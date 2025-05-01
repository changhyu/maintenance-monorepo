from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import uuid
from datetime import datetime

from backend.core.notifications import (
    NotificationType,
    NotificationPriority,
    Notification as CoreNotification
)
from backend.services.notification_service import NotificationService
from backend.core.auth import get_current_active_user
from backend.models.user import User

router = APIRouter(prefix="/notifications", tags=["알림"])

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    recipients: List[str]
    metadata: Dict[str, Any]
    priority: str
    created_at: str
    read_at: Optional[str] = None
    delivered_at: Optional[str] = None

class NotificationCreate(BaseModel):
    title: str
    message: str
    notification_type: NotificationType
    recipients: List[str]
    priority: NotificationPriority = NotificationPriority.NORMAL
    metadata: Dict[str, Any] = {}

@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    limit: int = Query(10, description="가져올 최대 알림 수"),
    unread_only: bool = Query(False, description="읽지 않은 알림만 조회"),
    current_user: User = Depends(get_current_active_user)
):
    """
    알림 목록을 조회합니다.
    """
    service = NotificationService()
    notifications = service.get_notifications(limit, unread_only, current_user.id)
    return [notification.to_dict() for notification in notifications]

@router.get("/unread/count", response_model=int)
async def get_unread_count(current_user: User = Depends(get_current_active_user)):
    """
    읽지 않은 알림 수를 조회합니다.
    """
    service = NotificationService()
    return service.get_unread_count(current_user.id)

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification: NotificationCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user)
):
    """
    새로운 알림을 생성합니다.
    """
    service = NotificationService()
    
    # 알림 생성
    db_notification = service.create_notification(
        title=notification.title,
        message=notification.message,
        notification_type=notification.notification_type,
        recipients=notification.recipients,
        priority=notification.priority,
        metadata=notification.metadata,
        user_id=current_user.id
    )
    
    # 코어 알림으로 변환
    core_notification = service.to_core_notification(db_notification)
    
    # 알림 전송
    success = await NotificationManager.send_notification(core_notification, background_tasks)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="알림 전송에 실패했습니다."
        )
    
    return {"message": "알림이 전송되었습니다.", "notification_id": db_notification.id}

@router.post("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_notification_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    알림을 읽음으로 표시합니다.
    """
    service = NotificationService()
    success = service.mark_as_read(notification_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="알림을 찾을 수 없습니다."
        )
    
    return {"message": "알림이 읽음으로 표시되었습니다."}

@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_notifications(current_user: User = Depends(get_current_active_user)):
    """
    모든 알림을 삭제합니다.
    """
    service = NotificationService()
    service.clear_notifications(current_user.id)
    return {} 