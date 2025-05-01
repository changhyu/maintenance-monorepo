"""
차량 스키마 정의
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class VehicleBase(BaseModel):
    """차량 기본 스키마"""
    name: str = Field(..., description="차량 이름", example="마이카")
    vin: Optional[str] = Field(None, description="차대번호", example="1HGCM82633A123456")
    license_plate: Optional[str] = Field(None, description="차량 번호판", example="12가 3456")
    make: Optional[str] = Field(None, description="제조사", example="현대")
    model: Optional[str] = Field(None, description="모델명", example="쏘나타")
    year: Optional[str] = Field(None, description="제조년도", example="2020")
    color: Optional[str] = Field(None, description="색상", example="흰색")
    mileage: Optional[str] = Field(None, description="주행거리", example="10000")
    fuel_type: Optional[str] = Field(None, description="연료 유형", example="가솔린")
    status: Optional[str] = Field(None, description="차량 상태", example="운행중")


class VehicleCreate(VehicleBase):
    """차량 생성 스키마"""
    owner_id: Optional[str] = Field(None, description="소유자 ID")


class VehicleUpdate(BaseModel):
    """차량 정보 업데이트 스키마"""
    name: Optional[str] = Field(None, description="차량 이름")
    vin: Optional[str] = Field(None, description="차대번호")
    license_plate: Optional[str] = Field(None, description="차량 번호판")
    make: Optional[str] = Field(None, description="제조사")
    model: Optional[str] = Field(None, description="모델명")
    year: Optional[str] = Field(None, description="제조년도")
    color: Optional[str] = Field(None, description="색상")
    mileage: Optional[str] = Field(None, description="주행거리")
    fuel_type: Optional[str] = Field(None, description="연료 유형")
    status: Optional[str] = Field(None, description="차량 상태")
    is_active: Optional[bool] = Field(None, description="활성 상태 여부")
    owner_id: Optional[str] = Field(None, description="소유자 ID")


class VehicleResponse(VehicleBase):
    """차량 응답 스키마"""
    id: str
    owner_id: Optional[str] = None
    is_active: bool
    last_inspection_date: Optional[datetime] = None
    next_inspection_date: Optional[datetime] = None
    last_maintenance_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class VehicleList(BaseModel):
    """차량 목록 응답 스키마"""
    total: int
    vehicles: List[VehicleResponse]
