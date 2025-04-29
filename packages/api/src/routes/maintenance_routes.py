"""
정비 기록 API 라우터 모듈
"""

import datetime
import uuid
from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
# 공통 모델 임포트
from src.models import MaintenanceRecord, get_db

# 라우터 생성
router = APIRouter()


# 정비 상태 열거형
class MaintenanceStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


# 정비 기록 스키마
class MaintenanceRecordBase(BaseModel):
    vehicle_id: str
    description: str
    date: datetime.datetime
    mileage: Optional[int] = None
    cost: Optional[float] = None
    performed_by: Optional[str] = None
    status: MaintenanceStatus = MaintenanceStatus.SCHEDULED
    notes: Optional[str] = None


class MaintenanceRecordCreate(MaintenanceRecordBase):
    pass


class MaintenanceRecordUpdate(BaseModel):
    description: Optional[str] = None
    date: Optional[datetime.datetime] = None
    mileage: Optional[int] = None
    cost: Optional[float] = None
    performed_by: Optional[str] = None
    status: Optional[MaintenanceStatus] = None
    notes: Optional[str] = None


class MaintenanceRecordResponse(MaintenanceRecordBase):
    id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# API 응답 모델
class ApiResponse(BaseModel):
    success: bool = True
    message: str = "요청이 성공적으로 처리되었습니다"
    data: Optional[dict] = None


# CRUD 함수들
def create_maintenance_record(db: Session, record: MaintenanceRecordCreate):
    db_record = MaintenanceRecord(
        id=str(uuid.uuid4()),
        vehicle_id=record.vehicle_id,
        description=record.description,
        date=record.date,
        mileage=record.mileage,
        cost=record.cost,
        performed_by=record.performed_by,
        status=record.status.value,
        notes=record.notes,
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


def get_maintenance_record(db: Session, record_id: str):
    return db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).first()


def get_maintenance_records(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    vehicle_id: str = None,
    status: str = None,
):
    query = db.query(MaintenanceRecord)
    if vehicle_id:
        query = query.filter(MaintenanceRecord.vehicle_id == vehicle_id)
    if status:
        query = query.filter(MaintenanceRecord.status == status)
    return query.offset(skip).limit(limit).all()


def update_maintenance_record(
    db: Session, record_id: str, record_update: MaintenanceRecordUpdate
):
    db_record = get_maintenance_record(db, record_id)
    if db_record is None:
        return None

    record_data = record_update.dict(exclude_unset=True)

    # Enum 값 처리
    if "status" in record_data and record_data["status"] is not None:
        record_data["status"] = record_data["status"].value

    for key, value in record_data.items():
        setattr(db_record, key, value)

    db.commit()
    db.refresh(db_record)
    return db_record


def delete_maintenance_record(db: Session, record_id: str):
    db_record = get_maintenance_record(db, record_id)
    if db_record is None:
        return False

    db.delete(db_record)
    db.commit()
    return True


# 엔드포인트 정의
@router.post("/", response_model=ApiResponse)
async def create_maintenance_record_endpoint(
    record: MaintenanceRecordCreate, db: Session = Depends(get_db)
):
    """새 정비 기록 생성"""
    record = create_maintenance_record(db=db, record=record)
    return {
        "success": True,
        "message": "정비 기록이 성공적으로 생성되었습니다",
        "data": {
            "id": record.id,
            "vehicle_id": record.vehicle_id,
            "description": record.description,
            "date": record.date,
            "status": record.status,
        },
    }


@router.get("/", response_model=ApiResponse)
async def get_maintenance_records_endpoint(
    vehicle_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """정비 기록 목록 조회"""
    records = get_maintenance_records(
        db, skip=skip, limit=limit, vehicle_id=vehicle_id, status=status
    )
    records_response = []

    for record in records:
        record_data = {
            "id": record.id,
            "vehicle_id": record.vehicle_id,
            "description": record.description,
            "date": record.date,
            "mileage": record.mileage,
            "cost": record.cost,
            "performed_by": record.performed_by,
            "status": record.status,
            "notes": record.notes,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
        }
        records_response.append(record_data)

    return {
        "success": True,
        "message": "정비 기록 목록을 성공적으로 조회했습니다",
        "data": records_response,
        "count": len(records_response),
    }


@router.get("/{record_id}", response_model=ApiResponse)
async def get_maintenance_record_endpoint(
    record_id: str, db: Session = Depends(get_db)
):
    """특정 정비 기록 조회"""
    db_record = get_maintenance_record(db, record_id=record_id)
    if db_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="정비 기록을 찾을 수 없습니다"
        )

    record_data = {
        "id": db_record.id,
        "vehicle_id": db_record.vehicle_id,
        "description": db_record.description,
        "date": db_record.date,
        "mileage": db_record.mileage,
        "cost": db_record.cost,
        "performed_by": db_record.performed_by,
        "status": db_record.status,
        "notes": db_record.notes,
        "created_at": db_record.created_at,
        "updated_at": db_record.updated_at,
    }

    return {
        "success": True,
        "message": "정비 기록을 성공적으로 조회했습니다",
        "data": record_data,
    }


@router.put("/{record_id}", response_model=ApiResponse)
async def update_maintenance_record_endpoint(
    record_id: str, record: MaintenanceRecordUpdate, db: Session = Depends(get_db)
):
    """정비 기록 업데이트"""
    updated_record = update_maintenance_record(
        db, record_id=record_id, record_update=record
    )
    if updated_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="정비 기록을 찾을 수 없습니다"
        )

    record_data = {
        "id": updated_record.id,
        "vehicle_id": updated_record.vehicle_id,
        "description": updated_record.description,
        "date": updated_record.date,
        "status": updated_record.status,
        "updated_at": updated_record.updated_at,
    }

    return {
        "success": True,
        "message": "정비 기록이 성공적으로 업데이트되었습니다",
        "data": record_data,
    }


@router.delete("/{record_id}", response_model=ApiResponse)
async def delete_maintenance_record_endpoint(
    record_id: str, db: Session = Depends(get_db)
):
    """정비 기록 삭제"""
    deleted = delete_maintenance_record(db, record_id=record_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="정비 기록을 찾을 수 없습니다"
        )

    return {"success": True, "message": "정비 기록이 성공적으로 삭제되었습니다"}
