from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from src.core.base_model import BaseDBModel


class NotificationBase(BaseModel):
    title: str
    message: str
    type: str
    user_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    is_read: bool = False


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(NotificationBase):
    pass


class NotificationInDB(NotificationBase, BaseDBModel):
    created_at: datetime
    updated_at: datetime


class NotificationResponse(NotificationInDB):
    pass
