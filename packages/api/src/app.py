"""
FastAPI 애플리케이션 생성 및 구성 모듈
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 내부 모듈 import
from packages.api.srccore.config import settings
from packages.api.srccore.documentation import setup_api_documentation
from packages.api.srccore.lifespan import configure_lifespan
from packages.api.srccore.logging_setup import setup_logging
from packages.api.srccore.versioning import setup_versioning

# 로깅 설정
logger = setup_logging()


def create_app() -> FastAPI:
    """
    FastAPI 애플리케이션 생성 및 기본 설정
    """
    # FastAPI 앱 인스턴스 생성
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description=getattr(
            settings, "PROJECT_DESCRIPTION", "차량 정비 관리 API 서비스"
        ),
        docs_url=getattr(settings, "DOCS_URL", "/docs"),
        redoc_url=getattr(settings, "REDOC_URL", "/redoc"),
        openapi_url=getattr(settings, "OPENAPI_URL", "/openapi.json"),
        lifespan=configure_lifespan(),
    )

    # API 문서 설정
    setup_api_documentation(app)

    # 버전 관리 설정
    setup_versioning(app)

    logger.info("FastAPI 애플리케이션이 생성되었습니다")
    return app
