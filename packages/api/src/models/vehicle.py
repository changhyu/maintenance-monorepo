"""
차량 모델 정의
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from models.base import Base
from models.mixins import TimeStampMixin


class Vehicle(Base, TimeStampMixin):
    """
    차량 정보 모델
    """
    __tablename__ = "vehicles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, comment="차량 이름")
    vin = Column(String(50), unique=True, nullable=True, comment="차대번호")
    license_plate = Column(String(20), nullable=True, comment="차량 번호판")
    make = Column(String(50), nullable=True, comment="제조사")
    model = Column(String(50), nullable=True, comment="모델명")
    year = Column(String(4), nullable=True, comment="제조년도")
    color = Column(String(30), nullable=True, comment="색상")
    
    # 차량 상태 정보
    mileage = Column(String(30), nullable=True, comment="주행거리")
    fuel_type = Column(String(30), nullable=True, comment="연료 유형")
    status = Column(String(20), nullable=True, comment="차량 상태")
    is_active = Column(Boolean, default=True, comment="활성 상태 여부")
    
    # 검사 및 정비 정보
    last_inspection_date = Column(DateTime, nullable=True, comment="마지막 검사일")
    next_inspection_date = Column(DateTime, nullable=True, comment="다음 예정 검사일")
    last_maintenance_date = Column(DateTime, nullable=True, comment="마지막 정비일")
    
    # 소유자 정보
    owner_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    # 관계 정의
    inspections = relationship("VehicleInspection", back_populates="vehicle", cascade="all, delete-orphan")
    maintenance_records = relationship("MaintenanceRecord", back_populates="vehicle", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Vehicle(id={self.id}, name={self.name}, license_plate={self.license_plate})>"
