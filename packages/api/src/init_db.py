"""
데이터베이스 초기화 및 테이블 생성 스크립트
"""
import sys
import os
import logging
from datetime import datetime, timedelta, date
import random
from passlib.context import CryptContext
import sqlalchemy

# 현재 디렉토리를 경로에 추가하여 모듈을 찾을 수 있도록 함
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 패키지 코어에 대한 경로 추가
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from database import Base, engine, get_db
import databasemodels as models
from packagescore.config import settings

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 암호 해싱을 위한 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_tables():
    """데이터베이스 테이블 생성"""
    logger.info("데이터베이스 테이블 생성 중...")
    
    try:
        # 기존 테이블 모두 삭제
        logger.info("기존 테이블을 삭제합니다...")
        Base.metadata.drop_all(bind=engine)
        logger.info("기존 테이블이 삭제되었습니다.")
        
        # 새 테이블 생성
        Base.metadata.create_all(bind=engine)
        logger.info("테이블이 성공적으로 생성되었습니다.")
    except Exception as e:
        logger.error(f"테이블 생성 중 오류 발생: {e}")
        raise

def get_password_hash(password):
    """입력된 비밀번호를 해싱합니다."""
    return pwd_context.hash(password)

def create_test_data():
    """테스트 데이터 생성"""
    logger.info("테스트 데이터 생성 중...")
    
    # 데이터베이스 세션 생성
    db_generator = get_db()
    db = next(db_generator)
    
    try:
        # 기존 사용자가 있는지 확인
        existing_user = db.query(models.User).filter(models.User.username == "testuser").first()
        if existing_user:
            logger.info("테스트 사용자가 이미 존재합니다. 생성을 건너뜁니다.")
            return
        
        # 테스트 사용자 생성
        test_users = [
            {
                "username": "testuser",
                "email": "test@example.com",
                "full_name": "테스트 사용자",
                "phone_number": "010-1234-5678",
                "hashed_password": get_password_hash("password"),
                "role": "user"
            },
            {
                "username": "admin",
                "email": "admin@example.com",
                "full_name": "관리자",
                "phone_number": "010-8765-4321",
                "hashed_password": get_password_hash("admin"),
                "role": "admin"
            },
            {
                "username": "mechanic",
                "email": "mechanic@example.com",
                "full_name": "정비사",
                "phone_number": "010-5555-6666",
                "hashed_password": get_password_hash("mechanic"),
                "role": "mechanic"
            }
        ]
        
        for user_data in test_users:
            user = models.User(**user_data)
            db.add(user)
        
        db.commit()
        logger.info(f"{len(test_users)}명의 테스트 사용자가 생성되었습니다.")
        
        # 테스트 정비소 생성
        test_shops = [
            {
                "name": "최고 정비소",
                "address": "서울시 강남구 테헤란로 123",
                "city": "서울",
                "state": "강남구",
                "zip_code": "06123",
                "phone_number": "02-555-1234",
                "email": "best@shop.com",
                "website": "http://bestshop.com",
                "specialties": "엔진 수리, 타이어 교체",
                "hours_of_operation": "평일 9:00-18:00, 토요일 9:00-15:00",
                "rating": 4.8
            },
            {
                "name": "퀵 정비",
                "address": "서울시 서초구 방배로 456",
                "city": "서울",
                "state": "서초구",
                "zip_code": "06789",
                "phone_number": "02-333-4567",
                "email": "quick@repair.com",
                "website": "http://quickrepair.com",
                "specialties": "오일 교체, 경정비",
                "hours_of_operation": "평일 8:00-20:00, 주말 9:00-18:00",
                "rating": 4.5
            },
            {
                "name": "프리미엄 모터스",
                "address": "서울시 송파구 올림픽로 789",
                "city": "서울",
                "state": "송파구",
                "zip_code": "05789",
                "phone_number": "02-777-8888",
                "email": "premium@motors.com",
                "website": "http://premiummotors.com",
                "specialties": "외제차 전문, 고급차 정비",
                "hours_of_operation": "평일 10:00-19:00, 예약제",
                "rating": 4.9
            }
        ]
        
        for shop_data in test_shops:
            shop = models.Shop(**shop_data)
            db.add(shop)
        
        db.commit()
        logger.info(f"{len(test_shops)}개의 테스트 정비소가 생성되었습니다.")
        
        # 테스트 사용자 가져오기
        test_user = db.query(models.User).filter(models.User.username == "testuser").first()
        
        # 테스트 차량 생성
        test_vehicles = [
            {
                "owner_id": test_user.id,
                "license_plate": "12가 3456",
                "vin": "1HGCM82633A123456",
                "make": "현대",
                "model": "아반떼",
                "year": 2021,
                "color": "파랑",
                "vehicle_type": models.VehicleTypeEnum.SEDAN,
                "fuel_type": models.FuelTypeEnum.GASOLINE,
                "mileage": 15000,
                "purchase_date": date(2021, 3, 15),
                "insurance_expiry": date.today() + timedelta(days=180),
                "last_inspection_date": date.today() - timedelta(days=90),
                "notes": "좌측 도어에 작은 스크래치 있음"
            },
            {
                "owner_id": test_user.id,
                "license_plate": "34나 5678",
                "vin": "KMHDU46D08U456789",
                "make": "기아",
                "model": "쏘렌토",
                "year": 2019,
                "color": "검정",
                "vehicle_type": models.VehicleTypeEnum.SUV,
                "fuel_type": models.FuelTypeEnum.DIESEL,
                "mileage": 45000,
                "purchase_date": date(2019, 7, 22),
                "insurance_expiry": date.today() + timedelta(days=90),
                "last_inspection_date": date.today() - timedelta(days=120),
                "notes": "후방 센서 가끔 오작동"
            }
        ]
        
        vehicles = []
        for vehicle_data in test_vehicles:
            vehicle = models.Vehicle(**vehicle_data)
            db.add(vehicle)
            vehicles.append(vehicle)
        
        db.commit()
        logger.info(f"{len(test_vehicles)}대의 테스트 차량이 생성되었습니다.")
        
        # 테스트 정비소 가져오기
        shops = db.query(models.Shop).all()
        
        # 테스트 정비 기록 생성
        maintenance_records = []
        for vehicle in vehicles:
            for i in range(3):  # 각 차량마다 3개의 정비 기록
                # 랜덤한 정비소 선택
                shop = random.choice(shops)
                
                # 날짜 계산 - 최근 1년 내의 랜덤한 날짜
                days_ago = random.randint(30, 365)
                service_date = date.today() - timedelta(days=days_ago)
                
                # 마일리지 계산 - 구매일부터 서비스 날짜까지 일일 평균 50km로 계산
                days_since_purchase = (service_date - vehicle.purchase_date).days
                mileage_at_service = int(days_since_purchase * 50 * 0.8)  # 20% 여유
                
                # 비용 계산
                labor_cost = float(random.randint(5, 20) * 10000)
                parts_cost = float(random.randint(3, 15) * 10000)
                total_cost = labor_cost + parts_cost
                
                # 정비 유형 선택
                maintenance_types = list(models.MaintenanceTypeEnum)
                maintenance_type = random.choice(maintenance_types)
                
                # 정비 내용 생성
                if maintenance_type == models.MaintenanceTypeEnum.REGULAR:
                    description = "정기 점검 및 오일 교체"
                    parts_replaced = "엔진 오일 필터, 에어 필터"
                elif maintenance_type == models.MaintenanceTypeEnum.REPAIR:
                    description = "브레이크 패드 교체 및 조정"
                    parts_replaced = "브레이크 패드, 브레이크 오일"
                else:
                    description = "엔진 점검 및 튠업"
                    parts_replaced = "점화 플러그, 연료 필터"
                
                record = models.MaintenanceRecord(
                    vehicle_id=vehicle.id,
                    shop_id=shop.id,
                    maintenance_type=maintenance_type,
                    service_date=service_date,
                    mileage_at_service=mileage_at_service,
                    description=description,
                    parts_replaced=parts_replaced,
                    labor_cost=labor_cost,
                    parts_cost=parts_cost,
                    total_cost=total_cost,
                    warranty_used=(random.random() < 0.3),  # 30% 확률로 보증 사용
                    technician_name=f"정비사 {random.randint(1, 5)}",
                    notes="고객 요청에 따른 정비 수행"
                )
                maintenance_records.append(record)
                db.add(record)
        
        db.commit()
        logger.info(f"{len(maintenance_records)}개의 테스트 정비 기록이 생성되었습니다.")
        
        # 테스트 검사 기록 생성
        inspection_records = []
        for vehicle in vehicles:
            # 날짜 계산 - 최근 2년 내의 검사 기록
            days_ago = random.randint(30, 730)
            inspection_date = date.today() - timedelta(days=days_ago)
            expiration_date = inspection_date + timedelta(days=365 * 2)  # 2년 유효
            
            # 검사 유형 선택
            inspection_types = list(models.InspectionTypeEnum)
            inspection_type = random.choice(inspection_types)
            
            record = models.InspectionRecord(
                vehicle_id=vehicle.id,
                inspection_type=inspection_type,
                inspection_date=inspection_date,
                expiration_date=expiration_date,
                passed=True,
                inspector_name=f"검사관 {random.randint(1, 3)}",
                inspection_center="자동차 검사소 본점",
                certificate_number=f"CERT-{random.randint(10000, 99999)}",
                notes="정상 검사 완료"
            )
            inspection_records.append(record)
            db.add(record)
        
        db.commit()
        logger.info(f"{len(inspection_records)}개의 테스트 검사 기록이 생성되었습니다.")
        
        # 테스트 예정된 정비 생성
        scheduled_maintenances = []
        for vehicle in vehicles:
            # 날짜 계산 - 미래 30~180일 이내
            days_future = random.randint(30, 180)
            scheduled_date = date.today() + timedelta(days=days_future)
            
            # 정비 유형 선택
            maintenance_types = list(models.MaintenanceTypeEnum)
            maintenance_type = random.choice(maintenance_types)
            
            # 정비소 선택
            shop = random.choice(shops)
            
            # 정비 내용 생성
            if maintenance_type == models.MaintenanceTypeEnum.REGULAR:
                description = "예정된 정기 점검"
                estimated_cost = float(random.randint(10, 30) * 10000)
            elif maintenance_type == models.MaintenanceTypeEnum.INSPECTION:
                description = "법정 정기 검사"
                estimated_cost = float(random.randint(5, 15) * 10000)
            else:
                description = "타이어 교체"
                estimated_cost = float(random.randint(40, 80) * 10000)
            
            record = models.ScheduledMaintenance(
                vehicle_id=vehicle.id,
                maintenance_type=maintenance_type,
                scheduled_date=scheduled_date,
                estimated_cost=estimated_cost,
                description=description,
                shop_id=shop.id,
                is_completed=False,
                notes="사전 예약 필요"
            )
            scheduled_maintenances.append(record)
            db.add(record)
        
        db.commit()
        logger.info(f"{len(scheduled_maintenances)}개의 테스트 예정된 정비가 생성되었습니다.")
        
        # 테스트 알림 생성
        notifications = []
        for i in range(5):  # 5개의 알림
            # 날짜 계산 - 최근 30일 이내
            days_ago = random.randint(0, 30)
            created_date = datetime.now() - timedelta(days=days_ago)
            
            # 알림 유형 결정
            types = ["maintenance", "inspection", "insurance", "reminder"]
            notification_type = random.choice(types)
            
            if notification_type == "maintenance":
                title = "정비 알림"
                message = "귀하의 차량 정기 점검 일정이 다가오고 있습니다."
            elif notification_type == "inspection":
                title = "검사 알림"
                message = "법정 검사 기간이 곧 만료됩니다. 검사를 예약해주세요."
            elif notification_type == "insurance":
                title = "보험 알림"
                message = "자동차 보험 갱신 기간이 다가오고 있습니다."
            else:
                title = "일반 알림"
                message = "새로운 차량 관리 기능이 추가되었습니다. 확인해보세요!"
            
            notification = models.Notification(
                user_id=test_user.id,
                title=title,
                message=message,
                type=notification_type,
                is_read=(random.random() < 0.5),  # 50% 확률로 읽음 처리
                reference_id=random.randint(1, 100),
                reference_type="Vehicle" if notification_type in ["maintenance", "inspection", "insurance"] else "System",
                created_at=created_date
            )
            notifications.append(notification)
            db.add(notification)
        
        db.commit()
        logger.info(f"{len(notifications)}개의 테스트 알림이 생성되었습니다.")
        
        logger.info("모든 테스트 데이터가 성공적으로 생성되었습니다.")
        
    except Exception as e:
        db.rollback()
        logger.error(f"테스트 데이터 생성 중 오류 발생: {e}")
        raise
    finally:
        db.close()

def main():
    """메인 함수"""
    logger.info("데이터베이스 초기화를 시작합니다...")
    
    # 테이블 생성
    create_tables()
    
    # 테스트 데이터 생성
    create_test_data()
    
    logger.info("데이터베이스 초기화 완료!")

if __name__ == "__main__":
    main()