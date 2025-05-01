import logging
from enum import Enum
from typing import Dict, Any, List, Optional, Union
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
import json
from datetime import datetime
from pydantic import BaseModel
from fastapi import BackgroundTasks

from backend.core.config import settings

logger = logging.getLogger(__name__)

class NotificationType(str, Enum):
    """알림 유형"""
    IN_APP = "in_app"  # 앱 내 알림
    EMAIL = "email"    # 이메일 알림
    SMS = "sms"        # SMS 알림
    PUSH = "push"      # 푸시 알림
    SYSTEM = "system"  # 시스템 알림

class NotificationPriority(str, Enum):
    """알림 우선순위"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class Notification(BaseModel):
    """알림 모델"""
    id: str
    title: str
    message: str
    notification_type: NotificationType
    recipients: List[str]
    priority: NotificationPriority
    metadata: Dict[str, Any] = {}
    created_at: datetime
    read_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None

class NotificationManager:
    """알림 관리자"""
    _notifications: List[Notification] = []
    _notification_handlers: Dict[NotificationType, List[callable]] = {}

    @classmethod
    def register_handler(cls, notification_type: NotificationType, handler: callable):
        """알림 핸들러 등록"""
        if notification_type not in cls._notification_handlers:
            cls._notification_handlers[notification_type] = []
        cls._notification_handlers[notification_type].append(handler)

    @classmethod
    async def send_notification(cls, notification: Notification, background_tasks: Optional[BackgroundTasks] = None) -> bool:
        """알림 전송"""
        try:
            # 알림 저장
            cls._notifications.append(notification)
            
            # 알림 핸들러 호출
            handlers = cls._notification_handlers.get(notification.notification_type, [])
            
            if background_tasks:
                for handler in handlers:
                    background_tasks.add_task(handler, notification)
            else:
                await asyncio.gather(*[handler(notification) for handler in handlers])
            
            return True
        except Exception as e:
            logger.error(f"알림 전송 실패: {str(e)}")
            return False

    @classmethod
    def get_notifications(cls, limit: int = 10) -> List[Notification]:
        """알림 목록 조회"""
        return sorted(cls._notifications, key=lambda x: x.created_at, reverse=True)[:limit]

    @classmethod
    def mark_as_read(cls, notification_id: str) -> bool:
        """알림을 읽음으로 표시"""
        for notification in cls._notifications:
            if notification.id == notification_id:
                notification.read_at = datetime.now()
                return True
        return False

    @classmethod
    def clear_notifications(cls):
        """모든 알림 삭제"""
        cls._notifications = []

    @classmethod
    def get_unread_count(cls) -> int:
        """읽지 않은 알림 수 조회"""
        return len([n for n in cls._notifications if not n.read_at])

# 기본 핸들러 등록
async def handle_in_app_notification(notification: Notification):
    """앱 내 알림 처리"""
    logger.info(f"앱 내 알림 전송: {notification.title}")

async def handle_email_notification(notification: Notification):
    """이메일 알림 처리"""
    logger.info(f"이메일 알림 전송: {notification.title}")

async def handle_sms_notification(notification: Notification):
    """SMS 알림 처리"""
    logger.info(f"SMS 알림 전송: {notification.title}")

async def handle_push_notification(notification: Notification):
    """푸시 알림 처리"""
    logger.info(f"푸시 알림 전송: {notification.title}")

# 핸들러 등록
NotificationManager.register_handler(NotificationType.IN_APP, handle_in_app_notification)
NotificationManager.register_handler(NotificationType.EMAIL, handle_email_notification)
NotificationManager.register_handler(NotificationType.SMS, handle_sms_notification)
NotificationManager.register_handler(NotificationType.PUSH, handle_push_notification)

# 작업 완료 알림 함수
async def notify_task_completion(
    task_id: str,
    task_type: str,
    status: str,
    description: str,
    recipients: Optional[List[str]] = None,
    notification_type: NotificationType = NotificationType.IN_APP,
    metadata: Optional[Dict[str, Any]] = None
) -> bool:
    """
    작업 완료 알림을 전송합니다.
    
    Args:
        task_id: 작업 ID
        task_type: 작업 유형
        status: 작업 상태
        description: 작업 설명
        recipients: 알림 수신자 목록
        notification_type: 알림 유형
        metadata: 추가 메타데이터
        
    Returns:
        전송 성공 여부
    """
    # 메시지 생성
    title = f"작업 {status}: {task_type}"
    
    if status == "completed":
        message = f"작업 '{description}'이(가) 성공적으로 완료되었습니다.\n작업 ID: {task_id}"
        priority = NotificationPriority.NORMAL
    elif status == "failed":
        message = f"작업 '{description}'이(가) 실패했습니다.\n작업 ID: {task_id}"
        priority = NotificationPriority.HIGH
    elif status == "timeout":
        message = f"작업 '{description}'이(가) 시간 초과로 종료되었습니다.\n작업 ID: {task_id}"
        priority = NotificationPriority.HIGH
    else:
        message = f"작업 '{description}'의 상태가 '{status}'로 변경되었습니다.\n작업 ID: {task_id}"
        priority = NotificationPriority.LOW
    
    # 메타데이터 설정
    metadata = metadata or {}
    metadata.update({
        "task_id": task_id,
        "task_type": task_type,
        "status": status
    })
    
    # 알림 생성 및 전송
    notification = Notification(
        id=str(uuid.uuid4()),
        title=title,
        message=message,
        notification_type=notification_type,
        recipients=recipients or ["admin"],
        priority=priority,
        metadata=metadata,
        created_at=datetime.now().isoformat()
    )
    
    return await NotificationManager.send_notification(notification) 