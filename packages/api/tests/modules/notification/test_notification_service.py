import pytest
from unittest.mock import Mock, AsyncMock
from datetime import datetime, timezone
from fastapi import BackgroundTasks

from src.modules.notification.services.notification_service import NotificationService
from src.modules.notification.models.notification import Notification, NotificationType
from src.modules.notification.repositories.notification_repository import NotificationRepository
from src.modules.notification.services.email_service import EmailService
from src.modules.notification.services.push_service import PushService

@pytest.fixture
def notification_repository():
    return AsyncMock(spec=NotificationRepository)

@pytest.fixture
def email_service():
    return AsyncMock(spec=EmailService)

@pytest.fixture
def push_service():
    return AsyncMock(spec=PushService)

@pytest.fixture
def background_tasks():
    return Mock(spec=BackgroundTasks)

@pytest.fixture
def notification_service(notification_repository, email_service, push_service, background_tasks):
    return NotificationService(
        notification_repository=notification_repository,
        email_service=email_service,
        push_service=push_service,
        background_tasks=background_tasks
    )

@pytest.mark.asyncio
async def test_create_email_notification(notification_service, notification_repository, background_tasks):
    # Given
    user_id = "test_user"
    title = "테스트 제목"
    message = "테스트 메시지"
    email = "test@example.com"
    
    notification_repository.create.return_value = Notification(
        id="test_id",
        user_id=user_id,
        title=title,
        message=message,
        type=NotificationType.EMAIL,
        created_at=datetime.now(timezone.UTC)
    )
    
    # When
    result = await notification_service.create_notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=NotificationType.EMAIL,
        email=email
    )
    
    # Then
    assert result.user_id == user_id
    assert result.title == title
    assert result.message == message
    assert result.type == NotificationType.EMAIL
    notification_repository.create.assert_called_once()
    background_tasks.add_task.assert_called_once()

@pytest.mark.asyncio
async def test_create_push_notification(notification_service, notification_repository, background_tasks):
    # Given
    user_id = "test_user"
    title = "테스트 제목"
    message = "테스트 메시지"
    device_token = "test_device_token"
    
    notification_repository.create.return_value = Notification(
        id="test_id",
        user_id=user_id,
        title=title,
        message=message,
        type=NotificationType.PUSH,
        created_at=datetime.now(timezone.UTC)
    )
    
    # When
    result = await notification_service.create_notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=NotificationType.PUSH,
        device_token=device_token
    )
    
    # Then
    assert result.user_id == user_id
    assert result.title == title
    assert result.message == message
    assert result.type == NotificationType.PUSH
    notification_repository.create.assert_called_once()
    background_tasks.add_task.assert_called_once()

@pytest.mark.asyncio
async def test_get_user_notifications(notification_service, notification_repository):
    # Given
    user_id = "test_user"
    notifications = [
        Notification(
            id="test_id_1",
            user_id=user_id,
            title="제목 1",
            message="메시지 1",
            type=NotificationType.EMAIL,
            created_at=datetime.now(timezone.UTC)
        ),
        Notification(
            id="test_id_2",
            user_id=user_id,
            title="제목 2",
            message="메시지 2",
            type=NotificationType.PUSH,
            created_at=datetime.now(timezone.UTC)
        )
    ]
    notification_repository.get_by_user_id.return_value = notifications
    
    # When
    result = await notification_service.get_user_notifications(user_id)
    
    # Then
    assert len(result) == 2
    assert all(n.user_id == user_id for n in result)
    notification_repository.get_by_user_id.assert_called_once_with(user_id, 0, 50)

@pytest.mark.asyncio
async def test_mark_as_read(notification_service, notification_repository):
    # Given
    notification_id = "test_id"
    notification = Notification(
        id=notification_id,
        user_id="test_user",
        title="테스트 제목",
        message="테스트 메시지",
        type=NotificationType.EMAIL,
        created_at=datetime.now(timezone.UTC)
    )
    notification_repository.get_by_id.return_value = notification
    notification_repository.update.return_value = notification
    
    # When
    result = await notification_service.mark_as_read(notification_id)
    
    # Then
    assert result.id == notification_id
    assert result.is_read is True
    assert result.read_at is not None
    notification_repository.get_by_id.assert_called_once_with(notification_id)
    notification_repository.update.assert_called_once() 