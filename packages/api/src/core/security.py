"""
인증 및 보안 관련 유틸리티.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# REMOVED: from jose import JWTError, jwt
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings

# 비밀번호 해싱에 사용할 암호화 컨텍스트
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 인증 스키마
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    평문 비밀번호와 해시된 비밀번호 검증
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    비밀번호 해싱
    """
    return pwd_context.hash(password)


def create_access_token(
    data: Dict[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """
    액세스 토큰 생성
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode["exp"] = expire
    
    return jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm="HS256"
    )


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    액세스 토큰 디코딩
    """
    try:
        return jwt.decode(
            token, settings.SECRET_KEY, algorithms=["HS256"]
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 인증 정보",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """
    현재 인증된 사용자 정보 조회
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="유효하지 않은 인증 정보",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception

        # 실제 구현에서는 DB에서 사용자 정보 조회
        # 지금은 간단한 정보만 반환
        return {
            "email": email,
            "name": payload.get("name", ""),
            "role": payload.get("role", ""),
            "token": token
        }
    except JWTError as e:
        raise credentials_exception from e
\n