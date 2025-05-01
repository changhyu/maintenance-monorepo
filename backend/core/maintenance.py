from enum import Enum
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field, validator

class MaintenanceType(str, Enum):
    """정비 유형"""
    OIL_CHANGE = "oil_change"  # 오일 교환
    TIRE_ROTATION = "tire_rotation"  # 타이어 교체
    BRAKE_SERVICE = "brake_service"  # 브레이크 정비
    ENGINE_SERVICE = "engine_service"  # 엔진 정비
    TRANSMISSION_SERVICE = "transmission_service"  # 변속기 정비
    ELECTRICAL_SERVICE = "electrical_service"  # 전기 정비
    BODY_SERVICE = "body_service"  # 차체 정비
    OTHER = "other"  # 기타

class MaintenanceStatus(str, Enum):
    """정비 상태"""
    PENDING = "pending"  # 대기 중
    IN_PROGRESS = "in_progress"  # 진행 중
    COMPLETED = "completed"  # 완료
    CANCELLED = "cancelled"  # 취소
    FAILED = "failed"  # 실패

class MaintenancePriority(str, Enum):
    """정비 우선순위"""
    LOW = "low"  # 낮음
    NORMAL = "normal"  # 보통
    HIGH = "high"  # 높음
    URGENT = "urgent"  # 긴급

class MaintenancePart(BaseModel):
    """정비 부품 모델"""
    name: str
    part_number: str
    quantity: int
    unit_cost: float
    
    @property
    def total_cost(self) -> float:
        """총 비용 계산"""
        return self.quantity * self.unit_cost

class MaintenanceBase(BaseModel):
    """정비 기본 모델"""
    vehicle_id: str
    maintenance_type: MaintenanceType
    status: MaintenanceStatus = MaintenanceStatus.PENDING
    priority: MaintenancePriority = MaintenancePriority.NORMAL
    description: str
    cost: float = 0.0
    start_date: datetime
    end_date: Optional[datetime] = None
    technician_id: Optional[str] = None
    parts: List[Dict[str, Any]] = []
    notes: Optional[str] = None

    @validator('start_date', 'end_date', pre=True)
    def ensure_timezone(cls, v):
        """날짜 필드에 시간대가 없는 경우 UTC로 설정"""
        if isinstance(v, datetime) and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v

    @validator('end_date')
    def validate_end_date(cls, v, values):
        """종료 날짜가 시작 날짜보다 이후인지 검증"""
        if v and values.get('start_date') and v < values['start_date']:
            raise ValueError('종료 날짜는 시작 날짜보다 이후여야 합니다')
        return v

class MaintenanceCreate(MaintenanceBase):
    """정비 생성 모델"""
    pass

class MaintenanceUpdate(BaseModel):
    """정비 업데이트 모델"""
    maintenance_type: Optional[MaintenanceType] = None
    status: Optional[MaintenanceStatus] = None
    priority: Optional[MaintenancePriority] = None
    description: Optional[str] = None
    cost: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    technician_id: Optional[str] = None
    parts: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None

    @validator('start_date', 'end_date', pre=True)
    def ensure_timezone(cls, v):
        """날짜 필드에 시간대가 없는 경우 UTC로 설정"""
        if isinstance(v, datetime) and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v

