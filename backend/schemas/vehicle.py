from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from backend.models.vehicle import VehicleStatus, VehicleType

class VehicleBase(BaseModel):
    make: str = Field(..., description="차량 제조사")
    model: str = Field(..., description="차량 모델명")
    year: int = Field(..., description="차량 제조년도", ge=1900, le=datetime.now().year + 1)
    type: str = Field(..., description="차량 유형")
    color: Optional[str] = Field(None, description="차량 색상")
    license_plate: Optional[str] = Field(None, description="차량 번호판")
    vin: Optional[str] = Field(None, description="차대번호(VIN)")
    status: Optional[str] = Field(VehicleStatus.AVAILABLE, description="차량 상태")
    
    # 재무 관련 필드 추가
    purchase_price: Optional[float] = Field(None, description="구매 가격", ge=0)
    purchase_date: Optional[date] = Field(None, description="구매 일자")
    sale_price: Optional[float] = Field(None, description="판매 가격", ge=0)
    sale_date: Optional[date] = Field(None, description="판매 일자")
    depreciation_rate: Optional[float] = Field(0.15, description="연간 감가상각률", ge=0, le=1)
    current_value: Optional[float] = Field(None, description="현재 가치")
    finance_notes: Optional[str] = Field(None, description="재무 관련 메모")
    insurance_cost: Optional[float] = Field(None, description="보험 비용", ge=0)
    insurance_expiry: Optional[date] = Field(None, description="보험 만료일")
    
    @validator("type")
    @classmethod
    def validate_vehicle_type(cls, v):
        """
        차량 유형 검증 메서드
        
        Args:
            cls: 클래스 인스턴스
            v: 검증할 값
        
        Returns:
            검증된 값
        
        Raises:
            ValueError: 유효하지 않은 차량 유형
        """
        if v not in [t.value for t in VehicleType]:
            raise ValueError(f"유효하지 않은 차량 유형입니다. 가능한 값: {[t.value for t in VehicleType]}")
        return v
        
    @validator("status")
    @classmethod
    def validate_vehicle_status(cls, v):
        """
        차량 상태 검증 메서드
        
        Args:
            cls: 클래스 인스턴스
            v: 검증할 값
        
        Returns:
            검증된 값
            
        Raises:
            ValueError: 유효하지 않은 차량 상태
        """
        if v not in [s.value for s in VehicleStatus]:
            raise ValueError(f"유효하지 않은 차량 상태입니다. 가능한 값: {[s.value for s in VehicleStatus]}")
        return v
    
    @validator("sale_date")
    @classmethod
    def validate_sale_date(cls, v, values):
        """
        판매일 검증 메서드 - 구매일 이후여야 함
        
        Args:
            cls: 클래스 인스턴스
            v: 검증할 값
            values: 다른 필드 값들
            
        Returns:
            검증된 값
        
        Raises:
            ValueError: 유효하지 않은 판매일
        """
        if v and 'purchase_date' in values and values['purchase_date']:
            if v < values['purchase_date']:
                raise ValueError("판매일은 구매일 이후여야 합니다")
        return v

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    type: Optional[str] = None
    color: Optional[str] = None
    license_plate: Optional[str] = None
    vin: Optional[str] = None
    status: Optional[str] = None
    
    # 재무 관련 필드 추가
    purchase_price: Optional[float] = None
    purchase_date: Optional[date] = None
    sale_price: Optional[float] = None
    sale_date: Optional[date] = None
    depreciation_rate: Optional[float] = None
    current_value: Optional[float] = None
    finance_notes: Optional[str] = None
    insurance_cost: Optional[float] = None
    insurance_expiry: Optional[date] = None
    
    @validator("type")
    @classmethod
    def validate_vehicle_type(cls, v):
        """
        차량 유형 검증 메서드
        
        Args:
            cls: 클래스 인스턴스
            v: 검증할 값
        
        Returns:
            검증된 값
            
        Raises:
            ValueError: 유효하지 않은 차량 유형
        """
        if v is not None and v not in [t.value for t in VehicleType]:
            raise ValueError(f"유효하지 않은 차량 유형입니다. 가능한 값: {[t.value for t in VehicleType]}")
        return v
        
    @validator("status")
    @classmethod
    def validate_vehicle_status(cls, v):
        """
        차량 상태 검증 메서드
        
        Args:
            cls: 클래스 인스턴스
            v: 검증할 값
        
        Returns:
            검증된 값
            
        Raises:
            ValueError: 유효하지 않은 차량 상태
        """
        if v is not None and v not in [s.value for s in VehicleStatus]:
            raise ValueError(f"유효하지 않은 차량 상태입니다. 가능한 값: {[s.value for s in VehicleStatus]}")
        return v
        
    @validator("sale_date")
    @classmethod
    def validate_sale_date(cls, v, values):
        """
        판매일 검증 메서드 - 구매일 이후여야 함
        
        Args:
            cls: 클래스 인스턴스
            v: 검증할 값
            values: 다른 필드 값들
            
        Returns:
            검증된 값
        
        Raises:
            ValueError: 유효하지 않은 판매일
        """
        if v and 'purchase_date' in values and values['purchase_date']:
            if v < values['purchase_date']:
                raise ValueError("판매일은 구매일 이후여야 합니다")
        return v

class VehicleInDB(VehicleBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class VehicleResponse(VehicleInDB):
    pass

# 재무 요약 정보 스키마
class VehicleFinanceSummary(BaseModel):
    total_maintenance_cost: float
    current_value: Optional[float]
    value_depreciation: Optional[float]
    value_depreciation_percentage: Optional[float]
    roi: Optional[float]
    insurance_valid: bool
    days_to_insurance_expiry: Optional[int]

# 차량 상세 응답 스키마 (재무 정보 포함)
class VehicleDetailWithFinance(VehicleResponse):
    finance_summary: VehicleFinanceSummary
    maintenance_summary: Dict[str, Any]

# 응답 형식 정의
class VehicleListResponse(BaseModel):
    success: bool = True
    message: str
    count: int
    data: List[VehicleResponse]
    
class VehicleDetailResponse(BaseModel):
    success: bool = True
    message: str
    data: VehicleResponse

# 재무 정보가 포함된 상세 응답
class VehicleDetailFinanceResponse(BaseModel):
    success: bool = True
    message: str
    data: VehicleDetailWithFinance