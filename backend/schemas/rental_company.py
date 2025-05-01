from typing import List, Optional
from pydantic import BaseModel, validator, EmailStr
from datetime import datetime, date


class RentalCompanyLocationBase(BaseModel):
    """렌터카 업체 지점 기본 스키마"""
    name: str
    address: str
    phone: str
    email: Optional[EmailStr] = None
    is_airport: bool = False
    is_active: bool = True
    opening_hours: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class RentalCompanyLocationCreate(RentalCompanyLocationBase):
    """렌터카 업체 지점 생성 스키마"""
    pass


class RentalCompanyLocationUpdate(BaseModel):
    """렌터카 업체 지점 업데이트 스키마"""
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    is_airport: Optional[bool] = None
    is_active: Optional[bool] = None
    opening_hours: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class RentalCompanyLocationResponse(RentalCompanyLocationBase):
    """렌터카 업체 지점 응답 스키마"""
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class RentalCompanyBase(BaseModel):
    """렌터카 업체 기본 스키마"""
    name: str
    business_number: str
    address: str
    phone: str
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: bool = True
    rating: float = 0.0
    rating_count: int = 0
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    commission_rate: float = 0.0


class RentalCompanyCreate(RentalCompanyBase):
    """렌터카 업체 생성 스키마"""
    @validator('business_number')
    def validate_business_number_format(cls, v):
        """사업자 번호 형식 검증 (예: 123-45-67890)"""
        import re
        if not re.match(r'^\d{3}-\d{2}-\d{5}$', v):
            raise ValueError('사업자 번호는 XXX-XX-XXXXX 형식이어야 합니다')
        return v


class RentalCompanyUpdate(BaseModel):
    """렌터카 업체 업데이트 스키마"""
    name: Optional[str] = None
    business_number: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: Optional[bool] = None
    rating: Optional[float] = None
    rating_count: Optional[int] = None
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    commission_rate: Optional[float] = None
    
    @validator('business_number')
    def validate_business_number_format(cls, v):
        """사업자 번호 형식 검증"""
        if v is None:
            return v
            
        import re
        if not re.match(r'^\d{3}-\d{2}-\d{5}$', v):
            raise ValueError('사업자 번호는 XXX-XX-XXXXX 형식이어야 합니다')
        return v


class RentalCompanyLocationInResponse(RentalCompanyLocationBase):
    """응답에 포함될 렌터카 업체 지점 스키마"""
    id: int
    
    class Config:
        from_attributes = True


class VehicleInResponse(BaseModel):
    """응답에 포함될 차량 정보 스키마"""
    id: int
    make: str
    model: str
    year: int
    type: str
    color: Optional[str] = None
    license_plate: Optional[str] = None
    status: str
    company_vehicle_id: Optional[str] = None
    is_available_for_rent: bool
    
    class Config:
        from_attributes = True


class RentalCompanyResponse(RentalCompanyBase):
    """렌터카 업체 응답 스키마"""
    id: int
    created_at: datetime
    updated_at: datetime
    locations: List[RentalCompanyLocationInResponse] = []
    vehicles_count: Optional[int] = None
    
    class Config:
        from_attributes = True


class RentalCompanyDetailResponse(RentalCompanyResponse):
    """렌터카 업체 상세 응답 스키마"""
    vehicles: List[VehicleInResponse] = []


class RentalCompanyListResponse(BaseModel):
    """렌터카 업체 목록 응답 스키마"""
    success: bool
    message: str
    count: int
    data: List[RentalCompanyResponse]


class RentalCompanyStatistics(BaseModel):
    """렌터카 업체 통계 스키마"""
    total_vehicles: int
    active_vehicles: int
    rented_vehicles: int
    maintenance_vehicles: int
    total_revenue: float
    average_rating: float
    most_rented_vehicle: Optional[str] = None
    locations_count: int
    

class RentalCompanyReview(BaseModel):
    """렌터카 업체 리뷰 스키마"""
    customer_id: int
    rating: float
    comment: Optional[str] = None
    rental_id: Optional[int] = None


class RentalCompanyReviewResponse(RentalCompanyReview):
    """렌터카 업체 리뷰 응답 스키마"""
    id: int
    company_id: int
    created_at: datetime
    customer_name: str
    
    class Config:
        from_attributes = True