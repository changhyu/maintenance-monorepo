"""
API 라우터 모듈

모든 API 엔드포인트는 이 모듈에서 정의된 라우터를 통해 노출됩니다.
"""

import logging

from fastapi import APIRouter

from routers.auth import router as auth_router
from routers.base_router import BaseRouter
from routers.maintenance import router as maintenance_router
from routers.maintenance_records import \
    router as maintenance_records_router
from routers.notifications import \
    router as notifications_router
from routers.schedule import router as schedule_router
from routers.shops import router as shops_router
from routers.todos import router as todos_router
from routers.vehicles import router as vehicles_router

logger = logging.getLogger(__name__)

# 라우터 이름 매핑
auth = auth_router
vehicles = vehicles_router
maintenance = maintenance_router
maintenance_records = maintenance_records_router
shops = shops_router
todos = todos_router
schedules = schedule_router
notifications = notifications_router

# 사용 가능한 라우터 목록
routers = [
    auth_router,
    vehicles_router,
    maintenance_router,
    maintenance_records_router,
    shops_router,
    todos_router,
    schedule_router,
    notifications_router,
]

# 메인 라우터 정의
api_router = APIRouter()

# 개별 라우터 추가
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(vehicles_router, prefix="/vehicles", tags=["vehicles"])
api_router.include_router(
    maintenance_router, prefix="/maintenance", tags=["maintenance"]
)
api_router.include_router(
    maintenance_records_router,
    prefix="/maintenance-records",
    tags=["maintenance-records"],
)
api_router.include_router(shops_router, prefix="/shops", tags=["shops"])
api_router.include_router(todos_router, prefix="/todos", tags=["todos"])
api_router.include_router(schedule_router, prefix="/schedules", tags=["schedules"])
api_router.include_router(
    notifications_router, prefix="/notifications", tags=["notifications"]
)

__all__ = [
    "routers",
    "auth",
    "vehicles",
    "maintenance",
    "maintenance_records",
    "shops",
    "todos",
    "schedules",
    "notifications",
    "BaseRouter",
]
