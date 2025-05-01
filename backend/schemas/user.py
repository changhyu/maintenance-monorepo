"""
사용자 정보 관련 API 요청/응답 스키마 정의
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class PermissionBase(BaseModel):
    """권한 기본 스키마"""
    name: str = Field(..., description="권한 이름")
    description: Optional[str] = Field(None, description="권한 설명")


class PermissionCreate(PermissionBase):
    """권한 생성 스키마"""
    pass


class Permission(PermissionBase):
    """권한 응답 스키마"""
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    """사용자 기본 스키마"""
    username: str = Field(..., min_length=3, max_length=50, description="사용자 아이디")
    email: EmailStr = Field(..., description="이메일 주소")
    full_name: Optional[str] = Field(None, description="사용자 전체 이름")
    is_active: bool = Field(True, description="활성 상태 여부")
    is_superuser: bool = Field(False, description="관리자 여부")


class UserCreate(BaseModel):
    username: str = Field(..., description="사용자 이름")
    email: EmailStr = Field(..., description="사용자 이메일")
    password: str = Field(..., description="사용자 비밀번호")
    role_id: int = Field(..., description="사용자 역할 ID")

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "username": "newuser",
            "email": "user@example.com",
            "password": "strongpassword123",
            "role_id": 2
        }
    })


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, description="변경할 사용자 이름")
    email: Optional[EmailStr] = Field(None, description="변경할 사용자 이메일")

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "username": "updatedusername",
            "email": "updated@example.com"
        }
    })


class User(UserBase):
    """사용자 응답 스키마"""
    id: int
    created_at: datetime
    updated_at: datetime
    permissions: List[Permission] = []

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """토큰 응답 스키마"""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """토큰 페이로드 스키마"""
    sub: Optional[str] = None
    permissions: List[str] = []
    exp: Optional[int] = None


class UserResponse(BaseModel):
    id: int = Field(..., description="사용자 ID")
    username: str = Field(..., description="사용자 이름")
    email: EmailStr = Field(..., description="사용자 이메일")
    role_id: int = Field(..., description="사용자 역할 ID")
    is_active: bool = Field(..., description="사용자 활성화 상태")

    model_config = ConfigDict(from_attributes=True)