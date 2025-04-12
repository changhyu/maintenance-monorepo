"""
차량 관련 데이터베이스 모델 정의
"""

from sqlalchemy import Column, String, Text, Integer, Float, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base

class VehicleModel(Base):
    """차량 정보 모델"""
    
    __tablename__ = "vehicles"
    
    id = Column(String(36), primary_key=True, index=True)
    make = Column(String(100), nullable=False, index=True)
    model = Column(String(100), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    vin = Column(String(50), unique=True, index=True)
    plate = Column(String(50), index=True)
    color = Column(String(50))
    mileage = Column(Integer)
    fuel_type = Column(String(50))
    engine = Column(String(100))
    transmission = Column(String(50))
    status = Column(String(50), default="active", index=True)
    last_maintenance_date = Column(DateTime, nullable=True)
    next_maintenance_date = Column(DateTime, nullable=True)
    purchase_date = Column(DateTime, nullable=True)
    owner_id = Column(String(36), index=True)
    notes = Column(Text)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    
    # 관계 설정
    maintenance_records = relationship("MaintenanceModel", back_populates="vehicle", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Vehicle {self.make} {self.model} ({self.year})>" 