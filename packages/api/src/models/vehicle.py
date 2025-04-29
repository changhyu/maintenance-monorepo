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
    Enum as SQLAlchemyEnum,
    func,
)
from sqlalchemy.orm import relationship
import enum

from .base import Base, BaseModel
from .schedule import MaintenanceScheduleModel
from .maintenance import Maintenance
from .location import VehicleLocation


class VehicleType(enum.Enum):
    CAR = "car"
    TRUCK = "truck"
    VAN = "van"
    BUS = "bus"
    MOTORCYCLE = "motorcycle"
    OTHER = "other"


class VehicleStatus(enum.Enum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    INACTIVE = "inactive"
    RESERVED = "reserved"
    INSPECTION_REQUIRED = "inspection_required"  # 법정검사 필요 상태 추가


class Vehicle(Base):
    """차량 모델"""

    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    type = Column(SQLAlchemyEnum(VehicleType), index=True, nullable=False, default=VehicleType.CAR)
    make = Column(String(50), nullable=False)
    model = Column(String(50), nullable=False)
    year = Column(Integer, nullable=False)
    vin = Column(String(17), nullable=True, unique=True)
    license_plate = Column(String(20), nullable=True, unique=True)
    color = Column(String(30), nullable=True)
    status = Column(SQLAlchemyEnum(VehicleStatus), index=True, default=VehicleStatus.ACTIVE)
    seating_capacity = Column(Integer)
    fuel_type = Column(String)
    fuel_efficiency = Column(Float)  # km/L 또는 km/kWh
    mileage = Column(Float)  # km
    last_maintenance_date = Column(DateTime)
    next_maintenance_date = Column(DateTime)
    last_inspection_date = Column(DateTime)  # 마지막 법정검사일
    next_inspection_date = Column(DateTime)  # 다음 법정검사일
    is_available = Column(Boolean, default=True, index=True)
    notes = Column(String)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # 관계 설정
    maintenance_schedules = relationship("MaintenanceScheduleModel", back_populates="vehicle", lazy="selectin")
    owner = relationship("UserModel", back_populates="vehicles", lazy="selectin")
    maintenance_records = relationship("Maintenance", back_populates="vehicle", lazy="selectin")
    locations = relationship("VehicleLocation", back_populates="vehicle", cascade="all, delete-orphan", lazy="selectin")
    inspections = relationship("VehicleInspection", back_populates="vehicle", cascade="all, delete-orphan", lazy="selectin")  # 법정검사 관계 추가

    def __repr__(self):
        return f"<Vehicle(id={self.id}, make={self.make}, model={self.model})>"

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

    @property
    def is_due_for_inspection(self):
        """차량의 다음 법정검사일이 현재 시간 이전이면 True 반환"""
        if not self.next_inspection_date:
            return False
        return self.next_inspection_date <= datetime.utcnow()

    @property
    def days_to_inspection(self):
        """다음 법정검사까지 남은 일수 반환"""
        if not self.next_inspection_date:
            return None
        delta = self.next_inspection_date - datetime.utcnow()
        return max(0, delta.days)
