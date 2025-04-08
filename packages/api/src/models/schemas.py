"""
Pydantic schemas for API request and response validation.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional, Any, Dict

from pydantic import BaseModel, Field, EmailStr


# 기본 스키마
class BaseSchema(BaseModel):
    """기본 스키마 클래스."""
    
    class Config:
        """스키마 설정."""
        
        orm_mode = True
        allow_population_by_field_name = True


# 상태 및 타입 열거형
class VehicleStatus(str, Enum):
    """차량 상태 열거형."""
    
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    INACTIVE = "inactive"
    RECALLED = "recalled"


class VehicleType(str, Enum):
    """차량 유형 열거형."""
    
    SEDAN = "sedan"
    SUV = "suv"
    TRUCK = "truck"
    VAN = "van"
    ELECTRIC = "electric"
    HYBRID = "hybrid"


class MaintenanceStatus(str, Enum):
    """정비 상태 열거형."""
    
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DELAYED = "delayed"


class UserRole(str, Enum):
    """사용자 역할 열거형."""
    
    ADMIN = "admin"
    MANAGER = "manager"
    TECHNICIAN = "technician"
    CUSTOMER = "customer"


class ShopStatus(str, Enum):
    """정비소 상태 열거형."""
    
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"


class ShopType(str, Enum):
    """정비소 유형 열거형."""
    
    DEALER = "dealer"
    INDEPENDENT = "independent"
    SPECIALTY = "specialty"
    CHAIN = "chain"


class ServiceType(str, Enum):
    """서비스 유형 열거형."""
    
    OIL_CHANGE = "oil_change"
    TIRE_SERVICE = "tire_service"
    BRAKE_SERVICE = "brake_service"
    ENGINE_REPAIR = "engine_repair"
    TRANSMISSION = "transmission"
    ELECTRICAL = "electrical"
    INSPECTION = "inspection"
    DIAGNOSIS = "diagnosis"
    BODY_REPAIR = "body_repair"
    GENERAL = "general"


# 차량 관련 스키마
class VehicleBase(BaseSchema):
    """차량 기본 스키마."""
    
    vin: str = Field(..., description="차량 식별 번호")
    make: str = Field(..., description="제조사")
    model: str = Field(..., description="모델명")
    year: int = Field(..., description="제조 연도")
    type: VehicleType = Field(..., description="차량 유형")
    color: Optional[str] = Field(None, description="색상")
    plate: Optional[str] = Field(None, description="번호판")
    mileage: Optional[int] = Field(None, description="주행 거리")
    status: VehicleStatus = Field(default=VehicleStatus.ACTIVE, description="차량 상태")


class VehicleCreate(VehicleBase):
    """차량 생성 스키마."""
    
    owner_id: Optional[str] = Field(None, description="소유자 ID")


class VehicleUpdate(BaseSchema):
    """차량 업데이트 스키마."""
    
    vin: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    type: Optional[VehicleType] = None
    color: Optional[str] = None
    plate: Optional[str] = None
    mileage: Optional[int] = None
    status: Optional[VehicleStatus] = None
    owner_id: Optional[str] = None


class Vehicle(VehicleBase):
    """차량 응답 스키마."""
    
    id: str
    owner_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# 정비 관련 스키마
class MaintenanceBase(BaseSchema):
    """정비 기본 스키마."""
    
    vehicle_id: str = Field(..., description="차량 ID")
    description: str = Field(..., description="정비 설명")
    date: datetime = Field(..., description="정비 일자")
    status: MaintenanceStatus = Field(
        default=MaintenanceStatus.SCHEDULED,
        description="정비 상태"
    )
    cost: Optional[float] = Field(None, description="비용")
    performed_by: Optional[str] = Field(None, description="담당자")
    notes: Optional[str] = Field(None, description="추가 메모")


class MaintenanceCreate(MaintenanceBase):
    """정비 생성 스키마."""
    
    pass


class MaintenanceUpdate(BaseSchema):
    """정비 업데이트 스키마."""
    
    description: Optional[str] = None
    date: Optional[datetime] = None
    status: Optional[MaintenanceStatus] = None
    cost: Optional[float] = None
    performed_by: Optional[str] = None
    notes: Optional[str] = None


class Maintenance(MaintenanceBase):
    """정비 응답 스키마."""
    
    id: str
    created_at: datetime
    updated_at: datetime


# 정비소 관련 스키마
class LocationSchema(BaseSchema):
    """위치 정보 스키마."""
    
    latitude: float = Field(..., description="위도")
    longitude: float = Field(..., description="경도")


class BusinessHoursSchema(BaseSchema):
    """영업 시간 스키마."""
    
    day: str = Field(..., description="요일")
    open: Optional[str] = Field(None, description="개점 시간")
    close: Optional[str] = Field(None, description="폐점 시간")
    is_closed: bool = Field(False, description="휴무일 여부")


class AddressSchema(BaseSchema):
    """주소 스키마."""
    
    street: str = Field(..., description="도로명")
    city: str = Field(..., description="시/도")
    district: str = Field(..., description="구/군")
    postal_code: str = Field(..., description="우편번호")
    country: str = Field(default="대한민국", description="국가")


class ContactSchema(BaseSchema):
    """연락처 스키마."""
    
    phone: str = Field(..., description="전화번호")
    email: Optional[EmailStr] = Field(None, description="이메일")
    website: Optional[str] = Field(None, description="웹사이트")


class ShopBase(BaseSchema):
    """정비소 기본 스키마."""
    
    name: str = Field(..., description="정비소 명")
    type: ShopType = Field(..., description="정비소 유형")
    status: ShopStatus = Field(default=ShopStatus.ACTIVE, description="상태")
    address: AddressSchema = Field(..., description="주소")
    location: LocationSchema = Field(..., description="위치 좌표")
    contact: ContactSchema = Field(..., description="연락처")
    description: Optional[str] = Field(None, description="설명")
    business_hours: List[BusinessHoursSchema] = Field(default_factory=list, description="영업 시간")


class ShopCreate(ShopBase):
    """정비소 생성 스키마."""
    
    owner_id: Optional[str] = Field(None, description="소유자 ID")
    services: Optional[List[str]] = Field(default_factory=list, description="제공 서비스")


class ShopUpdate(BaseSchema):
    """정비소 업데이트 스키마."""
    
    name: Optional[str] = None
    type: Optional[ShopType] = None
    status: Optional[ShopStatus] = None
    address: Optional[AddressSchema] = None
    location: Optional[LocationSchema] = None
    contact: Optional[ContactSchema] = None
    description: Optional[str] = None
    business_hours: Optional[List[BusinessHoursSchema]] = None
    services: Optional[List[str]] = None


class Shop(ShopBase):
    """정비소 응답 스키마."""
    
    id: str
    owner_id: Optional[str] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class ShopReviewBase(BaseSchema):
    """정비소 리뷰 기본 스키마."""
    
    shop_id: str = Field(..., description="정비소 ID")
    user_id: str = Field(..., description="사용자 ID")
    rating: float = Field(..., ge=1, le=5, description="평점")
    title: str = Field(..., description="제목")
    content: str = Field(..., description="내용")


class ShopReviewCreate(BaseSchema):
    """정비소 리뷰 생성 스키마."""
    
    rating: float = Field(..., ge=1, le=5, description="평점")
    title: str = Field(..., description="제목")
    content: str = Field(..., description="내용")


class ShopReview(ShopReviewBase):
    """정비소 리뷰 응답 스키마."""
    
    id: str
    created_at: datetime
    updated_at: datetime


# 사용자 관련 스키마
class UserBase(BaseSchema):
    """사용자 기본 스키마."""
    
    email: EmailStr = Field(..., description="이메일")
    name: str = Field(..., description="이름")
    role: UserRole = Field(default=UserRole.CUSTOMER, description="역할")
    is_active: bool = Field(default=True, description="활성 상태")


class UserCreate(UserBase):
    """사용자 생성 스키마."""
    
    password: str = Field(..., description="비밀번호")


class UserUpdate(BaseSchema):
    """사용자 업데이트 스키마."""
    
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class User(UserBase):
    """사용자 응답 스키마."""
    
    id: str
    created_at: datetime
    updated_at: datetime


# 인증 관련 스키마
class Token(BaseSchema):
    """토큰 스키마."""
    
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseSchema):
    """토큰 페이로드 스키마."""
    
    sub: str = None
    exp: int = None 