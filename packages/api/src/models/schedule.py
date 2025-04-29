"""
정비 일정 관리 모델 정의
"""

from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from sqlalchemy import Boolean, Column, DateTime
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .base import Base


class ScheduleStatus(str, Enum):
    """일정 상태 열거형"""

    SCHEDULED = "SCHEDULED"  # 예약됨
    IN_PROGRESS = "IN_PROGRESS"  # 진행 중
    COMPLETED = "COMPLETED"  # 완료됨
    CANCELLED = "CANCELLED"  # 취소됨
    PENDING = "PENDING"  # 대기 중


class SchedulePriority(str, Enum):
    """일정 우선순위 열거형"""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class MaintenanceType(str, Enum):
    """정비 유형 열거형"""

    GENERAL = "general"
    ENGINE = "engine"
    TIRE = "tire"


class ReminderType(str, Enum):
    """알림 유형 열거형"""

    EMAIL = "email"
    IN_APP = "in-app"
    PUSH = "push"
    SMS = "sms"


class ReminderStatus(str, Enum):
    """알림 상태 열거형"""

    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class RecurrencePattern(str, Enum):
    """반복 패턴 열거형"""

    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class MaintenanceScheduleModel(Base):
    """정비 일정 모델"""

    __tablename__ = "maintenance_schedules"

    id = Column(String(36), primary_key=True, index=True)
    vehicle_id = Column(
        String(36), ForeignKey("vehicles.id"), nullable=False, index=True
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    scheduled_date = Column(DateTime, nullable=False, index=True)
    completed_date = Column(DateTime, nullable=True)
    vehicle_mileage = Column(Integer, nullable=True)
    estimated_duration = Column(Integer, default=60)  # 분 단위
    estimated_cost = Column(Float, nullable=True)
    actual_cost = Column(Float, nullable=True)
    maintenance_type = Column(String(50), nullable=False, index=True)
    status = Column(String(50), default=ScheduleStatus.SCHEDULED.value, nullable=False)
    is_recurring = Column(Boolean, default=False, nullable=False)
    recurrence_pattern = Column(String(50), nullable=True)
    recurrence_interval = Column(Integer, default=1)  # 반복 간격 (1일, 1주, 1달, 1년)
    notification_sent = Column(Boolean, default=False)
    notification_date = Column(DateTime, nullable=True)
    priority = Column(String(50), default=SchedulePriority.NORMAL.value)
    assigned_to = Column(String(36), nullable=True, index=True)
    shop_id = Column(String(36), ForeignKey("shops.id"), nullable=True, index=True)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # 관계 설정
    vehicle = relationship("Vehicle", back_populates="maintenance_schedules", lazy="selectin")
    shop = relationship("ShopModel", back_populates="schedules", lazy="selectin")
    reminders = relationship(
        "ScheduleReminderModel", back_populates="schedule", cascade="all, delete-orphan", lazy="selectin"
    )
    notes = relationship(
        "ScheduleNoteModel", back_populates="schedule", cascade="all, delete-orphan", lazy="selectin"
    )
    next_schedule = relationship(
        "MaintenanceScheduleModel", remote_side=[id], uselist=False, lazy="selectin"
    )
    previous_schedule = relationship("MaintenanceScheduleModel", uselist=False, lazy="selectin")
    maintenance_items = relationship(
        "MaintenanceItemModel", back_populates="schedule", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self):
        return f"<MaintenanceScheduleModel(id={self.id}, vehicle_id={self.vehicle_id}, status={self.status})>"

    @property
    def is_completed(self) -> bool:
        """일정이 완료되었는지 확인"""
        return self.status == ScheduleStatus.COMPLETED.value

    @property
    def is_pending(self) -> bool:
        """일정이 대기 중인지 확인"""
        return self.status == ScheduleStatus.SCHEDULED.value

    @property
    def is_upcoming(self) -> bool:
        """일정이 앞으로 있을 일정인지 확인"""
        now = datetime.now(timezone.utc)
        return self.is_pending and self.scheduled_date > now

    @property
    def is_overdue(self) -> bool:
        """일정이 기한이 지났는지 확인"""
        now = datetime.now(timezone.utc)
        return self.is_pending and self.scheduled_date < now

    @property
    def time_to_appointment(self) -> Optional[timedelta]:
        """일정까지 남은 시간 반환"""
        if not self.is_upcoming:
            return None
        now = datetime.now(timezone.utc)
        return self.scheduled_date - now

    @property
    def duration_as_timedelta(self) -> timedelta:
        """예상 소요 시간을 timedelta로 반환"""
        return timedelta(minutes=self.estimated_duration or 0)

    @property
    def end_time(self) -> datetime:
        """일정 종료 예상 시간 반환"""
        if self.completed_date:
            return self.completed_date
        return self.scheduled_date + self.duration_as_timedelta

    def _validate_required_fields(self) -> List[str]:
        """필수 필드 검증"""
        errors = []
        if not self.title:
            errors.append("제목은 필수값입니다.")
        if not self.vehicle_id:
            errors.append("차량 ID는 필수값입니다.")
        if not self.scheduled_date:
            errors.append("예약 일시는 필수값입니다.")
        return errors

    def _validate_status(self) -> List[str]:
        """상태값 검증"""
        try:
            ScheduleStatus(self.status)
            return []
        except ValueError:
            valid_statuses = ", ".join([s.value for s in ScheduleStatus])
            return [f"유효하지 않은 상태값입니다. 가능한 값: {valid_statuses}"]

    def _validate_priority(self) -> List[str]:
        """우선순위 검증"""
        if not self.priority:
            return []
        try:
            SchedulePriority(self.priority)
            return []
        except ValueError:
            valid_priorities = ", ".join([p.value for p in SchedulePriority])
            return [f"유효하지 않은 우선순위입니다. 가능한 값: {valid_priorities}"]

    def _validate_recurrence(self) -> List[str]:
        """반복 설정 검증"""
        if not self.is_recurring:
            return []

        errors = []
        if not self.recurrence_pattern:
            errors.append("반복 일정은 반복 패턴을 설정해야 합니다.")
        else:
            try:
                RecurrencePattern(self.recurrence_pattern)
            except ValueError:
                valid_patterns = ", ".join([p.value for p in RecurrencePattern])
                errors.append(
                    f"유효하지 않은 반복 패턴입니다. 가능한 값: {valid_patterns}"
                )
        return errors

    def _validate_dates(self) -> List[str]:
        """날짜 유효성 검증"""
        if (
            self.completed_date
            and self.scheduled_date
            and self.completed_date < self.scheduled_date
        ):
            return ["종료 일시는 시작 일시보다 이후여야 합니다."]
        return []

    def validate(self) -> List[str]:
        """데이터 유효성 검증"""
        validators = [
            self._validate_required_fields,
            self._validate_status,
            self._validate_priority,
            self._validate_recurrence,
            self._validate_dates,
        ]

        errors = []
        for validator in validators:
            errors.extend(validator())
        return errors


class ScheduleReminderModel(Base):
    """일정 알림 모델"""

    __tablename__ = "schedule_reminders"

    id = Column(String(36), primary_key=True, index=True)
    schedule_id = Column(
        String(36), ForeignKey("maintenance_schedules.id"), nullable=False, index=True
    )
    reminder_time = Column(DateTime, nullable=False, index=True)
    reminder_type = Column(
        String(50), default=ReminderType.EMAIL.value
    )  # email, sms, push, in-app
    status = Column(
        String(50), default=ReminderStatus.PENDING.value
    )  # pending, sent, failed
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # 관계 설정
    schedule = relationship("MaintenanceScheduleModel", back_populates="reminders")

    def __repr__(self):
        return f"<ScheduleReminder {self.id[:8]} for schedule {self.schedule_id[:8]}>"

    @property
    def is_sent(self) -> bool:
        """알림이 발송되었는지 확인"""
        return self.status == ReminderStatus.SENT.value

    @property
    def is_pending(self) -> bool:
        """알림이 대기 중인지 확인"""
        return self.status == ReminderStatus.PENDING.value

    @property
    def is_due(self) -> bool:
        """알림 발송 시간이 되었는지 확인"""
        now = datetime.now(timezone.utc)
        return self.is_pending and self.reminder_time <= now

    def validate(self) -> List[str]:
        """데이터 유효성 검증"""
        errors = []

        # 필수 필드 검증
        if not self.schedule_id:
            errors.append("일정 ID는 필수값입니다.")

        if not self.reminder_time:
            errors.append("알림 시간은 필수값입니다.")

        # 유효한 알림 타입 검증
        try:
            ReminderType(self.reminder_type)
        except ValueError:
            valid_types = ", ".join([t.value for t in ReminderType])
            errors.append(f"유효하지 않은 알림 타입입니다. 가능한 값: {valid_types}")

        # 유효한 상태값 검증
        try:
            ReminderStatus(self.status)
        except ValueError:
            valid_statuses = ", ".join([s.value for s in ReminderStatus])
            errors.append(f"유효하지 않은 상태값입니다. 가능한 값: {valid_statuses}")

        return errors


class ScheduleNoteModel(Base):
    """일정 노트 모델"""

    __tablename__ = "schedule_notes"

    id = Column(String(36), primary_key=True, index=True)
    schedule_id = Column(
        String(36), ForeignKey("maintenance_schedules.id"), nullable=False, index=True
    )
    content = Column(Text, nullable=False)
    created_by = Column(String(36), nullable=True)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # 관계 설정
    schedule = relationship("MaintenanceScheduleModel", back_populates="notes")

    def __repr__(self):
        return f"<ScheduleNote {self.id[:8]} for schedule {self.schedule_id[:8]}>"

    @property
    def is_system_note(self) -> bool:
        """시스템이 자동으로 생성한 노트인지 확인"""
        return self.created_by == "system"

    def validate(self) -> List[str]:
        """데이터 유효성 검증"""
        errors = []

        # 필수 필드 검증
        if not self.schedule_id:
            errors.append("일정 ID는 필수값입니다.")

        if not self.content:
            errors.append("내용은 필수값입니다.")

        return errors


class MaintenanceItemType(str, Enum):
    """정비 항목 유형"""

    OIL_CHANGE = "OIL_CHANGE"  # 오일 교체
    TIRE_ROTATION = "TIRE_ROTATION"  # 타이어 위치 교환
    BRAKE_SERVICE = "BRAKE_SERVICE"  # 브레이크 서비스
    FLUID_CHANGE = "FLUID_CHANGE"  # 유체 교체
    FILTER_REPLACEMENT = "FILTER_REPLACEMENT"  # 필터 교체
    BATTERY_SERVICE = "BATTERY_SERVICE"  # 배터리 서비스
    SPARK_PLUG = "SPARK_PLUG"  # 점화 플러그
    INSPECTION = "INSPECTION"  # 검사
    OTHER = "OTHER"  # 기타


class MaintenanceItemStatus(str, Enum):
    """정비 항목 상태"""

    PENDING = "PENDING"  # 대기 중
    IN_PROGRESS = "IN_PROGRESS"  # 진행 중
    COMPLETED = "COMPLETED"  # 완료됨
    SKIPPED = "SKIPPED"  # 건너뜀
    CANCELLED = "CANCELLED"  # 취소됨


class MaintenanceItemModel(Base):
    """정비 항목 모델"""

    __tablename__ = "maintenance_items"

    id = Column(String(36), primary_key=True, index=True)
    schedule_id = Column(
        String(36), ForeignKey("maintenance_schedules.id"), nullable=False
    )

    # 항목 정보
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(
        SQLAlchemyEnum(MaintenanceItemType),
        nullable=False,
        default=MaintenanceItemType.OTHER,
    )

    # 상태 정보
    status = Column(
        SQLAlchemyEnum(MaintenanceItemStatus),
        nullable=False,
        default=MaintenanceItemStatus.PENDING,
    )

    # 비용 정보
    estimated_cost = Column(Float, nullable=True)
    actual_cost = Column(Float, nullable=True)

    # 작업자 정보
    technician_name = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # 관계 설정
    schedule = relationship(
        "MaintenanceScheduleModel", back_populates="maintenance_items"
    )

    def __repr__(self):
        return f"<MaintenanceItemModel(id={self.id}, name={self.name}, type={self.type}, status={self.status})>"


# vehicle.py에서 사용하는 ScheduleModel 변수 추가
ScheduleModel = MaintenanceScheduleModel
