"""
토큰 관련 모델 정의 모듈
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TokenPayload(BaseModel):
    """
    JWT 토큰 페이로드 정의
    """
    sub: str  # 사용자 ID 또는 식별자
    exp: Optional[datetime] = None  # 만료 시간
    iat: Optional[datetime] = None  # 발급 시간
    role: Optional[str] = None  # 사용자 역할
    type: Optional[str] = "access"  # 토큰 타입 (access/refresh)
