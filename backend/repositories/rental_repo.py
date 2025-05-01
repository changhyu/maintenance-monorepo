"""
렌트카 관련 데이터베이스 연산을 위한 레포지토리
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_, or_, not_
from sqlalchemy.sql import text
from typing import List, Dict, Any, Optional, Tuple, Union
from datetime import datetime, date, timedelta

from backend.models.rental import (
    Customer, Rental, Reservation, DamageReport, 
    InsurancePolicy, RentalRate, RentalStatus, PaymentStatus
)
from backend.models.vehicle import Vehicle, VehicleStatus
from backend.models.user import User

# 고객(Customer) 관련 함수
def create_customer(db: Session, customer_data: Dict[str, Any]) -> Customer:
    """
    새 고객을 생성합니다.
    
    Args:
        db: 데이터베이스 세션
        customer_data: 고객 데이터 딕셔너리
        
    Returns:
        생성된 고객 객체
    """
    customer = Customer(**customer_data)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

def get_customer(db: Session, customer_id: int) -> Optional[Customer]:
    """
    고객 ID로 고객을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        customer_id: 고객 ID
        
    Returns:
        고객 객체 또는 None
    """
    return db.query(Customer).filter(Customer.id == customer_id).first()

def get_customer_by_email(db: Session, email: str) -> Optional[Customer]:
    """
    이메일로 고객을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        email: 고객 이메일
        
    Returns:
        고객 객체 또는 None
    """
    return db.query(Customer).filter(Customer.email == email).first()

def update_customer(db: Session, customer_id: int, customer_data: Dict[str, Any]) -> Optional[Customer]:
    """
    고객 정보를 업데이트합니다.
    
    Args:
        db: 데이터베이스 세션
        customer_id: 고객 ID
        customer_data: 업데이트할 고객 데이터
        
    Returns:
        업데이트된 고객 객체 또는 None
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        return None
        
    for key, value in customer_data.items():
        setattr(customer, key, value)
    
    db.commit()
    db.refresh(customer)
    return customer

