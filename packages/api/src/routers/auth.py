"""
인증 관련 API 라우터.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from ..core.config import settings
from ..core.security import create_access_token, get_password_hash, verify_password

# OAuth2 인증 스키마 설정
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# 라우터 생성
router = APIRouter(
    prefix="/api/auth",
    tags=["인증"],
    responses={401: {"description": "인증되지 않음"}},
)


# 사용자 목데이터 (실제 구현에서는 데이터베이스로 대체)
MOCK_USERS = {
    "admin@example.com": {
        "id": "00001",
        "email": "admin@example.com",
        "name": "관리자",
        "password": get_password_hash("admin1234"),
        "role": "ADMIN",
        "is_active": True
    },
    "tech@example.com": {
        "id": "00002",
        "email": "tech@example.com",
        "name": "정비사",
        "password": get_password_hash("tech1234"),
        "role": "TECHNICIAN",
        "is_active": True
    },
    "user@example.com": {
        "id": "00003",
        "email": "user@example.com",
        "name": "사용자",
        "password": get_password_hash("user1234"),
        "role": "CUSTOMER",
        "is_active": True
    },
}


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """
    사용자 인증
    """
    if email not in MOCK_USERS:
        return None
    user = MOCK_USERS[email]
    if not verify_password(password, user["password"]):
        return None
    if not user["is_active"]:
        return None
    return user


@router.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2 호환 토큰 로그인, 폼에서 username은 이메일로 사용.
    """
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "name": user["name"], "role": user["role"]}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }


@router.get("/me")
async def read_users_me(token: str = Depends(oauth2_scheme)):
    """
    현재 인증된 사용자 정보
    """
    # 실제 구현에서는 토큰에서 추출한 사용자 ID로 DB 조회
    # 지금은 목데이터 사용
    return {"token": token, "message": "인증 성공"} 