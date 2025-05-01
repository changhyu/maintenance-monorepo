from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import List, Optional, Dict, Any
from backend.db.base import Base

class MaintenanceStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELED = "CANCELED"

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"
    
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(String(50), ForeignKey("vehicles.id"), nullable=False)
    description = Column(String(200), nullable=False)
    details = Column(Text)
    notes = Column(Text)
    date = Column(DateTime, nullable=False)
    completion_date = Column(DateTime)
    status = Column(String(20), default=MaintenanceStatus.PENDING)
    technician = Column(String(100))
    cost = Column(Float)
    parts = Column(JSON, default=list)
    labor = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(50), ForeignKey("users.id"))
    updated_by = Column(String(50), ForeignKey("users.id"))
    
    # 관계 정의
    vehicle = relationship("Vehicle", back_populates="maintenance_records")
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])
    
    def __repr__(self):
        return f"<MaintenanceRecord #{self.id} for Vehicle #{self.vehicle_id}>"