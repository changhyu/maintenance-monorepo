"""
API 요청 속도 제한 모듈

API 요청에 대한 속도 제한을 관리하는 미들웨어와 유틸리티를 제공합니다.
"""

import time
from datetime import datetime
from typing import Any, Callable, Dict, Optional, Tuple, Union

import redis
from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from packages.api.src.coreconfig import settings
from packages.api.src.coreexceptions import BadRequestException
from packages.api.src.corelogger import logger


class RateLimitExceeded(BadRequestException):
    """속도 제한 초과 예외"""

    def __init__(
        self, detail: str = "요청 횟수 제한을 초과했습니다. 잠시 후 다시 시도해주세요."
    ):
        super().__init__(detail=detail, headers=None, error_code="RATE_LIMIT_EXCEEDED")


class RateLimiter(BaseHTTPMiddleware):
    """
    API 요청 속도 제한 미들웨어

    지정된 시간 내에 허용된 요청 수를 제한합니다.
    """

    def __init__(
        self,
        app: ASGIApp,
        redis_client: Optional[redis.Redis] = None,
        rate_limit_per_minute: int = 60,
        admin_rate_limit_per_minute: int = 300,
        enable_rate_limit: bool = True,
    ):
        """
        속도 제한 미들웨어 초기화

        Args:
            app: ASGI 애플리케이션
            redis_client: Redis 클라이언트 (메모리 기반으로 사용하려면 None)
            rate_limit_per_minute: 분당 허용되는 일반 요청 수
            admin_rate_limit_per_minute: 분당 허용되는 관리자 요청 수
            enable_rate_limit: 속도 제한 활성화 여부
        """
        super().__init__(app)
        self.redis_client = redis_client
        self.rate_limit = rate_limit_per_minute
        self.admin_rate_limit = admin_rate_limit_per_minute
        self.window = 60  # 1분 (초 단위)
        self.enable_rate_limit = enable_rate_limit
        self._rate_limits: Dict[str, int] = {}
        self._rate_reset_time = int(time.time()) + self.window

        logger.info(
            f"속도 제한 미들웨어 초기화: 일반 사용자 {rate_limit_per_minute}회/분, 관리자 {admin_rate_limit_per_minute}회/분"
        )
        if not enable_rate_limit:
            logger.warning(
                "속도 제한이 비활성화되어 있습니다. 프로덕션 환경에서는 활성화하는 것이 좋습니다."
            )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        요청 처리 및 속도 제한 적용

        Args:
            request: HTTP 요청
            call_next: 다음 미들웨어 또는 라우트 핸들러

        Returns:
            Response: HTTP 응답
        """
        # 속도 제한이 비활성화되어 있으면 바로 처리
        if not self.enable_rate_limit:
            return await call_next(request)

        # API 요청에만 속도 제한 적용
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        # 건강 확인 및 문서 경로 제외
        if request.url.path in ["/api/health", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)

        # 클라이언트 식별자 (IP 또는 토큰)
        client_id = self._get_client_id(request)
        is_admin = await self._is_admin_user(request)

        # 속도 제한 검사
        allowed, current_count, reset_time = await self._check_rate_limit(
            client_id, self.admin_rate_limit if is_admin else self.rate_limit
        )

        # 속도 제한 초과 시
        if not allowed:
            logger.warning(f"속도 제한 초과: {client_id}, 요청 수: {current_count}")

            # 429 응답 생성
            response = Response(
                content=self._create_rate_limit_error(reset_time),
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                media_type="application/json",
            )
        else:
            # 요청 처리
            response = await call_next(request)

        # 속도 제한 헤더 추가
        rate_limit = self.admin_rate_limit if is_admin else self.rate_limit
        response.headers["X-RateLimit-Limit"] = str(rate_limit)
        response.headers["X-RateLimit-Remaining"] = str(
            max(0, rate_limit - current_count)
        )
        response.headers["X-RateLimit-Reset"] = str(reset_time)

        return response

    def _get_client_id(self, request: Request) -> str:
        """
        클라이언트 식별자 결정

        Args:
            request: HTTP 요청

        Returns:
            str: 클라이언트 식별자 (인증 토큰 또는 IP 주소)
        """
        # 인증 헤더 확인
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            # 토큰 기반 식별
            token = auth_header.split(" ")[1]
            # 실제 구현에서는 토큰 해시를 사용하는 것이 좋음
            return f"token:{token[:8]}"  # 토큰의 첫 8자만 사용

        # IP 주소 기반 식별
        ip = request.client.host if request.client else "unknown"
        return f"ip:{ip}"

    async def _is_admin_user(self, request: Request) -> bool:
        """
        관리자 사용자 여부 확인

        Args:
            request: HTTP 요청

        Returns:
            bool: 관리자 여부
        """
        # 실제 구현에서는 토큰에서 역할(role) 정보를 추출하여 확인
        # 여기서는 간단히 요청 헤더 확인
        return request.headers.get("X-Admin-Role") == "true"

    async def _check_rate_limit(
        self, client_id: str, limit: int
    ) -> Tuple[bool, int, int]:
        """
        속도 제한 확인

        Args:
            client_id: 클라이언트 식별자
            limit: 적용할 요청 제한 수

        Returns:
            Tuple[bool, int, int]: (허용 여부, 현재 요청 수, 다음 리셋 시간)
        """
        current_time = int(time.time())
        window_key = f"{current_time // self.window}"
        rate_key = f"rate:{client_id}:{window_key}"

        if self.redis_client:
            # Redis 기반 구현
            return await self._check_rate_limit_redis(rate_key, limit, current_time)
        else:
            # 메모리 기반 구현 (간단한 구현)
            return self._check_rate_limit_memory(rate_key, limit, current_time)

    async def _check_rate_limit_redis(
        self, rate_key: str, limit: int, current_time: int
    ) -> Tuple[bool, int, int]:
        """Redis 기반 속도 제한 확인"""
        pipeline = self.redis_client.pipeline()
        pipeline.incr(rate_key)
        pipeline.expire(rate_key, self.window)
        results = pipeline.execute()

        count = results[0]

        # 다음 리셋 시간 계산
        reset_time = current_time + (self.window - (current_time % self.window))

        return count <= limit, count, reset_time

    def _check_rate_limit_memory(
        self, rate_key: str, limit: int, current_time: int
    ) -> Tuple[bool, int, int]:
        """메모리 기반 속도 제한 확인"""
        # 새 시간 창으로 리셋
        if current_time >= self._rate_reset_time:
            self._rate_limits = {}
            self._rate_reset_time = current_time + self.window

        # 카운트 증가
        self._rate_limits[rate_key] = self._rate_limits.get(rate_key, 0) + 1

        return (
            self._rate_limits[rate_key] <= limit,
            self._rate_limits[rate_key],
            self._rate_reset_time,
        )

    def _create_rate_limit_error(self, reset_time: int) -> str:
        """속도 제한 오류 응답 생성"""
        import json

        from packages.api.src.coreresponses import error_response

        reset_datetime = datetime.fromtimestamp(reset_time).isoformat()

        return json.dumps(
            error_response(
                message="요청 횟수 제한을 초과했습니다",
                detail=f"속도 제한이 초과되었습니다. {reset_datetime} 이후에 다시 시도해주세요.",
                error_code="RATE_LIMIT_EXCEEDED",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            ).dict()
        )
