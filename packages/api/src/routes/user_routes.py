"""
사용자 API 라우터 모듈
"""

import datetime
import uuid
from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
# 공통 모델 임포트
from src.models import User, get_db

# 라우터 생성
router = APIRouter()


# 유저 스키마
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "USER"
    is_active: bool = True  # active에서 is_active로 변경


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None  # active에서 is_active로 변경


class UserResponse(UserBase):
    id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# API 응답 모델
class ApiResponse(BaseModel):
    success: bool = True
    message: str = "요청이 성공적으로 처리되었습니다"
    data: Optional[dict] = None


# CRUD 함수들
def create_user(db: Session, user: UserCreate):
    db_user = User(
        id=str(uuid.uuid4()),
        email=user.email,
        name=user.name,
        role=user.role,
        is_active=user.is_active,  # active에서 is_active로 변경
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user(db: Session, user_id: str):
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()


def update_user(db: Session, user_id: str, user_update: UserUpdate):
    db_user = get_user(db, user_id)
    if db_user is None:
        return None

    user_data = user_update.model_dump(exclude_unset=True)
    for key, value in user_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: str):
    db_user = get_user(db, user_id)
    if db_user is None:
        return False

    db.delete(db_user)
    db.commit()
    return True


# 엔드포인트 정의
@router.post("/", response_model=ApiResponse)
async def create_user_endpoint(user: UserCreate, db: Session = Depends(get_db)):
    """새 사용자 생성"""
    db_user = get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="이미 등록된 이메일입니다"
        )

    user = create_user(db=db, user=user)
    return {
        "success": True,
        "message": "사용자가 성공적으로 생성되었습니다",
        "data": UserResponse.model_validate(user).model_dump(),
    }


@router.get("/", response_model=ApiResponse)
async def get_users_endpoint(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    """모든 사용자 조회"""
    users = get_users(db, skip=skip, limit=limit)
    users_response = [UserResponse.model_validate(user).model_dump() for user in users]

    return {
        "success": True,
        "message": "사용자 목록을 성공적으로 조회했습니다",
        "data": users_response,
        "count": len(users_response),
    }


@router.get("/{user_id}", response_model=ApiResponse)
async def get_user_endpoint(user_id: str, db: Session = Depends(get_db)):
    """특정 사용자 조회"""
    db_user = get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다"
        )

    return {
        "success": True,
        "message": "사용자를 성공적으로 조회했습니다",
        "data": UserResponse.model_validate(db_user).model_dump(),
    }


@router.put("/{user_id}", response_model=ApiResponse)
async def update_user_endpoint(
    user_id: str, user: UserUpdate, db: Session = Depends(get_db)
):
    """사용자 정보 업데이트"""
    updated_user = update_user(db, user_id=user_id, user_update=user)
    if updated_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다"
        )

    return {
        "success": True,
        "message": "사용자 정보가 성공적으로 업데이트되었습니다",
        "data": UserResponse.model_validate(updated_user).model_dump(),
    }


@router.delete("/{user_id}", response_model=ApiResponse)
async def delete_user_endpoint(user_id: str, db: Session = Depends(get_db)):
    """사용자 삭제"""
    deleted = delete_user(db, user_id=user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다"
        )

    return {"success": True, "message": "사용자가 성공적으로 삭제되었습니다"}
