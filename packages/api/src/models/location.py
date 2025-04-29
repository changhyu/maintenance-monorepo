from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Index, func
from sqlalchemy.orm import relationship

from .base import Base, BaseModel


class Location(Base):
    """
    위치 정보를 저장하는 모델
    
    고정된 위치(예: 차고지, 사무실 등)를 나타내는 데 사용됩니다.
    """
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float)
    address = Column(String)
    postal_code = Column(String)
    city = Column(String)
    state = Column(String)
    country = Column(String)
    type = Column(String)  # 위치 유형 (사무실, 창고, 주차장 등)
    notes = Column(String)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class VehicleLocation(BaseModel, Base):
    """
    차량 위치 정보를 저장하는 통합 모델
    
    차량의 현재 및 과거 위치를 기록하는 데 사용됩니다.
    """
    __tablename__ = "vehicle_locations"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float)
    heading = Column(Float)  # 진행 방향 (도)
    speed = Column(Float)    # 속도 (km/h)
    accuracy = Column(Float) # 위치 정확도 (미터)
    address = Column(String)  # 주소 정보
    timestamp = Column(DateTime, default=func.now(), index=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # 관계
    vehicle = relationship("Vehicle", back_populates="locations", lazy="selectin")
    
    # 인덱스
    __table_args__ = (
        Index('idx_vehicle_timestamp', 'vehicle_id', 'timestamp'),
    )
    
    def __repr__(self):
        return f"<VehicleLocation(id={self.id}, vehicle_id={self.vehicle_id}, lat={self.latitude}, lng={self.longitude})>" 