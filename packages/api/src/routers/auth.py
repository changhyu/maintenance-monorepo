"""
Authentication API router.
"""

from datetime import timedelta
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..core.dependencies import get_db
from ..core.security import (
    create_access_token,
    verify_password,
    get_current_user
)
from ..core.config import settings
from ..models.schemas import Token, User, UserCreate


router = APIRouter(prefix="/auth", tags=["auth"])


# 임시 사용자 데이터 (실제 구현에서는 DB에서 관리)
fake_users_db = {
    "user@example.com": {
        "id": "user1",
        "email": "user@example.com",
        "name": "테스트 사용자",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # "password"
        "is_active": True,
        "role": "customer"
    },
    "admin@example.com": {
        "id": "admin1",
        "email": "admin@example.com",
        "name": "관리자",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # "password"
        "is_active": True,
        "role": "admin"
    }
}


def authenticate_user(username: str, password: str) -> dict:
    """
    사용자 인증.
    
    Args:
        username: 이메일 또는 사용자명
        password: 비밀번호
        
    Returns:
        인증된 사용자 정보
        
    Raises:
        HTTPException: 인증 실패 시
    """
    if username not in fake_users_db:
        return None
    
    user = fake_users_db[username]
    if not verify_password(password, user["hashed_password"]):
        return None
    
    return user


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    액세스 토큰을 발급합니다.
    """
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="잘못된 이메일 또는 비밀번호입니다",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    
    access_token = create_access_token(
        subject=user["id"],
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=Dict[str, Any])
async def read_users_me(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    현재 인증된 사용자 정보를 반환합니다.
    """
    return current_user


@router.post("/register", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    새 사용자를 등록합니다.
    """
    # 실제 구현에서는 DB에 저장
    if user_data.email in fake_users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 등록된 이메일입니다."
        )
    
    # 사용자 생성 로직 (실제로는 DB에 저장)
    return {
        "email": user_data.email,
        "name": user_data.name,
        "role": user_data.role,
        "is_active": user_data.is_active,
        "message": "사용자가 성공적으로 등록되었습니다."
    } 