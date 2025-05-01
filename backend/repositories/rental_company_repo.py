from typing import Dict, List, Optional, Tuple, Any, Union
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_, or_
from datetime import datetime, date

from backend.models.rental_company import RentalCompany, RentalCompanyLocation
from backend.models.vehicle import Vehicle, VehicleStatus


def create_rental_company(db: Session, company_data: Dict[str, Any], user_id: int) -> RentalCompany:
    """
    새 렌터카 업체를 생성합니다.
    
    Args:
        db: 데이터베이스 세션
        company_data: 렌터카 업체 데이터 딕셔너리
        user_id: 작업을 수행하는 사용자 ID
        
    Returns:
        생성된 렌터카 업체 객체
    """
    # 사용자 ID 추가
    company_data["created_by"] = user_id
    company_data["updated_by"] = user_id
    
    # 렌터카 업체 생성
    company = RentalCompany(**company_data)
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def get_rental_company(db: Session, company_id: int) -> Optional[RentalCompany]:
    """
    ID로 렌터카 업체를 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        company_id: 렌터카 업체 ID
        
    Returns:
        렌터카 업체 객체 또는 None
    """
    return db.query(RentalCompany).options(
        joinedload(RentalCompany.locations),
        joinedload(RentalCompany.vehicles)
    ).filter(RentalCompany.id == company_id).first()


def get_rental_company_by_business_number(db: Session, business_number: str) -> Optional[RentalCompany]:
    """
    사업자 번호로 렌터카 업체를 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        business_number: 사업자 번호
        
    Returns:
        렌터카 업체 객체 또는 None
    """
    return db.query(RentalCompany).filter(RentalCompany.business_number == business_number).first()


def update_rental_company(db: Session, company_id: int, company_data: Dict[str, Any], user_id: int) -> Optional[RentalCompany]:
    """
    렌터카 업체 정보를 업데이트합니다.
    
    Args:
        db: 데이터베이스 세션
        company_id: 렌터카 업체 ID
        company_data: 업데이트할 렌터카 업체 데이터
        user_id: 작업을 수행하는 사용자 ID
        
    Returns:
        업데이트된 렌터카 업체 객체 또는 None
    """
    company = db.query(RentalCompany).filter(RentalCompany.id == company_id).first()
    if not company:
        return None
    
    # 사용자 ID 추가
    company_data["updated_by"] = user_id
    
    # 업데이트
    for key, value in company_data.items():
        setattr(company, key, value)
    
    db.commit()
    db.refresh(company)
    return company


def list_rental_companies(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    is_active: bool = None
) -> Tuple[List[RentalCompany], int]:
    """
    렌터카 업체 목록을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        skip: 건너뛸 레코드 수
        limit: 조회할 최대 레코드 수
        search: 검색어
        is_active: 활성 상태 필터
        
    Returns:
        (렌터카 업체 목록, 총 레코드 수)
    """
    query = db.query(RentalCompany).options(
        joinedload(RentalCompany.locations)
    )
    
    # 검색어 필터
    if search:
        query = query.filter(
            or_(
                RentalCompany.name.ilike(f"%{search}%"),
                RentalCompany.business_number.ilike(f"%{search}%"),
                RentalCompany.address.ilike(f"%{search}%"),
                RentalCompany.phone.ilike(f"%{search}%"),
                RentalCompany.email.ilike(f"%{search}%")
            )
        )
    
    # 활성 상태 필터
    if is_active is not None:
        query = query.filter(RentalCompany.is_active == is_active)
    
    # 총 레코드 수
    total = query.count()
    
    # 페이징 및 정렬 적용 (생성일자 기준 내림차순)
    companies = query.order_by(desc(RentalCompany.created_at)).offset(skip).limit(limit).all()
    
    # 각 업체에 대한 차량 수 계산
    for company in companies:
        company.vehicles_count = db.query(func.count(Vehicle.id)).filter(
            Vehicle.rental_company_id == company.id
        ).scalar()
    
    return companies, total


