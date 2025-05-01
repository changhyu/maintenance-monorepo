from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime

from backend.models.notification import Notification
from backend.core.notifications import NotificationType, NotificationPriority
from backend.db.base_class import BaseRepository

class NotificationRepository(BaseRepository[Notification]):
    """알림 데이터 액세스를 담당하는 리포지토리 클래스"""
    
    def __init__(self, db: Session):
        super().__init__(db, Notification)

    def get_notifications(
        self,
        limit: int = 10,
        unread_only: bool = False,
        user_id: Optional[str] = None
    ) -> List[Notification]:
        """
        알림 목록을 조회합니다.
        
        Args:
            limit: 가져올 최대 알림 수
            unread_only: 읽지 않은 알림만 조회할지 여부
            user_id: 특정 사용자의 알림만 조회할 경우 사용자 ID
            
        Returns:
            알림 목록
        """
        query = self.db.query(Notification)
        
        if unread_only:
            query = query.filter(Notification.read_at.is_(None))
            
        if user_id:
            query = query.filter(Notification.user_id == user_id)
            
        return query.order_by(desc(Notification.created_at)).limit(limit).all()

    def get_unread_count(self, user_id: Optional[str] = None) -> int:
        """
        읽지 않은 알림 수를 조회합니다.
        
        Args:
            user_id: 특정 사용자의 알림만 조회할 경우 사용자 ID
            
        Returns:
            읽지 않은 알림 수
        """
        query = self.db.query(Notification).filter(Notification.read_at.is_(None))
        
        if user_id:
            query = query.filter(Notification.user_id == user_id)
            
        return query.count()

    def mark_as_read(self, notification_id: str) -> bool:
        """
        알림을 읽음으로 표시합니다.
        
        Args:
            notification_id: 알림 ID
            
        Returns:
            성공 여부
        """
        notification = self.get_by_id(notification_id)
        if not notification:
            return False
            
        notification.read_at = datetime.now()
        self.db.commit()
        return True

    def mark_as_delivered(self, notification_id: str) -> bool:
        """
        알림을 전송 완료로 표시합니다.
        
        Args:
            notification_id: 알림 ID
            
        Returns:
            성공 여부
        """
        notification = self.get_by_id(notification_id)
        if not notification:
            return False
            
        notification.delivered_at = datetime.now()
        self.db.commit()
        return True

    def clear_notifications(self, user_id: Optional[str] = None) -> int:
        """
        알림을 삭제합니다.
        
        Args:
            user_id: 특정 사용자의 알림만 삭제할 경우 사용자 ID
            
        Returns:
            삭제된 알림 수
        """
        query = self.db.query(Notification)
        
        if user_id:
            query = query.filter(Notification.user_id == user_id)
            
        deleted_count = query.delete()
        self.db.commit()
        return deleted_count 