"""
관리자 인증 API 모듈
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import timedelta

from backend.core.auth import create_access_token, get_current_active_user
from backend.core.config import settings
from backend.db.session import get_db
from backend.models.user import User, UserRole

router = APIRouter(tags=["관리자 인증"])

@router.post(
    "/api/admin/login", 
    response_model=Dict[str, Any],
    summary="관리자 로그인"
)
async def admin_login(
    credentials: Dict[str, str] = Body(...),
    db: Session = Depends(get_db)
):
    """
    관리자 로그인을 위한 엔드포인트입니다.
    - username: 관리자 이메일
    - password: 비밀번호
    """
    username = credentials.get("username")
    password = credentials.get("password")
    
    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required",
        )
    
    user = db.query(User).filter(User.email == username).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 관리자 역할 확인
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin privileges",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 2)  # 관리자는 더 긴 만료 시간
    access_token = create_access_token(
        data={"sub": user.email, "is_admin": True}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value,
            "is_active": user.is_active
        }
    }

@router.get(
    "/api/admin/me", 
    response_model=Dict[str, Any],
    summary="현재 로그인한 관리자 정보 조회"
)
async def get_admin_me(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    현재 로그인한 관리자의 정보를 반환합니다.
    관리자 권한이 없는 사용자는 접근할 수 없습니다.
    """
    # 관리자 역할 확인
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin privileges",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 사용자 정보에 추가적인 정보가 필요한 경우 DB에서 조회
    user = db.query(User).filter(User.id == current_user.id).first()
    
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value,
            "is_active": user.is_active,
            "permissions": ["admin:read", "admin:write", "user:read", "user:write"] 
        }
    }