def delete_rental_company(db: Session, company_id: int) -> bool:
    """
    렌터카 업체를 삭제합니다.
    
    Args:
        db: 데이터베이스 세션
        company_id: 렌터카 업체 ID
        
    Returns:
        삭제 성공 여부
    """
    company = db.query(RentalCompany).filter(RentalCompany.id == company_id).first()
    if not company:
        return False
    
    # 연결된 모든 지점 삭제
    db.query(RentalCompanyLocation).filter(RentalCompanyLocation.company_id == company_id).delete()
    
    # 연결된 차량의 업체 ID 제거 (차량 자체는 삭제하지 않음)
    db.query(Vehicle).filter(Vehicle.rental_company_id == company_id).update(
        {"rental_company_id": None, "company_vehicle_id": None}
    )
    
    # 업체 삭제
    db.delete(company)
    db.commit()
    return True


def get_rental_company_statistics(db: Session, company_id: int) -> Dict[str, Any]:
    """
    렌터카 업체 통계를 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        company_id: 렌터카 업체 ID
        
    Returns:
        통계 정보 딕셔너리
    """
    # 업체가 존재하는지 확인
    company = db.query(RentalCompany).filter(RentalCompany.id == company_id).first()
    if not company:
        return {}
    
    # 전체 차량 수
    total_vehicles = db.query(func.count(Vehicle.id)).filter(
        Vehicle.rental_company_id == company_id
    ).scalar() or 0
    
    # 활성 차량 수
    active_vehicles = db.query(func.count(Vehicle.id)).filter(
        Vehicle.rental_company_id == company_id,
        Vehicle.is_available_for_rent == True,
        Vehicle.status == VehicleStatus.AVAILABLE
    ).scalar() or 0
    
    # 대여중인 차량 수
    rented_vehicles = db.query(func.count(Vehicle.id)).filter(
        Vehicle.rental_company_id == company_id,
        Vehicle.status == VehicleStatus.RENTED
    ).scalar() or 0
    
    # 정비중인 차량 수
    maintenance_vehicles = db.query(func.count(Vehicle.id)).filter(
        Vehicle.rental_company_id == company_id,
        Vehicle.status.in_([VehicleStatus.MAINTENANCE, VehicleStatus.REPAIR])
    ).scalar() or 0
    
    # 전체 수익
    total_revenue = db.query(func.sum(Vehicle.rental_revenue)).filter(
        Vehicle.rental_company_id == company_id
    ).scalar() or 0
    
    # 가장 많이 대여된 차량
    most_rented_vehicle = db.query(Vehicle).filter(
        Vehicle.rental_company_id == company_id
    ).order_by(desc(Vehicle.times_rented)).first()
    
    # 지점 수
    locations_count = db.query(func.count(RentalCompanyLocation.id)).filter(
        RentalCompanyLocation.company_id == company_id
    ).scalar() or 0
    
    return {
        "total_vehicles": total_vehicles,
        "active_vehicles": active_vehicles,
        "rented_vehicles": rented_vehicles,
        "maintenance_vehicles": maintenance_vehicles,
        "total_revenue": total_revenue,
        "average_rating": company.rating,
        "most_rented_vehicle": f"{most_rented_vehicle.make} {most_rented_vehicle.model}" if most_rented_vehicle else None,
        "locations_count": locations_count
    }


# 렌터카 업체 지점 관련 함수
def create_rental_company_location(db: Session, location_data: Dict[str, Any]) -> RentalCompanyLocation:
    """
    새 렌터카 업체 지점을 생성합니다.
    
    Args:
        db: 데이터베이스 세션
        location_data: 지점 데이터 딕셔너리
        
    Returns:
        생성된 지점 객체
    """
    location = RentalCompanyLocation(**location_data)
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


def get_rental_company_location(db: Session, location_id: int) -> Optional[RentalCompanyLocation]:
    """
    ID로 렌터카 업체 지점을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        location_id: 지점 ID
        
    Returns:
        지점 객체 또는 None
    """
    return db.query(RentalCompanyLocation).filter(RentalCompanyLocation.id == location_id).first()


def update_rental_company_location(db: Session, location_id: int, location_data: Dict[str, Any]) -> Optional[RentalCompanyLocation]:
    """
    렌터카 업체 지점 정보를 업데이트합니다.
    
    Args:
        db: 데이터베이스 세션
        location_id: 지점 ID
        location_data: 업데이트할 지점 데이터
        
    Returns:
        업데이트된 지점 객체 또는 None
    """
    location = db.query(RentalCompanyLocation).filter(RentalCompanyLocation.id == location_id).first()
    if not location:
        return None
    
    # 업데이트
    for key, value in location_data.items():
        setattr(location, key, value)
    
    db.commit()
    db.refresh(location)
    return location


