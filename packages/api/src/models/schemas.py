"""
Pydantic schemas for API request and response validation.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Generic, List, Optional, TypeVar, Union

# REMOVED: from pydantic import BaseModel, Field, EmailStr, ConfigDict
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.generics import GenericModel

# 필드 설명 상수
VEHICLE_ID_DESC = "차량 ID"


# 기본 스키마
class BaseSchema(BaseModel):
    """기본 스키마 클래스."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


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


class MaintenancePriority(str, Enum):
    """정비 우선순위 열거형."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


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


class TodoPriority(str, Enum):
    """Todo 우선순위 열거형."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TodoStatus(str, Enum):
    """Todo 상태 열거형."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


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

    vehicle_id: str = Field(..., description=VEHICLE_ID_DESC)
    type: str = Field(
        ...,
        description="정비 유형 (routine, repair, emergency, recall, inspection, oil_change, seasonal)",
    )
    description: str = Field(..., description="정비 설명")
    date: datetime = Field(..., description="정비 예정일")
    status: MaintenanceStatus = Field(
        default=MaintenanceStatus.SCHEDULED, description="정비 상태"
    )
    cost: float = Field(default=0.0, description="비용")
    mileage: Optional[int] = Field(None, description="주행거리")
    performed_by: Optional[str] = Field(None, description="정비 수행자")
    provider: Optional[str] = Field(None, description="정비소")
    notes: Optional[str] = Field(None, description="비고")
    completion_date: Optional[datetime] = Field(None, description="완료일")


class MaintenanceCreate(MaintenanceBase):
    """정비 생성 스키마."""

    pass


class MaintenanceUpdate(BaseSchema):
    """정비 업데이트 스키마."""

    type: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    status: Optional[MaintenanceStatus] = None
    cost: Optional[float] = None
    mileage: Optional[int] = None
    performed_by: Optional[str] = None
    provider: Optional[str] = None
    notes: Optional[str] = None
    completion_date: Optional[datetime] = None


class MaintenancePartBase(BaseSchema):
    """정비 부품 기본 스키마."""

    name: str = Field(..., description="부품명")
    part_number: Optional[str] = Field(None, description="부품 번호")
    quantity: int = Field(default=1, description="수량")
    unit_cost: float = Field(default=0.0, description="단가")
    total_cost: float = Field(default=0.0, description="총액")
    replaced: bool = Field(default=True, description="교체 여부")
    condition: Optional[str] = Field(None, description="상태 (new, used, refurbished)")


class MaintenanceDocumentBase(BaseSchema):
    """정비 문서 기본 스키마."""

    file_name: str = Field(..., description="파일명")
    file_url: str = Field(..., description="파일 URL")
    file_type: Optional[str] = Field(None, description="파일 타입")
    file_size: Optional[int] = Field(None, description="파일 크기")
    description: Optional[str] = Field(None, description="설명")


class MaintenancePart(MaintenancePartBase):
    """정비 부품 응답 스키마."""

    id: str
    maintenance_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class MaintenanceDocument(MaintenanceDocumentBase):
    """정비 문서 응답 스키마."""

    id: str
    maintenance_id: str
    uploaded_at: datetime

    class Config:
        orm_mode = True


class MaintenanceResponse(MaintenanceBase):
    """정비 응답 스키마."""

    id: str
    created_at: datetime
    updated_at: datetime
    vehicle_info: Optional[Dict[str, Any]] = None
    shop_info: Optional[Dict[str, Any]] = None
    assigned_to_info: Optional[Dict[str, Any]] = None


class MaintenanceListResponse(BaseSchema):
    """정비 목록 응답 스키마."""

    maintenance_records: List[MaintenanceResponse] = Field(
        ..., description="정비 기록 목록"
    )
    total: int = Field(..., description="전체 정비 기록 수")
    page: int = Field(default=1, description="현재 페이지 번호")
    limit: int = Field(..., description="페이지당 항목 수")
    has_more: bool = Field(default=False, description="다음 페이지 존재 여부")


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
    business_hours: List[BusinessHoursSchema] = Field(
        default_factory=list, description="영업 시간"
    )


class ShopCreate(ShopBase):
    """정비소 생성 스키마."""

    owner_id: Optional[str] = Field(None, description="소유자 ID")
    services: Optional[List[str]] = Field(
        default_factory=list, description="제공 서비스"
    )


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

    sub: Optional[str] = None
    exp: Optional[int] = None


# 할 일 관련 스키마
class TodoBase(BaseSchema):
    """할 일 기본 스키마."""

    title: str = Field(..., description="제목")
    description: Optional[str] = Field(None, description="설명")
    due_date: Optional[datetime] = Field(None, description="마감일")
    status: TodoStatus = Field(default=TodoStatus.PENDING, description="상태")
    priority: TodoPriority = Field(default=TodoPriority.MEDIUM, description="우선순위")
    vehicle_id: Optional[str] = Field(None, description=VEHICLE_ID_DESC)
    user_id: str = Field(..., description="담당자 ID")
    assignee_id: Optional[str] = Field(None, description="할당자 ID")
    related_entity_type: Optional[str] = Field(None, description="관련 엔티티 타입")
    related_entity_id: Optional[str] = Field(None, description="관련 엔티티 ID")


class TodoCreate(TodoBase):
    """Todo 생성 스키마."""

    pass


class TodoUpdate(BaseSchema):
    """Todo 업데이트 스키마."""

    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[TodoStatus] = None
    priority: Optional[TodoPriority] = None
    vehicle_id: Optional[str] = None
    assignee_id: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None


class Todo(TodoBase):
    """Todo 응답 스키마."""

    id: str
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    # 추가 속성 - 관련 객체 정보
    vehicle_info: Optional[Dict[str, Any]] = None
    user_info: Optional[Dict[str, Any]] = None
    assignee_info: Optional[Dict[str, Any]] = None
    related_entity_info: Optional[Dict[str, Any]] = None


# 할 일 응답 모델을 위한 집계 스키마
class TodoStats(BaseSchema):
    """Todo 통계 스키마."""

    total: int = Field(..., description="전체 할 일 수")
    pending: int = Field(..., description="대기 중인 할 일 수")
    in_progress: int = Field(..., description="진행 중인 할 일 수")
    completed: int = Field(..., description="완료된 할 일 수")
    cancelled: int = Field(..., description="취소된 할 일 수")
    overdue: int = Field(..., description="기한이 지난 할 일 수")
    upcoming: int = Field(..., description="다가오는 할 일 수")

    by_priority: Dict[str, int] = Field(..., description="우선순위별 할 일 수")
    by_vehicle: Optional[Dict[str, int]] = Field(None, description="차량별 할 일 수")
    by_assignee: Optional[Dict[str, int]] = Field(None, description="담당자별 할 일 수")


class TodoFilter(BaseSchema):
    """Todo 필터 스키마."""

    status: Optional[List[TodoStatus]] = None
    priority: Optional[List[TodoPriority]] = None
    vehicle_id: Optional[str] = None
    user_id: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date_from: Optional[datetime] = None
    due_date_to: Optional[datetime] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    search_term: Optional[str] = None


class TodoResponse(BaseSchema):
    """Todo 응답 스키마."""

    id: str
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: TodoStatus
    priority: TodoPriority
    vehicle_id: Optional[str] = None
    user_id: str
    assignee_id: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    # 추가 속성 - 관련 객체 정보
    vehicle_info: Optional[Dict[str, Any]] = None
    user_info: Optional[Dict[str, Any]] = None
    assignee_info: Optional[Dict[str, Any]] = None
    related_entity_info: Optional[Dict[str, Any]] = None


class TodoListResponse(BaseSchema):
    """Todo 목록 응답 스키마."""

    todos: List[TodoResponse]
    total: int
    page: int
    limit: int
    stats: Optional[TodoStats] = None


# 제네릭 타입 변수 정의
T = TypeVar("T")


class APIResponse(GenericModel, Generic[T]):
    """표준 API 응답 형식"""

    success: bool = True
    data: Optional[T] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    @classmethod
    def success_response(
        cls, data: T, metadata: Optional[Dict[str, Any]] = None
    ) -> "APIResponse[T]":
        """성공 응답 생성"""
        return cls(success=True, data=data, metadata=metadata)

    @classmethod
    def error_response(
        cls, error: str, metadata: Optional[Dict[str, Any]] = None
    ) -> "APIResponse[None]":
        """오류 응답 생성"""
        return cls(success=False, error=error, metadata=metadata)


class TodoDetailResponse(APIResponse[TodoResponse]):
    """Todo 상세 응답"""

    pass


# 페이지네이션 응답 타입 정의를 위한 제네릭 타입 변수
T = TypeVar("T")


class Pagination(BaseModel):
    """페이지네이션 메타데이터"""

    total: int
    offset: int
    limit: int
    has_more: bool


class PaginatedResponse(BaseModel, Generic[T]):
    """페이지네이션 응답"""

    items: List[T]
    pagination: Pagination


class VehicleListResponse(PaginatedResponse[Vehicle]):
    """차량 목록 페이지네이션 응답"""

    pass


class ScheduleStatus(str, Enum):
    """일정 상태 열거형."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SchedulePriority(str, Enum):
    """일정 우선순위 열거형."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class RecurrencePattern(str, Enum):
    """반복 패턴 열거형."""

    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class MaintenanceType(str, Enum):
    """정비 유형 열거형."""

    REGULAR = "regular"
    OIL_CHANGE = "oil_change"
    INSPECTION = "inspection"
    REPAIR = "repair"
    TIRE_CHANGE = "tire_change"
    BRAKE_SERVICE = "brake_service"
    ENGINE_SERVICE = "engine_service"
    TRANSMISSION = "transmission"
    ELECTRICAL = "electrical"
    AC_SERVICE = "ac_service"
    BODY_WORK = "body_work"
    OTHER = "other"


# 일정 관련 스키마
class ScheduleReminderBase(BaseSchema):
    """일정 알림 기본 스키마."""

    reminder_time: datetime = Field(..., description="알림 시간")
    reminder_type: str = Field(default="email", description="알림 타입")


class ScheduleReminderCreate(ScheduleReminderBase):
    """일정 알림 생성 스키마."""

    pass


class ScheduleReminderResponse(ScheduleReminderBase):
    """일정 알림 응답 스키마."""

    id: str
    schedule_id: str
    status: str
    created_at: datetime


class ScheduleNoteBase(BaseSchema):
    """일정 노트 기본 스키마."""

    content: str = Field(..., description="노트 내용")
    created_by: Optional[str] = Field(None, description="작성자")


class ScheduleNoteCreate(ScheduleNoteBase):
    """일정 노트 생성 스키마."""

    pass


class ScheduleNoteResponse(ScheduleNoteBase):
    """일정 노트 응답 스키마."""

    id: str
    schedule_id: str
    created_at: datetime
    updated_at: datetime


class ScheduleBase(BaseSchema):
    """일정 기본 스키마."""

    vehicle_id: str = Field(..., description=VEHICLE_ID_DESC)
    title: str = Field(..., description="일정 제목")
    description: Optional[str] = Field(None, description="일정 설명")
    scheduled_date: datetime = Field(..., description="예약 일시")
    end_date: Optional[datetime] = Field(None, description="종료 일시")
    estimated_duration: Optional[int] = Field(60, description="예상 소요 시간(분)")
    estimated_cost: Optional[float] = Field(0.0, description="예상 비용")
    maintenance_type: MaintenanceType = Field(..., description="정비 유형")
    status: ScheduleStatus = Field(
        default=ScheduleStatus.PENDING, description="일정 상태"
    )
    is_recurring: bool = Field(default=False, description="반복 여부")
    recurrence_pattern: Optional[RecurrencePattern] = Field(
        None, description="반복 패턴"
    )
    recurrence_interval: Optional[int] = Field(1, description="반복 간격")
    priority: SchedulePriority = Field(
        default=SchedulePriority.NORMAL, description="우선순위"
    )
    assigned_to: Optional[str] = Field(None, description="담당자")
    shop_id: Optional[str] = Field(None, description="정비소 ID")


class ScheduleCreate(ScheduleBase):
    """일정 생성 스키마."""

    reminders: Optional[List[ScheduleReminderCreate]] = Field(
        default_factory=list, description="알림 설정"
    )
    notes: Optional[List[ScheduleNoteCreate]] = Field(
        default_factory=list, description="노트"
    )


class ScheduleUpdate(BaseSchema):
    """일정 업데이트 스키마."""

    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    estimated_duration: Optional[int] = None
    estimated_cost: Optional[float] = None
    maintenance_type: Optional[MaintenanceType] = None
    status: Optional[ScheduleStatus] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[RecurrencePattern] = None
    recurrence_interval: Optional[int] = None
    priority: Optional[SchedulePriority] = None
    assigned_to: Optional[str] = None
    shop_id: Optional[str] = None
    reminders: Optional[List[ScheduleReminderCreate]] = None
    notes: Optional[List[ScheduleNoteCreate]] = None


class ScheduleStatusUpdate(BaseSchema):
    """일정 상태 업데이트 스키마."""

    status: ScheduleStatus = Field(..., description="변경할 상태")


class ScheduleResponse(ScheduleBase):
    """일정 응답 스키마."""

    id: str
    created_at: datetime
    updated_at: datetime
    reminders: Optional[List[ScheduleReminderResponse]] = Field(
        default_factory=list, description="알림 설정"
    )
    notes: Optional[List[ScheduleNoteResponse]] = Field(
        default_factory=list, description="노트"
    )

    # 추가 정보
    vehicle_info: Optional[Dict[str, Any]] = None
    shop_info: Optional[Dict[str, Any]] = None
    assigned_to_info: Optional[Dict[str, Any]] = None


class ScheduleListResponse(BaseSchema):
    """일정 목록 응답 스키마."""

    schedules: List[ScheduleResponse] = Field(..., description="일정 목록")
    total: int = Field(..., description="전체 일정 수")
    page: int = Field(default=1, description="현재 페이지 번호")
    limit: int = Field(..., description="페이지당 항목 수")
    has_more: bool = Field(default=False, description="다음 페이지 존재 여부")


# API 공통 응답 스키마
class APIErrorResponse(BaseSchema):
    """API 오류 응답 스키마."""

    status: str = Field(default="error", description="응답 상태")
    code: int = Field(..., description="HTTP 상태 코드")
    message: str = Field(..., description="오류 메시지")
    details: Optional[Dict[str, Any]] = Field(None, description="추가 오류 상세 정보")
    timestamp: datetime = Field(
        default_factory=datetime.now, description="오류 발생 시간"
    )


class APISuccessResponse(BaseSchema):
    """API 성공 응답 스키마(데이터가 없는 경우)."""

    status: str = Field(default="success", description="응답 상태")
    message: str = Field(..., description="성공 메시지")
    timestamp: datetime = Field(default_factory=datetime.now, description="응답 시간")


class MaintenanceFilter(BaseSchema):
    """정비 필터 스키마."""

    status: Optional[List[MaintenanceStatus]] = None
    priority: Optional[List[MaintenancePriority]] = None
    vehicle_id: Optional[str] = None
    shop_id: Optional[str] = None
    user_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    maintenance_type: Optional[List[str]] = None
    search_term: Optional[str] = None


class ShopImageResponse(BaseModel):
    id: int
    image_url: str


class ShopImageBatchResponse(BaseModel):
    images: List[ShopImageResponse]


ApiResponse = APIResponse

# 위치 관련 스키마
class LocationBase(BaseModel):
    """위치 기본 스키마"""
    name: Optional[str] = None
    latitude: float
    longitude: float
    altitude: Optional[float] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    type: Optional[str] = None  # 위치 유형 (사무실, 창고, 주차장 등)
    notes: Optional[str] = None

class LocationCreate(LocationBase):
    """위치 생성 스키마"""
    pass

class LocationUpdate(BaseModel):
    """위치 업데이트 스키마"""
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    type: Optional[str] = None
    notes: Optional[str] = None

class LocationRead(LocationBase):
    """위치 조회 스키마"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# 차량 위치 관련 스키마
class VehicleCoordinates(BaseModel):
    """차량 좌표 스키마"""
    latitude: float
    longitude: float
    altitude: Optional[float] = None

class VehicleLocationBase(BaseModel):
    """차량 위치 기본 스키마"""
    vehicle_id: int
    latitude: float
    longitude: float
    altitude: Optional[float] = None
    heading: Optional[float] = None  # 진행 방향 (도)
    speed: Optional[float] = None    # 속도 (km/h)
    accuracy: Optional[float] = None # 위치 정확도 (미터)

class VehicleLocationCreate(VehicleLocationBase):
    """차량 위치 생성 스키마"""
    timestamp: Optional[datetime] = None

class VehicleLocationRead(VehicleLocationBase):
    """차량 위치 조회 스키마"""
    id: int
    timestamp: datetime
    
    class Config:
        orm_mode = True

class VehicleLocationHistory(BaseModel):
    """차량 위치 이력 스키마"""
    vehicle_id: int
    locations: List[VehicleLocationRead]
    start_time: datetime
    end_time: datetime
    total_distance: Optional[float] = None  # 총 이동 거리 (미터)
    avg_speed: Optional[float] = None       # 평균 속도 (km/h)
