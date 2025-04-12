"""
보안 관련 유틸리티 모듈.
API 애플리케이션에서 사용하는 보안 관련 유틸리티 함수들을 제공합니다.
"""

import base64
import hashlib
import hmac
import os
import re
import secrets
import string
from typing import List, Optional, Tuple, Union
from urllib.parse import urlparse

from .logging import security_logger


def generate_random_string(length: int = 32, include_special_chars: bool = False) -> str:
    """
    지정된 길이의 안전한 랜덤 문자열 생성.
    
    Args:
        length: 생성할 문자열 길이
        include_special_chars: 특수 문자 포함 여부
    
    Returns:
        생성된 랜덤 문자열
    """
    characters = string.ascii_letters + string.digits
    if include_special_chars:
        characters += string.punctuation
    
    return ''.join(secrets.choice(characters) for _ in range(length))


def generate_secure_token(length: int = 64) -> str:
    """
    보안 토큰 생성.
    
    Args:
        length: 생성할 토큰의 바이트 길이 (실제 문자열은 더 길어짐)
    
    Returns:
        Base64로 인코딩된 보안 토큰
    """
    token_bytes = secrets.token_bytes(length)
    return base64.urlsafe_b64encode(token_bytes).decode('utf-8').rstrip('=')


def compute_hmac(key: Union[str, bytes], message: Union[str, bytes]) -> str:
    """
    HMAC-SHA256을 사용하여 메시지의 서명 생성.
    
    Args:
        key: 서명 키
        message: 서명할 메시지
    
    Returns:
        Hex로 인코딩된 서명
    """
    if isinstance(key, str):
        key = key.encode('utf-8')
    if isinstance(message, str):
        message = message.encode('utf-8')
    
    signature = hmac.new(key, message, hashlib.sha256).hexdigest()
    return signature


def compute_sha256(data: Union[str, bytes]) -> str:
    """
    SHA-256 해시 계산.
    
    Args:
        data: 해시할 데이터
    
    Returns:
        Hex로 인코딩된 해시
    """
    if isinstance(data, str):
        data = data.encode('utf-8')
    
    hash_value = hashlib.sha256(data).hexdigest()
    return hash_value


def is_valid_password(password: str, min_length: int = 8) -> Tuple[bool, Optional[str]]:
    """
    비밀번호 유효성 검사.
    
    Args:
        password: 검사할 비밀번호
        min_length: 최소 길이
    
    Returns:
        (유효 여부, 실패 이유)
    """
    if len(password) < min_length:
        return False, f"비밀번호는 최소 {min_length}자 이상이어야 합니다."
    
    if not re.search(r'[A-Z]', password):
        return False, "비밀번호에는 최소 하나의 대문자가 포함되어야 합니다."
    
    if not re.search(r'[a-z]', password):
        return False, "비밀번호에는 최소 하나의 소문자가 포함되어야 합니다."
    
    if not re.search(r'[0-9]', password):
        return False, "비밀번호에는 최소 하나의 숫자가 포함되어야 합니다."
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "비밀번호에는 최소 하나의 특수 문자가 포함되어야 합니다."
    
    return True, None


def encrypt_sensitive_data(data: str, key: Optional[str] = None) -> str:
    """
    민감한 데이터 암호화.
    이 함수는 실제 프로젝트에서 적절한 암호화 라이브러리로 구현해야 합니다.
    
    Args:
        data: 암호화할 데이터
        key: 암호화 키 (None이면 환경변수에서 가져옴)
    
    Returns:
        암호화된 데이터
    """
    try:
        from cryptography.fernet import Fernet
        
        if key is None:
            key = os.environ.get("ENCRYPTION_KEY")
            if not key:
                security_logger.warning("ENCRYPTION_KEY 환경 변수가 설정되지 않았습니다.")
                # 임시 키 생성 (실제 사용 시에는 안전하게 관리된 키 사용 필요)
                key = base64.urlsafe_b64encode(os.urandom(32)).decode('utf-8')
        
        if not key.endswith('='):
            # Fernet 키는 URL-safe base64 인코딩이며 패딩이 있어야 함
            key += '=' * ((4 - len(key) % 4) % 4)
        
        f = Fernet(key.encode('utf-8'))
        encrypted_data = f.encrypt(data.encode('utf-8'))
        return base64.urlsafe_b64encode(encrypted_data).decode('utf-8')
    
    except ImportError:
        security_logger.warning("cryptography 라이브러리가 설치되지 않았습니다. 암호화가 수행되지 않습니다.")
        # 개발 환경을 위한 간단한 인코딩 (실제 암호화가 아님)
        return base64.b64encode(data.encode('utf-8')).decode('utf-8')


def decrypt_sensitive_data(encrypted_data: str, key: Optional[str] = None) -> str:
    """
    암호화된 민감한 데이터 복호화.
    이 함수는 실제 프로젝트에서 적절한 암호화 라이브러리로 구현해야 합니다.
    
    Args:
        encrypted_data: 복호화할 데이터
        key: 암호화 키 (None이면 환경변수에서 가져옴)
    
    Returns:
        복호화된 데이터
    """
    try:
        from cryptography.fernet import Fernet
        
        if key is None:
            key = os.environ.get("ENCRYPTION_KEY")
            if not key:
                security_logger.warning("ENCRYPTION_KEY 환경 변수가 설정되지 않았습니다.")
                return ""
        
        if not key.endswith('='):
            # Fernet 키는 URL-safe base64 인코딩이며 패딩이 있어야 함
            key += '=' * ((4 - len(key) % 4) % 4)
        
        f = Fernet(key.encode('utf-8'))
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode('utf-8'))
        decrypted_data = f.decrypt(encrypted_bytes).decode('utf-8')
        return decrypted_data
    
    except ImportError:
        security_logger.warning("cryptography 라이브러리가 설치되지 않았습니다. 복호화가 수행되지 않습니다.")
        # 개발 환경을 위한 간단한 디코딩 (실제 복호화가 아님)
        return base64.b64decode(encrypted_data.encode('utf-8')).decode('utf-8')


def is_safe_url(url: str, allowed_hosts: Optional[List[str]] = None) -> bool:
    """
    URL의 안전성 검사.
    
    Args:
        url: 검사할 URL
        allowed_hosts: 허용된 호스트 목록
    
    Returns:
        URL 안전성 여부
    """
    if allowed_hosts is None:
        allowed_hosts = []
    
    try:
        parsed_url = urlparse(url)
        # URL에 네트워크 위치가 없으면 상대 URL이므로 안전
        if not parsed_url.netloc:
            return True
        
        # 허용된 호스트 목록에 포함되어 있으면 안전
        return parsed_url.netloc in allowed_hosts
    except Exception:
        # 파싱 오류가 발생하면 안전하지 않음
        return False


def sanitize_input(data: str) -> str:
    """
    사용자 입력 데이터 정제.
    
    Args:
        data: 정제할 데이터
    
    Returns:
        정제된 데이터
    """
    # HTML 태그 제거
    data = re.sub(r'<[^>]*>', '', data)
    
    # SQL Injection 방지를 위한 특수 문자 처리
    data = re.sub(r'[\'";]', '', data)
    
    # XSS 방지를 위한 스크립트 시도 제거
    data = re.sub(r'javascript:', '', data, flags=re.IGNORECASE)
    
    return data.strip() 

\n