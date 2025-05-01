from datetime import datetime, date
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import func, extract, desc
from sqlalchemy.orm import Session, joinedload
from backend.models.vehicle import Vehicle, VehicleStatus
from backend.models.maintenance_record import MaintenanceRecord
from backend.schemas.vehicle import VehicleCreate, VehicleUpdate
from backend.schemas.maintenance_record import MaintenanceRecordCreate, MaintenanceRecordUpdate

# 차량 관련 함수들
def get_vehicles(db: Session, skip: int = 0, limit: int = 100, status: Optional[str] = None) -> List[Vehicle]:
    """
    차량 목록을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        skip: 건너뛸 결과 수
        limit: 최대 결과 수
        status: 필터링할 차량 상태
    
    Returns:
        차량 목록
    """
    query = db.query(Vehicle)
    
    if status:
        query = query.filter(Vehicle.status == status)
    
    return query.order_by(Vehicle.id).offset(skip).limit(limit).all()

def get_vehicle(db: Session, vehicle_id: int) -> Optional[Vehicle]:
    """
    단일 차량 정보를 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        vehicle_id: 차량 ID
        
    Returns:
        차량 객체 또는 None
    """
    return db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()

def create_vehicle(db: Session, vehicle: VehicleCreate) -> Vehicle:
    """
    새로운 차량을 등록합니다.
    
    Args:
        db: 데이터베이스 세션
        vehicle: 차량 생성 스키마
        
    Returns:
        생성된 차량 객체
    """
    db_vehicle = Vehicle(**vehicle.dict())
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

def update_vehicle(db: Session, vehicle_id: int, vehicle: VehicleUpdate) -> Optional[Vehicle]:
    """
    기존 차량 정보를 업데이트합니다.
    
    Args:
        db: 데이터베이스 세션
        vehicle_id: 차량 ID
        vehicle: 차량 업데이트 스키마
        
    Returns:
        업데이트된 차량 객체 또는 None
    """
    db_vehicle = get_vehicle(db, vehicle_id)
    if not db_vehicle:
        return None
    
    update_data = vehicle.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_vehicle, field, value)
    
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

def delete_vehicle(db: Session, vehicle_id: int) -> bool:
    """
    차량을 삭제합니다.
    
    Args:
        db: 데이터베이스 세션
        vehicle_id: 차량 ID
        
    Returns:
        성공 여부
    """
    db_vehicle = get_vehicle(db, vehicle_id)
    if not db_vehicle:
        return False
    
    db.delete(db_vehicle)
    db.commit()
    return True

# 정비 기록 관련 함수들
def get_maintenance_records(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    vehicle_id: Optional[int] = None,
    status: Optional[str] = None
) -> List[MaintenanceRecord]:
    """
    정비 기록 목록을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        skip: 건너뛸 결과 수
        limit: 최대 결과 수
        vehicle_id: 필터링할 차량 ID
        status: 필터링할 정비 상태
        
    Returns:
        정비 기록 목록
    """
    query = db.query(MaintenanceRecord).options(joinedload(MaintenanceRecord.vehicle))
    
    if vehicle_id:
        query = query.filter(MaintenanceRecord.vehicle_id == vehicle_id)
    
    if status:
        query = query.filter(MaintenanceRecord.status == status)
    
    return query.order_by(desc(MaintenanceRecord.date)).offset(skip).limit(limit).all()

def get_maintenance_record(db: Session, record_id: int) -> Optional[MaintenanceRecord]:
    """
    단일 정비 기록을 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        record_id: 정비 기록 ID
        
    Returns:
        정비 기록 객체 또는 None
    """
    return db.query(MaintenanceRecord).options(
        joinedload(MaintenanceRecord.vehicle)
    ).filter(MaintenanceRecord.id == record_id).first()

def create_maintenance_record(db: Session, record: MaintenanceRecordCreate, user_id: int) -> MaintenanceRecord:
    """
    새로운 정비 기록을 생성합니다.
    
    Args:
        db: 데이터베이스 세션
        record: 정비 기록 생성 스키마
        user_id: 생성자 ID
        
    Returns:
        생성된 정비 기록 객체
    """
    record_data = record.dict()
    db_record = MaintenanceRecord(**record_data, created_by=user_id)
    
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def update_maintenance_record(
    db: Session, 
    record_id: int, 
    record: MaintenanceRecordUpdate, 
    user_id: int
) -> Optional[MaintenanceRecord]:
    """
    기존 정비 기록을 업데이트합니다.
    
    Args:
        db: 데이터베이스 세션
        record_id: 정비 기록 ID
        record: 정비 기록 업데이트 스키마
        user_id: 수정자 ID
        
    Returns:
        업데이트된 정비 기록 객체 또는 None
    """
    db_record = get_maintenance_record(db, record_id)
    if not db_record:
        return None
    
    update_data = record.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_record, field, value)
    
    db_record.updated_by = user_id
    db.commit()
    db.refresh(db_record)
    return db_record

