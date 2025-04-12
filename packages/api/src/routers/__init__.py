"""
API 라우터 모듈 패키지

FastAPI 라우터를 관리합니다.
"""

from fastapi import APIRouter
import logging

from .auth import router as auth_router
from .vehicles import router as vehicles_router
from .maintenance import router as maintenance_router
from .shops import router as shops_router
from .todos import router as todos_router
from .base_router import BaseRouter

logger = logging.getLogger(__name__)

# 사용 가능한 라우터 목록
routers = [
    auth_router,
    vehicles_router,
    maintenance_router,
    shops_router,
    todos_router
]

__all__ = [
    "routers",
    "auth_router",
    "vehicles_router",
    "maintenance_router",
    "shops_router",
    "todos_router",
    "BaseRouter"
]