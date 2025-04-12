"""
Maintenance 모듈의 데이터 모델.
"""

from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy import Column, ForeignKey, String, Integer, Float, DateTime, Text, Enum



from ...models.base import BaseModel
from ...models.schemas import MaintenanceStatus


class Maintenance(BaseModel):
    """정비 기록 모델"""

    __tablename__ = "maintenance"

    id = Column(String, primary_key=True)
    vehicle_id = Column(String, ForeignKey("vehicles.id"))
    description = Column(String, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum(MaintenanceStatus), default=MaintenanceStatus.SCHEDULED)
    cost = Column(Float, default=0.0)
    performed_by = Column(String)
    notes = Column(Text)
    completion_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계 설정
    vehicle = relationship("Vehicle", back_populates="maintenance_records")
    documents = relationship("MaintenanceDocument", back_populates="maintenance")
    parts = relationship("MaintenancePart", back_populates="maintenance")


class MaintenanceDocument(BaseModel):
    """정비 관련 문서 모델"""

    __tablename__ = "maintenance_documents"

    id = Column(String, primary_key=True)
    maintenance_id = Column(String, ForeignKey("maintenance.id"))
    file_name = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    file_type = Column(String)
    file_size = Column(Integer)
    upload_date = Column(DateTime, default=datetime.utcnow)

    # 관계 설정
    maintenance = relationship("Maintenance", back_populates="documents")


class MaintenancePart(BaseModel):
    """정비 부품 모델"""

    __tablename__ = "maintenance_parts"

    id = Column(String, primary_key=True)
    maintenance_id = Column(String, ForeignKey("maintenance.id"))
    part_name = Column(String, nullable=False)
    part_number = Column(String)
    quantity = Column(Integer, default=1)
    unit_cost = Column(Float, default=0.0)
    notes = Column(Text)

    # 관계 설정
    maintenance = relationship("Maintenance", back_populates="parts")
