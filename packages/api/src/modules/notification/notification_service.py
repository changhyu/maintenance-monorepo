"""
알림 서비스 모듈

이 모듈은 알림 관련 비즈니스 로직을 처리합니다.
"""

import asyncio
import logging
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from enum import Enum, IntEnum
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

from fastapi import Depends
from jinja2 import Template
from packages.api.user.user_model import User
from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session
from core.config import Settings
from core.database import AsyncSession, Base, get_db
from core.metrics import metrics_collector
from core.security import SecurityService
from modules.notification.models import NotificationCreate
from modules.notification.models import NotificationInDB as Notification
from modules.notification.models import (NotificationResponse,
                                       NotificationUpdate)
from modules.notification.notification_repository import \
    NotificationRepository


class NotificationType(str, Enum):
    """알림 타입 열거형"""

    SYSTEM = "system"
    USER = "user"
    ALERT = "alert"
    INFO = "info"


class NotificationPriority(IntEnum):
    """알림 우선순위 열거형"""

    LOW = 0
    NORMAL = 1
    HIGH = 2
    URGENT = 3


class NotificationCategory(str, Enum):
    """알림 카테고리 열거형"""

    ACCOUNT = "account"
    SECURITY = "security"
    SYSTEM = "system"
    MARKETING = "marketing"
    NEWS = "news"


class NotificationGroup:
    """알림 그룹 클래스"""

    def __init__(
        self, category: NotificationCategory, notifications: List[Notification]
    ):
        self.category = category
        self.notifications = notifications
        self.count = len(notifications)
        self.latest = max(notifications, key=lambda n: n.created_at)
        self.unread_count = len([n for n in notifications if not n.is_read])


class NotificationSubscription:
    """알림 구독 클래스"""

    def __init__(
        self,
        user_id: int,
        categories: Set[NotificationCategory],
        preferences: Dict[str, Any],
    ):
        self.user_id = user_id
        self.categories = categories
        self.preferences = preferences
        self.created_at = datetime.now(timezone.UTC)
        self.updated_at = self.created_at


class NotificationTemplateVersion:
    """알림 템플릿 버전 클래스"""

    def __init__(
        self,
        template_id: str,
        version: str,
        content: str,
        created_at: datetime,
        created_by: Optional[str] = None,
        description: Optional[str] = None,
    ):
        self.template_id = template_id
        self.version = version
        self.content = content
        self.created_at = created_at
        self.created_by = created_by
        self.description = description
        self.template = Template(content)

    def render(self, **kwargs) -> str:
        """템플릿 렌더링"""
        return self.template.render(**kwargs)


class NotificationTemplate:
    """알림 템플릿 클래스"""

    def __init__(self, template_id: str, content: str):
        self.template_id = template_id
        self.versions: Dict[str, NotificationTemplateVersion] = {}
        self.add_version("1.0", content)

    def add_version(
        self,
        version: str,
        content: str,
        created_by: Optional[str] = None,
        description: Optional[str] = None,
    ) -> NotificationTemplateVersion:
        """
        새로운 버전 추가

        Args:
            version: 버전
            content: 템플릿 내용
            created_by: 생성자
            description: 설명

        Returns:
            생성된 템플릿 버전
        """
        template_version = NotificationTemplateVersion(
            self.template_id,
            version,
            content,
            datetime.now(timezone.utc),
            created_by,
            description,
        )
        self.versions[version] = template_version
        return template_version

    def get_version(self, version: Optional[str] = None) -> NotificationTemplateVersion:
        """
        특정 버전 조회

        Args:
            version: 버전 (None이면 최신 버전)

        Returns:
            템플릿 버전
        """
        if not version:
            return max(self.versions.values(), key=lambda v: v.created_at)

        if version not in self.versions:
            raise ValueError(f"존재하지 않는 버전: {version}")

        return self.versions[version]

    def render(self, version: Optional[str] = None, **kwargs) -> str:
        """
        템플릿 렌더링

        Args:
            version: 버전 (None이면 최신 버전)
            **kwargs: 템플릿 변수

        Returns:
            렌더링된 내용
        """
        return self.get_version(version).render(**kwargs)


class ScheduledNotification:
    """예약된 알림 클래스"""

    def __init__(
        self,
        notification: NotificationCreate,
        user_id: int,
        scheduled_at: datetime,
        repeat_interval: Optional[timedelta] = None,
        max_repeats: Optional[int] = None,
    ):
        self.notification = notification
        self.user_id = user_id
        self.scheduled_at = scheduled_at
        self.repeat_interval = repeat_interval
        self.max_repeats = max_repeats
        self.repeat_count = 0
        self.is_cancelled = False
        self.last_run_at: Optional[datetime] = None

    @property
    def next_run_time(self) -> Optional[datetime]:
        """다음 실행 시간"""
        if self.is_cancelled:
            return None

        if not self.last_run_at:
            return self.scheduled_at

        if not self.repeat_interval:
            return None

        if self.max_repeats and self.repeat_count >= self.max_repeats:
            return None

        return self.last_run_at + self.repeat_interval


