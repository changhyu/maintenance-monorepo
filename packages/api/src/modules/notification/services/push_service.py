from typing import Any, Dict, Optional

from core.config import settings
from firebase_admin import credentials, initialize_app, messaging


class PushService:
    def __init__(self):
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        if not len(messaging._apps):
            initialize_app(cred)

    async def send_push(
        self,
        device_token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        try:
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
                token=device_token,
            )

            response = messaging.send(message)
            return bool(response)
        except Exception as e:
            print(f"푸시 알림 전송 실패: {str(e)}")
            return False

    async def send_bulk_push(
        self,
        device_tokens: list[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        try:
            message = messaging.MulticastMessage(
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
                tokens=device_tokens,
            )

            response = messaging.send_multicast(message)
            return response.success_count > 0
        except Exception as e:
            print(f"대량 푸시 알림 전송 실패: {str(e)}")
            return False

    async def send_topic_push(
        self, topic: str, title: str, body: str, data: Optional[Dict[str, Any]] = None
    ) -> bool:
        try:
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
                topic=topic,
            )

            response = messaging.send(message)
            return bool(response)
        except Exception as e:
            print(f"토픽 푸시 알림 전송 실패: {str(e)}")
            return False
