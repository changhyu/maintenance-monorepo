"""
FastAPI 라우팅 구성 모듈
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

# 로깅 설정 함수 정의
def setup_logging():
    import logging
    logger = logging.getLogger("api")
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
        logger.addHandler(handler)
    return logger

# 로깅 설정
logger = setup_logging()

# 기본 라우터 생성
auth = APIRouter()
maintenance_records = APIRouter()
notifications = APIRouter() 
schedules = APIRouter()
shops = APIRouter()
vehicles = APIRouter()
admin = APIRouter()
vehicle_inspection_router = APIRouter()

def configure_routes(app: FastAPI) -> None:
    """
    모든 라우터 설정을 적용
    """
    try:
        # 명시적 라우터 등록
        _register_explicit_routers(app)

        # 헬스 체크 및 기타 기본 엔드포인트 설정
        _setup_health_endpoints(app)

        logger.info("모든 라우터 설정이 완료되었습니다")
    except Exception as e:
        logger.error(f"라우터 설정 중 오류 발생: {e}")


def _register_explicit_routers(app: FastAPI) -> None:
    """명시적으로 정의된 주요 라우터 등록"""
    try:
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
    except Exception as e:
        logger.error(f"라우터 등록 중 오류 발생: {e}")


def _setup_health_endpoints(app: FastAPI) -> None:
    """헬스 체크 및 상태 확인 엔드포인트 설정"""

    @app.get("/", response_model=Dict[str, Any], tags=["상태"])
    @app.get("/health", response_model=Dict[str, Any], tags=["상태"])
    async def health_check() -> Dict[str, Any]:
        """서비스 상태 확인 엔드포인트"""
        return {
            "status": "active",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": "1.0.0",
            "environment": "development"
        }

    logger.debug("헬스 체크 엔드포인트가 설정되었습니다")
