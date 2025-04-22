"""테스트 데이터 생성 스크립트"""

import os
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from passlib.context import CryptContext
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

# src 디렉토리를 Python 경로에 추가
src_path = str(Path(__file__).parent.parent)
if src_path not in sys.path:
    sys.path.append(src_path)

from passlib.context import CryptContext
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from src.core.config import settings
# 모델 임포트
from src.database import Base, get_session
from src.database.models import (Shop, ShopImage, ShopReview, ShopService,
                                 Technician, Todo, User)
from src.models.schemas import (MaintenanceStatus, ServiceType, ShopStatus,
                                ShopType, TodoPriority, TodoStatus, UserRole,
                                VehicleStatus, VehicleType)
from src.modules.maintenance.models import (Maintenance, MaintenanceDocument,
                                            MaintenancePart)
from src.modules.vehicle.models import Vehicle

# 비밀번호 해싱을 위한 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# 데이터베이스 연결
def get_database_url():
    """환경 변수에서 데이터베이스 URL을 가져오거나 기본값을 사용"""
    return os.getenv("DATABASE_URL", settings.DATABASE_URL)


def _get_vehicle_type(index: int) -> str:
    """차량 타입을 결정합니다."""
    if index % 3 == 0:
        return VehicleType.SEDAN.value
    elif index % 3 == 1:
        return VehicleType.SUV.value
    else:
        return VehicleType.ELECTRIC.value


def _get_second_vehicle_type(index: int) -> str:
    """두 번째 차량의 타입을 결정합니다."""
    if index % 3 == 0:
        return VehicleType.HYBRID.value
    elif index % 3 == 1:
        return VehicleType.VAN.value
    else:
        return VehicleType.TRUCK.value


def _create_database_engine(database_url: str):
    """데이터베이스 엔진을 생성합니다."""
    print(f"데이터베이스 연결 시도: {database_url}")
    return create_engine(database_url)


def _create_session_factory(engine):
    """세션 팩토리를 생성합니다."""
    return sessionmaker(bind=engine)


def _create_session(session_factory):
    """데이터베이스 세션을 생성합니다."""
    return session_factory()


def _test_database_connection(session):
    """데이터베이스 연결을 테스트합니다."""
    session.execute(text("SELECT 1"))
    print("데이터베이스 연결 성공")


def _initialize_database_connection() -> Engine:
    """데이터베이스 연결을 초기화합니다."""
    database_url = get_database_url()
    return _create_database_engine(database_url)


def create_database_session():
    """데이터베이스 세션을 생성합니다."""
    try:
        engine = _initialize_database_connection()
        session_factory = _create_session_factory(engine)
        db_session = _create_session(session_factory)
        _test_database_connection(db_session)
        return db_session

    except Exception as e:
        print(f"데이터베이스 연결 오류: {e}")
        import traceback

        traceback.print_exc()
        raise


# 세션 생성
session = create_database_session()