class NotificationService:
    """알림 서비스 클래스"""

    # 기본 알림 템플릿
    DEFAULT_TEMPLATES = {
        "welcome": NotificationTemplate(
            "welcome", "안녕하세요 {{ user_name }}님, 환영합니다!"
        ),
        "password_reset": NotificationTemplate(
            "password_reset",
            "비밀번호 재설정이 요청되었습니다. 다음 링크를 클릭하여 진행해주세요: {{ reset_link }}",
        ),
        "system_alert": NotificationTemplate(
            "system_alert", "시스템 알림: {{ message }}"
        ),
    }

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = NotificationRepository(db)
        self.batch_size = 100
        self.templates = self.DEFAULT_TEMPLATES.copy()
        self.subscriptions: Dict[int, NotificationSubscription] = {}
        self.scheduled_notifications: List[ScheduledNotification] = []
        self._scheduler_task: Optional[asyncio.Task] = None

    async def start_scheduler(self):
        """알림 스케줄러 시작"""
        if self._scheduler_task is None:
            self._scheduler_task = asyncio.create_task(self._run_scheduler())

    async def stop_scheduler(self):
        """알림 스케줄러 중지"""
        if self._scheduler_task:
            self._scheduler_task.cancel()
            with suppress(asyncio.CancelledError):
                await self._scheduler_task
            self._scheduler_task = None

    async def _run_scheduler(self):
        """알림 스케줄러 실행"""
        while True:
            now = datetime.now(timezone.UTC)

            # 실행할 알림 찾기
            to_run = [
                notification
                for notification in self.scheduled_notifications
                if notification.next_run_time and notification.next_run_time <= now
            ]

            for notification in to_run:
                try:
                    # 알림 전송
                    await self.create_notification(
                        notification.notification, notification.user_id
                    )

                    # 상태 업데이트
                    notification.last_run_at = now
                    notification.repeat_count += 1

                except Exception as e:
                    self.logger.error(
                        f"예약된 알림 전송 실패: {str(e)}",
                        extra={"notification": notification.__dict__},
                    )

            # 완료된 알림 제거
            self.scheduled_notifications = [
                notification
                for notification in self.scheduled_notifications
                if notification.next_run_time is not None
            ]

            await asyncio.sleep(60)  # 1분마다 체크

    async def schedule_notification(
        self,
        notification: NotificationCreate,
        user_id: int,
        scheduled_at: datetime,
        repeat_interval: Optional[timedelta] = None,
        max_repeats: Optional[int] = None,
    ) -> ScheduledNotification:
        """
        알림 예약

        Args:
            notification: 알림 데이터
            user_id: 사용자 ID
            scheduled_at: 예약 시간
            repeat_interval: 반복 간격
            max_repeats: 최대 반복 횟수

        Returns:
            예약된 알림
        """
        scheduled = ScheduledNotification(
            notification, user_id, scheduled_at, repeat_interval, max_repeats
        )
        self.scheduled_notifications.append(scheduled)
        return scheduled

    async def cancel_scheduled_notification(
        self, notification: ScheduledNotification
    ) -> bool:
        """
        예약된 알림 취소

        Args:
            notification: 예약된 알림

        Returns:
            취소 성공 여부
        """
        if notification not in self.scheduled_notifications:
            return False

        notification.is_cancelled = True
        self.scheduled_notifications.remove(notification)
        return True

    def register_template(self, template_id: str, content: str) -> None:
        """
        새로운 알림 템플릿 등록

        Args:
            template_id: 템플릿 ID
            content: 템플릿 내용
        """
        self.templates[template_id] = NotificationTemplate(template_id, content)

    async def create_notification_from_template(
        self,
        template_id: str,
        user_id: int,
        template_data: Dict[str, Any],
        notification_type: NotificationType = NotificationType.INFO,
        priority: NotificationPriority = NotificationPriority.NORMAL,
    ) -> Notification:
        """
        템플릿을 사용하여 알림 생성

        Args:
            template_id: 템플릿 ID
            user_id: 사용자 ID
            template_data: 템플릿 데이터
            notification_type: 알림 타입
            priority: 알림 우선순위

        Returns:
            생성된 알림 객체
        """
        if template_id not in self.templates:
            raise ValueError(f"템플릿을 찾을 수 없음: {template_id}")

        content = self.templates[template_id].render(**template_data)

        notification = NotificationCreate(
            content=content, notification_type=notification_type, priority=priority
        )

        return await self.create_notification(notification, user_id)

    async def subscribe(
        self,
        user_id: int,
        categories: Set[NotificationCategory],
        preferences: Optional[Dict[str, Any]] = None,
    ) -> NotificationSubscription:
        """
        알림 구독 등록

        Args:
            user_id: 사용자 ID
            categories: 구독할 카테고리 목록
            preferences: 구독 설정

        Returns:
            알림 구독 객체
        """
        subscription = NotificationSubscription(
            user_id=user_id, categories=categories, preferences=preferences or {}
        )
        self.subscriptions[user_id] = subscription
        return subscription

    async def unsubscribe(
        self, user_id: int, categories: Optional[Set[NotificationCategory]] = None
    ) -> bool:
        """
        알림 구독 해제

        Args:
            user_id: 사용자 ID
            categories: 구독 해제할 카테고리 목록 (None이면 전체 해제)

        Returns:
            구독 해제 성공 여부
        """
        if user_id not in self.subscriptions:
            return False

        if categories is None:
            del self.subscriptions[user_id]
            return True

        subscription = self.subscriptions[user_id]
        subscription.categories -= categories
        subscription.updated_at = datetime.now(timezone.UTC)

        if not subscription.categories:
            del self.subscriptions[user_id]

        return True

    async def get_notification_groups(
        self, user_id: int, skip: int = 0, limit: int = 100, include_read: bool = False
    ) -> List[NotificationGroup]:
        """
        사용자의 알림 그룹 목록 조회

        Args:
            user_id: 사용자 ID
            skip: 건너뛸 그룹 수
            limit: 조회할 최대 그룹 수
            include_read: 읽은 알림 포함 여부

        Returns:
            알림 그룹 목록
        """
        conditions = [Notification.user_id == user_id]

        if not include_read:
            conditions.append(Notification.is_read is False)

        query = (
            select(Notification)
            .where(and_(*conditions))
            .order_by(
                Notification.category,
                Notification.priority.desc(),
                Notification.created_at.desc(),
            )
            .offset(skip)
            .limit(min(limit, self.batch_size))
        )

        result = await self.db.execute(query)
        notifications = list(result.scalars().all())

        # 카테고리별로 그룹화
        groups: Dict[NotificationCategory, List[Notification]] = {}
        for notification in notifications:
            category = notification.category
            if category not in groups:
                groups[category] = []
            groups[category].append(notification)

        return [
            NotificationGroup(category, notifications)
            for category, notifications in groups.items()
        ]

    async def create_notification(
        self, notification: NotificationCreate, user_id: int
    ) -> Optional[Notification]:
        """
        새로운 알림 생성 (구독 확인)

        Args:
            notification: 생성할 알림 데이터
            user_id: 알림을 받을 사용자 ID

        Returns:
            생성된 알림 객체 또는 None (구독하지 않은 경우)
        """
        # 구독 확인
        subscription = self.subscriptions.get(user_id)
        if subscription and notification.category not in subscription.categories:
            return None

        db_notification = Notification(
            **notification.model_dump(),
            user_id=user_id,
            created_at=datetime.now(timezone.UTC),
            notification_type=notification.notification_type or NotificationType.INFO,
            priority=notification.priority or NotificationPriority.NORMAL,
            category=notification.category,
        )
        self.db.add(db_notification)
        await self.db.commit()
        await self.db.refresh(db_notification)
        return db_notification

    async def create_notifications_batch(
        self, notifications: List[NotificationCreate], user_ids: List[int]
    ) -> List[Notification]:
        """
        여러 알림을 배치로 생성

        Args:
            notifications: 생성할 알림 데이터 목록
            user_ids: 알림을 받을 사용자 ID 목록

        Returns:
            생성된 알림 객체 목록
        """
        now = datetime.now(timezone.UTC)
        db_notifications = []

        for notification in notifications:
            for user_id in user_ids:
                db_notification = Notification(
                    **notification.model_dump(),
                    user_id=user_id,
                    created_at=now,
                    notification_type=notification.notification_type
                    or NotificationType.INFO,
                )
                db_notifications.append(db_notification)

        self.db.add_all(db_notifications)
        await self.db.commit()

        for notification in db_notifications:
            await self.db.refresh(notification)

        return db_notifications

    async def get_notifications(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        notification_type: Optional[NotificationType] = None,
        priority: Optional[NotificationPriority] = None,
        include_read: bool = False,
    ) -> List[Notification]:
        """
        사용자의 알림 목록 조회

        Args:
            user_id: 사용자 ID
            skip: 건너뛸 알림 수
            limit: 조회할 최대 알림 수
            notification_type: 알림 타입 필터
            priority: 알림 우선순위 필터
            include_read: 읽은 알림 포함 여부

        Returns:
            알림 목록
        """
        conditions = [Notification.user_id == user_id]

        if notification_type:
            conditions.append(Notification.notification_type == notification_type)

        if priority:
            conditions.append(Notification.priority == priority)

        if not include_read:
            conditions.append(Notification.is_read is False)

        query = (
            select(Notification)
            .where(and_(*conditions))
            .order_by(Notification.priority.desc(), Notification.created_at.desc())
            .offset(skip)
            .limit(min(limit, self.batch_size))
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_unread_count(self, user_id: int) -> int:
        """
        읽지 않은 알림 수 조회

        Args:
            user_id: 사용자 ID

        Returns:
            읽지 않은 알림 수
        """
        query = select(func.count()).where(
            and_(Notification.user_id == user_id, Notification.is_read is False)
        )
        result = await self.db.execute(query)
        return result.scalar_one()

    async def mark_notifications_as_read(
        self, notification_ids: List[int], user_id: int
    ) -> List[Notification]:
        """
        여러 알림을 읽음 상태로 표시

        Args:
            notification_ids: 알림 ID 목록
            user_id: 사용자 ID

        Returns:
            업데이트된 알림 객체 목록
        """
        now = datetime.now(timezone.UTC)
        query = select(Notification).where(
            and_(
                Notification.id.in_(notification_ids),
                Notification.user_id == user_id,
                Notification.is_read is False,
            )
        )
        result = await self.db.execute(query)
        notifications = list(result.scalars().all())

        for notification in notifications:
            notification.is_read = True
            notification.read_at = now

        await self.db.commit()

        for notification in notifications:
            await self.db.refresh(notification)

        return notifications

    async def delete_notifications(
        self, notification_ids: List[int], user_id: int
    ) -> int:
        """
        여러 알림 삭제

        Args:
            notification_ids: 알림 ID 목록
            user_id: 사용자 ID

        Returns:
            삭제된 알림 수
        """
        query = select(Notification).where(
            and_(Notification.id.in_(notification_ids), Notification.user_id == user_id)
        )
        result = await self.db.execute(query)
        notifications = list(result.scalars().all())

        for notification in notifications:
            await self.db.delete(notification)

        await self.db.commit()
        return len(notifications)

    async def get_user_notifications(
        self, user_id: str, skip: int = 0, limit: int = 100, include_read: bool = False
    ) -> List[NotificationResponse]:
        """
        사용자의 알림 목록 조회

        Args:
            user_id: 사용자 ID
            skip: 건너뛸 항목 수
            limit: 최대 항목 수
            include_read: 읽은 알림 포함 여부

        Returns:
            알림 목록
        """
        notifications = await self.repository.get_by_user_id(
            user_id=user_id, skip=skip, limit=limit, include_read=include_read
        )

        # 메트릭 수집
        metrics_collector.track_notification_read(user_id)

        return [
            NotificationResponse.from_orm(notification)
            for notification in notifications
        ]

    async def get_unread_count(self, user_id: str) -> int:
        """
        읽지 않은 알림 수 조회

        Args:
            user_id: 사용자 ID

        Returns:
            읽지 않은 알림 수
        """
        return await self.repository.get_unread_count(user_id)

    async def create_notification(
        self, notification: NotificationCreate, user_id: str
    ) -> NotificationResponse:
        """
        새로운 알림 생성

        Args:
            notification: 생성할 알림 데이터
            user_id: 사용자 ID

        Returns:
            생성된 알림
        """
        db_notification = await self.repository.create_notification(
            notification=notification, user_id=user_id
        )

        # 메트릭 수집
        metrics_collector.track_notification_created(user_id)

        return NotificationResponse.from_orm(db_notification)

    async def mark_notifications_as_read(
        self, notification_ids: List[str], user_id: str
    ) -> List[NotificationResponse]:
        """
        알림을 읽음 상태로 표시

        Args:
            notification_ids: 알림 ID 목록
            user_id: 사용자 ID

        Returns:
            업데이트된 알림 목록
        """
        notifications = await self.repository.mark_as_read(
            notification_ids=notification_ids, user_id=user_id
        )

        # 메트릭 수집
        metrics_collector.track_notification_read(user_id, len(notifications))

        return [
            NotificationResponse.from_orm(notification)
            for notification in notifications
        ]

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
        deleted_count = await self.repository.delete_notifications(
            notification_ids=notification_ids, user_id=user_id
        )

        # 메트릭 수집
        metrics_collector.track_notification_deleted(user_id, deleted_count)

        return deleted_count
