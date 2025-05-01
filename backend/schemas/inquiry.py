"""
문의 관련 API 스키마
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# 문의 상태 Enum
class InquiryStatus(str, Enum):
    PENDING = "PENDING"  # 대기 중
    IN_PROGRESS = "IN_PROGRESS"  # 처리 중
    RESOLVED = "RESOLVED"  # 해결됨
    CLOSED = "CLOSED"  # 종료됨

# 문의 유형 Enum
class InquiryType(str, Enum):
    GENERAL = "GENERAL"  # 일반 문의
    TECHNICAL = "TECHNICAL"  # 기술 문의
    BILLING = "BILLING"  # 결제 문의
    FEATURE = "FEATURE"  # 기능 요청
    BUG = "BUG"  # 버그 보고
    OTHER = "OTHER"  # 기타

# 문의 생성 스키마
class InquiryCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200, description="문의 제목")
    content: str = Field(..., min_length=10, description="문의 내용")
    type: InquiryType = Field(default=InquiryType.GENERAL, description="문의 유형")
    is_urgent: bool = Field(default=False, description="긴급 여부")
    category: Optional[str] = Field(None, max_length=50, description="문의 카테고리")
    reference_id: Optional[str] = Field(None, max_length=50, description="참조 ID")

# 문의 수정 스키마
class InquiryUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200, description="문의 제목")
    content: Optional[str] = Field(None, min_length=10, description="문의 내용")
    status: Optional[InquiryStatus] = Field(None, description="문의 상태")
    type: Optional[InquiryType] = Field(None, description="문의 유형")
    is_urgent: Optional[bool] = Field(None, description="긴급 여부")
    category: Optional[str] = Field(None, max_length=50, description="문의 카테고리")
    reference_id: Optional[str] = Field(None, max_length=50, description="참조 ID")

# 관리자 응답 스키마
class InquiryResponse(BaseModel):
    response: str = Field(..., min_length=1, description="관리자 응답 내용")
    status: InquiryStatus = Field(default=InquiryStatus.RESOLVED, description="상태 변경")

# 문의 출력 스키마 (기본)
class InquiryBase(BaseModel):
    id: int
    title: str
    content: str
    status: InquiryStatus
    type: InquiryType
    is_urgent: bool
    category: Optional[str] = None
    reference_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# 문의 목록 출력 스키마
class InquiryList(InquiryBase):
    user_id: int
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    response: Optional[str] = None
    
    class Config:
        from_attributes = True

# 문의 상세 출력 스키마
class InquiryDetail(InquiryBase):
    user_id: int
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    response: Optional[str] = None
    responded_by_id: Optional[int] = None
    responded_by_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# 문의 필터링 옵션
class InquiryFilter(BaseModel):
    status: Optional[InquiryStatus] = None
    type: Optional[InquiryType] = None
    is_urgent: Optional[bool] = None
    category: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    user_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# API 응답 스키마
class InquiriesResponse(BaseModel):
    success: bool
    message: str
    count: int
    total_count: Optional[int] = None
    page: Optional[int] = None
    total_pages: Optional[int] = None
    data: List[InquiryList]
    
    class Config:
        from_attributes = True

class InquiryDetailResponse(BaseModel):
    success: bool
    message: str
    data: InquiryDetail
    
    class Config:
        from_attributes = True