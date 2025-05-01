import pytest
from fastapi.testclient import TestClient
from datetime import datetime
from typing import List, Dict, Any

from backend.main import app
from backend.core.notifications import NotificationType, NotificationPriority
from backend.models.notification import Notification
from backend.db.session import get_db
from backend.core.auth import create_access_token
from backend.models.user import User

client = TestClient(app)

@pytest.fixture
def test_user():
    """테스트용 사용자 생성"""
    return User(
        id="test-user-id",
        email="test@example.com",
        hashed_password="hashed_password",
        is_active=True
    )

@pytest.fixture
def test_token(test_user):
    """테스트용 토큰 생성"""
    return create_access_token(data={"sub": test_user.email})

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

def test_get_notifications(test_token, test_notification):
    """알림 목록 조회 테스트"""
    response = client.get(
        "/api/v1/notifications",
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert response.status_code == 200
    notifications = response.json()
    assert isinstance(notifications, list)

def test_get_unread_count(test_token):
    """읽지 않은 알림 수 조회 테스트"""
    response = client.get(
        "/api/v1/notifications/unread/count",
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert response.status_code == 200
    count = response.json()
    assert isinstance(count, int)

def test_create_notification(test_token):
    """알림 생성 테스트"""
    notification_data = {
        "title": "New Notification",
        "message": "This is a new notification",
        "notification_type": "in_app",
        "recipients": ["test@example.com"],
        "priority": "normal",
        "metadata": {}
    }
    
    response = client.post(
        "/api/v1/notifications",
        json=notification_data,
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert "notification_id" in data

def test_mark_notification_as_read(test_token, test_notification):
    """알림 읽음 표시 테스트"""
    response = client.post(
        f"/api/v1/notifications/{test_notification.id}/read",
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "알림이 읽음으로 표시되었습니다."

def test_clear_notifications(test_token):
    """알림 삭제 테스트"""
    response = client.delete(
        "/api/v1/notifications",
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert response.status_code == 204 