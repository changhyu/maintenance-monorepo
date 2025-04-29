"""
자동차 법정검사 관련 스키마 정의
"""
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field, validator

from src.models.vehicle_inspection import InspectionStatus, InspectionType


class InspectionBase(BaseModel):
    """법정검사 기본 스키마"""
    vehicle_id: str = Field(..., description="차량 ID")
    inspection_type: InspectionType = Field(default=InspectionType.REGULAR, description="검사 유형")
    due_date: date = Field(..., description="검사 예정일")
    location: Optional[str] = Field(None, description="검사 장소")
    inspector: Optional[str] = Field(None, description="검사관")
    notes: Optional[str] = Field(None, description="비고")


class InspectionCreate(InspectionBase):
    """법정검사 생성 스키마"""
    pass


class InspectionUpdate(BaseModel):
    """법정검사 업데이트 스키마"""
    inspection_type: Optional[InspectionType] = Field(None, description="검사 유형")
    due_date: Optional[date] = Field(None, description="검사 예정일")
    inspection_date: Optional[date] = Field(None, description="실제 검사일")
    status: Optional[InspectionStatus] = Field(None, description="검사 상태")
    location: Optional[str] = Field(None, description="검사 장소")
    inspector: Optional[str] = Field(None, description="검사관")
    fee: Optional[int] = Field(None, description="검사 비용")
    passed: Optional[bool] = Field(None, description="합격 여부")
    certificate_number: Optional[str] = Field(None, description="검사 증명서 번호")
    next_due_date: Optional[date] = Field(None, description="다음 검사 예정일")
    notes: Optional[str] = Field(None, description="비고")


class InspectionComplete(BaseModel):
    """법정검사 완료 스키마"""
    inspection_date: date = Field(..., description="실제 검사일")
    passed: bool = Field(..., description="합격 여부")
    fee: int = Field(..., description="검사 비용")
    certificate_number: Optional[str] = Field(None, description="검사 증명서 번호")
    next_due_date: Optional[date] = Field(None, description="다음 검사 예정일")
    notes: Optional[str] = Field(None, description="비고")


class InspectionVehicleInfo(BaseModel):
    """검사 관련 차량 정보 스키마"""
    id: str
    make: str
    model: str
    year: int
    license_plate: Optional[str] = None
    vin: Optional[str] = None

    class Config:
        orm_mode = True


class InspectionResponse(InspectionBase):
    """법정검사 응답 스키마"""
    id: str
    status: InspectionStatus
    inspection_date: Optional[datetime] = None
    fee: Optional[int] = None
    passed: Optional[bool] = None
    certificate_number: Optional[str] = None
    next_due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    vehicle: Optional[InspectionVehicleInfo] = None
    
    class Config:
        orm_mode = True


class UpcomingInspectionResponse(InspectionResponse):
    """다가오는 법정검사 응답 스키마"""
    days_remaining: int = Field(..., description="남은 일수")


class InspectionFilter(BaseModel):
    """법정검사 필터 스키마"""
    vehicle_id: Optional[str] = Field(None, description="차량 ID로 필터링")
    status: Optional[InspectionStatus] = Field(None, description="검사 상태로 필터링")
    due_before: Optional[date] = Field(None, description="지정된 날짜 이전에 예정된 검사 필터링")
    due_after: Optional[date] = Field(None, description="지정된 날짜 이후에 예정된 검사 필터링")