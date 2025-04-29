from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from src.core.security import get_current_user
from src.modules.notification.models import NotificationCreate, NotificationResponse
from src.modules.notification.notification_service import NotificationService

router = APIRouter(
    prefix="/api/v1/notifications",
    tags=["notifications"],
    responses={404: {"description": "Not found"}},
)

security = HTTPBearer()


async def get_notification_service() -> NotificationService:
    """알림 서비스 의존성 주입"""
    return NotificationService()


@router.get(
    "/",
    response_model=List[NotificationResponse],
    summary="사용자의 알림 목록 조회",
    description="현재 로그인한 사용자의 알림 목록을 조회합니다.",
)
async def get_notifications(
    skip: int = 0,
    limit: int = 100,
    include_read: bool = False,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """
    사용자의 알림 목록을 조회합니다.

    Args:
        skip: 건너뛸 항목 수
        limit: 최대 항목 수
        include_read: 읽은 알림 포함 여부
        credentials: 인증 토큰
        notification_service: 알림 서비스

    Returns:
        알림 목록
    """
    try:
        current_user = await get_current_user(credentials)
        notifications = await notification_service.get_user_notifications(
            user_id=current_user.id, skip=skip, limit=limit, include_read=include_read
        )
        return notifications
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get(
    "/unread/count",
    summary="읽지 않은 알림 수 조회",
    description="현재 로그인한 사용자의 읽지 않은 알림 수를 조회합니다.",
)
async def get_unread_count(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """
    읽지 않은 알림 수를 조회합니다.

    Args:
        credentials: 인증 토큰
        notification_service: 알림 서비스

    Returns:
        읽지 않은 알림 수
    """
    try:
        current_user = await get_current_user(credentials)
        count = await notification_service.get_unread_count(current_user.id)
        return {"count": count}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post(
    "/",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="새로운 알림 생성",
    description="새로운 알림을 생성합니다.",
)
async def create_notification(
    notification: NotificationCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """
    새로운 알림을 생성합니다.

    Args:
        notification: 생성할 알림 데이터
        credentials: 인증 토큰
        notification_service: 알림 서비스

    Returns:
        생성된 알림
    """
    try:
        current_user = await get_current_user(credentials)
        created_notification = await notification_service.create_notification(
            notification=notification, user_id=current_user.id
        )
        return created_notification
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.patch(
    "/read",
    response_model=List[NotificationResponse],
    summary="알림 읽음 처리",
    description="선택한 알림들을 읽음 상태로 표시합니다.",
)
async def mark_notifications_as_read(
    notification_ids: List[str],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """
    알림을 읽음 상태로 표시합니다.

    Args:
        notification_ids: 읽음 처리할 알림 ID 목록
        credentials: 인증 토큰
        notification_service: 알림 서비스

    Returns:
        읽음 처리된 알림 목록
    """
    try:
        current_user = await get_current_user(credentials)
        updated_notifications = await notification_service.mark_notifications_as_read(
            notification_ids=notification_ids, user_id=current_user.id
        )
        return updated_notifications
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.delete("/", summary="알림 삭제", description="선택한 알림들을 삭제합니다.")
async def delete_notifications(
    notification_ids: List[str],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """
    알림을 삭제합니다.

    Args:
        notification_ids: 삭제할 알림 ID 목록
        credentials: 인증 토큰
        notification_service: 알림 서비스

    Returns:
        삭제된 알림 수
    """
    try:
        current_user = await get_current_user(credentials)
        deleted_count = await notification_service.delete_notifications(
            notification_ids=notification_ids, user_id=current_user.id
        )
        return {"deleted_count": deleted_count}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
