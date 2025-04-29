"""
차량 법정검사 관련 API 라우트
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional

from src.database import get_db
from src.models.vehicle_inspection import VehicleInspection, InspectionStatus
from src.models.vehicle import Vehicle
from src.schemas.vehicle_inspection import (
    InspectionCreate,
    InspectionUpdate,
    InspectionComplete,
    InspectionResponse,
    UpcomingInspectionResponse,
    InspectionFilter
)

router = APIRouter(
    prefix="/vehicle-inspections",
    tags=["vehicle_inspections"],
)


@router.get("/", response_model=List[InspectionResponse])
def get_inspections(
    vehicle_id: Optional[str] = None,
    status: Optional[InspectionStatus] = None,
    due_before: Optional[datetime] = None,
    due_after: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    법정검사 목록 조회
    
    필터링 옵션:
    - vehicle_id: 특정 차량의 검사만 조회
    - status: 특정 상태의 검사만 조회
    - due_before: 지정된 날짜 이전에 예정된 검사만 조회
    - due_after: 지정된 날짜 이후에 예정된 검사만 조회
    """
    query = db.query(VehicleInspection)
    
    # 필터 적용
    if vehicle_id:
        query = query.filter(VehicleInspection.vehicle_id == vehicle_id)
    if status:
        query = query.filter(VehicleInspection.status == status)
    if due_before:
        query = query.filter(VehicleInspection.due_date <= due_before)
    if due_after:
        query = query.filter(VehicleInspection.due_date >= due_after)
    
    # 정렬 및 페이징
    query = query.order_by(VehicleInspection.due_date).offset(skip).limit(limit)
    
    return query.all()


@router.get("/upcoming", response_model=List[UpcomingInspectionResponse])
def get_upcoming_inspections(
    days: int = Query(30, description="앞으로 몇 일 이내의 검사를 조회할지 지정"),
    db: Session = Depends(get_db)
):
    """
    다가오는 법정검사 목록 조회
    
    현재로부터 지정된 일수 이내에 예정된 법정검사를 반환합니다.
    """
    today = datetime.utcnow().date()
    future_date = today + timedelta(days=days)
    
    query = db.query(VehicleInspection).filter(
        and_(
            VehicleInspection.due_date >= today,
            VehicleInspection.due_date <= future_date,
            or_(
                VehicleInspection.status == InspectionStatus.PENDING,
                VehicleInspection.status == InspectionStatus.SCHEDULED
            )
        )
    ).order_by(VehicleInspection.due_date)
    
    inspections = query.all()
    
    # 남은 일수 계산하여 응답 데이터에 추가
    result = []
    for inspection in inspections:
        days_remaining = (inspection.due_date.date() - today).days
        inspection_dict = InspectionResponse.from_orm(inspection).dict()
        inspection_dict["days_remaining"] = days_remaining
        result.append(inspection_dict)
    
    return result


@router.get("/{inspection_id}", response_model=InspectionResponse)
def get_inspection(
    inspection_id: str = Path(..., description="조회할 법정검사 ID"),
    db: Session = Depends(get_db)
):
    """
    특정 법정검사 조회
    
    주어진 ID에 해당하는 법정검사 정보를 반환합니다.
    """
    inspection = db.query(VehicleInspection).filter(VehicleInspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {inspection_id}에 해당하는 법정검사를 찾을 수 없습니다."
        )
    
    return inspection


@router.post("/", response_model=InspectionResponse, status_code=status.HTTP_201_CREATED)
def create_inspection(
    inspection: InspectionCreate,
    db: Session = Depends(get_db)
):
    """
    새 법정검사 등록
    
    새로운 법정검사 일정을 등록합니다.
    """
    # 차량 존재 확인
    vehicle = db.query(Vehicle).filter(Vehicle.id == inspection.vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {inspection.vehicle_id}에 해당하는 차량을 찾을 수 없습니다."
        )
    
    # 상태 결정
    status_value = InspectionStatus.PENDING
    today = datetime.utcnow().date()
    due_date = inspection.due_date
    
    if due_date < today:
        status_value = InspectionStatus.EXPIRED
    elif (due_date - today).days <= 7:
        status_value = InspectionStatus.SCHEDULED
    
    # 법정검사 객체 생성
    db_inspection = VehicleInspection(
        vehicle_id=inspection.vehicle_id,
        inspection_type=inspection.inspection_type,
        due_date=inspection.due_date,
        status=status_value,
        location=inspection.location,
        inspector=inspection.inspector,
        notes=inspection.notes
    )
    
    db.add(db_inspection)
    db.commit()
    db.refresh(db_inspection)
    
    # 차량의 다음 법정검사일 업데이트
    vehicle.next_inspection_date = due_date
    db.commit()
    
    return db_inspection


