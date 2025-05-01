"""
사용자 스키마 정의
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr


class UserBase(BaseModel):
    """사용자 기본 스키마"""
    username: str = Field(..., description="사용자 이름", example="user123")
    email: EmailStr = Field(..., description="이메일 주소", example="user@example.com")
    full_name: Optional[str] = Field(None, description="전체 이름", example="홍길동")
    phone: Optional[str] = Field(None, description="전화번호", example="010-1234-5678")


class UserCreate(UserBase):
    """사용자 생성 스키마"""
    password: str = Field(..., description="비밀번호", min_length=8)


class UserUpdate(BaseModel):
    """사용자 정보 업데이트 스키마"""
    username: Optional[str] = Field(None, description="사용자 이름")
    email: Optional[EmailStr] = Field(None, description="이메일 주소")
    full_name: Optional[str] = Field(None, description="전체 이름")
    phone: Optional[str] = Field(None, description="전화번호")
    is_active: Optional[bool] = Field(None, description="활성 상태 여부")
    role: Optional[str] = Field(None, description="사용자 역할")


class UserResponse(UserBase):
    """사용자 응답 스키마"""
    id: str
    is_active: bool
    is_verified: bool
    role: str
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class UserList(BaseModel):
    """사용자 목록 응답 스키마"""
    total: int
    users: List[UserResponse]


class UserLoginRequest(BaseModel):
    """사용자 로그인 요청 스키마"""
    username: str = Field(..., description="사용자 이름 또는 이메일")
    password: str = Field(..., description="비밀번호")


class Token(BaseModel):
    """토큰 응답 스키마"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
