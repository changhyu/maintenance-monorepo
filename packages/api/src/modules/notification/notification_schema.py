"""
알림 스키마 모듈
"""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel

from packages.api.src.modules.notificationnotification_service import (
    NotificationCategory,
    NotificationPriority,
    NotificationType,
)


class NotificationBase(BaseModel):
    """알림 기본 스키마"""

    content: str
    notification_type: Optional[NotificationType] = NotificationType.INFO
    priority: Optional[NotificationPriority] = NotificationPriority.NORMAL
    category: Optional[NotificationCategory] = NotificationCategory.SYSTEM
    metadata: Optional[Dict[str, Any]] = None


class NotificationCreate(NotificationBase):
    """알림 생성 스키마"""

    pass


class NotificationUpdate(NotificationBase):
    """알림 수정 스키마"""

    is_read: Optional[bool] = None
    read_at: Optional[datetime] = None
