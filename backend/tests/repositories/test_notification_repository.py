import pytest
from datetime import datetime
from typing import List, Dict, Any

from backend.repositories.notification_repository import NotificationRepository
from backend.core.notifications import NotificationType, NotificationPriority
from backend.models.notification import Notification
from backend.db.session import get_db

@pytest.fixture
def notification_repository():
    """알림 리포지토리 생성"""
    return NotificationRepository(next(get_db()))

@pytest.fixture
def test_notification():
    """테스트용 알림 생성"""
    return Notification(
        id="test-notification-id",
        title="Test Notification",
        message="This is a test notification",
        notification_type=NotificationType.IN_APP,
        recipients=["test@example.com"],
        priority=NotificationPriority.NORMAL,
        metadata={},
        created_at=datetime.now(),
        user_id="test-user-id"
    )

def test_create_notification(notification_repository, test_notification):
    """알림 생성 테스트"""
    notification = notification_repository.create(test_notification)
    assert notification.id == test_notification.id
    assert notification.title == test_notification.title
    assert notification.message == test_notification.message
    assert notification.notification_type == test_notification.notification_type
    assert notification.recipients == test_notification.recipients
    assert notification.priority == test_notification.priority
    assert notification.user_id == test_notification.user_id

def test_get_notifications(notification_repository, test_notification):
    """알림 목록 조회 테스트"""
    notifications = notification_repository.get_notifications()
    assert isinstance(notifications, list)

def test_get_unread_count(notification_repository, test_notification):
    """읽지 않은 알림 수 조회 테스트"""
    count = notification_repository.get_unread_count()
    assert isinstance(count, int)

def test_mark_as_read(notification_repository, test_notification):
    """알림 읽음 표시 테스트"""
    success = notification_repository.mark_as_read(test_notification.id)
    assert success is True

def test_mark_as_delivered(notification_repository, test_notification):
    """알림 전송 완료 표시 테스트"""
    success = notification_repository.mark_as_delivered(test_notification.id)
    assert success is True

def test_clear_notifications(notification_repository, test_notification):
    """알림 삭제 테스트"""
    deleted_count = notification_repository.clear_notifications()
    assert isinstance(deleted_count, int)

def test_get_by_id(notification_repository, test_notification):
    """ID로 알림 조회 테스트"""
    notification = notification_repository.get_by_id(test_notification.id)
    assert notification is not None
    assert notification.id == test_notification.id

def test_update_notification(notification_repository, test_notification):
    """알림 업데이트 테스트"""
    test_notification.title = "Updated Title"
    updated_notification = notification_repository.update(test_notification)
    assert updated_notification.title == "Updated Title"

def test_delete_notification(notification_repository, test_notification):
    """알림 삭제 테스트"""
    success = notification_repository.delete(test_notification.id)
    assert success is True 