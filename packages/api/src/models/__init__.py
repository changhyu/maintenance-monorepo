"""
Data models for the API service.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 상대 경로로 Base 임포트 변경
from .base import Base

# 상대 경로로 모델 임포트
# 임포트 순서가 중요합니다 - 의존성 순서대로 임포트
from .user import UserModel as User
from .vehicle import Vehicle
from .location import Location, VehicleLocation
from .maintenance import Maintenance as MaintenanceRecord, MaintenancePart, MaintenanceDocument
from .schedule import MaintenanceScheduleModel as MaintenanceSchedule
from .shop import ShopModel as Shop
from .admin import AdminSettings, AdminAuditLog, SystemMetrics, BackupLog, UserLoginHistory, AdminDashboardWidget

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