class Maintenance(MaintenanceBase):
    """정비 모델"""
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MaintenanceManager:
    """정비 관리자"""
    _maintenances: List[Maintenance] = []
    _maintenance_handlers: Dict[MaintenanceType, List[callable]] = {}

    @classmethod
    def register_handler(cls, maintenance_type: MaintenanceType, handler: callable):
        """정비 핸들러 등록"""
        if maintenance_type not in cls._maintenance_handlers:
            cls._maintenance_handlers[maintenance_type] = []
        cls._maintenance_handlers[maintenance_type].append(handler)

    @classmethod
    def create_maintenance(cls, maintenance: Maintenance) -> Maintenance:
        """정비 생성"""
        # 시간대가 없으면 UTC 추가
        if maintenance.created_at.tzinfo is None:
            maintenance.created_at = maintenance.created_at.replace(tzinfo=timezone.utc)
        if maintenance.updated_at.tzinfo is None:
            maintenance.updated_at = maintenance.updated_at.replace(tzinfo=timezone.utc)
            
        cls._maintenances.append(maintenance)
        return maintenance

    @classmethod
    def get_maintenance(cls, maintenance_id: str) -> Optional[Maintenance]:
        """정비 조회"""
        return next((m for m in cls._maintenances if m.id == maintenance_id), None)

    @classmethod
    def update_maintenance(cls, maintenance_id: str, updates: Dict[str, Any]) -> Optional[Maintenance]:
        """정비 업데이트"""
        maintenance = cls.get_maintenance(maintenance_id)
        if not maintenance:
            return None
            
        # 업데이트
        for key, value in updates.items():
            if hasattr(maintenance, key):
                setattr(maintenance, key, value)
                
        # 업데이트 시간 설정
        maintenance.updated_at = datetime.now(timezone.utc)
        return maintenance

    @classmethod
    def delete_maintenance(cls, maintenance_id: str) -> bool:
        """정비 삭제"""
        maintenance = cls.get_maintenance(maintenance_id)
        if maintenance:
            cls._maintenances.remove(maintenance)
            return True
        return False

    @classmethod
    def get_maintenances(cls, vehicle_id: Optional[str] = None) -> List[Maintenance]:
        """정비 목록 조회"""
        if vehicle_id:
            return [m for m in cls._maintenances if m.vehicle_id == vehicle_id]
        return cls._maintenances

    @classmethod
    def get_maintenances_by_status(cls, status: MaintenanceStatus) -> List[Maintenance]:
        """상태별 정비 목록 조회"""
        return [m for m in cls._maintenances if m.status == status]

    @classmethod
    def get_maintenances_by_technician(cls, technician_id: str) -> List[Maintenance]:
        """기술자별 정비 목록 조회"""
        return [m for m in cls._maintenances if m.technician_id == technician_id]

    @classmethod
    def get_maintenances_by_date_range(cls, start_date: datetime, end_date: datetime) -> List[Maintenance]:
        """기간별 정비 목록 조회"""
        # 시간대가 없으면 UTC 추가
        if start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)
            
        return [m for m in cls._maintenances if start_date <= m.start_date <= end_date]

    @classmethod
    def get_maintenances_by_priority(cls, priority: MaintenancePriority) -> List[Maintenance]:
        """우선순위별 정비 목록 조회"""
        return [m for m in cls._maintenances if m.priority == priority]

    @classmethod
    def get_maintenances_by_type(cls, maintenance_type: MaintenanceType) -> List[Maintenance]:
        """유형별 정비 목록 조회"""
        return [m for m in cls._maintenances if m.maintenance_type == maintenance_type]

    @classmethod
    def get_maintenances_by_cost_range(cls, min_cost: float, max_cost: float) -> List[Maintenance]:
        """비용 범위별 정비 목록 조회"""
        return [m for m in cls._maintenances if min_cost <= m.cost <= max_cost]

    @classmethod
    def get_maintenances_by_parts(cls, part_name: str) -> List[Maintenance]:
        """부품별 정비 목록 조회"""
        return [m for m in cls._maintenances if any(part["name"] == part_name for part in m.parts)]

    @classmethod
    def get_maintenances_by_notes(cls, keyword: str) -> List[Maintenance]:
        """메모 키워드별 정비 목록 조회"""
        return [m for m in cls._maintenances if m.notes and keyword.lower() in m.notes.lower()]

    @classmethod
    def get_maintenances_by_description(cls, keyword: str) -> List[Maintenance]:
        """설명 키워드별 정비 목록 조회"""
        return [m for m in cls._maintenances if keyword.lower() in m.description.lower()]

    @classmethod
    def get_maintenances_by_vehicle_and_date(cls, vehicle_id: str, date: datetime) -> List[Maintenance]:
        """차량 및 날짜별 정비 목록 조회"""
        # 시간대가 없으면 UTC 추가
        if date.tzinfo is None:
            date = date.replace(tzinfo=timezone.utc)
            
        return [m for m in cls._maintenances 
                if m.vehicle_id == vehicle_id and m.start_date.date() == date.date()]

    @classmethod
    def get_maintenances_by_vehicle_and_status(cls, vehicle_id: str, status: MaintenanceStatus) -> List[Maintenance]:
        """차량 및 상태별 정비 목록 조회"""
        return [m for m in cls._maintenances if m.vehicle_id == vehicle_id and m.status == status]

    @classmethod
    def get_maintenances_by_vehicle_and_type(cls, vehicle_id: str, maintenance_type: MaintenanceType) -> List[Maintenance]:
        """차량 및 유형별 정비 목록 조회"""
        return [m for m in cls._maintenances 
                if m.vehicle_id == vehicle_id and m.maintenance_type == maintenance_type]

    @classmethod
    def get_maintenances_by_vehicle_and_priority(cls, vehicle_id: str, priority: MaintenancePriority) -> List[Maintenance]:
        """차량 및 우선순위별 정비 목록 조회"""
        return [m for m in cls._maintenances if m.vehicle_id == vehicle_id and m.priority == priority]

    @classmethod
    def get_maintenances_by_vehicle_and_cost_range(cls, vehicle_id: str, min_cost: float, max_cost: float) -> List[Maintenance]:
        """차량 및 비용 범위별 정비 목록 조회"""
        return [m for m in cls._maintenances 
                if m.vehicle_id == vehicle_id and min_cost <= m.cost <= max_cost]

    @classmethod
    def get_maintenances_by_vehicle_and_parts(cls, vehicle_id: str, part_name: str) -> List[Maintenance]:
        """차량 및 부품별 정비 목록 조회"""
        return [m for m in cls._maintenances 
                if m.vehicle_id == vehicle_id and 
                any(part["name"] == part_name for part in m.parts)]

    @classmethod
    def get_maintenances_by_vehicle_and_notes(cls, vehicle_id: str, keyword: str) -> List[Maintenance]:
        """차량 및 메모 키워드별 정비 목록 조회"""
        return [m for m in cls._maintenances 
                if m.vehicle_id == vehicle_id and 
                m.notes and keyword.lower() in m.notes.lower()]

    @classmethod
    def get_maintenances_by_vehicle_and_description(cls, vehicle_id: str, keyword: str) -> List[Maintenance]:
        """차량 및 설명 키워드별 정비 목록 조회"""
        return [m for m in cls._maintenances 
                if m.vehicle_id == vehicle_id and keyword.lower() in m.description.lower()]

    @classmethod
    def get_maintenances_by_technician_and_date(cls, technician_id: str, date: datetime) -> List[Maintenance]:
        """기술자 및 날짜별 정비 목록 조회"""
        return [m for m in cls._maintenances if m.technician_id == technician_id and m.start_date.date() == date.date()]

    @classmethod
    def get_maintenances_by_technician_and_status(cls, technician_id: str, status: MaintenanceStatus) -> List[Maintenance]:
        """기술자 및 상태별 정비 목록 조회"""
        return [m for m in cls._maintenances if m.technician_id == technician_id and m.status == status]

    @classmethod
    def get_maintenances_by_technician_and_type(cls, technician_id: str, maintenance_type: MaintenanceType) -> List[Maintenance]:
        """기술자 및 유형별 정비 목록 조회"""
        return [m for m in cls._maintenances if m.technician_id == technician_id and m.maintenance_type == maintenance_type]

    @classmethod
    def get_maintenances_by_technician_and_priority(cls, technician_id: str, priority: MaintenancePriority) -> List[Maintenance]:
        """기술자 및 우선순위별 정비 목록 조회"""
        return [m for m in cls._maintenances if m.technician_id == technician_id and m.priority == priority]

    @classmethod
    def get_maintenances_by_technician_and_cost_range(cls, technician_id: str, min_cost: float, max_cost: float) -> List[Maintenance]:
        """기술자 및 비용 범위별 정비 목록 조회"""
        return [m for m in cls._maintenances if m.technician_id == technician_id and min_cost <= m.cost <= max_cost]

    @classmethod
    def get_maintenances_by_technician_and_parts(cls, technician_id: str, part_name: str) -> List[Maintenance]:
        """기술자 및 부품별 정비 목록 조회"""
        return [m for m in cls._maintenances if m.technician_id == technician_id and any(part["name"] == part_name for part in m.parts)]

    @classmethod
    def get_maintenances_by_technician_and_notes(cls, technician_id: str, keyword: str) -> List[Maintenance]:
        """기술자 및 메모 키워드별 정비 목록 조회"""
        return [m for m in cls._maintenances if m.technician_id == technician_id and m.notes and keyword in m.notes]

    @classmethod
    def get_maintenances_by_technician_and_description(cls, technician_id: str, keyword: str) -> List[Maintenance]:
        """기술자 및 설명 키워드별 정비 목록 조회"""
        return [m for m in cls._maintenances if m.technician_id == technician_id and keyword in m.description] 