"""
미들웨어 패키지 초기화 파일
"""
import time
import uuid
from typing import Any, Callable, Dict

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

try:
    from ..logging import get_logger
    logger = get_logger(__name__)
except ImportError:
    import logging
    logger = logging.getLogger(__name__)

# 미들웨어 클래스 임포트
from .request_id_middleware import get_request_id_middleware, RequestIdMiddleware
from .error_handler_middleware import get_error_handler_middleware, ErrorHandlerMiddleware


class TimingMiddleware(BaseHTTPMiddleware):
    """
    요청 처리 시간을 측정하여 로깅하는 미들웨어
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()

        # 요청 처리
        response = await call_next(request)

        # 요청 처리 시간 계산 및 로깅
        process_time = time.time() - start_time
        logger.debug(
            f"[{request.method}] {request.url.path} 처리 시간: {process_time:.4f}초"
        )

        # 응답 헤더에 처리 시간 추가 (선택사항)
        response.headers["X-Process-Time"] = str(process_time)
        return response


def configure_cors(app: FastAPI, origins: list = None) -> None:
    """
    CORS 미들웨어 설정

    Args:
        app: FastAPI 앱 인스턴스
        origins: 허용할 출처 목록 (기본값: ["*"])
    """
    if origins is None:
        origins = ["*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def configure_standard_middlewares(app: FastAPI, enable_timing: bool = True) -> None:
    """
    표준 미들웨어 설정

    Args:
        app: FastAPI 앱 인스턴스
        enable_timing: 타이밍 미들웨어 활성화 여부
    """
    # 요청 ID 미들웨어 추가
    app.add_middleware(RequestIdMiddleware)

    # 에러 핸들러 미들웨어 추가
    app.add_middleware(ErrorHandlerMiddleware)

    # 타이밍 미들웨어 추가 (선택적)
    if enable_timing:
        app.add_middleware(TimingMiddleware)
