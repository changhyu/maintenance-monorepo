"""
차량 법정검사 관련 API 라우터
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.models import get_db
from src.models.vehicle import Vehicle
from src.models.vehicle_inspection import VehicleInspection, InspectionStatus, InspectionType
from src.schemas.vehicle_inspection import (
    VehicleInspectionCreate,
    VehicleInspectionUpdate,
    VehicleInspectionResponse,
    VehicleInspectionList,
    VehicleInspectionCompleteRequest,
)
from src.schemas.common import ApiResponse

router = APIRouter(prefix="/vehicle-inspections", tags=["법정검사"])


@router.post("/", response_model=ApiResponse)
async def create_vehicle_inspection(
    inspection: VehicleInspectionCreate, db: Session = Depends(get_db)
):
    """새 법정검사 일정 생성"""
    
    # 차량 존재 확인
    vehicle = db.query(Vehicle).filter(Vehicle.id == inspection.vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="차량을 찾을 수 없습니다"
        )

    # 새 법정검사 생성
    db_inspection = VehicleInspection(
        id=str(uuid.uuid4()),
        vehicle_id=inspection.vehicle_id,
        inspection_type=inspection.inspection_type.value,
        due_date=inspection.due_date,
        status=InspectionStatus.PENDING,
        location=inspection.location,
        inspector=inspection.inspector,
        notes=inspection.notes,
    )

    # 차량 법정검사 정보 업데이트
    vehicle.next_inspection_date = inspection.due_date
    
    # 가까운 시일 내에 법정검사가 예정된 경우 차량 상태 변경
    days_to_inspection = (inspection.due_date - datetime.utcnow()).days
    if days_to_inspection <= 30:  # 30일 이내 검사 예정
        vehicle.status = "inspection_required"
    
    db.add(db_inspection)
    db.commit()
    db.refresh(db_inspection)

    return {
        "success": True,
        "message": "법정검사 일정이 성공적으로 등록되었습니다",
        "data": {
            "id": db_inspection.id,
            "vehicle_id": db_inspection.vehicle_id,
            "inspection_type": db_inspection.inspection_type,
            "due_date": db_inspection.due_date,
            "status": db_inspection.status,
        },
    }


@router.get("/", response_model=ApiResponse)
async def get_inspections(
    vehicle_id: Optional[str] = None,
    status: Optional[str] = None,
    due_before: Optional[datetime] = None,
    due_after: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """법정검사 목록 조회"""
    
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
        
    # 정렬 (검사 만료일 기준)
    query = query.order_by(VehicleInspection.due_date)
    
    total = query.count()
    inspections = query.offset(skip).limit(limit).all()
    
    inspections_data = []
    for inspection in inspections:
        inspections_data.append({
            "id": inspection.id,
            "vehicle_id": inspection.vehicle_id,
            "inspection_type": inspection.inspection_type,
            "due_date": inspection.due_date,
            "inspection_date": inspection.inspection_date,
            "status": inspection.status,
            "location": inspection.location,
            "fee": inspection.fee,
            "passed": inspection.passed,
            "certificate_number": inspection.certificate_number,
            "next_due_date": inspection.next_due_date,
            "created_at": inspection.created_at,
            "updated_at": inspection.updated_at,
        })
    
    return {
        "success": True,
        "message": "법정검사 목록을 성공적으로 조회했습니다",
        "data": inspections_data,
        "count": len(inspections_data),
        "total": total,
    }


@router.get("/upcoming", response_model=ApiResponse)
async def get_upcoming_inspections(
    days: int = 30, db: Session = Depends(get_db)
):
    """만료 예정 법정검사 조회 (기본 30일 이내)"""
    
    now = datetime.utcnow()
    due_date_limit = now + timedelta(days=days)
    
    inspections = (
        db.query(VehicleInspection)
        .filter(VehicleInspection.due_date > now)
        .filter(VehicleInspection.due_date <= due_date_limit)
        .filter(VehicleInspection.status.in_([InspectionStatus.PENDING, InspectionStatus.SCHEDULED]))
        .order_by(VehicleInspection.due_date)
        .all()
    )
    
    inspections_data = []
    for inspection in inspections:
        # 차량 정보 가져오기
        vehicle = db.query(Vehicle).filter(Vehicle.id == inspection.vehicle_id).first()
        vehicle_info = None
        if vehicle:
            vehicle_info = {
                "id": vehicle.id,
                "make": vehicle.make,
                "model": vehicle.model,
                "year": vehicle.year,
                "license_plate": vehicle.license_plate if hasattr(vehicle, "license_plate") else None,
                "vin": vehicle.vin,
            }
            
        inspections_data.append({
            "id": inspection.id,
            "vehicle_id": inspection.vehicle_id,
            "vehicle": vehicle_info,
            "inspection_type": inspection.inspection_type,
            "due_date": inspection.due_date,
            "days_remaining": (inspection.due_date - now).days,
            "status": inspection.status,
        })
    
    return {
        "success": True,
        "message": f"향후 {days}일 이내 만료 예정인 법정검사를 조회했습니다",
        "data": inspections_data,
        "count": len(inspections_data),
    }


@router.get("/{inspection_id}", response_model=ApiResponse)
async def get_inspection(inspection_id: str, db: Session = Depends(get_db)):
    """특정 법정검사 조회"""
    
    inspection = db.query(VehicleInspection).filter(VehicleInspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="법정검사 정보를 찾을 수 없습니다"
        )

    # 차량 정보 가져오기
    vehicle = db.query(Vehicle).filter(Vehicle.id == inspection.vehicle_id).first()
    vehicle_info = None
    if vehicle:
        vehicle_info = {
            "id": vehicle.id,
            "make": vehicle.make,
            "model": vehicle.model,
            "year": vehicle.year,
            "license_plate": vehicle.license_plate if hasattr(vehicle, "license_plate") else None,
            "vin": vehicle.vin,
        }
    
    return {
        "success": True,
        "message": "법정검사 정보를 성공적으로 조회했습니다",
        "data": {
            "id": inspection.id,
            "vehicle_id": inspection.vehicle_id,
            "vehicle": vehicle_info,
            "inspection_type": inspection.inspection_type,
            "due_date": inspection.due_date,
            "inspection_date": inspection.inspection_date,
            "status": inspection.status,
            "location": inspection.location,
            "inspector": inspection.inspector,
            "fee": inspection.fee,
            "passed": inspection.passed,
            "certificate_number": inspection.certificate_number,
            "next_due_date": inspection.next_due_date,
            "notes": inspection.notes,
            "created_at": inspection.created_at,
            "updated_at": inspection.updated_at,
        },
    }


@router.put("/{inspection_id}", response_model=ApiResponse)
async def update_inspection(
    inspection_id: str, inspection: VehicleInspectionUpdate, db: Session = Depends(get_db)
):
    """법정검사 정보 업데이트"""
    
    db_inspection = db.query(VehicleInspection).filter(VehicleInspection.id == inspection_id).first()
    if not db_inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="법정검사 정보를 찾을 수 없습니다"
        )

    # 업데이트 필드 처리
    inspection_data = inspection.dict(exclude_unset=True)
    
    # Enum 값 처리
    if "inspection_type" in inspection_data and inspection_data["inspection_type"] is not None:
        inspection_data["inspection_type"] = inspection_data["inspection_type"].value
    if "status" in inspection_data and inspection_data["status"] is not None:
        inspection_data["status"] = inspection_data["status"].value
    
    for key, value in inspection_data.items():
        setattr(db_inspection, key, value)
    
    # 차량 정보도 함께 업데이트
    vehicle = db.query(Vehicle).filter(Vehicle.id == db_inspection.vehicle_id).first()
    if vehicle:
        if db_inspection.inspection_date:
            vehicle.last_inspection_date = db_inspection.inspection_date
        if db_inspection.next_due_date:
            vehicle.next_inspection_date = db_inspection.next_due_date
    
    db.commit()
    db.refresh(db_inspection)
    
    return {
        "success": True,
        "message": "법정검사 정보가 성공적으로 업데이트되었습니다",
        "data": {
            "id": db_inspection.id,
            "vehicle_id": db_inspection.vehicle_id,
            "inspection_type": db_inspection.inspection_type,
            "status": db_inspection.status,
        },
    }


@router.post("/{inspection_id}/complete", response_model=ApiResponse)
async def complete_inspection(
    inspection_id: str, 
    completion_data: VehicleInspectionCompleteRequest, 
    db: Session = Depends(get_db)
):
    """법정검사 완료 처리"""
    
    db_inspection = db.query(VehicleInspection).filter(VehicleInspection.id == inspection_id).first()
    if not db_inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="법정검사 정보를 찾을 수 없습니다"
        )

    # 완료 정보 업데이트
    db_inspection.status = InspectionStatus.COMPLETED.value if completion_data.passed else InspectionStatus.FAILED.value
    db_inspection.inspection_date = completion_data.inspection_date
    db_inspection.passed = completion_data.passed
    db_inspection.fee = completion_data.fee
    db_inspection.certificate_number = completion_data.certificate_number
    db_inspection.next_due_date = completion_data.next_due_date
    db_inspection.notes = completion_data.notes

    # 차량 정보도 함께 업데이트
    vehicle = db.query(Vehicle).filter(Vehicle.id == db_inspection.vehicle_id).first()
    if vehicle:
        vehicle.last_inspection_date = completion_data.inspection_date
        vehicle.next_inspection_date = completion_data.next_due_date
        
        # 검사가 통과했고 다음 검사일이 충분히 먼 경우 차량 상태 정상으로 변경
        if completion_data.passed:
            if vehicle.status == "inspection_required" or vehicle.status == "maintenance":
                vehicle.status = "active"
    
    db.commit()
    db.refresh(db_inspection)
    
    return {
        "success": True,
        "message": "법정검사 완료 처리가 성공적으로 되었습니다",
        "data": {
            "id": db_inspection.id,
            "vehicle_id": db_inspection.vehicle_id,
            "passed": db_inspection.passed,
            "status": db_inspection.status,
            "next_due_date": db_inspection.next_due_date,
        },
    }


@router.delete("/{inspection_id}", response_model=ApiResponse)
async def delete_inspection(inspection_id: str, db: Session = Depends(get_db)):
    """법정검사 일정 삭제"""
    
    db_inspection = db.query(VehicleInspection).filter(VehicleInspection.id == inspection_id).first()
    if not db_inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="법정검사 정보를 찾을 수 없습니다"
        )
    
    db.delete(db_inspection)
    db.commit()
    
    return {
        "success": True,
        "message": "법정검사 정보가 성공적으로 삭제되었습니다",
    }