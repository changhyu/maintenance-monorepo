"""
FastAPI 애플리케이션 팩토리 모듈
표준화된 FastAPI 애플리케이션 생성 및 구성 기능 제공
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Callable, Dict, List, Optional, Set, Union

from fastapi import Depends, FastAPI, Request
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.openapi.utils import get_openapi

from ..config import BaseAppSettings
from ..logging import get_logger, setup_logging
from ..middleware import configure_cors, configure_standard_middlewares


@asynccontextmanager
async def create_lifespan(
    on_startup: Optional[List[Callable]] = None,
    on_shutdown: Optional[List[Callable]] = None,
    logger: Optional[logging.Logger] = None,
):
    """
    애플리케이션 수명주기 관리를 위한 기본 lifespan 컨텍스트 관리자

    Args:
        on_startup: 시작 시 실행할 함수 목록
        on_shutdown: 종료 시 실행할 함수 목록
        logger: 사용할 로거 객체
    """
    # 로거가 제공되지 않은 경우 기본 로거 사용
    if logger is None:
        logger = get_logger(__name__)

    # 백그라운드 태스크 세트
    background_tasks = set()

    try:
        logger.info("애플리케이션 시작 작업 실행")

        # 시작 함수 실행
        if on_startup:
            for startup_func in on_startup:
                try:
                    if asyncio.iscoroutinefunction(startup_func):
                        await startup_func()
                    else:
                        startup_func()
                except Exception as e:
                    logger.error(f"시작 함수 실행 중 오류 발생: {str(e)}")

        yield  # FastAPI가 여기서 요청 처리

    finally:
        logger.info("애플리케이션 종료 작업 실행")

        # 종료 함수 실행
        if on_shutdown:
            for shutdown_func in on_shutdown:
                try:
                    if asyncio.iscoroutinefunction(shutdown_func):
                        await shutdown_func()
                    else:
                        shutdown_func()
                except Exception as e:
                    logger.error(f"종료 함수 실행 중 오류 발생: {str(e)}")

        # 모든 백그라운드 태스크 취소
        for task in background_tasks:
            task.cancel()

        # 활성 태스크 완료 대기
        if background_tasks:
            await asyncio.gather(*background_tasks, return_exceptions=True)

        logger.info("모든 리소스 정리 완료")


def create_fastapi_app(
    settings: BaseAppSettings,
    title: Optional[str] = None,
    description: Optional[str] = None,
    version: Optional[str] = None,
    on_startup: Optional[List[Callable]] = None,
    on_shutdown: Optional[List[Callable]] = None,
    enable_timing: bool = True,
    configure_middleware_func: Optional[Callable[[FastAPI], None]] = None,
    configure_routes_func: Optional[Callable[[FastAPI], None]] = None,
    configure_exception_handlers_func: Optional[Callable[[FastAPI], None]] = None,
    logger: Optional[logging.Logger] = None,
    openapi_url: Optional[str] = "/openapi.json",
    docs_url: Optional[str] = "/docs",
    redoc_url: Optional[str] = "/redoc",
) -> FastAPI:
    """
    표준화된 FastAPI 애플리케이션 생성

    Args:
        settings: 앱 설정
        title: API 제목 (None인 경우 settings에서 가져옴)
        description: API 설명 (None인 경우 기본값 사용)
        version: API 버전 (None인 경우 settings에서 가져옴)
        on_startup: 시작 시 실행할 함수 목록
        on_shutdown: 종료 시 실행할 함수 목록
        enable_timing: 타이밍 미들웨어 활성화 여부
        configure_middleware_func: 추가 미들웨어 설정 함수
        configure_routes_func: 라우터 설정 함수
        configure_exception_handlers_func: 예외 핸들러 설정 함수
        logger: 사용할 로거 (None인 경우 새로 생성)
        openapi_url: OpenAPI JSON 경로
        docs_url: Swagger UI 경로
        redoc_url: ReDoc 경로

    Returns:
        구성된 FastAPI 앱 인스턴스
    """
    # 로깅 설정
    if logger is None:
        logger = setup_logging("fastapi_app")

    # 앱 메타데이터 설정
    if title is None:
        title = settings.PROJECT_NAME

    if description is None:
        description = f"{title} - {settings.ENVIRONMENT} 환경"

    if version is None:
        version = settings.API_VERSION

    # Lifespan 컨텍스트 관리자 생성
    lifespan = lambda app: create_lifespan(
        on_startup=on_startup, on_shutdown=on_shutdown, logger=logger
    )

    # FastAPI 앱 생성
    app = FastAPI(
        title=title,
        description=description,
        version=version,
        lifespan=lifespan,
        openapi_url=openapi_url,
        docs_url=docs_url,
        redoc_url=redoc_url,
    )

    # CORS 설정
    configure_cors(app, settings.CORS_ORIGINS)

    # 표준 미들웨어 설정
    configure_standard_middlewares(app, enable_timing=enable_timing)

    # 추가 미들웨어 구성
    if configure_middleware_func:
        configure_middleware_func(app)

    # 라우터 구성
    if configure_routes_func:
        configure_routes_func(app)

    # 예외 핸들러 구성
    if configure_exception_handlers_func:
        configure_exception_handlers_func(app)

    # 기본 상태 점검 엔드포인트
    @app.get("/health")
    async def health_check():
        """서비스 상태 확인 엔드포인트"""
        return {"status": "ok", "version": version, "environment": settings.ENVIRONMENT}

    logger.info(f"{title} v{version} - FastAPI 애플리케이션 초기화 완료")
    return app
