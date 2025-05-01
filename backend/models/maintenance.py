from sqlalchemy import Column, String, DateTime, Float, JSON, Enum as SQLEnum, ForeignKey
from sqlalchemy.sql import func
from datetime import datetime
import uuid

from backend.db.base_class import Base
from backend.core.maintenance import MaintenanceType, MaintenanceStatus, MaintenancePriority

class Maintenance(Base):
    """정비 모델"""
    __tablename__ = "maintenances"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vehicle_id = Column(String(36), ForeignKey("vehicles.id"), nullable=False)
    maintenance_type = Column(SQLEnum(MaintenanceType), nullable=False)
    status = Column(SQLEnum(MaintenanceStatus), nullable=False, default=MaintenanceStatus.PENDING)
    priority = Column(SQLEnum(MaintenancePriority), nullable=False, default=MaintenancePriority.NORMAL)
    description = Column(String(1000), nullable=False)
    cost = Column(Float, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    technician_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    parts = Column(JSON, nullable=False, default=list)
    notes = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self) -> dict:
        """모델을 딕셔너리로 변환"""
        return {
            "id": self.id,
            "vehicle_id": self.vehicle_id,
            "maintenance_type": self.maintenance_type,
            "status": self.status,
            "priority": self.priority,
            "description": self.description,
            "cost": self.cost,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "technician_id": self.technician_id,
            "parts": self.parts,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        } 