"""
정비 관련 데이터베이스 모델 정의
"""

from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base

class MaintenanceModel(Base):
    """정비 정보 모델"""
    
    __tablename__ = "maintenance"
    
    id = Column(String(36), primary_key=True, index=True)
    vehicle_id = Column(String(36), ForeignKey("vehicles.id"), nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)
    description = Column(String(255), nullable=False)
    date = Column(DateTime, default=datetime.now, nullable=False, index=True)
    status = Column(String(50), default="scheduled", nullable=False, index=True)
    cost = Column(Float, default=0.0)
    mileage = Column(Integer)
    performed_by = Column(String(100))
    provider = Column(String(100))
    notes = Column(Text)
    completion_date = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    
    # 관계 설정
    vehicle = relationship("VehicleModel", back_populates="maintenance_records")
    documents = relationship("MaintenanceDocumentModel", back_populates="maintenance", cascade="all, delete-orphan")
    parts = relationship("MaintenancePartModel", back_populates="maintenance", cascade="all, delete-orphan")

class MaintenanceDocumentModel(Base):
    """정비 문서 모델"""
    
    __tablename__ = "maintenance_documents"
    
    id = Column(String(36), primary_key=True, index=True)
    maintenance_id = Column(String(36), ForeignKey("maintenance.id"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(512), nullable=False)
    file_type = Column(String(100))
    file_size = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.now, nullable=False)
    description = Column(String(255))
    
    # 관계 설정
    maintenance = relationship("MaintenanceModel", back_populates="documents")

class MaintenancePartModel(Base):
    """정비 부품 모델"""
    
    __tablename__ = "maintenance_parts"
    
    id = Column(String(36), primary_key=True, index=True)
    maintenance_id = Column(String(36), ForeignKey("maintenance.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    part_number = Column(String(100))
    quantity = Column(Integer, default=1)
    unit_cost = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    replaced = Column(String(1), default="Y")  # Y/N
    condition = Column(String(50))  # new, used, refurbished
    
    # 관계 설정
    maintenance = relationship("MaintenanceModel", back_populates="parts") 