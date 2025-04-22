"""
푸시 알림 API

웹 푸시 알림 구독 및 전송을 위한 API 엔드포인트
"""

import json
import os
from typing import Any, Dict, List, Optional, Union

from fastapi import APIRouter, Body, Depends, Header, HTTPException
from packagescore.logger import logger
from packagescore.versioning import ApiVersion
from pydantic import BaseModel, Field
from pywebpush import WebPushException, webpush

# 상수
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "YOUR_VAPID_PRIVATE_KEY_HERE")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "YOUR_VAPID_PUBLIC_KEY_HERE")
VAPID_CLAIMS = {"sub": "mailto:example@example.com"}

# 구독 정보를 저장할 리스트 (실제 구현에서는 데이터베이스 사용)
subscriptions: List[Dict[str, Any]] = []

# 라우터 설정
router = APIRouter(prefix="/notifications", tags=["notifications"])


# 모델 정의
class PushSubscription(BaseModel):
    """웹 푸시 구독 정보"""

    endpoint: str
    keys: Dict[str, str] = Field(..., description="p256dh 및 auth 키")


class NotificationAction(BaseModel):
    """알림 액션 정보"""

    action: str
    title: str
    icon: Optional[str] = None


class NotificationData(BaseModel):
    """알림 데이터"""

    title: str
    body: Optional[str] = None
    icon: Optional[str] = None
    badge: Optional[str] = None
    url: Optional[str] = None
    tag: Optional[str] = None
    actions: Optional[List[NotificationAction]] = None


class NotificationResponse(BaseModel):
    """알림 응답"""

    success: bool
    message: str
    failed_count: Optional[int] = None


# 엔드포인트 정의
@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """VAPID 공개 키 반환"""
    return {"public_key": VAPID_PUBLIC_KEY}


@router.post("/subscribe", status_code=201, response_model=NotificationResponse)
async def subscribe(subscription: PushSubscription = Body(...)):
    """
    새 구독 등록
    """
    # 중복 구독 확인
    for existing_sub in subscriptions:
        if existing_sub.get("endpoint") == subscription.endpoint:
            logger.info(f"이미 등록된 구독: {subscription.endpoint}")
            return {"success": True, "message": "이미 구독되어 있습니다"}

    # 구독 정보 저장
    subscription_dict = subscription.dict()
    subscriptions.append(subscription_dict)

    # 테스트 알림 전송
    try:
        webpush(
            subscription_info=subscription_dict,
            data=json.dumps(
                {
                    "title": "구독 성공",
                    "body": "푸시 알림 구독이 성공적으로 등록되었습니다.",
                    "icon": "/logo192.png",
                }
            ),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS,
        )
        logger.info(f"새 구독 등록: {subscription.endpoint}")

        return {"success": True, "message": "푸시 알림 구독이 등록되었습니다"}
    except WebPushException as e:
        logger.error(f"구독 중 오류 발생: {e}")
        # 구독은 여전히 유효하므로 성공으로 처리
        return {
            "success": True,
            "message": "푸시 알림 구독이 등록되었습니다 (알림 전송 실패)",
        }


@router.post("/send", response_model=NotificationResponse)
async def send_notification(notification: NotificationData = Body(...)):
    """
    구독자에게 알림 전송
    """
    if not subscriptions:
        logger.warning("구독자가 없음")
        return {"success": False, "message": "구독자가 없습니다"}

    # 알림 데이터 준비
    data = notification.dict()

    # 실패한 전송 카운트
    failed_count = 0

    # 모든 구독자에게 전송
    for subscription in subscriptions[:]:  # 복사본으로 반복
        try:
            webpush(
                subscription_info=subscription,
                data=json.dumps(data),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS,
            )
        except WebPushException as e:
            failed_count += 1
            logger.error(f"알림 전송 실패: {e}")

            # 만료된 구독인 경우 제거
            if "410" in str(e):
                subscriptions.remove(subscription)
                logger.info(f"만료된 구독 제거: {subscription.get('endpoint')}")

    result = {
        "success": failed_count < len(subscriptions),
        "message": "알림 전송 완료",
        "failed_count": failed_count,
    }

    logger.info(f"알림 전송 결과: {result}")
    return result
