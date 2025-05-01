"""
FastAPI 애플리케이션 생성 모듈
표준화된 FastAPI 애플리케이션 생성을 위한 팩토리 함수를 제공합니다.
"""

import logging
from typing import Any, Callable, Dict, List, Optional, Union

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseSettings

from .middleware import configure_cors


def create_fastapi_app(
    settings: BaseSettings,
    title: str = "차량 정비 서비스 API",
    description: str = "차량 정비 관리를 위한 API",
    version: str = "0.1.0",
    docs_url: str = "/docs",
    redoc_url: str = "/redoc",
    openapi_url: str = "/openapi.json",
    on_startup: List[Callable] = None,
    on_shutdown: List[Callable] = None,
    configure_middleware_func: Callable[[FastAPI], None] = None,
    configure_routes_func: Callable[[FastAPI], None] = None,
    configure_exception_handlers_func: Callable[[FastAPI], None] = None,
    logger: logging.Logger = None,
) -> FastAPI:
    """
    표준화된 FastAPI 애플리케이션을 생성합니다.

    Args:
        settings: 설정 객체
        title: API 제목
        description: API 설명
        version: API 버전
        docs_url: Swagger UI URL
        redoc_url: ReDoc UI URL
        openapi_url: OpenAPI JSON URL
        on_startup: 시작 시 실행할 함수 리스트
        on_shutdown: 종료 시 실행할 함수 리스트
        configure_middleware_func: 미들웨어 설정 함수
        configure_routes_func: 라우팅 설정 함수
        configure_exception_handlers_func: 예외 핸들러 설정 함수
        logger: 로거 객체

    Returns:
        설정된 FastAPI 애플리케이션
    """
    # 기본값 초기화
    if on_startup is None:
        on_startup = []
    if on_shutdown is None:
        on_shutdown = []

    # FastAPI 앱 생성
    app = FastAPI(
        title=title,
        description=description,
        version=version,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
    )

    # CORS 설정
    if hasattr(settings, "CORS_ORIGINS"):
        origins = settings.CORS_ORIGINS if hasattr(settings, "CORS_ORIGINS") else ["*"]
        configure_cors(app, origins=origins)

    # 커스텀 미들웨어 설정
    if configure_middleware_func:
        configure_middleware_func(app)

    # 라우팅 설정
    if configure_routes_func:
        configure_routes_func(app)

    # 예외 핸들러 설정
    if configure_exception_handlers_func:
        configure_exception_handlers_func(app)

    # 시작/종료 이벤트 설정
    for handler in on_startup:
        app.add_event_handler("startup", handler)

    for handler in on_shutdown:
        app.add_event_handler("shutdown", handler)

    # 기본 상태 확인 엔드포인트
    @app.get("/health")
    async def health_check():
        """
        서비스 상태 확인 엔드포인트
        """
        return {
            "status": "ok",
            "version": version,
            "environment": (
                settings.ENVIRONMENT if hasattr(settings, "ENVIRONMENT") else "unknown"
            ),
        }

    # 로깅
    if logger:
        logger.info(f"{title} v{version} 애플리케이션이 초기화되었습니다.")

    return app
