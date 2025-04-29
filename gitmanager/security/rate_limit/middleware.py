"""
속도 제한(Rate Limiting) 미들웨어 모듈

이 모듈은 FastAPI와 함께 사용할 수 있는 API 속도 제한 미들웨어를 제공합니다.
"""

import time
import logging
from typing import Callable, Dict, Any, Optional, Union
import json

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from gitmanager.security.rate_limit.core import RateLimiter

# 로거 설정
logger = logging.getLogger(__name__)

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI용 API 속도 제한 미들웨어
    
    이 미들웨어는 들어오는 API 요청에 대해 속도 제한을 적용합니다.
    요청 IP 또는 인증된 사용자 ID를 기반으로 제한합니다.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        rate_limiter: Optional[RateLimiter] = None,
        enabled: bool = True,
        excluded_paths: Optional[list] = None,
        admin_paths: Optional[list] = None,
        admin_role_key: str = "role_id",
        admin_role_value: Union[str, int] = 1,
        get_username_from_request: Optional[Callable] = None
    ):
        """
        RateLimitMiddleware 초기화
        
        Args:
            app: FastAPI 애플리케이션
            rate_limiter: 사용할 RateLimiter 인스턴스. 없으면 새로 생성
            enabled: 미들웨어 활성화 여부
            excluded_paths: 속도 제한에서 제외할 경로 목록 (예: ["/health", "/metrics"])
            admin_paths: 관리자 경로 목록 (예: ["/admin", "/api/admin"])
            admin_role_key: 관리자 역할을 식별하는 키
            admin_role_value: 관리자 역할 값
            get_username_from_request: 요청에서 사용자 이름을 추출하는 함수
        """
        super().__init__(app)
        self.rate_limiter = rate_limiter or RateLimiter()
        self.enabled = enabled
        self.excluded_paths = excluded_paths or []
        self.admin_paths = admin_paths or ["/api/admin", "/admin"]
        self.admin_role_key = admin_role_key
        self.admin_role_value = admin_role_value
        self.get_username_from_request = get_username_from_request
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        요청을 처리하고 속도 제한을 적용합니다.
        
        Args:
            request: 클라이언트 요청
            call_next: 다음 미들웨어 또는 엔드포인트 호출 함수
            
        Returns:
            Response: HTTP 응답
        """
        # 미들웨어가 비활성화되어 있거나 제외 경로인 경우 속도 제한 적용하지 않음
        if not self.enabled or self._is_excluded_path(request.url.path):
            return await call_next(request)
            
        # 엔드포인트 식별
        endpoint = self._get_endpoint_identifier(request)
        
        # 클라이언트 식별자 (IP 또는 사용자 ID)
        client_id = await self._get_client_identifier(request)
        
        # 관리자 여부 확인
        is_admin = await self._is_admin_request(request)
        
        # 속도 제한 확인
        allowed, limit_info = self.rate_limiter.check_rate_limit(
            key=client_id,
            endpoint=endpoint,
            is_admin=is_admin
        )
        
        # 디버그 로깅
        if not allowed:
            logger.warning(
                f"속도 제한 초과: 클라이언트={client_id}, 엔드포인트={endpoint}, "
                f"관리자={is_admin}, 제한={limit_info['limit']}, 남은요청={limit_info['remaining']}"
            )
        
        # 속도 제한 초과 시 429 응답 반환
        if not allowed:
            return self._create_rate_limit_response(limit_info)
            
        # 요청 처리
        response = await call_next(request)
        
        # 응답 헤더에 속도 제한 정보 추가
        response.headers["X-RateLimit-Limit"] = str(limit_info["limit"])
        response.headers["X-RateLimit-Remaining"] = str(limit_info["remaining"])
        response.headers["X-RateLimit-Reset"] = str(limit_info["reset"])
        
        return response
    
    def _is_excluded_path(self, path: str) -> bool:
        """
        경로가 속도 제한에서 제외되는지 확인합니다.
        
        Args:
            path: 요청 URL 경로
            
        Returns:
            bool: 제외 여부
        """
        return any(path.startswith(excluded) for excluded in self.excluded_paths)
        
    def _get_endpoint_identifier(self, request: Request) -> str:
        """
        요청의 엔드포인트 식별자를 반환합니다.
        
        Args:
            request: 클라이언트 요청
            
        Returns:
            str: 엔드포인트 식별자
        """
        path = request.url.path
        
        # Git API 경로 매핑
        if "/api/admin/git/status" in path:
            return "git_status"
        elif "/api/admin/git/commit" in path:
            return "git_commit"
        elif "/api/admin/git/push" in path or "/api/git/push" in path:
            return "git_push"
        elif "/api/admin/git/pull" in path or "/api/git/pull" in path:
            return "git_pull"
        elif "/api/admin/git/merge" in path or "/api/git/merge" in path:
            return "git_merge"
        elif "/api/admin/git/branch" in path or "/api/git/branch" in path:
            return "git_branch"
            
        # 기본값
        return "default"
        
    async def _get_client_identifier(self, request: Request) -> str:
        """
        요청의 클라이언트 식별자를 반환합니다.
        
        먼저 사용자 ID를 확인하고, 없으면 IP 주소를 사용합니다.
        
        Args:
            request: 클라이언트 요청
            
        Returns:
            str: 클라이언트 식별자
        """
        # 사용자 정의 추출 함수가 있으면 사용
        if self.get_username_from_request:
            username = await self.get_username_from_request(request)
            if username:
                return f"user:{username}"
                
        # 사용자 정보 확인
        if hasattr(request.state, "user") and getattr(request.state.user, "id", None):
            return f"user:{request.state.user.id}"
            
        # IP 주소 사용
        client_host = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        
        if forwarded_for:
            # X-Forwarded-For 헤더에서 첫 번째 IP 사용
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = client_host
            
        return f"ip:{client_ip}"
        
    async def _is_admin_request(self, request: Request) -> bool:
        """
        요청이 관리자에 의한 것인지 확인합니다.
        
        관리자 경로이거나 사용자가 관리자 역할을 가지고 있으면 True 반환
        
        Args:
            request: 클라이언트 요청
            
        Returns:
            bool: 관리자 요청 여부
        """
        # 관리자 경로 확인
        if any(request.url.path.startswith(admin_path) for admin_path in self.admin_paths):
            # 요청 상태에 사용자 정보가 있는지 확인
            if hasattr(request.state, "user"):
                user = request.state.user
                # 사용자가 관리자 역할을 가지고 있는지 확인
                if hasattr(user, self.admin_role_key) and getattr(user, self.admin_role_key) == self.admin_role_value:
                    return True
                    
        return False
        
    def _create_rate_limit_response(self, limit_info: Dict[str, Any]) -> JSONResponse:
        """
        속도 제한 초과 응답을 생성합니다.
        
        Args:
            limit_info: 속도 제한 정보
            
        Returns:
            JSONResponse: 429 상태 코드와 함께 속도 제한 정보가 포함된 응답
        """
        response = JSONResponse(
            status_code=429,
            content={
                "success": False,
                "message": "요청 횟수가 너무 많습니다. 잠시 후 다시 시도하세요.",
                "error_code": "RATE_LIMIT_EXCEEDED",
                "retry_after": limit_info["reset"] - int(time.time())
            }
        )
        
        # 응답 헤더 설정
        response.headers["X-RateLimit-Limit"] = str(limit_info["limit"])
        response.headers["X-RateLimit-Remaining"] = "0"
        response.headers["X-RateLimit-Reset"] = str(limit_info["reset"])
        response.headers["Retry-After"] = str(limit_info["reset"] - int(time.time()))
        
        return response 