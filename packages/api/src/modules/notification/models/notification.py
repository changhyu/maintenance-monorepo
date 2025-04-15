from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId

class NotificationType(str, Enum):
    EMAIL = "email"
    PUSH = "push"
    IN_APP = "in_app"

class NotificationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    READ = "read"

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    user_id: str
    title: str
    message: str
    type: NotificationType
    priority: NotificationPriority = NotificationPriority.MEDIUM
    status: NotificationStatus = NotificationStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.UTC))
    updated_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    is_read: bool = False
    metadata: dict = Field(default_factory=dict)

    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str
        }

    def mark_as_sent(self):
        self.status = NotificationStatus.SENT
        self.sent_at = datetime.now(timezone.UTC)
        self.updated_at = datetime.now(timezone.UTC)

    def mark_as_failed(self):
        self.status = NotificationStatus.FAILED
        self.updated_at = datetime.now(timezone.UTC)

    def mark_as_read(self):
        self.status = NotificationStatus.READ
        self.is_read = True
        self.read_at = datetime.now(timezone.UTC)
        self.updated_at = datetime.now(timezone.UTC) 