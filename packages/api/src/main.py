"""
Main application entry point for the API service.
모듈화된 FastAPI 애플리케이션 진입점
"""

import os
import sys
from typing import Any, Dict

import uvicorn

# 현재 디렉토리를 파이썬 시스템 경로에 추가
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from app import create_app

# 내부 모듈 imports
from fastapi import Depends, FastAPI, Request
from maintenance_shared_python.config import BaseAppSettings

# 공유 패키지 임포트
from maintenance_shared_python.fastapi_app import create_fastapi_app
from maintenance_shared_python.logging import get_logger, setup_logging
from middleware import configure_middleware
from routing import configure_routes
from src.dependencies import get_settings_dependency, lifespan_dependencies
from src.docs import setup_docs
from src.utils.concurrency import timed_operation

# 수정된 임포트 경로 - srccore에서 src.core로 변경
from src.core.config import Settings, get_settings
from src.core.exceptions import setup_exception_handlers

# 로깅 설정 적용
logger = setup_logging("api_service")
logger.info("API 서비스 초기화 시작")

# 설정 로드
settings = get_settings()


# API 시작/종료 이벤트 핸들러
async def startup_event():
    """서비스 시작 시 초기화 작업"""
    logger.info("API 서비스 시작 이벤트 처리")
    # 여기에 추가 초기화 코드 작성


async def shutdown_event():
    """서비스 종료 시 리소스 정리"""
    logger.info("API 서비스 종료 이벤트 처리")
    # 여기에 리소스 정리 코드 작성


# FastAPI 애플리케이션 생성 및 설정
app = create_fastapi_app(
    settings=settings,
    title="차량 정비 관리 API",
    description="모듈화된 FastAPI 기반 차량 정비 관리 API 서비스",
    version=settings.VERSION if hasattr(settings, "VERSION") else "1.0.0",
    on_startup=[startup_event],
    on_shutdown=[shutdown_event],
    configure_middleware_func=configure_middleware,
    configure_routes_func=configure_routes,
    configure_exception_handlers_func=setup_exception_handlers,
    logger=logger,
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# API 문서화 설정
setup_docs(app)


# 미들웨어 추가: 요청별 의존성 설정
@app.middleware("http")
async def dependencies_middleware(request: Request, call_next):
    """
    요청별 의존성 주입 미들웨어
    각 요청에 대한 의존성(DB 세션, 서비스 등)을 설정
    """
    async with timed_operation(f"{request.method} {request.url.path}"):
        async with lifespan_dependencies(request):
            # 다음 미들웨어 또는 엔드포인트 핸들러 호출
            response = await call_next(request)
            return response


# 기존 헬스 체크 엔드포인트 유지
@app.get("/api/health")
async def api_health_check(settings: Settings = Depends(get_settings_dependency)):
    """
    서비스 헬스 체크 엔드포인트
    """
    return {
        "status": "ok",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "service": "api",
    }


# 루트 경로 헬스 체크 엔드포인트 추가 (Docker 헬스체크 호환용)
@app.get("/health")
async def health_check(settings: Settings = Depends(get_settings_dependency)):
    """
    Docker 컨테이너 헬스 체크 엔드포인트
    """
    return {
        "status": "ok",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "service": "api",
    }


logger.info("API 문서화 설정이 완료되었습니다")
logger.info("API 애플리케이션이 성공적으로 초기화되었습니다")

# 직접 실행될 경우 개발 서버 시작
if __name__ == "__main__":
    try:
        # 환경 변수나 설정에서 포트 가져오기 - 기본값을 8080으로 변경
        port = int(
            os.getenv("PORT", settings.API_PORT if hasattr(settings, "API_PORT") else 8080)
        )

        # 로거에 기록
        logger.info(
            f"API 서버 시작: 포트 {port}, 디버그 모드: {settings.DEBUG}, 환경: {settings.ENVIRONMENT}"
        )

        # 서버 설정
        uvicorn_config = {
            "app": "src.main:app",
            "host": "0.0.0.0",
            "port": port,
            "reload": settings.DEBUG,
            "log_level": "info" if not settings.DEBUG else "debug",
            "workers": settings.WORKERS if hasattr(settings, "WORKERS") else 1,
            "timeout_keep_alive": 120,
        }

        # 서버 실행
        logger.info("API 서버를 시작합니다...")
        uvicorn.run(**uvicorn_config)
    except (ImportError, ModuleNotFoundError) as e:
        logger.error(f"서버 시작 중 모듈 오류 발생: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"서버 시작 중 예상치 못한 오류 발생: {str(e)}")
        raise