def create_users():
    """사용자 데이터 생성"""
    users = [
        # 관리자
        User(
            id=str(uuid.uuid4()),
            email="admin@example.com",
            name="시스템 관리자",
            password_hash=pwd_context.hash("admin1234"),
            role=UserRole.ADMIN.value,
        ),
        User(
            id=str(uuid.uuid4()),
            email="admin2@example.com",
            name="보조 관리자",
            password_hash=pwd_context.hash("admin1234"),
            role=UserRole.ADMIN.value,
        ),
        # 매니저
        User(
            id=str(uuid.uuid4()),
            email="manager@example.com",
            name="정비소 매니저",
            password_hash=pwd_context.hash("manager1234"),
            role=UserRole.MANAGER.value,
        ),
        User(
            id=str(uuid.uuid4()),
            email="manager2@example.com",
            name="야간 매니저",
            password_hash=pwd_context.hash("manager1234"),
            role=UserRole.MANAGER.value,
        ),
        User(
            id=str(uuid.uuid4()),
            email="manager3@example.com",
            name="주말 매니저",
            password_hash=pwd_context.hash("manager1234"),
            role=UserRole.MANAGER.value,
        ),
        # 고객
        User(
            id=str(uuid.uuid4()),
            email="customer1@example.com",
            name="김고객",
            password_hash=pwd_context.hash("customer1234"),
            role=UserRole.CUSTOMER.value,
        ),
        User(
            id=str(uuid.uuid4()),
            email="customer2@example.com",
            name="이고객",
            password_hash=pwd_context.hash("customer1234"),
            role=UserRole.CUSTOMER.value,
        ),
        User(
            id=str(uuid.uuid4()),
            email="customer3@example.com",
            name="박고객",
            password_hash=pwd_context.hash("customer1234"),
            role=UserRole.CUSTOMER.value,
        ),
        User(
            id=str(uuid.uuid4()),
            email="customer4@example.com",
            name="최고객",
            password_hash=pwd_context.hash("customer1234"),
            role=UserRole.CUSTOMER.value,
        ),
        User(
            id=str(uuid.uuid4()),
            email="customer5@example.com",
            name="정고객",
            password_hash=pwd_context.hash("customer1234"),
            role=UserRole.CUSTOMER.value,
        ),
    ]
    session.add_all(users)
    session.commit()
    return users


def create_vehicles(users):
    """차량 데이터 생성"""
    # 고객 사용자만 필터링 (인덱스 5부터 시작)
    customers = users[5:]
    vehicles = []

    # 각 고객별 차량 생성
    for customer in customers:
        # 첫 번째 차량
        vehicles.append(
            Vehicle(
                id=str(uuid.uuid4()),
                vin=f"1HGCM82633A{str(uuid.uuid4())[:6]}",
                make="현대",
                model=["아반떼", "소나타", "그랜저", "투싼"][len(vehicles) % 4],
                year=2020 + (len(vehicles) % 3),
                type=_get_vehicle_type(len(vehicles)),
                color=["검정", "흰색", "은색", "회색", "빨강"][len(vehicles) % 5],
                plate=f"{len(vehicles)+11}가 {(len(vehicles)+1)*1234}",
                mileage=30000 + (len(vehicles) * 5000),
                status=VehicleStatus.ACTIVE.value,
                owner_id=customer.id,
            )
        )

        # 두 번째 차량 (일부 고객만)
        if len(vehicles) % 2 == 0:
            vehicles.append(
                Vehicle(
                    id=str(uuid.uuid4()),
                    vin=f"5XYZU3LB0DG{str(uuid.uuid4())[:6]}",
                    make="기아",
                    model=["K5", "쏘렌토", "스포티지", "카니발"][len(vehicles) % 4],
                    year=2019 + (len(vehicles) % 4),
                    type=_get_second_vehicle_type(len(vehicles)),
                    color=["검정", "흰색", "은색", "청색", "진주색"][len(vehicles) % 5],
                    plate=f"{len(vehicles)+31}나 {(len(vehicles)+1)*2345}",
                    mileage=20000 + (len(vehicles) * 3000),
                    status=VehicleStatus.ACTIVE.value,
                    owner_id=customer.id,
                )
            )

    session.add_all(vehicles)
    session.commit()
    return vehicles


def create_shops():
    """정비소 데이터 생성"""
    shops = [
        Shop(
            id=str(uuid.uuid4()),
            name="현대 공식 서비스센터",
            type=ShopType.DEALER.value,
            status=ShopStatus.ACTIVE.value,
            description="현대자동차 공식 서비스센터입니다.",
            address="서울시 강남구 테헤란로 123",
            phone="02-1234-5678",
            email="service@hyundai.com",
            latitude=37.5665,
            longitude=126.9780,
        ),
        Shop(
            id=str(uuid.uuid4()),
            name="기아 공식 서비스센터",
            type=ShopType.DEALER.value,
            status=ShopStatus.ACTIVE.value,
            description="기아자동차 공식 서비스센터입니다.",
            address="서울시 서초구 반포대로 456",
            phone="02-2345-6789",
            email="service@kia.com",
            latitude=37.5028,
            longitude=127.0244,
        ),
    ]
    session.add_all(shops)
    session.commit()
    return shops


