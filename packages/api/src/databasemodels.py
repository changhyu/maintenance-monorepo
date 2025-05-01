"""
Database models for the API application
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, 
    ForeignKey, Text, Date, Enum, Table
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from database import Base

# 다대다 관계를 위한 연결 테이블
vehicle_shop = Table(
    'vehicle_shop',
    Base.metadata,
    Column('vehicle_id', Integer, ForeignKey('vehicles.id'), primary_key=True),
    Column('shop_id', Integer, ForeignKey('shops.id'), primary_key=True)
)

class VehicleTypeEnum(str, enum.Enum):
    """차량 유형 열거형"""
    SEDAN = "sedan"
    SUV = "suv"
    TRUCK = "truck"
    VAN = "van"
    BUS = "bus"
    MOTORCYCLE = "motorcycle"

class FuelTypeEnum(str, enum.Enum):
    """연료 유형 열거형"""
    GASOLINE = "gasoline"
    DIESEL = "diesel"
    LPG = "lpg"
    ELECTRIC = "electric"
    HYBRID = "hybrid"
    HYDROGEN = "hydrogen"

class MaintenanceTypeEnum(str, enum.Enum):
    """정비 유형 열거형"""
    REGULAR = "regular"
    REPAIR = "repair"
    EMERGENCY = "emergency"
    RECALL = "recall"
    INSPECTION = "inspection"

class InspectionTypeEnum(str, enum.Enum):
    """검사 유형 열거형"""
    REGULAR = "regular"
    EMISSION = "emission"
    SAFETY = "safety"
    COMPREHENSIVE = "comprehensive"

class User(Base):
    """사용자 모델"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    full_name = Column(String(100))
    phone_number = Column(String(20))
    is_active = Column(Boolean, default=True)
    role = Column(String(20), default="user")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # 관계 정의
    vehicles = relationship("Vehicle", back_populates="owner")
    notifications = relationship("Notification", back_populates="user")

class Vehicle(Base):
    """차량 모델"""
    __tablename__ = "vehicles"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    license_plate = Column(String(20), index=True, nullable=False)
    vin = Column(String(17), unique=True, index=True)
    make = Column(String(50), nullable=False)
    model = Column(String(50), nullable=False)
    year = Column(Integer, nullable=False)
    color = Column(String(30))
    vehicle_type = Column(Enum(VehicleTypeEnum), nullable=False)
    fuel_type = Column(Enum(FuelTypeEnum), nullable=False)
    mileage = Column(Integer, default=0)
    purchase_date = Column(Date)
    insurance_expiry = Column(Date)
    last_inspection_date = Column(Date)
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # 관계 정의
    owner = relationship("User", back_populates="vehicles")
    maintenance_records = relationship("MaintenanceRecord", back_populates="vehicle")
    inspection_records = relationship("InspectionRecord", back_populates="vehicle")
    scheduled_maintenances = relationship("ScheduledMaintenance", back_populates="vehicle")
    preferred_shops = relationship("Shop", secondary=vehicle_shop, back_populates="preferred_by_vehicles")

class Shop(Base):
    """정비소 모델"""
    __tablename__ = "shops"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    address = Column(String(200))
    city = Column(String(50))
    state = Column(String(50))
    zip_code = Column(String(20))
    phone_number = Column(String(20))
    email = Column(String(100))
    website = Column(String(200))
    specialties = Column(String(200))
    hours_of_operation = Column(String(200))
    rating = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # 관계 정의
    maintenance_records = relationship("MaintenanceRecord", back_populates="shop")
    preferred_by_vehicles = relationship("Vehicle", secondary=vehicle_shop, back_populates="preferred_shops")

class MaintenanceRecord(Base):
    """정비 기록 모델"""
    __tablename__ = "maintenance_records"
    
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    shop_id = Column(Integer, ForeignKey("shops.id"))
    maintenance_type = Column(Enum(MaintenanceTypeEnum), nullable=False)
    service_date = Column(Date, nullable=False)
    mileage_at_service = Column(Integer)
    description = Column(Text, nullable=False)
    parts_replaced = Column(Text)
    labor_cost = Column(Float, default=0.0)
    parts_cost = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    warranty_used = Column(Boolean, default=False)
    technician_name = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # 관계 정의
    vehicle = relationship("Vehicle", back_populates="maintenance_records")
    shop = relationship("Shop", back_populates="maintenance_records")

class InspectionRecord(Base):
    """검사 기록 모델"""
    __tablename__ = "inspection_records"
    
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    inspection_type = Column(Enum(InspectionTypeEnum), nullable=False)
    inspection_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=False)
    passed = Column(Boolean, default=True)
    inspector_name = Column(String(100))
    inspection_center = Column(String(100))
    certificate_number = Column(String(50))
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # 관계 정의
    vehicle = relationship("Vehicle", back_populates="inspection_records")

class ScheduledMaintenance(Base):
    """예정된 정비 모델"""
    __tablename__ = "scheduled_maintenances"
    
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    maintenance_type = Column(Enum(MaintenanceTypeEnum), nullable=False)
    scheduled_date = Column(Date, nullable=False)
    estimated_cost = Column(Float)
    description = Column(Text)
    shop_id = Column(Integer, ForeignKey("shops.id"))
    is_completed = Column(Boolean, default=False)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # 관계 정의
    vehicle = relationship("Vehicle", back_populates="scheduled_maintenances")
    shop = relationship("Shop")

class Notification(Base):
    """알림 모델"""
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50))
    is_read = Column(Boolean, default=False)
    reference_id = Column(Integer)
    reference_type = Column(String(50))
    created_at = Column(DateTime, server_default=func.now())
    
    # 관계 정의
    user = relationship("User", back_populates="notifications")