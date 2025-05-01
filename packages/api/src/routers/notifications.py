"""
푸시 알림 API

웹 푸시 알림 구독 및 전송을 위한 API 엔드포인트
(호환성을 위한 리다이렉션 라우터)
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

# 로거 설정
from packagescore.logger import logger

# 라우터 설정
router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """VAPID 공개 키 반환 (리다이렉션)"""
    # API 버전 라우팅으로 리다이렉션
    logger.info("VAPID 키 요청이 /api/notifications/vapid-public-key로 리다이렉션됩니다.")
    return RedirectResponse(url="/api/notifications/vapid-public-key")


@router.post("/subscribe", status_code=307)
async def subscribe(request: Request):
    """
    새 구독 등록 (리다이렉션)
    """
    # 모든 요청을 새 API로 리다이렉션
    logger.info("구독 요청이 /api/notifications/subscribe로 리다이렉션됩니다.")
    return RedirectResponse(
        url="/api/notifications/subscribe",
        status_code=307  # 307은 POST 요청을 보존
    )


@router.post("/send", status_code=307)
async def send_notification(request: Request):
    """
    구독자에게 알림 전송 (리다이렉션)
    """
    # 모든 요청을 새 API로 리다이렉션
    logger.info("알림 전송 요청이 /api/notifications/send로 리다이렉션됩니다.")
    return RedirectResponse(
        url="/api/notifications/send", 
        status_code=307  # 307은 POST 요청을 보존
    )


# 로그에 디버그 메시지 출력
logger.info("알림 API 라우터가 /api/notifications 경로로 리다이렉션됩니다.")
