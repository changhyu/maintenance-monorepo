"""
공통 데이터베이스 모델 정의
"""

import datetime
import os
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    create_engine,
    func,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

# 데이터베이스 연결 설정 (SQLite 사용)
DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# 의존성 설정 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 모델 정의
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    name = Column(String)
    role = Column(String, default="USER")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # 관계 설정
    vehicles = relationship("Vehicle", back_populates="owner")


# UserModel을 User와 동일하게 처리
UserModel = User


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    vin = Column(String, unique=True, index=True)
    make = Column(String)
    model = Column(String)
    year = Column(Integer)
    type = Column(String)
    color = Column(String, nullable=True)
    plate = Column(String, nullable=True, unique=True)
    mileage = Column(Integer, nullable=True)
    status = Column(String, default="AVAILABLE")
    owner_id = Column(String, ForeignKey("users.id"), nullable=True)
    last_service_date = Column(DateTime, nullable=True)
    next_service_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # 관계 설정
    owner = relationship("User", back_populates="vehicles")
    maintenance_records = relationship("MaintenanceRecord", back_populates="vehicle")


# VehicleModel을 Vehicle과 동일하게 처리
VehicleModel = Vehicle


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    vehicle_id = Column(String, ForeignKey("vehicles.id"))
    description = Column(String)
    date = Column(DateTime)
    mileage = Column(Integer, nullable=True)
    cost = Column(Float, nullable=True)
    performed_by = Column(String, nullable=True)
    status = Column(String, default="SCHEDULED")
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # 관계 설정
    vehicle = relationship("Vehicle", back_populates="maintenance_records")


# MaintenanceModel을 MaintenanceRecord와 동일하게 처리
MaintenanceModel = MaintenanceRecord


# Shop 모델 (간단한 형태로 추가)
class Shop(Base):
    __tablename__ = "shops"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ShopModel을 Shop과 동일하게 처리
ShopModel = Shop


# 데이터베이스 초기화 함수
def init_db():
    """데이터베이스 테이블 생성"""
    Base.metadata.create_all(bind=engine)


# 샘플 데이터 생성 함수
def create_sample_data(db):
    """테스트용 샘플 데이터 생성"""
    # 이미 데이터가 있는지 확인
    user_count = db.query(User).count()
    if user_count > 0:
        return  # 이미 데이터가 있으면 스킵

    # 사용자 샘플 데이터
    test_user = User(
        id=str(uuid.uuid4()),
        email="test@example.com",
        name="테스트 사용자",
        role="USER",
        is_active=True,
    )
    db.add(test_user)
    db.commit()

    # 차량 샘플 데이터
    test_vehicle = Vehicle(
        id=str(uuid.uuid4()),
        vin="1HGCM82633A123456",
        make="현대",
        model="아반떼",
        year=2023,
        type="SEDAN",
        color="파랑",
        plate="12가3456",
        mileage=5000,
        status="AVAILABLE",
        owner_id=test_user.id,
    )
    db.add(test_vehicle)
    db.commit()

    # 정비 기록 샘플 데이터
    test_maintenance = MaintenanceRecord(
        id=str(uuid.uuid4()),
        vehicle_id=test_vehicle.id,
        description="정기 점검",
        date=datetime.datetime.now(),
        mileage=5000,
        cost=150000.0,
        performed_by="테스트 정비소",
        status="COMPLETED",
        notes="오일 교체 및 일반 점검 완료",
    )
    db.add(test_maintenance)
    db.commit()
