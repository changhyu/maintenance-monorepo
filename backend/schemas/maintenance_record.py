from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from backend.models.maintenance_record import MaintenanceStatus

class PartItem(BaseModel):
    name: str = Field(..., description="부품 이름")
    quantity: int = Field(..., description="수량", ge=1)
    price: float = Field(..., description="가격")

class LaborItem(BaseModel):
    description: str = Field(..., description="작업 설명")
    hours: float = Field(..., description="작업 시간", ge=0)
    rate: float = Field(..., description="시간당 비용")

class MaintenanceRecordBase(BaseModel):
    vehicle_id: int = Field(..., description="차량 ID")
    description: str = Field(..., description="정비 내용 요약", max_length=200)
    details: Optional[str] = Field(None, description="상세 정비 내용")
    notes: Optional[str] = Field(None, description="특이사항")
    date: datetime = Field(..., description="정비 날짜")
    completion_date: Optional[datetime] = Field(None, description="완료 날짜")
    status: str = Field(MaintenanceStatus.PENDING, description="정비 상태")
    technician: Optional[str] = Field(None, description="담당 기술자")
    cost: Optional[float] = Field(None, description="총 비용")
    parts: Optional[List[Dict[str, Any]]] = Field([], description="사용된 부품 목록")
    labor: Optional[List[Dict[str, Any]]] = Field([], description="작업 내역")
    
    @validator("status")
    @classmethod
    def validate_status(cls, v):
        """
        정비 상태 검증 메서드
        
        Args:
            cls: 클래스 인스턴스
            v: 검증할 값
            
        Returns:
            검증된 값
            
        Raises:
            ValueError: 유효하지 않은 정비 상태
        """
        if v not in [s.value for s in MaintenanceStatus]:
            raise ValueError(f"유효하지 않은 상태입니다. 가능한 값: {[s.value for s in MaintenanceStatus]}")
        return v

class MaintenanceRecordCreate(MaintenanceRecordBase):
    pass

class MaintenanceRecordUpdate(BaseModel):
    description: Optional[str] = None
    details: Optional[str] = None
    notes: Optional[str] = None
    date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    status: Optional[str] = None
    technician: Optional[str] = None
    cost: Optional[float] = None
    parts: Optional[List[Dict[str, Any]]] = None
    labor: Optional[List[Dict[str, Any]]] = None
    
    @validator("status")
    @classmethod
    def validate_status(cls, v):
        """
        정비 상태 검증 메서드
        
        Args:
            cls: 클래스 인스턴스
            v: 검증할 값
            
        Returns:
            검증된 값
            
        Raises:
            ValueError: 유효하지 않은 정비 상태
        """
        if v is not None and v not in [s.value for s in MaintenanceStatus]:
            raise ValueError(f"유효하지 않은 상태입니다. 가능한 값: {[s.value for s in MaintenanceStatus]}")
        return v

class MaintenanceRecordInDB(MaintenanceRecordBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    
    class Config:
        from_attributes = True

class VehicleInfo(BaseModel):
    make: str
    model: str
    year: int
    type: str
    color: Optional[str] = None

class MaintenanceRecordResponse(MaintenanceRecordInDB):
    vehicle_info: Optional[VehicleInfo] = None

# 응답 형식 정의
class MaintenanceRecordListResponse(BaseModel):
    success: bool = True
    message: str
    count: int
    data: List[MaintenanceRecordResponse]

class MaintenanceRecordDetailResponse(BaseModel):
    success: bool = True
    message: str
    data: MaintenanceRecordResponse

# 통계 응답 모델
class YearlyStats(BaseModel):
    count: int
    total_cost: float

class MonthlyStats(BaseModel):
    count: int
    total_cost: float

class MaintenanceStatistics(BaseModel):
    yearly: Dict[int, YearlyStats]
    monthly: Dict[str, MonthlyStats]

class VehicleHistoryResponse(BaseModel):
    success: bool = True
    message: str
    data: Dict[str, Any]

class MaintenanceStatsResponse(BaseModel):
    success: bool = True
    message: str
    period: str
    data: Dict[str, Dict[str, Any]]