"""
렌트카 관련 스키마 정의
"""
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, date
from pydantic import BaseModel, validator, Field, EmailStr


class CustomerBase(BaseModel):
    """고객 기본 스키마"""
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    
class CustomerCreate(CustomerBase):
    """고객 생성 스키마"""
    license_number: str
    license_expiry: date

class CustomerUpdate(BaseModel):
    """고객 업데이트 스키마"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[date] = None
    is_active: Optional[bool] = None
    
class CustomerResponse(CustomerBase):
    """고객 응답 스키마"""
    id: int
    license_number: str
    license_expiry: date
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
        
class CustomerListResponse(BaseModel):
    """고객 목록 응답 스키마"""
    success: bool
    message: str
    count: int
    data: List[CustomerResponse]
    
class CustomerDetailResponse(BaseModel):
    """고객 상세 응답 스키마"""
    success: bool
    message: str
    data: CustomerResponse
    
# 렌탈 스키마
class RentalBase(BaseModel):
    """렌탈 기본 스키마"""
    vehicle_id: int
    start_date: datetime
    end_date: datetime
    pickup_location: Optional[str] = None
    return_location: Optional[str] = None
    base_rate: float
    
class RentalCreate(RentalBase):
    """렌탈 생성 스키마"""
    customer_id: int
    additional_charges: Optional[float] = 0.0
    discount: Optional[float] = 0.0
    deposit_amount: Optional[float] = 0.0
    notes: Optional[str] = None
    odometer_start: Optional[int] = None
    fuel_level_start: Optional[float] = None
    
class RentalUpdate(BaseModel):
    """렌탈 업데이트 스키마"""
    status: Optional[str] = None
    payment_status: Optional[str] = None
    additional_charges: Optional[float] = None
    discount: Optional[float] = None
    notes: Optional[str] = None
    actual_return_date: Optional[datetime] = None
    odometer_end: Optional[int] = None
    fuel_level_end: Optional[float] = None
    
class RentalCheckIn(BaseModel):
    """차량 반납 스키마"""
    actual_return_date: datetime
    odometer_end: int
    fuel_level_end: float
    additional_charges: Optional[float] = 0.0
    notes: Optional[str] = None
    
class RentalCheckOut(BaseModel):
    """차량 인도 스키마"""
    odometer_start: int
    fuel_level_start: float
    notes: Optional[str] = None
    
class RentalVehicleInfo(BaseModel):
    """렌탈 차량 정보 스키마"""
    id: int
    make: str
    model: str
    year: int
    type: str
    color: Optional[str] = None
    license_plate: Optional[str] = None
    daily_rental_rate: Optional[float] = None
    
    class Config:
        from_attributes = True
        
class RentalCustomerInfo(BaseModel):
    """렌탈 고객 정보 스키마"""
    id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    license_number: str
    
    class Config:
        from_attributes = True
        
class RentalResponse(BaseModel):
    """렌탈 응답 스키마"""
    id: int
    customer_id: int
    vehicle_id: int
    start_date: datetime
    end_date: datetime
    pickup_location: Optional[str] = None
    return_location: Optional[str] = None
    status: str
    payment_status: str
    base_rate: float
    additional_charges: float
    discount: float
    deposit_amount: float
    tax: float
    total_amount: float
    actual_return_date: Optional[datetime] = None
    odometer_start: Optional[int] = None
    odometer_end: Optional[int] = None
    fuel_level_start: Optional[float] = None
    fuel_level_end: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime
    
    # 추가 정보
    customer_info: Optional[RentalCustomerInfo] = None
    vehicle_info: Optional[RentalVehicleInfo] = None
    duration_days: Optional[int] = None
    is_overdue: Optional[bool] = None
    
    class Config:
        from_attributes = True
        
class RentalListResponse(BaseModel):
    """렌탈 목록 응답 스키마"""
    success: bool
    message: str
    count: int
    data: List[RentalResponse]
    
class RentalDetailResponse(BaseModel):
    """렌탈 상세 응답 스키마"""
    success: bool
    message: str
    data: RentalResponse
    
# 예약 스키마
class ReservationBase(BaseModel):
    """예약 기본 스키마"""
    customer_id: int
    start_date: datetime
    end_date: datetime
    pickup_location: Optional[str] = None
    return_location: Optional[str] = None
    
class ReservationCreate(ReservationBase):
    """예약 생성 스키마"""
    vehicle_id: Optional[int] = None
    vehicle_type: Optional[str] = None
    special_requests: Optional[str] = None
    
    @validator('vehicle_id', 'vehicle_type')
    def validate_vehicle_info(cls, v, values, **kwargs):
        """차량 ID 또는 차량 유형 중 하나는 필수"""
        field = kwargs.get('field', None)
        
        if field.name == 'vehicle_id':
            vehicle_type = values.get('vehicle_type', None)
            if v is None and vehicle_type is None:
                raise ValueError('차량 ID 또는 차량 유형 중 하나는 필수입니다')
        return v
    
class ReservationUpdate(BaseModel):
    """예약 업데이트 스키마"""
    vehicle_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    pickup_location: Optional[str] = None
    return_location: Optional[str] = None
    status: Optional[str] = None
    special_requests: Optional[str] = None
    
class ReservationResponse(BaseModel):
    """예약 응답 스키마"""
    id: int
    customer_id: int
    vehicle_id: Optional[int] = None
    vehicle_type: Optional[str] = None
    start_date: datetime
    end_date: datetime
    pickup_location: Optional[str] = None
    return_location: Optional[str] = None
    status: str
    reservation_code: str
    estimated_price: Optional[float] = None
    special_requests: Optional[str] = None
    created_at: datetime
    
    # 추가 정보
    customer_info: Optional[RentalCustomerInfo] = None
    vehicle_info: Optional[RentalVehicleInfo] = None
    
    class Config:
        from_attributes = True
        
class ReservationListResponse(BaseModel):
    """예약 목록 응답 스키마"""
    success: bool
    message: str
    count: int
    data: List[ReservationResponse]
    
class ReservationDetailResponse(BaseModel):
    """예약 상세 응답 스키마"""
    success: bool
    message: str
    data: ReservationResponse
    
# 손상 보고서 스키마
class DamageReportBase(BaseModel):
    """손상 보고서 기본 스키마"""
    rental_id: int
    damage_type: str
    description: str
    location_on_vehicle: str
    severity: str
    
class DamageReportCreate(DamageReportBase):
    """손상 보고서 생성 스키마"""
    repair_cost: Optional[float] = None
    is_customer_responsible: Optional[bool] = True
    photos_path: Optional[str] = None
    notes: Optional[str] = None
    
class DamageReportUpdate(BaseModel):
    """손상 보고서 업데이트 스키마"""
    damage_type: Optional[str] = None
    description: Optional[str] = None
    location_on_vehicle: Optional[str] = None
    severity: Optional[str] = None
    repair_cost: Optional[float] = None
    is_customer_responsible: Optional[bool] = None
    is_repaired: Optional[bool] = None
    repair_date: Optional[datetime] = None
    photos_path: Optional[str] = None
    notes: Optional[str] = None
    
class DamageReportResponse(BaseModel):
    """손상 보고서 응답 스키마"""
    id: int
    rental_id: int
    report_date: datetime
    damage_type: str
    description: str
    location_on_vehicle: str
    severity: str
    repair_cost: Optional[float] = None
    is_customer_responsible: bool
    is_repaired: bool
    repair_date: Optional[datetime] = None
    photos_path: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    created_by: int
    
    class Config:
        from_attributes = True
        
class DamageReportListResponse(BaseModel):
    """손상 보고서 목록 응답 스키마"""
    success: bool
    message: str
    count: int
    data: List[DamageReportResponse]
    
class DamageReportDetailResponse(BaseModel):
    """손상 보고서 상세 응답 스키마"""
    success: bool
    message: str
    data: DamageReportResponse
    
# 보험 정책 스키마
class InsurancePolicyBase(BaseModel):
    """보험 정책 기본 스키마"""
    name: str
    daily_rate: float
    coverage_type: str
    
class InsurancePolicyCreate(InsurancePolicyBase):
    """보험 정책 생성 스키마"""
    description: Optional[str] = None
    coverage_details: Optional[str] = None
    deductible: Optional[float] = None
    
class InsurancePolicyUpdate(BaseModel):
    """보험 정책 업데이트 스키마"""
    name: Optional[str] = None
    description: Optional[str] = None
    daily_rate: Optional[float] = None
    coverage_type: Optional[str] = None
    coverage_details: Optional[str] = None
    deductible: Optional[float] = None
    is_active: Optional[bool] = None
    
class InsurancePolicyResponse(BaseModel):
    """보험 정책 응답 스키마"""
    id: int
    name: str
    description: Optional[str] = None
    daily_rate: float
    coverage_type: str
    coverage_details: Optional[str] = None
    deductible: Optional[float] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
        
class InsurancePolicyListResponse(BaseModel):
    """보험 정책 목록 응답 스키마"""
    success: bool
    message: str
    count: int
    data: List[InsurancePolicyResponse]
    
class InsurancePolicyDetailResponse(BaseModel):
    """보험 정책 상세 응답 스키마"""
    success: bool
    message: str
    data: InsurancePolicyResponse
    
# 렌탈 요금 정책 스키마
class RentalRateBase(BaseModel):
    """렌탈 요금 정책 기본 스키마"""
    vehicle_type: str
    daily_rate: float
    effective_from: date
    
class RentalRateCreate(RentalRateBase):
    """렌탈 요금 정책 생성 스키마"""
    weekly_rate: Optional[float] = None
    monthly_rate: Optional[float] = None
    weekend_rate: Optional[float] = None
    holiday_rate: Optional[float] = None
    mileage_allowance: Optional[int] = None
    extra_mileage_fee: Optional[float] = None
    late_return_fee_hourly: Optional[float] = None
    effective_to: Optional[date] = None
    
class RentalRateUpdate(BaseModel):
    """렌탈 요금 정책 업데이트 스키마"""
    daily_rate: Optional[float] = None
    weekly_rate: Optional[float] = None
    monthly_rate: Optional[float] = None
    weekend_rate: Optional[float] = None
    holiday_rate: Optional[float] = None
    mileage_allowance: Optional[int] = None
    extra_mileage_fee: Optional[float] = None
    late_return_fee_hourly: Optional[float] = None
    is_active: Optional[bool] = None
    effective_to: Optional[date] = None
    
class RentalRateResponse(BaseModel):
    """렌탈 요금 정책 응답 스키마"""
    id: int
    vehicle_type: str
    daily_rate: float
    weekly_rate: Optional[float] = None
    monthly_rate: Optional[float] = None
    weekend_rate: Optional[float] = None
    holiday_rate: Optional[float] = None
    mileage_allowance: Optional[int] = None
    extra_mileage_fee: Optional[float] = None
    late_return_fee_hourly: Optional[float] = None
    is_active: bool
    effective_from: date
    effective_to: Optional[date] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
        
class RentalRateListResponse(BaseModel):
    """렌탈 요금 정책 목록 응답 스키마"""
    success: bool
    message: str
    count: int
    data: List[RentalRateResponse]
    
class RentalRateDetailResponse(BaseModel):
    """렌탈 요금 정책 상세 응답 스키마"""
    success: bool
    message: str
    data: RentalRateResponse
    
# 통계 및 분석 스키마
class RentalStatistics(BaseModel):
    """렌탈 통계 스키마"""
    total_rentals: int
    active_rentals: int
    completed_rentals: int
    canceled_rentals: int
    overdue_rentals: int
    average_rental_duration: float  # 일 단위
    total_revenue: float
    average_revenue_per_rental: float
    most_popular_vehicle_type: str
    most_popular_vehicle: Dict[str, Any]
    
class FleetStatistics(BaseModel):
    """차량 플릿 통계 스키마"""
    total_vehicles: int
    available_vehicles: int
    rented_vehicles: int
    maintenance_vehicles: int
    utilization_rate: float  # 차량 활용률
    average_age: float  # 플릿 평균 연식
    top_performing_vehicles: List[Dict[str, Any]]
    most_profitable_vehicle_types: List[Dict[str, Any]]
    average_revenue_per_vehicle: float
    
class StatisticsResponse(BaseModel):
    """통계 응답 스키마"""
    success: bool
    message: str
    period: str  # day, week, month, year, all
    data: Dict[str, Any]
    
# 차량 가용성 확인 스키마
class VehicleAvailabilityCheck(BaseModel):
    """차량 가용성 확인 요청 스키마"""
    start_date: datetime
    end_date: datetime
    vehicle_type: Optional[str] = None
    vehicle_id: Optional[int] = None
    pickup_location: Optional[str] = None
    
class AvailableVehicle(BaseModel):
    """가용 차량 정보 스키마"""
    id: int
    make: str
    model: str
    year: int
    type: str
    color: Optional[str] = None
    daily_rental_rate: float
    has_gps: bool
    has_bluetooth: bool
    has_sunroof: bool
    has_heated_seats: bool
    passenger_capacity: Optional[int] = None
    total_price: float  # 요청한 기간에 대한 총 예상 가격
    
    class Config:
        from_attributes = True
        
class VehicleAvailabilityResponse(BaseModel):
    """차량 가용성 응답 스키마"""
    success: bool
    message: str
    start_date: datetime
    end_date: datetime
    days: int
    count: int
    data: List[AvailableVehicle]
    
# 결제 처리 스키마
class PaymentProcess(BaseModel):
    """결제 처리 요청 스키마"""
    rental_id: int
    amount: float
    payment_method: str
    payment_details: Optional[Dict[str, Any]] = None
    
class PaymentResponse(BaseModel):
    """결제 응답 스키마"""
    success: bool
    message: str
    rental_id: int
    transaction_id: str
    amount: float
    payment_status: str
    payment_date: datetime
    payment_method: str
    receipt_url: Optional[str] = None