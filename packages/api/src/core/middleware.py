import time
import json
import gzip
from typing import Callable, Optional, Dict, List, Any, Set
from fastapi import FastAPI, Request, Response
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from starlette.responses import JSONResponse
import structlog
from datetime import datetime, timezone
import logging

from packages.api.src.core.config import settings
from packages.api.src.core.logger import logger
from packages.api.src.core.security import SecurityService, get_security_service
from packages.api.src.core.metrics_collector import metrics_collector
from .monitoring.middleware import MonitoringMiddleware
from .rate_limiter import RateLimiter

logger = structlog.get_logger()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    요청 로깅 미들웨어
    모든 API 요청에 대한 경로, 메서드, 소요 시간, 상태 코드 로깅
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # 요청 시작 로깅
        logger.info(f"Request started: {request.method} {request.url.path}")
        
        # 요청 처리
        response = await call_next(request)
        
        # 처리 시간 계산
        process_time = (time.time() - start_time) * 1000
        formatted_process_time = '{0:.2f}'.format(process_time)
        
        # 응답 로깅
        logger.info(
            f"Request completed: {request.method} {request.url.path} - "
            f"Status: {response.status_code} - "
            f"Time: {formatted_process_time}ms"
        )
        
        # 메트릭 수집
        metrics_collector.track_request(
            method=request.method,
            endpoint=request.url.path,
            status_code=response.status_code
        )
        metrics_collector.http_request_duration_seconds.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(process_time / 1000)  # 초 단위로 변환
        
        return response


