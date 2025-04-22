"""
차량 관련 데이터베이스 모델 정의
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from packages.api.src.modelsbase import Base, BaseModel
from packages.api.src.modelsschedule import ScheduleModel  # ScheduleModel을 먼저 import


class VehicleStatus(str, Enum):
    """차량 상태 열거형"""

    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    INACTIVE = "inactive"
    RECALLED = "recalled"


class VehicleModel(Base, BaseModel):
    """차량 모델"""

    __tablename__ = "vehicles"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    make = Column(String(50), nullable=False)
    model = Column(String(50), nullable=False)
    year = Column(Integer, nullable=False)
    vin = Column(String(17), nullable=True, unique=True)
    license_plate = Column(String(20), nullable=True, unique=True)
    color = Column(String(30), nullable=True)
    status = Column(String(20), default=VehicleStatus.ACTIVE.value, nullable=False)
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
    schedules = relationship("ScheduleModel", back_populates="vehicle")
    owner = relationship("UserModel", back_populates="vehicles")
    maintenance_records = relationship("MaintenanceModel", back_populates="vehicle")
    schedules = relationship("MaintenanceScheduleModel", back_populates="vehicle")

    def __repr__(self):
        return f"<VehicleModel(id={self.id}, make={self.make}, model={self.model})>"

    def validate(self) -> List[str]:
        """모델 유효성 검사"""
        errors = []

        if not self.user_id:
            errors.append("사용자 ID는 필수입니다.")

        if not self.make:
            errors.append("제조사는 필수입니다.")

        if not self.model:
            errors.append("모델은 필수입니다.")

        if not self.year:
            errors.append("연식은 필수입니다.")

        return errors

    @property
    def full_name(self):
        """차량의 전체 이름을 반환"""
        return f"{self.make} {self.model} ({self.year})"

    @property
    def is_due_for_maintenance(self):
        """차량의 다음 정비일이 현재 시간 이전이면 True 반환"""
        if not self.next_maintenance_date:
            return False
        return self.next_maintenance_date <= datetime.utcnow()