def list_rental_company_locations(
    db: Session,
    company_id: int,
    skip: int = 0,
    limit: int = 100,
    is_active: bool = None,
    is_airport: bool = None
) -> Tuple[List[RentalCompanyLocation], int]:
    """
    렌터카 업체 지점 목록을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        company_id: 렌터카 업체 ID
        skip: 건너뛸 레코드 수
        limit: 조회할 최대 레코드 수
        is_active: 활성 상태 필터
        is_airport: 공항 지점 여부 필터
        
    Returns:
        (지점 목록, 총 레코드 수)
    """
    query = db.query(RentalCompanyLocation).filter(
        RentalCompanyLocation.company_id == company_id
    )
    
    # 활성 상태 필터
    if is_active is not None:
        query = query.filter(RentalCompanyLocation.is_active == is_active)
    
    # 공항 지점 필터
    if is_airport is not None:
        query = query.filter(RentalCompanyLocation.is_airport == is_airport)
    
    # 총 레코드 수
    total = query.count()
    
    # 페이징 적용
    locations = query.offset(skip).limit(limit).all()
    
    return locations, total


def delete_rental_company_location(db: Session, location_id: int) -> bool:
    """
    렌터카 업체 지점을 삭제합니다.
    
    Args:
        db: 데이터베이스 세션
        location_id: 지점 ID
        
    Returns:
        삭제 성공 여부
    """
    location = db.query(RentalCompanyLocation).filter(RentalCompanyLocation.id == location_id).first()
    if not location:
        return False
    
    db.delete(location)
    db.commit()
    return True


# 차량과 렌터카 업체 연결 관련 함수
def assign_vehicle_to_company(db: Session, vehicle_id: int, company_id: int, company_vehicle_id: str = None) -> Optional[Vehicle]:
    """
    차량을 렌터카 업체에 할당합니다.
    
    Args:
        db: 데이터베이스 세션
        vehicle_id: 차량 ID
        company_id: 렌터카 업체 ID
        company_vehicle_id: 업체 내 차량 식별 번호
        
    Returns:
        업데이트된 차량 객체 또는 None
    """
    # 차량과 업체가 존재하는지 확인
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    company = db.query(RentalCompany).filter(RentalCompany.id == company_id).first()
    
    if not vehicle or not company:
        return None
    
    # 차량에 업체 정보 할당
    vehicle.rental_company_id = company_id
    vehicle.company_vehicle_id = company_vehicle_id
    
    db.commit()
    db.refresh(vehicle)
    return vehicle


def remove_vehicle_from_company(db: Session, vehicle_id: int) -> Optional[Vehicle]:
    """
    차량을 렌터카 업체에서 해제합니다.
    
    Args:
        db: 데이터베이스 세션
        vehicle_id: 차량 ID
        
    Returns:
        업데이트된 차량 객체 또는 None
    """
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        return None
    
    # 렌터카 업체 정보 해제
    vehicle.rental_company_id = None
    vehicle.company_vehicle_id = None
    
    db.commit()
    db.refresh(vehicle)
    return vehicle


def list_company_vehicles(
    db: Session,
    company_id: int,
    skip: int = 0,
    limit: int = 100,
    status: Union[str, List[str]] = None,
    vehicle_type: str = None,
    is_available_for_rent: bool = None
) -> Tuple[List[Vehicle], int]:
    """
    렌터카 업체의 차량 목록을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        company_id: 렌터카 업체 ID
        skip: 건너뛸 레코드 수
        limit: 조회할 최대 레코드 수
        status: 차량 상태 필터
        vehicle_type: 차량 유형 필터
        is_available_for_rent: 대여 가능 여부 필터
        
    Returns:
        (차량 목록, 총 레코드 수)
    """
    query = db.query(Vehicle).filter(Vehicle.rental_company_id == company_id)
    
    # 상태 필터
    if status:
        if isinstance(status, list):
            query = query.filter(Vehicle.status.in_(status))
        else:
            query = query.filter(Vehicle.status == status)
    
    # 차량 유형 필터
    if vehicle_type:
        query = query.filter(Vehicle.type == vehicle_type)
    
    # 대여 가능 여부 필터
    if is_available_for_rent is not None:
        query = query.filter(Vehicle.is_available_for_rent == is_available_for_rent)
    
    # 총 레코드 수
    total = query.count()
    
    # 페이징 적용
    vehicles = query.offset(skip).limit(limit).all()
    
    return vehicles, total