def create_shop_services(shops):
    """정비소 서비스 데이터 생성"""
    services = []
    for shop in shops:
        services.extend(
            [
                ShopService(
                    id=str(uuid.uuid4()),
                    shop_id=shop.id,
                    service_type=ServiceType.OIL_CHANGE.value,
                    description="엔진 오일 교체",
                    price=50000,
                    duration_minutes=30,
                ),
                ShopService(
                    id=str(uuid.uuid4()),
                    shop_id=shop.id,
                    service_type=ServiceType.TIRE_SERVICE.value,
                    description="타이어 교체/로테이션",
                    price=80000,
                    duration_minutes=60,
                ),
            ]
        )
    session.add_all(services)
    session.commit()
    return services


def create_technicians(shops):
    """정비사 데이터 생성"""
    technicians = []
    for shop in shops:
        technicians.extend(
            [
                Technician(
                    id=str(uuid.uuid4()),
                    shop_id=shop.id,
                    name=f"{shop.name} 정비사 1",
                    specialty="엔진",
                    experience_years=5,
                    certification="자동차 정비기사",
                ),
                Technician(
                    id=str(uuid.uuid4()),
                    shop_id=shop.id,
                    name=f"{shop.name} 정비사 2",
                    specialty="전기/전자",
                    experience_years=3,
                    certification="전기자동차 정비기사",
                ),
            ]
        )
    session.add_all(technicians)
    session.commit()
    return technicians


def _create_maintenance_date(index: int, records_count: int) -> datetime:
    """정비 날짜를 생성합니다."""
    return datetime.now(timezone.utc) - timedelta(
        days=30 * (index + 1) + (records_count % 15)
    )


def _create_todo_due_date(
    todos_count: int, base_days: int, variation_days: int
) -> datetime:
    """할 일 마감일을 생성합니다."""
    return datetime.now(timezone.utc) + timedelta(
        days=base_days + (todos_count % variation_days)
    )


def create_maintenance_records(vehicles, shops):
    """정비 기록 데이터 생성"""
    records = []
    maintenance_types = [
        ("엔진 오일 교체", 50000),
        ("타이어 교체", 400000),
        ("브레이크 패드 교체", 150000),
        ("에어컨 필터 교체", 30000),
        ("배터리 교체", 200000),
    ]

    for vehicle in vehicles:
        num_records = random.randint(3, 8)
        for i in range(num_records):
            maint_type = maintenance_types[len(records) % len(maintenance_types)]
            records.append(
                Maintenance(
                    id=str(uuid.uuid4()),
                    vehicle_id=vehicle.id,
                    description=maint_type[0],
                    date=_create_maintenance_date(i, len(records)),
                    status=MaintenanceStatus.COMPLETED.value,
                    cost=maint_type[1],
                    performed_by=f"{shops[len(records) % len(shops)].name} 정비사",
                )
            )

    session.add_all(records)
    session.commit()
    return records


def _get_todo_priority(index: int, is_second: bool = False) -> str:
    """할 일 우선순위를 결정합니다."""
    if is_second:
        if index % 3 == 0:
            return TodoPriority.MEDIUM.value
        elif index % 3 == 1:
            return TodoPriority.LOW.value
        return TodoPriority.HIGH.value

    if index % 3 == 0:
        return TodoPriority.HIGH.value
    elif index % 3 == 1:
        return TodoPriority.MEDIUM.value
    return TodoPriority.LOW.value