def delete_customer(db: Session, customer_id: int) -> bool:
    """
    고객을 삭제합니다.
    
    Args:
        db: 데이터베이스 세션
        customer_id: 고객 ID
        
    Returns:
        삭제 성공 여부
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        return False
        
    db.delete(customer)
    db.commit()
    return True

def list_customers(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    search: str = None,
    is_active: bool = None
) -> Tuple[List[Customer], int]:
    """
    고객 목록을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        skip: 건너뛸 레코드 수
        limit: 조회할 최대 레코드 수
        search: 검색어 (이름, 이메일, 전화번호 등)
        is_active: 활성 상태 필터
        
    Returns:
        (고객 목록, 총 레코드 수)
    """
    query = db.query(Customer)
    
    # 검색어 필터
    if search:
        query = query.filter(
            or_(
                Customer.first_name.ilike(f"%{search}%"),
                Customer.last_name.ilike(f"%{search}%"),
                Customer.email.ilike(f"%{search}%"),
                Customer.phone.ilike(f"%{search}%")
            )
        )
    
    # 활성 상태 필터
    if is_active is not None:
        query = query.filter(Customer.is_active == is_active)
    
    # 총 레코드 수
    total = query.count()
    
    # 페이징 적용
    customers = query.offset(skip).limit(limit).all()
    
    return customers, total

# 렌탈(Rental) 관련 함수
def create_rental(db: Session, rental_data: Dict[str, Any], user_id: int) -> Rental:
    """
    새 렌탈을 생성합니다.
    
    Args:
        db: 데이터베이스 세션
        rental_data: 렌탈 데이터 딕셔너리
        user_id: 작업을 수행하는 사용자 ID
        
    Returns:
        생성된 렌탈 객체
    """
    # 사용자 ID 추가
    rental_data["created_by"] = user_id
    rental_data["updated_by"] = user_id
    
    # 총 금액 계산
    if "base_rate" in rental_data:
        base_rate = rental_data.get("base_rate")
        discount = rental_data.get("discount", 0)
        additional_charges = rental_data.get("additional_charges", 0)
        tax_rate = 0.1  # 10% 세금 가정
        
        subtotal = base_rate - discount + additional_charges
        tax = subtotal * tax_rate
        total = subtotal + tax
        
        rental_data["tax"] = tax
        rental_data["total_amount"] = total
    
    # 렌탈 생성
    rental = Rental(**rental_data)
    db.add(rental)
    
    # 차량 상태 업데이트
    vehicle = db.query(Vehicle).filter(Vehicle.id == rental_data["vehicle_id"]).first()
    if vehicle:
        if rental.status == RentalStatus.ACTIVE:
            vehicle.status = VehicleStatus.RENTED
    
    db.commit()
    db.refresh(rental)
    return rental

def get_rental(db: Session, rental_id: int) -> Optional[Rental]:
    """
    렌탈 ID로 렌탈을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        rental_id: 렌탈 ID
        
    Returns:
        렌탈 객체 또는 None
    """
    return db.query(Rental).options(
        joinedload(Rental.customer),
        joinedload(Rental.vehicle),
        joinedload(Rental.damage_reports)
    ).filter(Rental.id == rental_id).first()

def update_rental(db: Session, rental_id: int, rental_data: Dict[str, Any], user_id: int) -> Optional[Rental]:
    """
    렌탈 정보를 업데이트합니다.
    
    Args:
        db: 데이터베이스 세션
        rental_id: 렌탈 ID
        rental_data: 업데이트할 렌탈 데이터
        user_id: 작업을 수행하는 사용자 ID
        
    Returns:
        업데이트된 렌탈 객체 또는 None
    """
    rental = db.query(Rental).filter(Rental.id == rental_id).first()
    if not rental:
        return None
    
    # 사용자 ID 추가
    rental_data["updated_by"] = user_id
    
    # 금액 관련 정보가 변경된 경우 총 금액 다시 계산
    recalculate_total = any(key in rental_data for key in ["base_rate", "discount", "additional_charges"])
    
    for key, value in rental_data.items():
        setattr(rental, key, value)
    
    if recalculate_total:
        base_rate = rental.base_rate
        discount = rental.discount or 0
        additional_charges = rental.additional_charges or 0
        tax_rate = 0.1  # 10% 세금 가정
        
        subtotal = base_rate - discount + additional_charges
        tax = subtotal * tax_rate
        total = subtotal + tax
        
        rental.tax = tax
        rental.total_amount = total
    
    # 상태가 변경된 경우 차량 상태도 업데이트
    if "status" in rental_data:
        vehicle = db.query(Vehicle).filter(Vehicle.id == rental.vehicle_id).first()
        if vehicle:
            if rental.status == RentalStatus.ACTIVE:
                vehicle.status = VehicleStatus.RENTED
            elif rental.status in [RentalStatus.COMPLETED, RentalStatus.CANCELED]:
                vehicle.status = VehicleStatus.AVAILABLE
    
    db.commit()
    db.refresh(rental)
    return rental

def list_rentals(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    customer_id: int = None,
    vehicle_id: int = None,
    status: Union[str, List[str]] = None,
    payment_status: Union[str, List[str]] = None,
    start_date_from: datetime = None,
    start_date_to: datetime = None,
    end_date_from: datetime = None,
    end_date_to: datetime = None,
    overdue_only: bool = False
) -> Tuple[List[Rental], int]:
    """
    렌탈 목록을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        skip: 건너뛸 레코드 수
        limit: 조회할 최대 레코드 수
        customer_id: 고객 ID 필터
        vehicle_id: 차량 ID 필터
        status: 상태 필터
        payment_status: 결제 상태 필터
        start_date_from: 시작 날짜 범위(시작)
        start_date_to: 시작 날짜 범위(끝)
        end_date_from: 종료 날짜 범위(시작)
        end_date_to: 종료 날짜 범위(끝)
        overdue_only: 연체된 렌탈만 조회
        
    Returns:
        (렌탈 목록, 총 레코드 수)
    """
    query = db.query(Rental).options(
        joinedload(Rental.customer),
        joinedload(Rental.vehicle)
    )
    
    # 고객 ID 필터
    if customer_id:
        query = query.filter(Rental.customer_id == customer_id)
    
    # 차량 ID 필터
    if vehicle_id:
        query = query.filter(Rental.vehicle_id == vehicle_id)
    
    # 상태 필터
    if status:
        if isinstance(status, list):
            query = query.filter(Rental.status.in_(status))
        else:
            query = query.filter(Rental.status == status)
    
    # 결제 상태 필터
    if payment_status:
        if isinstance(payment_status, list):
            query = query.filter(Rental.payment_status.in_(payment_status))
        else:
            query = query.filter(Rental.payment_status == payment_status)
    
    # 시작 날짜 범위 필터
    if start_date_from:
        query = query.filter(Rental.start_date >= start_date_from)
    if start_date_to:
        query = query.filter(Rental.start_date <= start_date_to)
    
    # 종료 날짜 범위 필터
    if end_date_from:
        query = query.filter(Rental.end_date >= end_date_from)
    if end_date_to:
        query = query.filter(Rental.end_date <= end_date_to)
    
    # 연체된 렌탈만 필터
    if overdue_only:
        now = datetime.utcnow()
        query = query.filter(
            and_(
                Rental.status == RentalStatus.ACTIVE,
                Rental.end_date < now
            )
        )
    
    # 총 레코드 수
    total = query.count()
    
    # 페이징 및 정렬 적용 (생성일자 기준 내림차순)
    rentals = query.order_by(desc(Rental.created_at)).offset(skip).limit(limit).all()
    
    return rentals, total

def checkout_vehicle(db: Session, rental_id: int, checkout_data: Dict[str, Any], user_id: int) -> Optional[Rental]:
    """
    차량을 대여(체크아웃)합니다.
    
    Args:
        db: 데이터베이스 세션
        rental_id: 렌탈 ID
        checkout_data: 체크아웃 데이터
        user_id: 작업을 수행하는 사용자 ID
        
    Returns:
        업데이트된 렌탈 객체 또는 None
    """
    rental = db.query(Rental).filter(Rental.id == rental_id).first()
    if not rental:
        return None
    
    # 이미 활성화된 렌탈인 경우
    if rental.status != RentalStatus.RESERVED:
        return None
    
    # 렌탈 업데이트
    rental.status = RentalStatus.ACTIVE
    rental.odometer_start = checkout_data.get("odometer_start")
    rental.fuel_level_start = checkout_data.get("fuel_level_start")
    if "notes" in checkout_data:
        rental.notes = checkout_data.get("notes")
    rental.updated_by = user_id
    
    # 차량 상태 업데이트
    vehicle = db.query(Vehicle).filter(Vehicle.id == rental.vehicle_id).first()
    if vehicle:
        vehicle.status = VehicleStatus.RENTED
        vehicle.mileage = checkout_data.get("odometer_start") or vehicle.mileage
    
    db.commit()
    db.refresh(rental)
    return rental

def checkin_vehicle(db: Session, rental_id: int, checkin_data: Dict[str, Any], user_id: int) -> Optional[Rental]:
    """
    차량을 반납(체크인)합니다.
    
    Args:
        db: 데이터베이스 세션
        rental_id: 렌탈 ID
        checkin_data: 체크인 데이터
        user_id: 작업을 수행하는 사용자 ID
        
    Returns:
        업데이트된 렌탈 객체 또는 None
    """
    rental = db.query(Rental).filter(Rental.id == rental_id).first()
    if not rental:
        return None
    
    # 활성화된 렌탈이 아닌 경우
    if rental.status != RentalStatus.ACTIVE:
        return None
    
    # 렌탈 업데이트
    rental.status = RentalStatus.COMPLETED
    rental.actual_return_date = checkin_data.get("actual_return_date") or datetime.utcnow()
    rental.odometer_end = checkin_data.get("odometer_end")
    rental.fuel_level_end = checkin_data.get("fuel_level_end")
    
    # 추가 요금이 있으면 적용
    if "additional_charges" in checkin_data and checkin_data["additional_charges"] > 0:
        rental.additional_charges = (rental.additional_charges or 0) + checkin_data["additional_charges"]
        
        # 총 금액 다시 계산
        base_rate = rental.base_rate
        discount = rental.discount or 0
        additional_charges = rental.additional_charges
        tax_rate = 0.1  # 10% 세금 가정
        
        subtotal = base_rate - discount + additional_charges
        tax = subtotal * tax_rate
        total = subtotal + tax
        
        rental.tax = tax
        rental.total_amount = total
    
    if "notes" in checkin_data:
        new_note = checkin_data.get("notes")
        if rental.notes:
            rental.notes = f"{rental.notes}\n\n[체크인 메모: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}]\n{new_note}"
        else:
            rental.notes = f"[체크인 메모: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}]\n{new_note}"
    
    rental.updated_by = user_id
    
    # 차량 상태 및 정보 업데이트
    vehicle = db.query(Vehicle).filter(Vehicle.id == rental.vehicle_id).first()
    if vehicle:
        vehicle.status = VehicleStatus.AVAILABLE
        vehicle.mileage = checkin_data.get("odometer_end") or vehicle.mileage
        
        # 차량 렌탈 통계 업데이트
        vehicle.update_rental_stats(rental.total_amount)
    
    db.commit()
    db.refresh(rental)
    return rental

# 예약(Reservation) 관련 함수
def create_reservation(db: Session, reservation_data: Dict[str, Any]) -> Reservation:
    """
    새 예약을 생성합니다.
    
    Args:
        db: 데이터베이스 세션
        reservation_data: 예약 데이터 딕셔너리
        
    Returns:
        생성된 예약 객체
    """
    # 예약 코드 생성 (간단한 예시 - 실제로는 더 복잡한 코드 생성 로직이 필요할 수 있음)
    import random
    import string
    
    # 이미 있는 예약 코드가 아닌 고유한 코드 생성
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        existing = db.query(Reservation).filter(Reservation.reservation_code == code).first()
        if not existing:
            break
    
    reservation_data["reservation_code"] = code
    
    # 예약 생성
    reservation = Reservation(**reservation_data)
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    return reservation

def get_reservation(db: Session, reservation_id: int) -> Optional[Reservation]:
    """
    예약 ID로 예약을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        reservation_id: 예약 ID
        
    Returns:
        예약 객체 또는 None
    """
    return db.query(Reservation).options(
        joinedload(Reservation.customer),
        joinedload(Reservation.vehicle)
    ).filter(Reservation.id == reservation_id).first()

def get_reservation_by_code(db: Session, code: str) -> Optional[Reservation]:
    """
    예약 코드로 예약을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        code: 예약 코드
        
    Returns:
        예약 객체 또는 None
    """
    return db.query(Reservation).options(
        joinedload(Reservation.customer),
        joinedload(Reservation.vehicle)
    ).filter(Reservation.reservation_code == code).first()

def update_reservation(db: Session, reservation_id: int, reservation_data: Dict[str, Any]) -> Optional[Reservation]:
    """
    예약 정보를 업데이트합니다.
    
    Args:
        db: 데이터베이스 세션
        reservation_id: 예약 ID
        reservation_data: 업데이트할 예약 데이터
        
    Returns:
        업데이트된 예약 객체 또는 None
    """
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        return None
    
    for key, value in reservation_data.items():
        setattr(reservation, key, value)
    
    db.commit()
    db.refresh(reservation)
    return reservation

def list_reservations(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    customer_id: int = None,
    vehicle_id: int = None,
    status: str = None,
    start_date_from: datetime = None,
    start_date_to: datetime = None
) -> Tuple[List[Reservation], int]:
    """
    예약 목록을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        skip: 건너뛸 레코드 수
        limit: 조회할 최대 레코드 수
        customer_id: 고객 ID 필터
        vehicle_id: 차량 ID 필터
        status: 상태 필터
        start_date_from: 시작 날짜 범위(시작)
        start_date_to: 시작 날짜 범위(끝)
        
    Returns:
        (예약 목록, 총 레코드 수)
    """
    query = db.query(Reservation).options(
        joinedload(Reservation.customer),
        joinedload(Reservation.vehicle)
    )
    
    # 고객 ID 필터
    if customer_id:
        query = query.filter(Reservation.customer_id == customer_id)
    
    # 차량 ID 필터
    if vehicle_id:
        query = query.filter(Reservation.vehicle_id == vehicle_id)
    
    # 상태 필터
    if status:
        query = query.filter(Reservation.status == status)
    
    # 시작 날짜 범위 필터
    if start_date_from:
        query = query.filter(Reservation.start_date >= start_date_from)
    if start_date_to:
        query = query.filter(Reservation.start_date <= start_date_to)
    
    # 총 레코드 수
    total = query.count()
    
    # 페이징 및 정렬 적용 (생성일자 기준 내림차순)
    reservations = query.order_by(desc(Reservation.created_at)).offset(skip).limit(limit).all()
    
    return reservations, total

def convert_reservation_to_rental(
    db: Session, 
    reservation_id: int, 
    rental_data: Dict[str, Any],
    user_id: int
) -> Optional[Rental]:
    """
    예약을 렌탈로 전환합니다.
    
    Args:
        db: 데이터베이스 세션
        reservation_id: 예약 ID
        rental_data: 추가 렌탈 데이터
        user_id: 작업을 수행하는 사용자 ID
        
    Returns:
        생성된 렌탈 객체 또는 None
    """
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        return None
    
    # 이미 취소된 예약인 경우
    if reservation.status == "CANCELED":
        return None
    
    # 렌탈 데이터 준비
    new_rental_data = {
        "customer_id": reservation.customer_id,
        "vehicle_id": reservation.vehicle_id,
        "start_date": reservation.start_date,
        "end_date": reservation.end_date,
        "pickup_location": reservation.pickup_location,
        "return_location": reservation.return_location,
        "status": RentalStatus.RESERVED,
        "payment_status": PaymentStatus.PENDING,
        "base_rate": rental_data.get("base_rate"),
        "additional_charges": rental_data.get("additional_charges", 0),
        "discount": rental_data.get("discount", 0),
        "deposit_amount": rental_data.get("deposit_amount", 0),
        "notes": f"예약 코드 {reservation.reservation_code}에서 전환됨. {rental_data.get('notes', '')}"
    }
    
    # 렌탈 생성
    rental = create_rental(db, new_rental_data, user_id)
    
    # 예약 상태 업데이트
    reservation.status = "CONFIRMED"
    db.commit()
    
    return rental

def cancel_reservation(db: Session, reservation_id: int) -> Optional[Reservation]:
    """
    예약을 취소합니다.
    
    Args:
        db: 데이터베이스 세션
        reservation_id: 예약 ID
        
    Returns:
        업데이트된 예약 객체 또는 None
    """
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        return None
    
    reservation.status = "CANCELED"
    db.commit()
    db.refresh(reservation)
    return reservation

# 차량 가용성 확인
def check_vehicle_availability(
    db: Session,
    start_date: datetime,
    end_date: datetime,
    vehicle_type: str = None,
    pickup_location: str = None,
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[Dict[str, Any]], int]:
    """
    특정 기간에 대여 가능한 차량을 찾습니다.
    
    Args:
        db: 데이터베이스 세션
        start_date: 대여 시작일
        end_date: 대여 종료일
        vehicle_type: 차량 유형 필터
        pickup_location: 픽업 위치 필터
        skip: 건너뛸 레코드 수
        limit: 조회할 최대 레코드 수
        
    Returns:
        (가용 차량 목록, 총 레코드 수)
    """
    # 대여 가능한 차량 쿼리
    query = db.query(Vehicle).filter(
        Vehicle.is_available_for_rent == True,
        Vehicle.status == VehicleStatus.AVAILABLE
    )
    
    # 차량 유형 필터
    if vehicle_type:
        query = query.filter(Vehicle.type == vehicle_type)
    
    # 해당 기간 대여 중인 차량 ID 목록 (예약 또는 렌탈)
    unavailable_vehicle_ids = db.query(Rental.vehicle_id).filter(
        Rental.status.in_([RentalStatus.RESERVED, RentalStatus.ACTIVE]),
        or_(
            # 1. 새 대여 시작일이 기존 대여 기간 내에 있는 경우
            and_(Rental.start_date <= start_date, start_date <= Rental.end_date),
            # 2. 새 대여 종료일이 기존 대여 기간 내에 있는 경우
            and_(Rental.start_date <= end_date, end_date <= Rental.end_date),
            # 3. 새 대여 기간이 기존 대여를 완전히 포함하는 경우
            and_(start_date <= Rental.start_date, Rental.end_date <= end_date)
        )
    ).distinct().all()
    
    # 예약된 차량 ID 목록
    unavailable_from_reservations = db.query(Reservation.vehicle_id).filter(
        Reservation.status == "CONFIRMED",
        Reservation.vehicle_id != None,
        or_(
            # 1. 새 대여 시작일이 기존 예약 기간 내에 있는 경우
            and_(Reservation.start_date <= start_date, start_date <= Reservation.end_date),
            # 2. 새 대여 종료일이 기존 예약 기간 내에 있는 경우
            and_(Reservation.start_date <= end_date, end_date <= Reservation.end_date),
            # 3. 새 대여 기간이 기존 예약을 완전히 포함하는 경우
            and_(start_date <= Reservation.start_date, Reservation.end_date <= end_date)
        )
    ).distinct().all()
    
    # 불가능한 차량 ID 목록 병합
    unavailable_ids = [item[0] for item in unavailable_vehicle_ids]
    unavailable_ids.extend([item[0] for item in unavailable_from_reservations])
    
    # 불가능한 차량 필터링
    if unavailable_ids:
        query = query.filter(~Vehicle.id.in_(unavailable_ids))
    
    # 총 레코드 수
    total = query.count()
    
    # 요금 정책 조회 (해당 차량 유형에 맞는 가장 최근의 요금 정책)
    rate_subquery = db.query(
        RentalRate.vehicle_type,
        func.max(RentalRate.id).label('latest_id')
    ).filter(
        RentalRate.is_active == True,
        RentalRate.effective_from <= datetime.utcnow().date(),
        or_(
            RentalRate.effective_to == None,
            RentalRate.effective_to >= datetime.utcnow().date()
        )
    ).group_by(RentalRate.vehicle_type).subquery()
    
    latest_rates = db.query(RentalRate).join(
        rate_subquery,
        and_(
            RentalRate.vehicle_type == rate_subquery.c.vehicle_type,
            RentalRate.id == rate_subquery.c.latest_id
        )
    ).all()
    
    # 요금 정책을 딕셔너리로 변환
    rates_dict = {rate.vehicle_type: rate for rate in latest_rates}
    
    # 페이징 적용
    vehicles = query.offset(skip).limit(limit).all()
    
    # 대여 기간 계산
    rental_days = (end_date - start_date).days
    if rental_days < 1:
        rental_days = 1
    
    # 결과 처리
    result = []
    for vehicle in vehicles:
        # 대여 요금 계산
        daily_rate = vehicle.daily_rental_rate
        
        # 차량 유형에 맞는 요금 정책이 있으면 적용
        if not daily_rate and vehicle.type in rates_dict:
            rate_policy = rates_dict[vehicle.type]
            
            # 대여 기간에 따른 요금 적용
            if rental_days >= 30 and rate_policy.monthly_rate:
                # 월간 요금
                months = rental_days // 30
                remaining_days = rental_days % 30
                total_price = (rate_policy.monthly_rate * months) + (rate_policy.daily_rate * remaining_days)
            elif rental_days >= 7 and rate_policy.weekly_rate:
                # 주간 요금
                weeks = rental_days // 7
                remaining_days = rental_days % 7
                total_price = (rate_policy.weekly_rate * weeks) + (rate_policy.daily_rate * remaining_days)
            else:
                # 일간 요금
                total_price = rate_policy.daily_rate * rental_days
                
                # 주말 포함 여부 확인 (토요일, 일요일)
                current_date = start_date
                while current_date <= end_date:
                    if current_date.weekday() >= 5:  # 5: 토요일, 6: 일요일
                        if rate_policy.weekend_rate:
                            # 일간 요금 대신 주말 요금 적용
                            total_price = total_price - rate_policy.daily_rate + rate_policy.weekend_rate
                    current_date += timedelta(days=1)
        else:
            # 기본 일일 요금 적용 (차량에 직접 설정된 요금)
            total_price = (daily_rate or 0) * rental_days
        
        # 결과 추가
        result.append({
            "id": vehicle.id,
            "make": vehicle.make,
            "model": vehicle.model,
            "year": vehicle.year,
            "type": vehicle.type,
            "color": vehicle.color,
            "daily_rental_rate": vehicle.daily_rental_rate or (rates_dict.get(vehicle.type).daily_rate if vehicle.type in rates_dict else 0),
            "has_gps": vehicle.has_gps,
            "has_bluetooth": vehicle.has_bluetooth,
            "has_sunroof": vehicle.has_sunroof,
            "has_heated_seats": vehicle.has_heated_seats,
            "passenger_capacity": vehicle.passenger_capacity,
            "total_price": total_price
        })
    
    return result, total

# 렌탈 통계 관련 함수
def get_rental_statistics(db: Session, period: str = "month") -> Dict[str, Any]:
    """
    렌탈 통계 정보를 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        period: 기간 (day, week, month, year, all)
        
    Returns:
        통계 정보 딕셔너리
    """
    now = datetime.utcnow()
    
    # 기간별 시작일 설정
    if period == "day":
        start_date = datetime(now.year, now.month, now.day, 0, 0, 0)
    elif period == "week":
        # 이번 주 월요일
        days_since_monday = now.weekday()
        start_date = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        start_date = datetime(now.year, now.month, 1, 0, 0, 0)
    elif period == "year":
        start_date = datetime(now.year, 1, 1, 0, 0, 0)
    else:  # all
        start_date = datetime(2000, 1, 1, 0, 0, 0)  # 충분히 과거
    
    # 기본 쿼리 설정
    query = db.query(Rental).filter(Rental.created_at >= start_date)
    
    # 통계 계산
    total_rentals = query.count()
    active_rentals = query.filter(Rental.status == RentalStatus.ACTIVE).count()
    completed_rentals = query.filter(Rental.status == RentalStatus.COMPLETED).count()
    canceled_rentals = query.filter(Rental.status == RentalStatus.CANCELED).count()
    overdue_rentals = query.filter(
        and_(
            Rental.status == RentalStatus.ACTIVE,
            Rental.end_date < now
        )
    ).count()
    
    # 평균 대여 기간 (완료된 대여만)
    duration_query = db.query(
        func.avg(func.julianday(Rental.actual_return_date or Rental.end_date) - func.julianday(Rental.start_date))
    ).filter(
        Rental.created_at >= start_date,
        Rental.status == RentalStatus.COMPLETED
    )
    avg_duration = duration_query.scalar() or 0
    
    # 총 수익
    revenue_query = db.query(func.sum(Rental.total_amount)).filter(
        Rental.created_at >= start_date,
        Rental.status.in_([RentalStatus.COMPLETED, RentalStatus.ACTIVE])
    )
    total_revenue = revenue_query.scalar() or 0
    
    # 대여당 평균 수익
    avg_revenue = total_revenue / (completed_rentals + active_rentals) if (completed_rentals + active_rentals) > 0 else 0
    
    # 가장 인기있는 차량 유형
    popular_type_query = db.query(
        Vehicle.type, func.count(Rental.id).label('count')
    ).join(
        Rental, Rental.vehicle_id == Vehicle.id
    ).filter(
        Rental.created_at >= start_date
    ).group_by(
        Vehicle.type
    ).order_by(
        desc('count')
    )
    popular_type_result = popular_type_query.first()
    most_popular_type = popular_type_result[0] if popular_type_result else "Unknown"
    
    # 가장 인기있는 차량
    popular_vehicle_query = db.query(
        Vehicle, func.count(Rental.id).label('count')
    ).join(
        Rental, Rental.vehicle_id == Vehicle.id
    ).filter(
        Rental.created_at >= start_date
    ).group_by(
        Vehicle.id
    ).order_by(
        desc('count')
    )
    popular_vehicle_result = popular_vehicle_query.first()
    most_popular_vehicle = {
        "id": popular_vehicle_result[0].id,
        "make": popular_vehicle_result[0].make,
        "model": popular_vehicle_result[0].model,
        "year": popular_vehicle_result[0].year,
        "type": popular_vehicle_result[0].type,
        "count": popular_vehicle_result[1]
    } if popular_vehicle_result else {"id": 0, "make": "Unknown", "model": "Unknown", "year": 0, "type": "Unknown", "count": 0}
    
    return {
        "total_rentals": total_rentals,
        "active_rentals": active_rentals,
        "completed_rentals": completed_rentals,
        "canceled_rentals": canceled_rentals,
        "overdue_rentals": overdue_rentals,
        "average_rental_duration": round(avg_duration, 2),
        "total_revenue": round(total_revenue, 2),
        "average_revenue_per_rental": round(avg_revenue, 2),
        "most_popular_vehicle_type": most_popular_type,
        "most_popular_vehicle": most_popular_vehicle
    }

# 플릿 통계 관련 함수
def get_fleet_statistics(db: Session) -> Dict[str, Any]:
    """
    차량 플릿 통계 정보를 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        
    Returns:
        통계 정보 딕셔너리
    """
    now = datetime.utcnow()
    current_year = now.year
    
    # 기본 차량 수 통계
    total_vehicles = db.query(func.count(Vehicle.id)).scalar() or 0
    available_vehicles = db.query(func.count(Vehicle.id)).filter(
        Vehicle.status == VehicleStatus.AVAILABLE,
        Vehicle.is_available_for_rent == True
    ).scalar() or 0
    rented_vehicles = db.query(func.count(Vehicle.id)).filter(
        Vehicle.status == VehicleStatus.RENTED
    ).scalar() or 0
    maintenance_vehicles = db.query(func.count(Vehicle.id)).filter(
        Vehicle.status.in_([VehicleStatus.MAINTENANCE, VehicleStatus.REPAIR])
    ).scalar() or 0
    
    # 차량 활용률 (렌트 중인 차량 / 렌트 가능한 차량)
    rentable_vehicles = available_vehicles + rented_vehicles
    utilization_rate = rented_vehicles / rentable_vehicles if rentable_vehicles > 0 else 0
    
    # 플릿 평균 연식
    avg_age_query = db.query(func.avg(current_year - Vehicle.year))
    avg_age = avg_age_query.scalar() or 0
    
    # 가장 수익성 높은 차량
    top_vehicles_query = db.query(
        Vehicle
    ).order_by(
        desc(Vehicle.rental_revenue)
    ).limit(5)
    top_vehicles = [{
        "id": v.id,
        "make": v.make,
        "model": v.model,
        "year": v.year,
        "type": v.type,
        "times_rented": v.times_rented,
        "rental_revenue": v.rental_revenue
    } for v in top_vehicles_query.all()]
    
    # 가장 수익성 높은 차량 유형
    top_types_query = db.query(
        Vehicle.type,
        func.sum(Vehicle.rental_revenue).label('total_revenue'),
        func.avg(Vehicle.rental_revenue).label('avg_revenue'),
        func.count(Vehicle.id).label('count')
    ).group_by(
        Vehicle.type
    ).order_by(
        desc('total_revenue')
    ).limit(5)
    top_types = [{
        "type": t[0],
        "total_revenue": t[1],
        "avg_revenue": t[2],
        "vehicle_count": t[3]
    } for t in top_types_query.all()]
    
    # 차량당 평균 수익
    avg_revenue_per_vehicle = db.query(func.avg(Vehicle.rental_revenue)).scalar() or 0
    
    return {
        "total_vehicles": total_vehicles,
        "available_vehicles": available_vehicles,
        "rented_vehicles": rented_vehicles,
        "maintenance_vehicles": maintenance_vehicles,
        "utilization_rate": round(utilization_rate * 100, 2),  # 퍼센트로 표시
        "average_age": round(avg_age, 1),
        "top_performing_vehicles": top_vehicles,
        "most_profitable_vehicle_types": top_types,
        "average_revenue_per_vehicle": round(avg_revenue_per_vehicle, 2)
    }

# 손상 보고서 관련 함수
def create_damage_report(db: Session, damage_data: Dict[str, Any], user_id: int) -> DamageReport:
    """
    새 손상 보고서를 생성합니다.
    
    Args:
        db: 데이터베이스 세션
        damage_data: 손상 보고서 데이터
        user_id: 작업을 수행하는 사용자 ID
        
    Returns:
        생성된 손상 보고서 객체
    """
    damage_data["created_by"] = user_id
    
    report = DamageReport(**damage_data)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

def get_damage_report(db: Session, report_id: int) -> Optional[DamageReport]:
    """
    손상 보고서 ID로 보고서를 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        report_id: 보고서 ID
        
    Returns:
        손상 보고서 객체 또는 None
    """
    return db.query(DamageReport).options(
        joinedload(DamageReport.rental)
    ).filter(DamageReport.id == report_id).first()

def update_damage_report(
    db: Session, report_id: int, report_data: Dict[str, Any]
) -> Optional[DamageReport]:
    """
    손상 보고서 정보를 업데이트합니다.
    
    Args:
        db: 데이터베이스 세션
        report_id: 보고서 ID
        report_data: 업데이트할 보고서 데이터
        
    Returns:
        업데이트된 손상 보고서 객체 또는 None
    """
    report = db.query(DamageReport).filter(DamageReport.id == report_id).first()
    if not report:
        return None
    
    for key, value in report_data.items():
        setattr(report, key, value)
    
    db.commit()
    db.refresh(report)
    return report

def list_damage_reports(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    rental_id: int = None,
    vehicle_id: int = None,
    is_repaired: bool = None
) -> Tuple[List[DamageReport], int]:
    """
    손상 보고서 목록을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        skip: 건너뛸 레코드 수
        limit: 조회할 최대 레코드 수
        rental_id: 렌탈 ID 필터
        vehicle_id: 차량 ID 필터
        is_repaired: 수리 완료 여부 필터
        
    Returns:
        (손상 보고서 목록, 총 레코드 수)
    """
    query = db.query(DamageReport).options(
        joinedload(DamageReport.rental)
    )
    
    # 렌탈 ID 필터
    if rental_id:
        query = query.filter(DamageReport.rental_id == rental_id)
    
    # 차량 ID 필터 (렌탈을 통한 필터링)
    if vehicle_id:
        query = query.join(Rental).filter(Rental.vehicle_id == vehicle_id)
    
    # 수리 완료 여부 필터
    if is_repaired is not None:
        query = query.filter(DamageReport.is_repaired == is_repaired)
    
    # 총 레코드 수
    total = query.count()
    
    # 페이징 및 정렬 적용 (생성일자 기준 내림차순)
    reports = query.order_by(desc(DamageReport.created_at)).offset(skip).limit(limit).all()
    
    return reports, total