"""
FastAPI 라우팅 구성 모듈
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

# 내부 모듈 import
from packages.api.srccore.config import settings
from packages.api.srccore.dependencies import get_current_user
from packages.api.srccore.logging_setup import setup_logging
from packages.api.srccore.router_loader import load_routers
from packages.api.srccore.websocket_manager import WebSocketManager
from packages.api.srcmodules.notification import router as notification_router
# 라우터 import
from packages.api.srcrouters import (auth, maintenance_records, notifications,
                                     schedules, shops, vehicles, admin)
# 법정검사 라우터 import - 경로 수정
from src.routes.vehicle_inspections import router as vehicle_inspection_router

# 로깅 설정
logger = setup_logging()


def configure_routes(app: FastAPI) -> None:
    """
    모든 라우터 설정을 적용
    """
    # 동적으로 라우터 로드
    routers = load_routers()
    for router in routers:
        app.include_router(router)

    # 알림 모듈 라우터 등록
    app.include_router(notification_router)

    # 메트릭 엔드포인트 추가 (선택적)
    _setup_metrics_router(app)

    # 명시적 라우터 등록
    _register_explicit_routers(app)

    # 헬스 체크 및 기타 기본 엔드포인트 설정
    _setup_health_endpoints(app)

    # WebSocket 설정
    _setup_websocket_endpoints(app)

    logger.info("모든 라우터 설정이 완료되었습니다")


def _setup_metrics_router(app: FastAPI) -> None:
    """메트릭 라우터 설정"""
    try:
        from packages.api.srccore import test_metrics

        app.include_router(test_metrics.router)
        logger.debug("메트릭 라우터가 등록되었습니다")
    except ImportError:
        logger.warning("메트릭 라우터를 로드할 수 없습니다")


def _register_explicit_routers(app: FastAPI) -> None:
    """명시적으로 정의된 주요 라우터 등록"""
    app.include_router(auth, prefix="/api/auth", tags=["인증"])
    app.include_router(vehicles, prefix="/api/vehicles", tags=["차량"])
    app.include_router(maintenance_records, prefix="/api/maintenance", tags=["정비"])
    app.include_router(schedules, prefix="/api/schedules", tags=["일정"])
    app.include_router(shops, prefix="/api/shops", tags=["정비소"])
    app.include_router(notifications, prefix="/api/notifications", tags=["알림"])
    app.include_router(admin, prefix="/api/admin", tags=["관리자"])
    # 법정검사 라우터 등록
    app.include_router(vehicle_inspection_router, prefix="/api/vehicle-inspections", tags=["법정검사"])

    logger.debug("명시적 라우터가 등록되었습니다")


def _setup_health_endpoints(app: FastAPI) -> None:
    """헬스 체크 및 상태 확인 엔드포인트 설정"""

    @app.get("/", response_model=Dict[str, Any], tags=["상태"])
    @app.get("/health", response_model=Dict[str, Any], tags=["상태"])
    async def health_check() -> Dict[str, Any]:
        """서비스 상태 확인 엔드포인트"""
        return {
            "status": "active",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "domain": os.getenv("API_DOMAIN", "localhost"),
        }

    @app.get("/domain-status", response_model=Dict[str, Any], tags=["상태"])
    async def domain_status() -> Dict[str, Any]:
        """현재 도메인 정보와 CORS 설정 확인 엔드포인트"""
        return {
            "api_domain": os.getenv("API_DOMAIN", "localhost"),
            "cors_origins": (
                settings.CORS_ORIGINS
                if hasattr(settings, "CORS_ORIGINS")
                else settings.BACKEND_CORS_ORIGINS
            ),
            "environment": settings.ENVIRONMENT,
            "ssl_enabled": (
                settings.SSL_REDIRECT if hasattr(settings, "SSL_REDIRECT") else False
            ),
        }

    logger.debug("헬스 체크 엔드포인트가 설정되었습니다")


def _setup_websocket_endpoints(app: FastAPI) -> None:
    """WebSocket 엔드포인트 설정"""
    websocket_manager = WebSocketManager()

    @app.websocket("/ws/{client_id}")
    async def websocket_endpoint(websocket: WebSocket, client_id: str):
        await websocket_manager.connect(websocket, client_id)
        try:
            while True:
                data = await websocket.receive_text()
                await websocket_manager.process_message(client_id, data)
        except WebSocketDisconnect:
            websocket_manager.disconnect(client_id)

    logger.debug("WebSocket 엔드포인트가 설정되었습니다")