def create_todos(users, vehicles):
    """할 일 데이터 생성"""
    todos = []
    managers = [user for user in users if user.role == UserRole.MANAGER.value]

    for vehicle in vehicles:
        # 기본 정비 일정
        todos.extend(
            [
                Todo(
                    id=str(uuid.uuid4()),
                    title=f"{vehicle.make} {vehicle.model} 정기 점검",
                    description="정기 점검 및 소모품 교체 필요",
                    due_date=_create_todo_due_date(len(todos), 7, 14),
                    status=TodoStatus.PENDING.value,
                    priority=_get_todo_priority(len(todos)),
                    vehicle_id=vehicle.id,
                    user_id=vehicle.owner_id,
                    assignee_id=managers[len(todos) % len(managers)].id,
                ),
                Todo(
                    id=str(uuid.uuid4()),
                    title=f"{vehicle.make} {vehicle.model} 타이어 교체",
                    description="겨울용 타이어로 교체 필요",
                    due_date=_create_todo_due_date(len(todos), 14, 30),
                    status=TodoStatus.PENDING.value,
                    priority=_get_todo_priority(len(todos), is_second=True),
                    vehicle_id=vehicle.id,
                    user_id=vehicle.owner_id,
                    assignee_id=managers[len(todos) % len(managers)].id,
                ),
            ]
        )

        # 추가 정비 항목 (일부 차량만)
        if len(todos) % 3 == 0:
            todos.append(
                Todo(
                    id=str(uuid.uuid4()),
                    title=f"{vehicle.make} {vehicle.model} 브레이크 패드 점검",
                    description="브레이크 패드 마모 상태 확인 필요",
                    due_date=_create_todo_due_date(len(todos), 3, 7),
                    status=TodoStatus.PENDING.value,
                    priority=_get_todo_priority(len(todos), is_second=True),
                    vehicle_id=vehicle.id,
                    user_id=vehicle.owner_id,
                    assignee_id=managers[len(todos) % len(managers)].id,
                )
            )

    session.add_all(todos)
    session.commit()
    return todos


def _initialize_database():
    """데이터베이스 초기화 - 기존 데이터 삭제"""
    print("기존 데이터 삭제 중...")
    tables = [
        Todo,
        MaintenancePart,
        MaintenanceDocument,
        Maintenance,
        Vehicle,
        ShopService,
        ShopReview,
        ShopImage,
        Technician,
        Shop,
        User,
    ]
    for table in tables:
        session.query(table).delete()
    session.commit()
    print("기존 데이터 삭제 완료")


def _create_test_data():
    """테스트 데이터 생성"""
    # 사용자 생성
    print("사용자 생성 중...")
    users = create_users()
    print(f"{len(users)}명의 사용자 생성 완료")

    # 차량 생성
    print("차량 생성 중...")
    vehicles = create_vehicles(users)
    print(f"{len(vehicles)}대의 차량 생성 완료")

    # 정비소 생성
    print("정비소 생성 중...")
    shops = create_shops()
    print(f"{len(shops)}개의 정비소 생성 완료")

    # 정비소 서비스 생성
    print("정비소 서비스 생성 중...")
    services = create_shop_services(shops)
    print(f"{len(services)}개의 서비스 생성 완료")

    # 정비사 생성
    print("정비사 생성 중...")
    technicians = create_technicians(shops)
    print(f"{len(technicians)}명의 정비사 생성 완료")

    # 정비 기록 생성
    print("정비 기록 생성 중...")
    maintenance_records = create_maintenance_records(vehicles, shops)
    print(f"{len(maintenance_records)}개의 정비 기록 생성 완료")

    # 할 일 생성
    print("할 일 생성 중...")
    todos = create_todos(users, vehicles)
    print(f"{len(todos)}개의 할 일 생성 완료")

    return users, vehicles, shops, services, technicians, maintenance_records, todos


def main():
    """메인 함수"""
    try:
        print("테스트 데이터 생성 시작...")
        _initialize_database()
        _create_test_data()
        print("\n테스트 데이터 생성 완료!")

    except Exception as e:
        print(f"오류 발생: {str(e)}")
        import traceback

        traceback.print_exc()
        session.rollback()
    finally:
        session.close()


if __name__ == "__main__":
    main()
