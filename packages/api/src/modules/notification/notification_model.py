"""
알림 모델 모듈
"""

from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship
from src.core.database import Base

from packages.api.src.modules.notificationnotification_service import (
    NotificationCategory,
    NotificationPriority,
    NotificationType,
)


class Notification(Base):
    """알림 모델"""

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=False)
    notification_type = Column(
        Enum(NotificationType), nullable=False, default=NotificationType.INFO
    )
    priority = Column(Integer, nullable=False, default=NotificationPriority.NORMAL)
    category = Column(
        Enum(NotificationCategory), nullable=False, default=NotificationCategory.SYSTEM
    )
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    read_at = Column(DateTime(timezone=True), nullable=True)
    metadata = Column(JSON, nullable=True)

    # 관계 설정
    user = relationship("User", back_populates="notifications")
