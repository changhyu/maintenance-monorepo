from sqlalchemy import Column, String, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.sql import func
from datetime import datetime
import uuid

from backend.db.base import Base
from backend.core.notifications import NotificationType, NotificationPriority

class Notification(Base):
    """알림 모델"""
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    notification_type = Column(SQLEnum(NotificationType), nullable=False)
    recipients = Column(JSON, nullable=False)  # List[str]을 JSON으로 저장
    priority = Column(SQLEnum(NotificationPriority), nullable=False, default=NotificationPriority.NORMAL)
    meta_data = Column(JSON, nullable=True)  # metadata에서 meta_data로 변경
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    user_id = Column(String(36), nullable=True)  # 알림을 생성한 사용자 ID

    def to_dict(self) -> dict:
        """모델을 딕셔너리로 변환"""
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "notification_type": self.notification_type,
            "recipients": self.recipients,
            "priority": self.priority,
            "meta_data": self.meta_data,  # metadata에서 meta_data로 변경
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "delivered_at": self.delivered_at.isoformat() if self.delivered_at else None,
            "user_id": self.user_id
        }