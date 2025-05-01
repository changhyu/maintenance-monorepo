from pydantic import BaseModel, Field, EmailStr, HttpUrl
from typing import Optional, List, Dict
from datetime import datetime

# 정비소 생성 스키마
class ShopCreate(BaseModel):
    name: str = Field(..., max_length=100, description="정비소 이름")
    address: str = Field(..., max_length=200, description="정비소 주소")
    city: str = Field(..., max_length=50, description="도시")
    state: str = Field(..., max_length=50, description="주/도")
    postal_code: str = Field(..., max_length=20, description="우편번호")
    phone: str = Field(..., max_length=20, description="전화번호")
    email: Optional[EmailStr] = Field(None, description="이메일")
    website: Optional[str] = Field(None, max_length=100, description="웹사이트")
    description: Optional[str] = Field(None, description="정비소 설명")
    latitude: Optional[float] = Field(None, description="위도")
    longitude: Optional[float] = Field(None, description="경도")

# 정비소 업데이트 스키마
class ShopUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100, description="정비소 이름")
    address: Optional[str] = Field(None, max_length=200, description="정비소 주소")
    city: Optional[str] = Field(None, max_length=50, description="도시")
    state: Optional[str] = Field(None, max_length=50, description="주/도")
    postal_code: Optional[str] = Field(None, max_length=20, description="우편번호")
    phone: Optional[str] = Field(None, max_length=20, description="전화번호")
    email: Optional[EmailStr] = Field(None, description="이메일")
    website: Optional[str] = Field(None, max_length=100, description="웹사이트")
    description: Optional[str] = Field(None, description="정비소 설명")
    is_active: Optional[bool] = Field(None, description="활성 상태")
    latitude: Optional[float] = Field(None, description="위도")
    longitude: Optional[float] = Field(None, description="경도")

# 정비소 응답 스키마
class ShopResponse(BaseModel):
    id: int
    name: str
    address: str
    city: str
    state: str
    postal_code: str
    phone: str
    email: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# 정비소 목록 응답 스키마
class ShopListResponse(BaseModel):
    success: bool
    message: str
    count: int
    data: List[ShopResponse]
    
    class Config:
        from_attributes = True

# 정비소 상세 응답 스키마
class ShopDetailResponse(BaseModel):
    success: bool
    message: str
    data: ShopResponse
    
    class Config:
        from_attributes = True