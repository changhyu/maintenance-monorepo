"""
공통 미들웨어 모듈
FastAPI 애플리케이션에 사용할 표준 미들웨어를 제공합니다.
"""

import time
from typing import Any, Callable, Dict, List, Optional

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware


def configure_cors(
    app: FastAPI,
    origins: List[str] = None,
    allow_credentials: bool = True,
    allow_methods: List[str] = ["*"],
    allow_headers: List[str] = ["*"],
    expose_headers: List[str] = None,
    max_age: int = 600,
) -> None:
    """
    CORS 미들웨어를 설정합니다.

    Args:
        app: FastAPI 애플리케이션
        origins: 허용할 오리진 목록
        allow_credentials: 자격 증명 허용 여부
        allow_methods: 허용할 HTTP 메소드 목록
        allow_headers: 허용할 HTTP 헤더 목록
        expose_headers: 노출할 HTTP 헤더 목록
        max_age: 프리플라이트 요청 캐시 시간 (초)
    """
    if origins is None:
        origins = ["*"]

    if expose_headers is None:
        expose_headers = []

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=allow_credentials,
        allow_methods=allow_methods,
        allow_headers=allow_headers,
        expose_headers=expose_headers,
        max_age=max_age,
    )


def add_gzip_middleware(app: FastAPI, minimum_size: int = 1000) -> None:
    """
    GZip 압축 미들웨어를 추가합니다.

    Args:
        app: FastAPI 애플리케이션
        minimum_size: 압축을 적용할 최소 응답 크기 (바이트)
    """
    app.add_middleware(GZipMiddleware, minimum_size=minimum_size)


def add_timing_middleware(app: FastAPI) -> None:
    """
    요청 처리 시간을 측정하는 커스텀 미들웨어를 추가합니다.

    Args:
        app: FastAPI 애플리케이션
    """

    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response


def configure_standard_middlewares(
    app: FastAPI, settings: Optional[Any] = None
) -> None:
    """
    표준 미들웨어 설정들을 일괄 적용합니다.

    Args:
        app: FastAPI 애플리케이션
        settings: 설정 객체 (CORS 설정 등에 사용)
    """
    # CORS 설정
    if settings and hasattr(settings, "CORS_ORIGINS"):
        origins = settings.CORS_ORIGINS
        allow_credentials = (
            settings.CORS_CREDENTIALS if hasattr(settings, "CORS_CREDENTIALS") else True
        )
        configure_cors(app, origins=origins, allow_credentials=allow_credentials)
    else:
        configure_cors(app)

    # GZip 압축
    add_gzip_middleware(app)

    # 처리 시간 측정
    add_timing_middleware(app)
