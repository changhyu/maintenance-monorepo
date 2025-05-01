import pytest
from datetime import datetime
from typing import List, Dict, Any

from backend.services.notification_service import NotificationService
from backend.core.notifications import NotificationType, NotificationPriority
from backend.models.notification import Notification
from backend.db.session import get_db

@pytest.fixture
def notification_service():
    """알림 서비스 생성"""
    return NotificationService()

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

def test_create_notification(notification_service):
    """알림 생성 테스트"""
    notification = notification_service.create_notification(
        title="New Notification",
        message="This is a new notification",
        notification_type=NotificationType.IN_APP,
        recipients=["test@example.com"],
        priority=NotificationPriority.NORMAL,
        metadata={},
        user_id="test-user-id"
    )
    
    assert notification.title == "New Notification"
    assert notification.message == "This is a new notification"
    assert notification.notification_type == NotificationType.IN_APP
    assert notification.recipients == ["test@example.com"]
    assert notification.priority == NotificationPriority.NORMAL
    assert notification.user_id == "test-user-id"

def test_get_notifications(notification_service, test_notification):
    """알림 목록 조회 테스트"""
    notifications = notification_service.get_notifications()
    assert isinstance(notifications, list)

def test_get_unread_count(notification_service, test_notification):
    """읽지 않은 알림 수 조회 테스트"""
    count = notification_service.get_unread_count()
    assert isinstance(count, int)

def test_mark_as_read(notification_service, test_notification):
    """알림 읽음 표시 테스트"""
    success = notification_service.mark_as_read(test_notification.id)
    assert success is True

def test_mark_as_delivered(notification_service, test_notification):
    """알림 전송 완료 표시 테스트"""
    success = notification_service.mark_as_delivered(test_notification.id)
    assert success is True

def test_clear_notifications(notification_service, test_notification):
    """알림 삭제 테스트"""
    deleted_count = notification_service.clear_notifications()
    assert isinstance(deleted_count, int)

def test_to_core_notification(notification_service, test_notification):
    """데이터베이스 알림을 코어 알림으로 변환 테스트"""
    core_notification = notification_service.to_core_notification(test_notification)
    
    assert core_notification.id == test_notification.id
    assert core_notification.title == test_notification.title
    assert core_notification.message == test_notification.message
    assert core_notification.notification_type == test_notification.notification_type
    assert core_notification.recipients == test_notification.recipients
    assert core_notification.priority == test_notification.priority
    assert core_notification.metadata == test_notification.metadata
    assert core_notification.created_at == test_notification.created_at
    assert core_notification.read_at == test_notification.read_at
    assert core_notification.delivered_at == test_notification.delivered_at 