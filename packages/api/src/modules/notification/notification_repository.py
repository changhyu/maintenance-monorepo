from datetime import datetime, timezone
from typing import List

# Using three dots relative import like in todo_repository.py
from packagescore.base_repository import BaseRepository
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

# Using relative imports for the notification models
from packages.api.src.modules.notificationmodels import (
    NotificationBase,
    NotificationCreate,
    NotificationInDB,
)


class NotificationRepository(BaseRepository[NotificationInDB, NotificationBase]):
    """알림 리포지토리 클래스"""

    def __init__(self, db_session: Session):
        """
        알림 리포지토리 초기화

        Args:
            db_session: 데이터베이스 세션
        """
        super().__init__(db_session, NotificationInDB)

    async def get_by_user_id(
        self, user_id: str, skip: int = 0, limit: int = 100, include_read: bool = False
    ) -> List[NotificationInDB]:
        """
        사용자 ID로 알림 목록 조회

        Args:
            user_id: 사용자 ID
            skip: 건너뛸 항목 수
            limit: 최대 항목 수
            include_read: 읽은 알림 포함 여부

        Returns:
            알림 목록
        """
        filters = {"user_id": user_id}
        if not include_read:
            filters["is_read"] = False

        return await self.find_all(
            skip=skip,
            limit=limit,
            filters=filters,
        )

    async def get_unread_count(self, user_id: str) -> int:
        """
        읽지 않은 알림 수 조회

        Args:
            user_id: 사용자 ID

        Returns:
            읽지 않은 알림 수
        """
        conditions = [
            NotificationInDB.user_id == user_id,
            NotificationInDB.is_read == False,
        ]

        query = select(NotificationInDB).where(and_(*conditions))
        result = await self.db.execute(query)
        return len(result.scalars().all())

    async def mark_as_read(
        self, notification_ids: List[str], user_id: str
    ) -> List[NotificationInDB]:
        """
        알림을 읽음 상태로 표시

        Args:
            notification_ids: 알림 ID 목록
            user_id: 사용자 ID

        Returns:
            업데이트된 알림 목록
        """
        conditions = [
            NotificationInDB.id.in_(notification_ids),
            NotificationInDB.user_id == user_id,
        ]

        query = select(NotificationInDB).where(and_(*conditions))
        result = await self.db.execute(query)
        notifications = result.scalars().all()

        for notification in notifications:
            notification.is_read = True
            notification.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        return list(notifications)

    async def create_notification(
        self, notification: NotificationCreate, user_id: str
    ) -> NotificationInDB:
        """
        새로운 알림 생성

        Args:
            notification: 생성할 알림 데이터
            user_id: 사용자 ID

        Returns:
            생성된 알림
        """
        now = datetime.now(timezone.utc)
        db_notification = NotificationInDB(
            **notification.model_dump(), user_id=user_id, created_at=now, updated_at=now
        )

        return await self.create(db_notification)

    async def delete_notifications(
        self, notification_ids: List[str], user_id: str
    ) -> int:
        """
        알림 삭제

        Args:
            notification_ids: 알림 ID 목록
            user_id: 사용자 ID

        Returns:
            삭제된 알림 수
        """
        conditions = [
            NotificationInDB.id.in_(notification_ids),
            NotificationInDB.user_id == user_id,
        ]

        query = select(NotificationInDB).where(and_(*conditions))
        result = await self.db.execute(query)
        notifications = result.scalars().all()

        for notification in notifications:
            await self.delete(notification)

        return len(notifications)
