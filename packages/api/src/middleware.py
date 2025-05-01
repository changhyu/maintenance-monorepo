"""
FastAPI 미들웨어 구성 모듈
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

# 내부 모듈 import
try:
    from core.config import settings
    from core.logging_setup import setup_logging
    from core.middleware import setup_middlewares
    from core.monitoring.middleware import MonitoringMiddleware
    print("middleware.py: 내부 모듈 임포트 성공")
except ImportError as e:
    print(f"middleware.py: 내부 모듈 임포트 오류 - {e}")
    raise  # 필수 임포트이므로 예외 발생시치기

# 로깅 설정
logger = setup_logging()


def setup_cors(app: FastAPI) -> None:
    """CORS 미들웨어 설정"""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.debug("CORS 미들웨어가 설정되었습니다")


def setup_security_middleware(app: FastAPI) -> None:
    """보안 관련 미들웨어 설정"""
    if hasattr(settings, "SECURE_SSL_REDIRECT") and settings.SECURE_SSL_REDIRECT:
        app.add_middleware(HTTPSRedirectMiddleware)
        logger.debug("HTTPS 리다이렉트 미들웨어가 설정되었습니다")

    if hasattr(settings, "SECURE_HSTS_SECONDS") and settings.SECURE_HSTS_SECONDS > 0:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=[
                "api.car-goro.com",
                "test-api.car-goro.com",
                "api.car-goro.kr",
                "test-api.car-goro.kr",
                "localhost",
                "127.0.0.1",
            ],
        )
        logger.debug("신뢰할 수 있는 호스트 미들웨어가 설정되었습니다")


def setup_monitoring_middleware(app: FastAPI) -> None:
    """모니터링 미들웨어 설정"""
    app.add_middleware(MonitoringMiddleware)
    logger.debug("모니터링 미들웨어가 설정되었습니다")


def configure_middleware(app: FastAPI) -> None:
    """
    모든 미들웨어 설정을 적용
    """
    # CORS 미들웨어 설정
    setup_cors(app)

    # 보안 관련 미들웨어 설정
    setup_security_middleware(app)

    # 모니터링 미들웨어 설정
    setup_monitoring_middleware(app)

    # 기타 미들웨어 설정 (커스텀 미들웨어 등)
    setup_middlewares(app)

    logger.info("모든 미들웨어 설정이 완료되었습니다")
