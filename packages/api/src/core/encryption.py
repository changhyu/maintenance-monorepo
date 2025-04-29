"""
암호화 서비스 모듈
"""

import base64
import logging
import os
from typing import Optional

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from packages.api.src.coreconfig import settings

logger = logging.getLogger(__name__)


class EncryptionService:
    """암호화 서비스 클래스"""

    def __init__(self, secret_key: Optional[str] = None):
        """
        암호화 서비스 초기화

        Args:
            secret_key: 암호화 키 (없으면 설정에서 가져옴)
        """
        self.secret_key = secret_key or settings.SECRET_KEY
        self.fernet = self._create_fernet()
        self.logger = logger

    def _create_fernet(self) -> Fernet:
        """Fernet 인스턴스 생성"""
        # PBKDF2를 사용하여 키 생성
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"static_salt",  # 실제 구현에서는 동적 salt 사용 권장
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.secret_key.encode()))
        return Fernet(key)

    def encrypt(self, data: str) -> str:
        """
        데이터 암호화

        Args:
            data: 암호화할 데이터

        Returns:
            str: 암호화된 데이터
        """
        try:
            encrypted_data = self.fernet.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted_data).decode()
        except Exception as e:
            self.logger.error(f"암호화 실패: {str(e)}")
            raise

    def decrypt(self, encrypted_data: str) -> str:
        """
        데이터 복호화

        Args:
            encrypted_data: 복호화할 데이터

        Returns:
            str: 복호화된 데이터
        """
        try:
            decoded_data = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self.fernet.decrypt(decoded_data)
            return decrypted_data.decode()
        except Exception as e:
            self.logger.error(f"복호화 실패: {str(e)}")
            raise

    def generate_key(self) -> str:
        """
        새로운 암호화 키 생성

        Returns:
            str: 생성된 키
        """
        return base64.urlsafe_b64encode(os.urandom(32)).decode()


# 전역 암호화 서비스 인스턴스
encryption_service = EncryptionService()
