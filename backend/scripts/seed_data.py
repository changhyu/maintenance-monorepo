from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid

from backend.database import SessionLocal
from backend.models.maintenance import Maintenance
from backend.core.maintenance import (
    MaintenanceType,
    MaintenanceStatus,
    MaintenancePriority
)

def seed_maintenance_data(db: Session) -> None:
    """초기 정비 데이터 생성"""
    # 샘플 정비 데이터
    maintenances = [
        {
            "id": str(uuid.uuid4()),
            "vehicle_id": str(uuid.uuid4()),
            "maintenance_type": MaintenanceType.OIL_CHANGE,
            "status": MaintenanceStatus.COMPLETED,
            "priority": MaintenancePriority.NORMAL,
            "description": "정기 오일 교환",
            "cost": 50000,
            "start_date": datetime.now() - timedelta(days=7),
            "end_date": datetime.now() - timedelta(days=6),
            "technician_id": str(uuid.uuid4()),
            "parts": [{"name": "엔진오일", "quantity": 1, "price": 30000}],
            "notes": "정상적으로 완료됨"
        },
        {
            "id": str(uuid.uuid4()),
            "vehicle_id": str(uuid.uuid4()),
            "maintenance_type": MaintenanceType.BRAKE_SERVICE,
            "status": MaintenanceStatus.IN_PROGRESS,
            "priority": MaintenancePriority.HIGH,
            "description": "브레이크 패드 교체",
            "cost": 150000,
            "start_date": datetime.now(),
            "end_date": None,
            "technician_id": str(uuid.uuid4()),
            "parts": [{"name": "브레이크 패드", "quantity": 4, "price": 120000}],
            "notes": "전면 브레이크 패드 마모 심함"
        },
        {
            "id": str(uuid.uuid4()),
            "vehicle_id": str(uuid.uuid4()),
            "maintenance_type": MaintenanceType.TIRE_ROTATION,
            "status": MaintenanceStatus.PENDING,
            "priority": MaintenancePriority.LOW,
            "description": "타이어 로테이션",
            "cost": 30000,
            "start_date": datetime.now() + timedelta(days=3),
            "end_date": None,
            "technician_id": None,
            "parts": [],
            "notes": "예약 완료"
        }
    ]

    # 데이터베이스에 데이터 추가
    for maintenance_data in maintenances:
        maintenance = Maintenance(**maintenance_data)
        db.add(maintenance)

    db.commit()

def main() -> None:
    """메인 함수"""
    db = SessionLocal()
    try:
        seed_maintenance_data(db)
        print("초기 데이터 생성 완료")
    except Exception as e:
        print(f"초기 데이터 생성 중 오류 발생: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main() 