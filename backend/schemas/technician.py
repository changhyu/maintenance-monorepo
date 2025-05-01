from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# 정비사 생성 스키마
class TechnicianCreate(BaseModel):
    name: str = Field(..., max_length=100, description="정비사 이름")
    shop_id: int = Field(..., description="정비소 ID")
    phone: Optional[str] = Field(None, max_length=20, description="전화번호")
    email: Optional[EmailStr] = Field(None, description="이메일")
    specialties: Optional[List[str]] = Field(default=[], description="전문 분야")
    years_experience: Optional[int] = Field(default=0, description="경력 연수")
    certification: Optional[str] = Field(None, max_length=200, description="자격증")

# 정비사 업데이트 스키마
class TechnicianUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100, description="정비사 이름")
    shop_id: Optional[int] = Field(None, description="정비소 ID")
    phone: Optional[str] = Field(None, max_length=20, description="전화번호")
    email: Optional[EmailStr] = Field(None, description="이메일")
    specialties: Optional[List[str]] = Field(None, description="전문 분야")
    years_experience: Optional[int] = Field(None, description="경력 연수")
    certification: Optional[str] = Field(None, max_length=200, description="자격증")
    is_active: Optional[bool] = Field(None, description="활성 상태")

# 정비사 응답 스키마
class TechnicianResponse(BaseModel):
    id: int
    name: str
    shop_id: int
    phone: Optional[str] = None
    email: Optional[str] = None
    specialties: List[str] = []
    years_experience: int = 0
    certification: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    # 추가 정보
    shop_info: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

# 정비사 목록 응답 스키마
class TechnicianListResponse(BaseModel):
    success: bool
    message: str
    count: int
    data: List[TechnicianResponse]
    
    class Config:
        from_attributes = True

# 정비사 상세 응답 스키마
class TechnicianDetailResponse(BaseModel):
    success: bool
    message: str
    data: TechnicianResponse
    
    class Config:
        from_attributes = True