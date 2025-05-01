from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from fastapi.middleware.gzip import GZipMiddleware
import time
from typing import Dict, List, Set, Optional, Tuple
import json
import logging
import hashlib
from datetime import datetime, timedelta

# 로거 설정
logger = logging.getLogger(__name__)

class CacheMiddleware(BaseHTTPMiddleware):
    """캐시 미들웨어"""
    
    def __init__(self, app, ttl: int = 300):
        super().__init__(app)
        self.ttl = ttl
        self.cache: Dict[str, Dict] = {}
        self.cache_hits = 0
        self.cache_misses = 0
        self.last_cleanup = time.time()
        self.cleanup_interval = 3600  # 1시간마다 만료된 캐시 정리
        self.path_patterns_to_cache: Set[str] = {
            "/api/v1/maintenance",  # 정비 관련 API
            "/api/v1/git",          # Git 관련 API
            "/api/v1/users",        # 사용자 관련 API
        }
        
        logger.info(f"캐시 미들웨어 초기화: TTL={ttl}초, 정리 간격={self.cleanup_interval}초")
    
    def should_cache(self, request: Request) -> bool:
        """요청을 캐시해야 하는지 확인"""
        # GET 요청이 아니면 캐시하지 않음
        if request.method != "GET":
            return False
            
        # 인증 요청은 캐시하지 않음
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return False
            
        # 특정 경로 패턴만 캐시
        return any(pattern in request.url.path for pattern in self.path_patterns_to_cache)
    
    def generate_cache_key(self, request: Request) -> str:
        """캐시 키 생성"""
        # URL 및 쿼리 파라미터
        url_key = f"{request.url.path}?{request.url.query}"
        
        # 인증 정보 (토큰 전체 대신 해시 사용)
        auth_header = request.headers.get("Authorization", "")
        auth_hash = hashlib.md5(auth_header.encode()).hexdigest() if auth_header else ""
        
        return f"{url_key}:{auth_hash}"
    
    async def dispatch(self, request: Request, call_next):
        # 캐시 유효성 검사 및 만료 항목 정리
        current_time = time.time()
        if current_time - self.last_cleanup > self.cleanup_interval:
            self._cleanup_expired_cache()
            self.last_cleanup = current_time
        
        # 캐시 적용 여부 확인
        if not self.should_cache(request):
            return await call_next(request)
        
        # 캐시 키 생성
        cache_key = self.generate_cache_key(request)
        
        # 캐시된 응답이 있고 만료되지 않았으면 반환
        if cache_key in self.cache:
            cached = self.cache[cache_key]
            if current_time - cached["timestamp"] < self.ttl:
                self.cache_hits += 1
                logger.debug(f"캐시 히트: {request.url.path}")
                
                # 헤더에 캐시 정보 추가
                response = Response(
                    content=cached["content"],
                    status_code=cached["status_code"],
                    headers=dict(cached["headers"])
                )
                response.headers["X-Cache"] = "HIT"
                response.headers["X-Cache-Remaining"] = str(int(cached["timestamp"] + self.ttl - current_time))
                return response
        
        # 캐시 미스
        self.cache_misses += 1
        logger.debug(f"캐시 미스: {request.url.path}")
        
        # 요청 처리
        response = await call_next(request)
        
        # 응답 캐시 (성공 응답만)
        if response.status_code == 200 and "application/json" in response.headers.get("content-type", ""):
            self.cache[cache_key] = {
                "content": response.body,
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "timestamp": current_time
            }
            
            # 캐시 상태 헤더 추가
            response.headers["X-Cache"] = "MISS"
            response.headers["X-Cache-TTL"] = str(self.ttl)
        
        return response
    
    def _cleanup_expired_cache(self):
        """만료된 캐시 항목 정리"""
        current_time = time.time()
        expired_keys = [
            key for key, value in self.cache.items()
            if current_time - value["timestamp"] > self.ttl
        ]
        
        for key in expired_keys:
            del self.cache[key]
            
        logger.info(f"캐시 정리 완료: {len(expired_keys)}개 항목 제거, 남은 항목: {len(self.cache)}개")
        logger.info(f"캐시 통계: 히트={self.cache_hits}, 미스={self.cache_misses}, 적중률={self.cache_hits/(self.cache_hits+self.cache_misses)*100 if (self.cache_hits+self.cache_misses) > 0 else 0:.2f}%")
    
    def clear_cache(self, path_pattern: Optional[str] = None):
        """캐시 비우기"""
        if path_pattern:
            keys_to_remove = [key for key in self.cache if path_pattern in key]
            for key in keys_to_remove:
                del self.cache[key]
            logger.info(f"패턴 '{path_pattern}'에 맞는 {len(keys_to_remove)}개 캐시 항목 제거")
        else:
            count = len(self.cache)
            self.cache.clear()
            logger.info(f"전체 캐시 초기화: {count}개 항목 제거")

class CompressionMiddleware(GZipMiddleware):
    """압축 미들웨어"""
    
    def __init__(self, app, minimum_size: int = 1000):
        super().__init__(app, minimum_size=minimum_size)
        logger.info(f"압축 미들웨어 초기화: 최소 크기={minimum_size}바이트")

class QueryOptimizationMiddleware(BaseHTTPMiddleware):
    """쿼리 최적화 미들웨어"""
    
    def __init__(self, app):
        super().__init__(app)
        logger.info("쿼리 최적화 미들웨어 초기화")
    
    async def dispatch(self, request: Request, call_next):
        # 요청 처리 시작 시간
        start_time = time.time()
        
        # 요청 처리
        response = await call_next(request)
        
        # 처리 시간 계산
        process_time = time.time() - start_time
        
        # 성능 지표 헤더 추가
        response.headers["X-Process-Time"] = str(process_time)
        
        # 응답이 JSON인 경우와 응답이 StreamingResponse가 아닌 경우에만 처리
        if ("application/json" in response.headers.get("content-type", "") and 
            hasattr(response, "body")):
            try:
                # 응답 본문 파싱
                body = json.loads(response.body)
                
                # 중복 제거 및 정렬
                if isinstance(body, list):
                    # 리스트인 경우 중복 제거
                    if len(body) > 0 and isinstance(body[0], dict) and "id" in body[0]:
                        # 딕셔너리 리스트인 경우 ID 기준으로 중복 제거
                        unique_items = {}
                        for item in body:
                            if "id" in item:
                                unique_items[item["id"]] = item
                        body = list(unique_items.values())
                    else:
                        # 일반 리스트인 경우 중복 제거
                        body = list(dict.fromkeys(body))
                    
                    # 정렬 (가능한 경우)
                    if all(isinstance(item, (int, float, str)) for item in body):
                        body.sort()
                
                # 최적화된 응답 반환
                return Response(
                    content=json.dumps(body),
                    status_code=response.status_code,
                    headers=dict(response.headers)
                )
            except Exception as e:
                logger.error(f"응답 최적화 중 오류: {str(e)}")
        
        # 로깅
        if process_time > 1.0:  # 1초 이상 소요된 요청 로깅
            logger.warning(f"느린 요청 감지: {request.method} {request.url.path} - {process_time:.2f}초")
        
        return response