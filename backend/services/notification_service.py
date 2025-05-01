from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import logging

from backend.core.notifications import (
    NotificationType,
    NotificationPriority,
    Notification as CoreNotification
)
from backend.repositories.notification_repository import NotificationRepository
from backend.models.notification import Notification as DBNotification
from backend.core.auth import get_current_user
from backend.db.session import get_db

logger = logging.getLogger(__name__)

class NotificationService:
    """알림 서비스"""
    
    def __init__(self):
        self.db = next(get_db())
        self.repository = NotificationRepository(self.db)
    
    def create_notification(
        self,
        title: str,
        message: str,
        notification_type: NotificationType,
        recipients: List[str],
        priority: NotificationPriority = NotificationPriority.NORMAL,
        metadata: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None
    ) -> DBNotification:
        """
        새로운 알림을 생성합니다.
        
        Args:
            title: 알림 제목
            message: 알림 메시지
            notification_type: 알림 유형
            recipients: 수신자 목록
            priority: 알림 우선순위
            metadata: 추가 메타데이터
            user_id: 알림을 생성한 사용자 ID
            
        Returns:
            생성된 알림
        """
        notification = DBNotification(
            id=str(uuid.uuid4()),
            title=title,
            message=message,
            notification_type=notification_type,
            recipients=recipients,
            priority=priority,
            metadata=metadata or {},
            user_id=user_id
        )
        
        return self.repository.create(notification)
    
    def get_notifications(
        self,
        limit: int = 10,
        unread_only: bool = False,
        user_id: Optional[str] = None
    ) -> List[DBNotification]:
        """
        알림 목록을 조회합니다.
        
        Args:
            limit: 가져올 최대 알림 수
            unread_only: 읽지 않은 알림만 조회할지 여부
            user_id: 특정 사용자의 알림만 조회할 경우 사용자 ID
            
        Returns:
            알림 목록
        """
        return self.repository.get_notifications(limit, unread_only, user_id)
    
    def get_unread_count(self, user_id: Optional[str] = None) -> int:
        """
        읽지 않은 알림 수를 조회합니다.
        
        Args:
            user_id: 특정 사용자의 알림만 조회할 경우 사용자 ID
            
        Returns:
            읽지 않은 알림 수
        """
        return self.repository.get_unread_count(user_id)
    
    def mark_as_read(self, notification_id: str) -> bool:
        """
        알림을 읽음으로 표시합니다.
        
        Args:
            notification_id: 알림 ID
            
        Returns:
            성공 여부
        """
        return self.repository.mark_as_read(notification_id)
    
    def mark_as_delivered(self, notification_id: str) -> bool:
        """
        알림을 전송 완료로 표시합니다.
        
        Args:
            notification_id: 알림 ID
            
        Returns:
            성공 여부
        """
        return self.repository.mark_as_delivered(notification_id)
    
    def clear_notifications(self, user_id: Optional[str] = None) -> int:
        """
        알림을 삭제합니다.
        
        Args:
            user_id: 특정 사용자의 알림만 삭제할 경우 사용자 ID
            
        Returns:
            삭제된 알림 수
        """
        return self.repository.clear_notifications(user_id)
    
    def to_core_notification(self, db_notification: DBNotification) -> CoreNotification:
        """
        데이터베이스 알림을 코어 알림으로 변환합니다.
        
        Args:
            db_notification: 데이터베이스 알림
            
        Returns:
            코어 알림
        """
        return CoreNotification(
            id=db_notification.id,
            title=db_notification.title,
            message=db_notification.message,
            notification_type=db_notification.notification_type,
            recipients=db_notification.recipients,
            priority=db_notification.priority,
            metadata=db_notification.metadata,
            created_at=db_notification.created_at,
            read_at=db_notification.read_at,
            delivered_at=db_notification.delivered_at
        ) 