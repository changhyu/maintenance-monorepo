from sqlalchemy import Column, String, DateTime, Float, Integer, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .base import Base

class DriverStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ON_LEAVE = "ON_LEAVE"
    SUSPENDED = "SUSPENDED"

class DriverModel(Base):
    __tablename__ = "drivers"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    phone = Column(String, nullable=False)
    license_number = Column(String, nullable=False, unique=True)
    status = Column(SQLEnum(DriverStatus), nullable=False, default=DriverStatus.ACTIVE)
    address = Column(String)
    emergency_contact = Column(String)
    notes = Column(String)
    vehicle_id = Column(String, ForeignKey("vehicles.id"))
    birth_date = Column(DateTime, nullable=False)
    hire_date = Column(DateTime, nullable=False)
    license_expiry = Column(DateTime, nullable=False)
    safety_score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계 설정
    vehicle = relationship("VehicleModel", back_populates="drivers")
    documents = relationship("DocumentModel", back_populates="driver", cascade="all, delete-orphan")

class DocumentModel(Base):
    __tablename__ = "driver_documents"

    id = Column(String, primary_key=True, index=True)
    driver_id = Column(String, ForeignKey("drivers.id"), nullable=False)
    type = Column(String, nullable=False)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    expiry_date = Column(DateTime, nullable=True)
    status = Column(String, default="VALID")

    # 관계 설정
    driver = relationship("DriverModel", back_populates="documents") 