class SecurityMiddleware(BaseHTTPMiddleware):
    """보안 미들웨어"""
    
    def __init__(
        self,
        app: ASGIApp,
        security_service: Optional[SecurityService] = None
    ):
        super().__init__(app)
        self.security_service = security_service or get_security_service()
        self.logger = logger.bind(middleware="security")
        
    async def dispatch(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """요청 처리 및 보안 검증"""
        try:
            # 세션 검증
            if "Authorization" in request.headers:
                token = request.headers["Authorization"].split(" ")[1]
                user = await self.security_service.get_current_user(token)
                session_id = request.headers.get("X-Session-ID")
                
                if session_id:
                    session_result = await self.security_service.validate_session_activity(
                        user,
                        session_id
                    )
                    if not session_result.success:
                        return Response(
                            content=session_result.error,
                            status_code=401
                        )
                
                # 비밀번호 만료 확인
                password_result = await self.security_service.check_password_expiry(user)
                if not password_result.success:
                    return Response(
                        content=password_result.error,
                        status_code=403
                    )
                
                # 민감한 작업 확인
                operation = request.url.path.split("/")[-1]
                if await self.security_service.is_operation_sensitive(operation):
                    two_factor_code = request.headers.get("X-2FA-Code")
                    security_result = await self.security_service.verify_operation_security(
                        user,
                        operation,
                        two_factor_code
                    )
                    if not security_result.success:
                        return Response(
                            content=security_result.error,
                            status_code=403
                        )
            
            response = await call_next(request)
            return response
            
        except Exception as e:
            self.logger.error("security_middleware_error", error=str(e))
            return Response(
                content="보안 검증 중 오류가 발생했습니다",
                status_code=500
            )


class CompressionMiddleware(BaseHTTPMiddleware):
    """
    응답 압축 미들웨어
    
    특정 크기 이상의 응답을 gzip으로 압축합니다.
    클라이언트가 압축을 지원하는 경우에만 압축이 적용됩니다.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        minimum_size: int = 1024,
        compress_types: Optional[Set[str]] = None
    ):
        """
        압축 미들웨어 초기화
        
        Args:
            app: ASGI 애플리케이션
            minimum_size: 압축 적용 최소 크기 (바이트)
            compress_types: 압축 적용 콘텐츠 타입 집합
        """
        super().__init__(app)
        self.minimum_size = minimum_size
        self.compress_types = compress_types or {
            "text/html", "text/css", "text/javascript", "application/javascript",
            "application/json", "text/plain", "text/xml", "application/xml"
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        요청 처리 및 응답 압축
        
        Args:
            request: 요청 객체
            call_next: 다음 미들웨어 또는 라우트 핸들러
            
        Returns:
            압축된 응답 또는 원본 응답
        """
        # 클라이언트 압축 지원 여부 확인
        accept_encoding = request.headers.get("Accept-Encoding", "")
        supports_gzip = "gzip" in accept_encoding
        
        # 압축 지원하지 않으면 원본 응답 반환
        if not supports_gzip:
            return await call_next(request)
        
        # 원본 응답 처리
        response = await call_next(request)
        
        # 응답 압축 가능 여부 확인
        content_type = response.headers.get("Content-Type", "")
        content_encoding = response.headers.get("Content-Encoding", "")
        
        # 이미 압축되었거나, 압축 불가능한 유형이거나, 너무 작은 경우 원본 반환
        if (
            content_encoding or
            not any(ctype in content_type for ctype in self.compress_types) or
            "content-length" in response.headers and 
            int(response.headers["content-length"]) < self.minimum_size
        ):
            return response
        
        # 응답 본문 압축
        if hasattr(response, "body"):
            body = response.body
            if len(body) >= self.minimum_size:
                compressed_body = gzip.compress(body)
                
                # 새 응답 생성
                new_response = Response(
                    content=compressed_body,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type
                )
                
                # 압축 헤더 추가
                new_response.headers["Content-Encoding"] = "gzip"
                new_response.headers["Content-Length"] = str(len(compressed_body))
                new_response.headers["Vary"] = "Accept-Encoding"
                
                # 압축률 측정
                compression_ratio = (len(body) - len(compressed_body)) / len(body) * 100
                logger.debug(f"응답 압축: {len(body)} -> {len(compressed_body)} 바이트 ({compression_ratio:.1f}% 감소)")
                
                # 압축 메트릭 기록
                metrics_collector.cache_memory_usage.set(len(compressed_body))
                
                return new_response
        
        return response


class BatchRequestMiddleware(BaseHTTPMiddleware):
    """
    요청 묶음 처리 미들웨어
    
    여러 API 요청을 하나의 요청으로 묶어서 처리합니다.
    '/batch' 경로에 대한 POST 요청을 통해 여러 API 작업을 한 번에 처리할 수 있습니다.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        요청 처리
        
        Args:
            request: 요청 객체
            call_next: 다음 미들웨어 또는 라우트 핸들러
            
        Returns:
            응답 객체
        """
        # 배치 요청 경로 확인
        if request.method == "POST" and request.url.path.endswith("/batch"):
            return await self._handle_batch_request(request)
        
        # 일반 요청 처리
        return await call_next(request)
    
    async def _handle_batch_request(self, request: Request) -> JSONResponse:
        """
        배치 요청 처리
        
        Args:
            request: 배치 요청 객체
            
        Returns:
            배치 작업 결과 응답
        """
        try:
            # 요청 본문 파싱
            batch_data = await request.json()
            
            if not isinstance(batch_data, list):
                return JSONResponse(
                    status_code=400,
                    content={"error": "배치 요청은 배열 형식이어야 합니다"}
                )
            
            # 각 요청 처리 결과를 저장할 리스트
            results = []
            
            # 모든 배치 요청 처리
            for idx, item in enumerate(batch_data):
                # 필수 필드 확인
                if not isinstance(item, dict) or "method" not in item or "path" not in item:
                    results.append({
                        "status": 400,
                        "body": {"error": "각 배치 항목은 method와 path를 포함해야 합니다"},
                        "id": item.get("id")
                    })
                    continue
                
                # 요청 항목 정보 추출
                method = item["method"].upper()
                path = item["path"]
                headers = item.get("headers", {})
                params = item.get("params", {})
                body = item.get("body")
                request_id = item.get("id")
                
                # 내부 요청 처리
                try:
                    start_time = time.time()
                    response = await self._process_subrequest(request, method, path, headers, params, body)
                    process_time = time.time() - start_time
                    
                    # 응답 본문 추출
                    response_body = None
                    if hasattr(response, "body"):
                        try:
                            response_body = json.loads(response.body)
                        except:
                            response_body = response.body.decode("utf-8")
                    
                    # 응답 정보 저장
                    result = {
                        "status": response.status_code,
                        "headers": dict(response.headers),
                        "body": response_body,
                        "time": process_time
                    }
                    
                    # 요청 ID가 있으면 포함
                    if request_id is not None:
                        result["id"] = request_id
                    
                    results.append(result)
                    
                except Exception as e:
                    # 하위 요청 처리 오류
                    error_result = {
                        "status": 500,
                        "body": {"error": str(e)},
                    }
                    
                    if request_id is not None:
                        error_result["id"] = request_id
                    
                    results.append(error_result)
            
            # 모든 결과 반환
            return JSONResponse(
                content=results,
                status_code=200
            )
            
        except Exception as e:
            # 전체 배치 처리 오류
            logger.error(f"배치 요청 처리 오류: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"error": f"배치 요청 처리 오류: {str(e)}"}
            )
    
    async def _process_subrequest(
        self,
        original_request: Request,
        method: str,
        path: str,
        headers: Dict[str, str],
        params: Dict[str, str],
        body: Any = None
    ) -> Response:
        """
        하위 요청 처리 (실제 구현은 애플리케이션 상황에 맞게 개발 필요)
        
        Args:
            original_request: 원본 요청 객체
            method: HTTP 메서드
            path: 요청 경로
            headers: 요청 헤더
            params: 쿼리 파라미터
            body: 요청 본문
            
        Returns:
            하위 요청 처리 응답
        """
        # 기본 가상 응답 반환 (실제 구현 필요)
        return JSONResponse(
            content={
                "success": True,
                "message": f"{method} {path} 처리됨",
                "params": params,
                "body": body
            },
            status_code=200
        )


class CircuitBreakerMiddleware(BaseHTTPMiddleware):
    """
    서킷 브레이커 미들웨어
    
    특정 임계값을 넘어서는 오류가 발생하면 일시적으로 서비스를 차단합니다.
    서비스 과부하나 종속성 오류로부터 시스템을 보호합니다.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        failure_threshold: int = 5,
        reset_timeout: int = 30,
        exclude_paths: Optional[List[str]] = None
    ):
        """
        서킷 브레이커 미들웨어 초기화
        
        Args:
            app: ASGI 애플리케이션
            failure_threshold: 서킷 오픈 실패 횟수 임계값
            reset_timeout: 서킷 초기화 타임아웃 (초)
            exclude_paths: 서킷 브레이커에서 제외할 경로 목록
        """
        super().__init__(app)
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.exclude_paths = exclude_paths or []
        
        # 서킷 상태 정보
        self.failure_count = 0
        self.circuit_open = False
        self.last_failure_time = 0
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        요청 처리 및 서킷 브레이커 로직 적용
        
        Args:
            request: 요청 객체
            call_next: 다음 미들웨어 또는 라우트 핸들러
            
        Returns:
            응답 객체
        """
        # 제외 경로 확인
        path = request.url.path
        if any(path.startswith(exclude) for exclude in self.exclude_paths):
            return await call_next(request)
        
        # 서킷 상태 확인
        current_time = time.time()
        
        # 서킷이 열려있고 리셋 시간이 지났으면 반열림 상태로 전환
        if self.circuit_open and (current_time - self.last_failure_time) > self.reset_timeout:
            logger.info(f"서킷 반열림 상태로 전환: {path}")
            self.circuit_open = False
            self.failure_count = 0
        
        # 서킷이 열려있으면 즉시 오류 응답
        if self.circuit_open:
            logger.warning(f"서킷 열림 상태: {path} 요청 거부됨")
            return JSONResponse(
                status_code=503,
                content={
                    "error": "Service Temporarily Unavailable",
                    "message": "서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요."
                }
            )
        
        try:
            # 요청 처리
            response = await call_next(request)
            
            # 성공적인 응답이면 실패 카운트 리셋
            if response.status_code < 500:
                self.failure_count = 0
            else:
                # 5xx 오류는 실패로 간주
                self._record_failure()
            
            return response
            
        except Exception as e:
            # 예외 발생 시 실패 기록
            logger.error(f"요청 처리 중 오류 발생: {path} - {str(e)}")
            self._record_failure()
            
            # 오류 응답 생성
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal Server Error",
                    "message": str(e)
                }
            )
    
    def _record_failure(self):
        """실패 기록 및 서킷 상태 업데이트"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        # 임계값을 넘으면 서킷 오픈
        if self.failure_count >= self.failure_threshold and not self.circuit_open:
            self.circuit_open = True
            logger.warning(
                f"서킷 열림 상태로 전환: 실패 횟수 {self.failure_count}회 "
                f"(임계값: {self.failure_threshold}회)"
            )


def setup_middlewares(app: FastAPI) -> None:
    """
    FastAPI 애플리케이션에 필요한 미들웨어를 설정합니다.
    
    Args:
        app: FastAPI 애플리케이션 인스턴스
    """
    # CORS 미들웨어 설정
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 모니터링 미들웨어 추가
    app.add_middleware(MonitoringMiddleware)
    
    # 보안 미들웨어 추가
    app.add_middleware(SecurityMiddleware)
    
    # 레이트 리미터 설정 (선택적)
    if settings.RATE_LIMIT_ENABLED:
        app.add_middleware(RateLimiter)
        logger.info("레이트 리미터가 활성화되었습니다")
    
    # 응답 압축 미들웨어 추가
    app.add_middleware(
        CompressionMiddleware,
        minimum_size=1024,  # 1KB 이상인 응답만 압축
    )
    
    # 서킷 브레이커 미들웨어 추가
    app.add_middleware(
        CircuitBreakerMiddleware,
        failure_threshold=5,
        reset_timeout=30,
        exclude_paths=["/health", "/metrics", "/docs", "/redoc"]
    )
    
    # 요청 묶음 처리 미들웨어 추가
    app.add_middleware(BatchRequestMiddleware)
    
    # 요청 로깅 미들웨어 추가
    app.add_middleware(RequestLoggingMiddleware)
    
    logger.info("모든 미들웨어가 설정되었습니다") 