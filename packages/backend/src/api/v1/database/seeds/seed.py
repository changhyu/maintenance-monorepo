import os
import sys
from pathlib import Path

# 프로젝트 루트 디렉토리를 Python 경로에 추가
project_root = str(Path(__file__).parent.parent.parent.parent.parent)
sys.path.append(project_root)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.api.v1.database.base import Base
from src.api.v1.database.models import VehicleModel, DriverModel, DocumentModel
from src.api.v1.database.seeds.seed_data import VEHICLES, DRIVERS, DOCUMENTS

def get_database_url():
    return "postgresql://{user}:{password}@{host}:{port}/{name}".format(
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        name=os.getenv("DB_NAME", "maintenance_db"),
    )

def seed_database():
    # 데이터베이스 연결
    engine = create_engine(get_database_url())
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # 기존 데이터 삭제
        db.query(DocumentModel).delete()
        db.query(DriverModel).delete()
        db.query(VehicleModel).delete()
        db.commit()

        # 차량 데이터 삽입
        for vehicle_data in VEHICLES:
            vehicle = VehicleModel(**vehicle_data)
            db.add(vehicle)
        db.commit()

        # 드라이버 데이터 삽입
        for driver_data in DRIVERS:
            driver = DriverModel(**driver_data)
            db.add(driver)
        db.commit()

        # 문서 데이터 삽입
        for document_data in DOCUMENTS:
            document = DocumentModel(**document_data)
            db.add(document)
        db.commit()

        print("시드 데이터가 성공적으로 삽입되었습니다.")

    except Exception as e:
        db.rollback()
        print(f"시드 데이터 삽입 중 오류 발생: {str(e)}")
        raise

    finally:
        db.close()

if __name__ == "__main__":
    seed_database() 