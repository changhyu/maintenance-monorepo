import logging
from email.mime.text import MIMEText
from typing import Dict, List

import aiosmtplib
from core.config import Settings, settings
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema
from pydantic import EmailStr

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.smtp_client = None

    async def _init_smtp_client(self):
        """SMTP 클라이언트 초기화"""
        if not self.smtp_client:
            self.smtp_client = aiosmtplib.SMTP(
                hostname=self.settings.SMTP_HOST,
                port=self.settings.SMTP_PORT,
                use_tls=self.settings.SMTP_TLS,
            )
            await self.smtp_client.connect()
            if self.settings.SMTP_USERNAME and self.settings.SMTP_PASSWORD:
                await self.smtp_client.login(
                    self.settings.SMTP_USERNAME, self.settings.SMTP_PASSWORD
                )

    async def send_email(
        self, to_email: str, subject: str, content: str, is_html: bool = False
    ) -> bool:
        """
        이메일 전송

        Args:
            to_email: 수신자 이메일
            subject: 이메일 제목
            content: 이메일 내용
            is_html: HTML 형식 여부

        Returns:
            전송 성공 여부
        """
        try:
            # SMTP 클라이언트 초기화
            if not self.smtp_client:
                await self._init_smtp_client()

            # 이메일 메시지 생성
            message = MIMEText(content, "html" if is_html else "plain")
            message["Subject"] = subject
            message["From"] = self.settings.SMTP_SENDER
            message["To"] = to_email

            # 이메일 전송
            await self.smtp_client.send_message(message)
            return True

        except Exception as e:
            logger.error(f"이메일 전송 실패: {str(e)}")
            return False

    async def send_bulk_email(
        self, to_emails: List[str], subject: str, content: str, is_html: bool = False
    ) -> Dict[str, bool]:
        """
        대량 이메일 전송

        Args:
            to_emails: 수신자 이메일 목록
            subject: 이메일 제목
            content: 이메일 내용
            is_html: HTML 형식 여부

        Returns:
            이메일별 전송 결과
        """
        results = {}
        for email in to_emails:
            results[email] = await self.send_email(email, subject, content, is_html)
        return results

    async def send_welcome_email(self, email: EmailStr, username: str) -> bool:
        """
        환영 이메일 전송

        Args:
            email: 수신자 이메일
            username: 사용자 이름

        Returns:
            전송 성공 여부
        """
        subject = "환영합니다!"
        content = f"""
        <h2>{username}님, 환영합니다!</h2>
        <p>저희 서비스에 가입해 주셔서 감사합니다.</p>
        <p>더 나은 서비스를 제공하기 위해 노력하겠습니다.</p>
        """
        return await self.send_email(email, subject, content, is_html=True)

    async def send_password_reset_email(
        self, email: EmailStr, reset_token: str
    ) -> bool:
        """
        비밀번호 재설정 이메일 전송

        Args:
            email: 수신자 이메일
            reset_token: 재설정 토큰

        Returns:
            전송 성공 여부
        """
        reset_url = f"{self.settings.FRONTEND_URL}/reset-password?token={reset_token}"
        subject = "비밀번호 재설정"
        content = f"""
        <h2>비밀번호 재설정 요청</h2>
        <p>비밀번호 재설정을 요청하셨습니다.</p>
        <p>아래 링크를 클릭하여 비밀번호를 재설정하실 수 있습니다:</p>
        <p><a href="{reset_url}">비밀번호 재설정하기</a></p>
        <p>이 링크는 24시간 동안 유효합니다.</p>
        <p>비밀번호 재설정을 요청하지 않으셨다면 이 이메일을 무시하시면 됩니다.</p>
        """
        return await self.send_email(email, subject, content, is_html=True)
