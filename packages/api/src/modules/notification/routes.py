from typing import List, Optional

from core.dependencies import get_current_user
from core.schemas import PaginationParams
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import EmailStr

from packages.api.src.modules.notificationmodels.notification import (
    Notification,
    NotificationType,
)
from packages.api.src.modules.notificationschemas.requests import (
    CreateNotificationRequest,
)
from packages.api.src.modules.notificationschemas.responses import (
    NotificationListResponse,
    NotificationResponse,
)
from packages.api.src.modules.notificationservices.notification_service import (
    NotificationService,
)

router = APIRouter(prefix="/notifications", tags=["알림"])


@router.post(
    "",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="알림 생성",
    description="""
    새로운 알림을 생성합니다.
    
    - 이메일 알림: 이메일 주소 필요
    - 푸시 알림: 디바이스 토큰 필요
    - 인앱 알림: 추가 정보 불필요
    
    ## 권한
    - 인증된 사용자만 접근 가능
    
    ## 응답
    - 201: 알림 생성 성공
    - 400: 잘못된 요청
    - 401: 인증 실패
    """,
)
async def create_notification(
    request: CreateNotificationRequest,
    background_tasks: BackgroundTasks,
    notification_service: NotificationService = Depends(),
    current_user: dict = Depends(get_current_user),
) -> NotificationResponse:
    notification = await notification_service.create_notification(
        user_id=current_user["id"],
        title=request.title,
        message=request.message,
        notification_type=request.type,
        email=request.email,
        device_token=request.device_token,
    )
    return NotificationResponse.from_model(notification)


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="사용자 알림 목록 조회",
    description="""
    현재 사용자의 알림 목록을 조회합니다.
    
    ## 권한
    - 인증된 사용자만 접근 가능
    
    ## 페이지네이션
    - skip: 건너뛸 알림 수
    - limit: 한 페이지당 알림 수
    
    ## 응답
    - 200: 조회 성공
    - 401: 인증 실패
    """,
)
async def get_notifications(
    pagination: PaginationParams = Depends(),
    notification_service: NotificationService = Depends(),
    current_user: dict = Depends(get_current_user),
) -> NotificationListResponse:
    notifications = await notification_service.get_user_notifications(
        user_id=current_user["id"], skip=pagination.skip, limit=pagination.limit
    )
    return NotificationListResponse(
        items=[NotificationResponse.from_model(n) for n in notifications],
        total=len(notifications),
    )


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="알림 읽음 처리",
    description="""
    특정 알림을 읽음 상태로 변경합니다.
    
    ## 권한
    - 인증된 사용자만 접근 가능
    - 본인의 알림만 수정 가능
    
    ## 응답
    - 200: 수정 성공
    - 401: 인증 실패
    - 403: 권한 없음
    - 404: 알림 없음
    """,
)
async def mark_notification_as_read(
    notification_id: str,
    notification_service: NotificationService = Depends(),
    current_user: dict = Depends(get_current_user),
) -> NotificationResponse:
    notification = await notification_service.mark_as_read(notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="알림을 찾을 수 없습니다"
        )
    if notification.user_id != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 알림에 대한 권한이 없습니다",
        )
    return NotificationResponse.from_model(notification)


@router.get(
    "/unread-count",
    response_model=int,
    summary="읽지 않은 알림 수 조회",
    description="""
    현재 사용자의 읽지 않은 알림 수를 조회합니다.
    
    ## 권한
    - 인증된 사용자만 접근 가능
    
    ## 응답
    - 200: 조회 성공
    - 401: 인증 실패
    """,
)
async def get_unread_count(
    notification_service: NotificationService = Depends(),
    current_user: dict = Depends(get_current_user),
) -> int:
    return await notification_service.get_unread_count(current_user["id"])
