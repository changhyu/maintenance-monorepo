from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime

# 부품 생성 스키마
class PartCreate(BaseModel):
    name: str = Field(..., max_length=100, description="부품 이름")
    part_number: str = Field(..., max_length=50, description="부품 번호")
    description: Optional[str] = Field(None, description="부품 설명")
    price: float = Field(..., gt=0, description="가격")
    category: Optional[str] = Field(None, max_length=100, description="카테고리")
    manufacturer: Optional[str] = Field(None, max_length=100, description="제조사")
    stock: Optional[int] = Field(default=0, description="재고")
    location: Optional[str] = Field(None, max_length=100, description="보관 위치")

# 부품 업데이트 스키마
class PartUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100, description="부품 이름")
    description: Optional[str] = Field(None, description="부품 설명")
    price: Optional[float] = Field(None, gt=0, description="가격")
    category: Optional[str] = Field(None, max_length=100, description="카테고리")
    manufacturer: Optional[str] = Field(None, max_length=100, description="제조사")
    stock: Optional[int] = Field(None, description="재고")
    location: Optional[str] = Field(None, max_length=100, description="보관 위치")
    is_active: Optional[bool] = Field(None, description="활성 상태")

# 부품 응답 스키마
class PartResponse(BaseModel):
    id: int
    name: str
    part_number: str
    description: Optional[str] = None
    price: float
    category: Optional[str] = None
    manufacturer: Optional[str] = None
    stock: int = 0
    location: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# 부품 목록 응답 스키마
class PartListResponse(BaseModel):
    success: bool
    message: str
    count: int
    data: List[PartResponse]
    
    class Config:
        from_attributes = True

# 부품 상세 응답 스키마
class PartDetailResponse(BaseModel):
    success: bool
    message: str
    data: PartResponse
    
    class Config:
        from_attributes = True