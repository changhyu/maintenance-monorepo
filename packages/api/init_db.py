"""
데이터베이스 초기화 및 테이블 생성 스크립트
"""

import datetime
import os
import sys
import uuid

# 현재 디렉토리를 시스템 경로에 추가
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# 공통 모델 임포트
from src.models import Base, MaintenanceRecord, SessionLocal, User, Vehicle, engine


def init_db():
    """데이터베이스 초기화 및 테이블 생성"""
    try:
        # 테이블 생성
        Base.metadata.create_all(bind=engine)
        print("데이터베이스 테이블이 성공적으로 생성되었습니다.")

        # 초기 데이터 생성
        db = SessionLocal()

        # 사용자가 없는지 확인
        user_count = db.query(User).count()
        if user_count == 0:
            # 관리자 계정 생성
            admin = User(
                id=str(uuid.uuid4()),
                email="admin@example.com",
                name="관리자",
                role="ADMIN",
                is_active=True,
            )
            db.add(admin)

            # 일반 사용자 계정 생성
            user = User(
                id=str(uuid.uuid4()),
                email="user@example.com",
                name="일반 사용자",
                role="USER",
                is_active=True,
            )
            db.add(user)

            # 변경사항 저장
            db.commit()
            print("초기 사용자 데이터가 생성되었습니다.")

        # 차량이 없는지 확인
        vehicle_count = db.query(Vehicle).count()
        if vehicle_count == 0:
            # 사용자 조회
            user = db.query(User).filter(User.email == "user@example.com").first()

            if user:
                # 차량 데이터 생성
                vehicle1 = Vehicle(
                    id=str(uuid.uuid4()),
                    vin="1HGCM82633A123456",
                    make="현대",
                    model="소나타",
                    year=2023,
                    type="SEDAN",
                    color="검정색",
                    plate="12가 3456",
                    mileage=1000,
                    status="AVAILABLE",
                    owner_id=user.id,
                )
                db.add(vehicle1)

                vehicle2 = Vehicle(
                    id=str(uuid.uuid4()),
                    vin="5XYZU3LB1DG123789",
                    make="기아",
                    model="스포티지",
                    year=2022,
                    type="SUV",
                    color="흰색",
                    plate="34나 5678",
                    mileage=5000,
                    status="AVAILABLE",
                    owner_id=user.id,
                )
                db.add(vehicle2)

                # 변경사항 저장
                db.commit()
                print("초기 차량 데이터가 생성되었습니다.")

                # 차량 정비 기록 생성
                vehicle = (
                    db.query(Vehicle).filter(Vehicle.vin == "1HGCM82633A123456").first()
                )
                if vehicle:
                    maintenance = MaintenanceRecord(
                        id=str(uuid.uuid4()),
                        vehicle_id=vehicle.id,
                        description="정기 점검",
                        date=datetime.datetime.now(),
                        mileage=1000,
                        cost=150000.0,
                        performed_by="홍길동 정비사",
                        status="COMPLETED",
                        notes="엔진 오일 교체, 타이어 공기압 점검",
                    )
                    db.add(maintenance)

                    # 변경사항 저장
                    db.commit()
                    print("초기 정비 기록 데이터가 생성되었습니다.")

        # 종료
        db.close()
        print("데이터베이스 초기화가 완료되었습니다.")

        return True
    except Exception as e:
        print(f"데이터베이스 초기화 중 오류 발생: {str(e)}")
        return False


if __name__ == "__main__":
    init_db()