def delete_maintenance_record(db: Session, record_id: int) -> bool:
    """
    정비 기록을 삭제합니다.
    
    Args:
        db: 데이터베이스 세션
        record_id: 정비 기록 ID
        
    Returns:
        성공 여부
    """
    db_record = get_maintenance_record(db, record_id)
    if not db_record:
        return False
    
    db.delete(db_record)
    db.commit()
    return True

def get_vehicle_maintenance_history(
    db: Session,
    vehicle_id: int,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None
) -> Tuple[List[MaintenanceRecord], Dict[int, Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    """
    특정 차량의 정비 이력과 통계를 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        vehicle_id: 차량 ID
        from_date: 이 날짜부터 조회 (선택적)
        to_date: 이 날짜까지 조회 (선택적)
        
    Returns:
        (정비 기록 목록, 연도별 통계, 월별 통계) 튜플
    """
    query = db.query(MaintenanceRecord).filter(MaintenanceRecord.vehicle_id == vehicle_id)
    
    if from_date:
        query = query.filter(MaintenanceRecord.date >= from_date)
    
    if to_date:
        query = query.filter(MaintenanceRecord.date <= to_date)
    
    records = query.order_by(desc(MaintenanceRecord.date)).all()
    
    # 통계 계산
    yearly_stats = {}
    monthly_stats = {}
    
    for record in records:
        year = record.date.year
        month = f"{year}-{record.date.month:02d}"
        
        # 연도별 통계
        if year not in yearly_stats:
            yearly_stats[year] = {
                "count": 0,
                "total_cost": 0
            }
        yearly_stats[year]["count"] += 1
        if record.cost:
            yearly_stats[year]["total_cost"] += record.cost
        
        # 월별 통계
        if month not in monthly_stats:
            monthly_stats[month] = {
                "count": 0,
                "total_cost": 0
            }
        monthly_stats[month]["count"] += 1
        if record.cost:
            monthly_stats[month]["total_cost"] += record.cost
    
    return records, yearly_stats, monthly_stats

# 통계 결과 포맷팅 도우미 함수
def _format_statistics_result(results, period_type):
    """
    데이터베이스 결과를 통계 형식으로 변환하는 도우미 함수
    
    Args:
        results: 데이터베이스 쿼리 결과
        period_type: 기간 유형 ('day', 'month', 'year')
        
    Returns:
        포맷팅된 통계 딕셔너리
    """
    statistics = {}
    
    for row in results:
        if period_type == 'day':
            period_str = row.day.isoformat() if row.day else "unknown"
        elif period_type == 'month':
            period_str = f"{int(row.year)}-{int(row.month):02d}"
        else:  # year
            period_str = str(int(row.year))
            
        statistics[period_str] = {
            "count": row.count,
            "total_cost": float(row.total_cost) if row.total_cost else 0
        }
    
    return statistics

def get_maintenance_statistics(
    db: Session,
    period: str = "month"
) -> Dict[str, Dict[str, Any]]:
    """
    정비 통계를 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        period: 통계 기간 ("day", "month", "year" 중 하나)
        
    Returns:
        기간별 통계 딕셔너리
    """
    # 기본값 설정 - 유효하지 않은 period는 "month"로 처리
    if period not in ["day", "month", "year"]:
        period = "month"
    
    if period == "day":
        # 일별 통계
        results = db.query(
            func.date(MaintenanceRecord.date).label("day"),
            func.count().label("count"),
            func.sum(MaintenanceRecord.cost).label("total_cost")
        ).group_by(func.date(MaintenanceRecord.date))\
         .order_by(func.date(MaintenanceRecord.date).desc())\
         .limit(31)\
         .all()
        
        return _format_statistics_result(results, 'day')
        
    elif period == "month":
        # 월별 통계
        results = db.query(
            extract('year', MaintenanceRecord.date).label("year"),
            extract('month', MaintenanceRecord.date).label("month"),
            func.count().label("count"),
            func.sum(MaintenanceRecord.cost).label("total_cost")
        ).group_by(
            extract('year', MaintenanceRecord.date),
            extract('month', MaintenanceRecord.date)
        ).order_by(
            extract('year', MaintenanceRecord.date).desc(),
            extract('month', MaintenanceRecord.date).desc()
        ).limit(12).all()
        
        return _format_statistics_result(results, 'month')
        
    else:  # year
        # 연도별 통계
        results = db.query(
            extract('year', MaintenanceRecord.date).label("year"),
            func.count().label("count"),
            func.sum(MaintenanceRecord.cost).label("total_cost")
        ).group_by(
            extract('year', MaintenanceRecord.date)
        ).order_by(
            extract('year', MaintenanceRecord.date).desc()
        ).limit(10).all()
        
        return _format_statistics_result(results, 'year')

# 차량 재무 관련 함수들

def get_vehicle_finance_summary(db: Session, vehicle_id: int) -> Optional[Dict[str, Any]]:
    """
    차량의 재무 요약 정보를 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        vehicle_id: 차량 ID
        
    Returns:
        재무 요약 정보 또는 None
    """
    vehicle = get_vehicle(db, vehicle_id)
    if not vehicle:
        return None
    
    # 현재 날짜 기준
    today = date.today()
    
    # 현재 가치 계산
    current_value = vehicle.calculate_current_value()
    
    # 감가상각 계산
    value_depreciation = None
    value_depreciation_percentage = None
    if vehicle.purchase_price and current_value:
        value_depreciation = vehicle.purchase_price - current_value
        value_depreciation_percentage = (value_depreciation / vehicle.purchase_price) * 100
    
    # 수익률(ROI) 계산
    roi = vehicle.calculate_roi()
    
    # 보험 만료일까지 남은 일수
    days_to_insurance_expiry = None
    if vehicle.insurance_expiry:
        days_to_insurance_expiry = (vehicle.insurance_expiry - today).days
    
    # 정비 비용 요약
    maintenance_summary = vehicle.get_maintenance_cost_summary()
    
    finance_summary = {
        "total_maintenance_cost": maintenance_summary["total_cost"],
        "current_value": current_value,
        "value_depreciation": value_depreciation,
        "value_depreciation_percentage": value_depreciation_percentage,
        "roi": roi,
        "insurance_valid": vehicle.is_insurance_valid(),
        "days_to_insurance_expiry": days_to_insurance_expiry
    }
    
    return {
        "finance_summary": finance_summary,
        "maintenance_summary": maintenance_summary
    }

def update_vehicle_finance_info(
    db: Session, 
    vehicle_id: int, 
    finance_data: Dict[str, Any]
) -> Optional[Vehicle]:
    """
    차량의 재무 정보를 업데이트합니다.
    
    Args:
        db: 데이터베이스 세션
        vehicle_id: 차량 ID
        finance_data: 업데이트할 재무 정보
        
    Returns:
        업데이트된 차량 객체 또는 None
    """
    db_vehicle = get_vehicle(db, vehicle_id)
    if not db_vehicle:
        return None
    
    # 재무 관련 필드 업데이트
    finance_fields = [
        "purchase_price", "purchase_date", "sale_price", "sale_date",
        "depreciation_rate", "current_value", "finance_notes",
        "insurance_cost", "insurance_expiry"
    ]
    
    for field in finance_fields:
        if field in finance_data and finance_data[field] is not None:
            setattr(db_vehicle, field, finance_data[field])
    
    # 현재 가치 자동 계산 (입력되지 않은 경우)
    if finance_data.get("calculate_current_value", False) and db_vehicle.purchase_price and db_vehicle.purchase_date:
        db_vehicle.current_value = db_vehicle.calculate_current_value()
    
    # 판매 시 상태 자동 업데이트
    if finance_data.get("sale_price") and finance_data.get("sale_date"):
        db_vehicle.status = VehicleStatus.SOLD
    
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

def get_fleet_finance_summary(db: Session) -> Dict[str, Any]:
    """
    전체 차량 플릿에 대한 재무 요약 정보를 조회합니다.
    
    Args:
        db: 데이터베이스 세션
        
    Returns:
        플릿 재무 요약 정보
    """
    # 모든 차량 조회
    vehicles = db.query(Vehicle).all()
    
    # 전체 플릿 가치 계산
    total_current_value = 0
    total_purchase_value = 0
    total_maintenance_cost = 0
    total_sold_value = 0
    total_roi = 0
    
    active_vehicles = 0
    sold_vehicles = 0
    
    for vehicle in vehicles:
        # 구매 가치 합산
        if vehicle.purchase_price:
            total_purchase_value += vehicle.purchase_price
            
        # 현재 가치 또는 판매 가치 합산
        if vehicle.status == VehicleStatus.SOLD:
            sold_vehicles += 1
            if vehicle.sale_price:
                total_sold_value += vehicle.sale_price
        else:
            active_vehicles += 1
            current_value = vehicle.calculate_current_value()
            if current_value:
                total_current_value += current_value
        
        # 정비 비용 합산
        maintenance_costs = sum([record.cost or 0 for record in vehicle.maintenance_records])
        total_maintenance_cost += maintenance_costs
        
        # 수익률 계산 및 합산 (판매된 차량만)
        if vehicle.status == VehicleStatus.SOLD and vehicle.calculate_roi() is not None:
            total_roi += vehicle.calculate_roi()
    
    # 평균 수익률 계산
    avg_roi = total_roi / sold_vehicles if sold_vehicles > 0 else 0
    
    return {
        "total_vehicles": len(vehicles),
        "active_vehicles": active_vehicles,
        "sold_vehicles": sold_vehicles,
        "total_purchase_value": total_purchase_value,
        "total_current_value": total_current_value,
        "total_sold_value": total_sold_value,
        "total_maintenance_cost": total_maintenance_cost,
        "average_roi": avg_roi,
        "fleet_value": total_current_value + total_sold_value,
        "total_depreciation": total_purchase_value - total_current_value - total_sold_value,
        "total_depreciation_percentage": ((total_purchase_value - total_current_value - total_sold_value) / total_purchase_value * 100) if total_purchase_value > 0 else 0
    }