@router.put("/{inspection_id}", response_model=InspectionResponse)
def update_inspection(
    inspection_id: str,
    inspection_update: InspectionUpdate,
    db: Session = Depends(get_db)
):
    """
    법정검사 정보 수정
    
    기존 법정검사 정보를 업데이트합니다.
    """
    db_inspection = db.query(VehicleInspection).filter(VehicleInspection.id == inspection_id).first()
    if not db_inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {inspection_id}에 해당하는 법정검사를 찾을 수 없습니다."
        )
    
    # 상태 및 결과 관련 필드는 별도 처리
    excluded_fields = {'status', 'passed'}
    update_data = inspection_update.dict(exclude_unset=True)
    
    # 상태 결정 로직
    if 'due_date' in update_data and update_data['due_date']:
        today = datetime.utcnow().date()
        due_date = update_data['due_date']
        
        if due_date < today:
            update_data['status'] = InspectionStatus.EXPIRED
        elif (due_date - today).days <= 7:
            update_data['status'] = InspectionStatus.SCHEDULED
        else:
            update_data['status'] = InspectionStatus.PENDING
    
    # 검사 완료 관련 필드 업데이트 시, 상태 변경
    if 'inspection_date' in update_data and update_data['inspection_date'] and 'passed' in update_data:
        if update_data['passed']:
            update_data['status'] = InspectionStatus.COMPLETED
        else:
            update_data['status'] = InspectionStatus.FAILED
    
    # 필드 업데이트
    for field, value in update_data.items():
        setattr(db_inspection, field, value)
    
    db.commit()
    db.refresh(db_inspection)
    
    # 차량의 다음 법정검사일 업데이트
    if db_inspection.next_due_date:
        vehicle = db.query(Vehicle).filter(Vehicle.id == db_inspection.vehicle_id).first()
        if vehicle:
            vehicle.next_inspection_date = db_inspection.next_due_date
            vehicle.last_inspection_date = db_inspection.inspection_date
            db.commit()
    
    return db_inspection


@router.post("/{inspection_id}/complete", response_model=InspectionResponse)
def complete_inspection(
    inspection_id: str,
    complete_data: InspectionComplete,
    db: Session = Depends(get_db)
):
    """
    법정검사 완료 처리
    
    법정검사 결과를 등록하고 완료 처리합니다.
    """
    db_inspection = db.query(VehicleInspection).filter(VehicleInspection.id == inspection_id).first()
    if not db_inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {inspection_id}에 해당하는 법정검사를 찾을 수 없습니다."
        )
    
    # 이미 완료된 검사인지 확인
    if db_inspection.status == InspectionStatus.COMPLETED or db_inspection.status == InspectionStatus.FAILED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 완료 처리된 법정검사입니다."
        )
    
    # 검사 결과에 따라 상태 설정
    db_inspection.inspection_date = complete_data.inspection_date
    db_inspection.passed = complete_data.passed
    db_inspection.fee = complete_data.fee
    db_inspection.certificate_number = complete_data.certificate_number
    db_inspection.next_due_date = complete_data.next_due_date
    db_inspection.notes = complete_data.notes or db_inspection.notes
    
    if complete_data.passed:
        db_inspection.status = InspectionStatus.COMPLETED
    else:
        db_inspection.status = InspectionStatus.FAILED
    
    db.commit()
    db.refresh(db_inspection)
    
    # 차량 정보 업데이트
    vehicle = db.query(Vehicle).filter(Vehicle.id == db_inspection.vehicle_id).first()
    if vehicle:
        vehicle.last_inspection_date = db_inspection.inspection_date
        if db_inspection.next_due_date:
            vehicle.next_inspection_date = db_inspection.next_due_date
        db.commit()
    
    return db_inspection


@router.delete("/{inspection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inspection(
    inspection_id: str,
    db: Session = Depends(get_db)
):
    """
    법정검사 삭제
    
    법정검사 일정을 삭제합니다.
    """
    db_inspection = db.query(VehicleInspection).filter(VehicleInspection.id == inspection_id).first()
    if not db_inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {inspection_id}에 해당하는 법정검사를 찾을 수 없습니다."
        )
    
    db.delete(db_inspection)
    db.commit()
    
    return None