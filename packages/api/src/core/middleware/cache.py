from fastapi import Request, Response
from typing import Optional, Dict, Any
import json
import hashlib
from datetime import datetime, timedelta
import asyncio
from ..config import settings
from ..redis import redis_client

class CacheMiddleware:
    """캐시 미들웨어"""

    def __init__(self):
        self.cache_enabled = settings.CACHE_ENABLED
        self.default_ttl = settings.CACHE_DEFAULT_TTL
        self.cache_prefix = settings.CACHE_PREFIX
        self._local_cache: Dict[str, Any] = {}
        self._cache_lock = asyncio.Lock()

    def _generate_cache_key(self, request: Request) -> str:
        """요청에 대한 캐시 키 생성"""
        # URL, 메서드, 쿼리 파라미터, 헤더 등을 포함한 고유 키 생성
        cache_parts = [
            request.url.path,
            request.method,
            str(sorted(request.query_params.items())),
            request.headers.get('accept', ''),
            request.headers.get('accept-language', '')
        ]
        
        # Authorization 헤더가 있는 경우 사용자별 캐시를 위해 추가
        auth_header = request.headers.get('authorization')
        if auth_header:
            cache_parts.append(hashlib.sha256(auth_header.encode()).hexdigest())
            
        cache_key = hashlib.sha256('|'.join(cache_parts).encode()).hexdigest()
        return f"{self.cache_prefix}:{cache_key}"

    async def get_cached_response(self, cache_key: str) -> Optional[Response]:
        """캐시된 응답 조회"""
        # 먼저 로컬 캐시 확인
        if cache_key in self._local_cache:
            cache_data = self._local_cache[cache_key]
            if datetime.now() < cache_data['expires_at']:
                return Response(
                    content=cache_data['content'],
                    media_type=cache_data['media_type'],
                    status_code=cache_data['status_code'],
                    headers=cache_data['headers']
                )
            else:
                del self._local_cache[cache_key]

        # Redis 캐시 확인
        try:
            cached_data = await redis_client.get(cache_key)
            if cached_data:
                cache_data = json.loads(cached_data)
                
                # 로컬 캐시에도 저장
                self._local_cache[cache_key] = {
                    **cache_data,
                    'expires_at': datetime.now() + timedelta(seconds=self.default_ttl)
                }
                
                return Response(
                    content=cache_data['content'],
                    media_type=cache_data['media_type'],
                    status_code=cache_data['status_code'],
                    headers=cache_data['headers']
                )
        except Exception as e:
            print(f"Cache retrieval error: {e}")
        return None

    async def set_cached_response(
        self,
        cache_key: str,
        response: Response,
        ttl: Optional[int] = None
    ) -> None:
        """응답 캐시 저장"""
        if not self.cache_enabled:
            return

        ttl = ttl or self.default_ttl
        
        # 응답 데이터 준비
        cache_data = {
            'content': response.body.decode(),
            'media_type': response.media_type,
            'status_code': response.status_code,
            'headers': dict(response.headers)
        }
        
        try:
            # Redis에 캐시 저장
            await redis_client.setex(
                cache_key,
                ttl,
                json.dumps(cache_data)
            )
            
            # 로컬 캐시에도 저장
            async with self._cache_lock:
                self._local_cache[cache_key] = {
                    **cache_data,
                    'expires_at': datetime.now() + timedelta(seconds=ttl)
                }
                
                # 로컬 캐시 크기 제한
                if len(self._local_cache) > settings.LOCAL_CACHE_MAX_SIZE:
                    # 가장 오래된 항목 제거
                    oldest_key = min(
                        self._local_cache.keys(),
                        key=lambda k: self._local_cache[k]['expires_at']
                    )
                    del self._local_cache[oldest_key]
                    
        except Exception as e:
            print(f"Cache storage error: {e}")

    def should_cache_request(self, request: Request) -> bool:
        """캐시 적용 여부 결정"""
        if not self.cache_enabled:
            return False
            
        # GET 요청만 캐시
        if request.method != "GET":
            return False
            
        # 캐시 제외 경로 확인
        if request.url.path in settings.CACHE_EXCLUDE_PATHS:
            return False
            
        # 캐시 제외 헤더 확인
        cache_control = request.headers.get('cache-control', '')
        if 'no-cache' in cache_control or 'no-store' in cache_control:
            return False
            
        return True

    async def clear_cache(self, pattern: str = "*") -> None:
        """캐시 삭제"""
        try:
            # Redis 캐시 삭제
            keys = await redis_client.keys(f"{self.cache_prefix}:{pattern}")
            if keys:
                await redis_client.delete(*keys)
            
            # 로컬 캐시 삭제
            async with self._cache_lock:
                self._local_cache.clear()
                
        except Exception as e:
            print(f"Cache clearing error: {e}")

    async def __call__(self, request: Request, call_next):
        """미들웨어 실행"""
        if not self.should_cache_request(request):
            return await call_next(request)

        cache_key = self._generate_cache_key(request)
        
        # 캐시된 응답 확인
        cached_response = await self.get_cached_response(cache_key)
        if cached_response:
            return cached_response

        # 새로운 응답 생성 및 캐시
        response = await call_next(request)
        
        # 성공 응답만 캐시
        if 200 <= response.status_code < 300:
            await self.set_cached_response(cache_key, response)

        return response 