"""
Data models for the API service.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from packages.api.src.modelsbase import Base
from packages.api.src.modelsmaintenance import MaintenanceModel as MaintenanceRecord
from packages.api.src.modelsschedule import (
    MaintenanceScheduleModel as MaintenanceSchedule,
)
from packages.api.src.modelsshop import ShopModel as Shop
from packages.api.src.modelsuser import UserModel as User
from packages.api.src.modelsvehicle import VehicleModel as Vehicle

# 데이터베이스 연결 설정 (SQLite 사용)
DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# 의존성 설정 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
