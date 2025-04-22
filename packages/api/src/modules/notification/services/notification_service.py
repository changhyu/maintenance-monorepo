from datetime import datetime, timezone
from typing import List, Optional

from fastapi import BackgroundTasks
from pydantic import EmailStr

from packages.api.src.modules.notification.servicesemail_service import EmailService
from packages.api.src.modules.notification.servicespush_service import PushService
from packages.api.srcmodels.notification import Notification, NotificationType
from packages.api.srcrepositories.notification_repository import NotificationRepository


class NotificationService:
    def __init__(
        self,
        notification_repository: NotificationRepository,
        email_service: EmailService,
        push_service: PushService,
        background_tasks: BackgroundTasks,
    ):
        self.repository = notification_repository
        self.email_service = email_service
        self.push_service = push_service
        self.background_tasks = background_tasks

    async def create_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: NotificationType,
        email: Optional[str] = None,
        device_token: Optional[str] = None,
    ) -> Notification:
        """
        알림 생성 및 전송

        Args:
            user_id: 사용자 ID
            title: 알림 제목
            message: 알림 내용
            notification_type: 알림 유형
            email: 이메일 주소 (이메일 알림인 경우)
            device_token: 디바이스 토큰 (푸시 알림인 경우)

        Returns:
            생성된 알림 객체
        """
        # 알림 생성
        notification = await self.repository.create(
            user_id=user_id, title=title, message=message, type=notification_type
        )

        # 알림 전송 작업 예약
        if notification_type == NotificationType.EMAIL and email:
            self.background_tasks.add_task(
                self.email_service.send_email, email, title, message
            )
        elif notification_type == NotificationType.PUSH and device_token:
            self.background_tasks.add_task(
                self.push_service.send_push, device_token, title, message
            )

        return notification

    async def get_user_notifications(
        self, user_id: str, skip: int = 0, limit: int = 50
    ) -> List[Notification]:
        """사용자의 모든 알림 조회"""
        return await self.repository.get_by_user_id(user_id, skip, limit)

    async def mark_as_read(self, notification_id: str) -> Optional[Notification]:
        """알림을 읽음 상태로 표시"""
        notification = await self.repository.get_by_id(notification_id)
        if notification:
            notification.is_read = True
            notification.read_at = datetime.now(timezone.UTC)
            return await self.repository.update(notification)
        return None

    async def get_unread_notifications(
        self, user_id: str, skip: int = 0, limit: int = 50
    ) -> List[Notification]:
        """사용자의 읽지 않은 알림 조회"""
        return await self.repository.get_unread_notifications(user_id, skip, limit)

    async def get_unread_count(self, user_id: str) -> int:
        """사용자의 읽지 않은 알림 수 조회"""
        return await self.repository.count_unread(user_id)

    async def delete_notification(self, notification_id: str) -> bool:
        """알림 삭제"""
        return await self.repository.delete(notification_id)
