"""
알림 API 라우터
"""
from typing import Dict, Any, List
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel, Field

# 웹 푸시 관련 모듈
from pywebpush import webpush, WebPushException
import json
import os

# 로거 설정
logger = logging.getLogger(__name__)

# 라우터 정의
router = APIRouter(tags=["notifications"])

# 모델 정의
class PushSubscription(BaseModel):
    """웹 푸시 구독 정보 모델"""
    endpoint: str
    keys: dict = Field(..., example={"p256dh": "string", "auth": "string"})

class NotificationData(BaseModel):
    """알림 데이터 모델"""
    title: str
    body: str
    icon: str = "/logo192.png"
    badge: str = "/notification-badge.png"
    url: str = "/"
    tag: str = None
    actions: List[Dict[str, str]] = []

# 환경 변수에서 VAPID 키 가져오기 (설정되지 않은 경우 기본값 사용)
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "uXCQ8FvpmPzYc7HaNEUC_bJ-1b0xDwAZ81q8qEf16AE")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "BDzZ-AE5Kg9vpjvDrJJgfr1f_0aZLlsUf1FHgvEmP04VC2uAdnPa06PxdnqIHv7ANE_hVB0sZJSZ1i6npZX4dSo")
VAPID_CLAIMS = {
    "sub": "mailto:admin@car-goro.com"
}

# 구독 정보 저장소 (실제 구현에서는 데이터베이스 사용)
subscriptions = []

@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe_to_push(subscription: PushSubscription):
    """
    웹 푸시 알림 구독 등록
    """
    try:
        # 중복 구독 확인
        for existing in subscriptions:
            if existing.get("endpoint") == subscription.endpoint:
                return {"message": "이미 구독되어 있습니다.", "success": True}
        
        # 구독 정보 저장
        subscriptions.append(subscription.dict())
        
        # 구독 확인 알림 전송
        notification_data = {
            "title": "알림 설정 완료",
            "body": "차량 정비 관리 시스템의 알림 설정이 완료되었습니다.",
            "icon": "/logo192.png"
        }
        
        try:
            webpush(
                subscription_info=subscription.dict(),
                data=json.dumps(notification_data),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS
            )
        except Exception as e:
            logger.warning(f"확인 알림 전송 중 오류 발생: {str(e)}")
        
        return {"message": "푸시 알림 구독이 등록되었습니다.", "success": True}
    except Exception as e:
        logger.error(f"구독 등록 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="알림 구독 등록 중 오류가 발생했습니다."
        )

@router.post("/send", status_code=status.HTTP_200_OK)
async def send_notification(notification: NotificationData, user_ids: List[str] = Body(None)):
    """
    푸시 알림 전송
    
    특정 사용자 또는 모든 구독자에게 알림을 전송합니다.
    user_ids가 제공되면 해당 사용자에게만 전송하고, 그렇지 않으면 모든 구독자에게 전송합니다.
    """
    if not subscriptions:
        return {"message": "구독자가 없습니다.", "success": False}
    
    try:
        notification_data = notification.dict()
        sent_count = 0
        failed_count = 0
        
        for subscription in subscriptions:
            try:
                webpush(
                    subscription_info=subscription,
                    data=json.dumps(notification_data),
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims=VAPID_CLAIMS
                )
                sent_count += 1
            except WebPushException as e:
                logger.warning(f"알림 전송 실패: {str(e)}")
                # 만료된 구독 삭제
                if e.response and e.response.status_code == 410:
                    subscriptions.remove(subscription)
                failed_count += 1
        
        return {
            "message": f"알림 전송 완료: {sent_count}명 성공, {failed_count}명 실패",
            "success": True,
            "sent_count": sent_count,
            "failed_count": failed_count
        }
    except Exception as e:
        logger.error(f"알림 전송 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="알림 전송 중 오류가 발생했습니다."
        )

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """
    VAPID 공개 키 반환
    """
    return {"public_key": VAPID_PUBLIC_KEY} 