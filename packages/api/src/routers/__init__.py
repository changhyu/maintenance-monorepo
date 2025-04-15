"""
API 라우터 모듈

모든 API 엔드포인트는 이 모듈에서 정의된 라우터를 통해 노출됩니다.
"""

from fastapi import APIRouter
import logging

from .auth import router as auth_router
from .vehicles import router as vehicles_router
from .maintenance import router as maintenance_router
from .shops import router as shops_router
from .todos import router as todos_router
from .schedule import router as schedule_router
from .notifications import router as notifications_router
from .base_router import BaseRouter

logger = logging.getLogger(__name__)

# 사용 가능한 라우터 목록
routers = [
    auth_router,
    vehicles_router,
    maintenance_router,
    shops_router,
    todos_router,
    schedule_router,
    notifications_router
]

# 메인 라우터 정의
api_router = APIRouter()

# 개별 라우터 추가
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(vehicles_router, prefix="/vehicles", tags=["vehicles"])
api_router.include_router(maintenance_router, prefix="/maintenance", tags=["maintenance"])
api_router.include_router(shops_router, prefix="/shops", tags=["shops"])
api_router.include_router(todos_router, prefix="/todos", tags=["todos"])
api_router.include_router(schedule_router, prefix="/schedules", tags=["schedules"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])

__all__ = [
    "routers",
    "auth_router",
    "vehicles_router",
    "maintenance_router",
    "shops_router",
    "todos_router",
    "schedule_router",
    "notifications_router",
    "BaseRouter"
]