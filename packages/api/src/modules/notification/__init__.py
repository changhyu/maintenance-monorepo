from fastapi import APIRouter

from packages.api.src.modules.notificationnotification_router import (
    router as notification_router,
)

__all__ = ["notification_router"]

# 알림 모듈의 라우터를 등록
router = APIRouter()
router.include_router(notification_router)
