"""
차량 API 라우터 모듈
"""

import datetime
import uuid
from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
# 공통 모델 임포트
from src.models import Vehicle, get_db
from src.models.location import VehicleLocation
from src.models.maintenance import MaintenanceModel
from src.models.maintenance_schedule import MaintenanceSchedule

# 라우터 생성
router = APIRouter()


# 차량 상태 및 타입 열거형
class VehicleType(str, Enum):
    SEDAN = "SEDAN"
    SUV = "SUV"
    TRUCK = "TRUCK"
    VAN = "VAN"
    ELECTRIC = "ELECTRIC"
    HYBRID = "HYBRID"


class VehicleStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    MAINTENANCE = "MAINTENANCE"
    RESERVED = "RESERVED"
    INACTIVE = "INACTIVE"


# 차량 스키마
class VehicleBase(BaseModel):
    vin: str
    make: str
    model: str
    year: int
    type: VehicleType
    color: Optional[str] = None
    plate: Optional[str] = None
    mileage: Optional[int] = None
    status: VehicleStatus = VehicleStatus.AVAILABLE
    owner_id: Optional[str] = None
    last_service_date: Optional[datetime.datetime] = None
    next_service_date: Optional[datetime.datetime] = None


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    type: Optional[VehicleType] = None
    color: Optional[str] = None
    plate: Optional[str] = None
    mileage: Optional[int] = None
    status: Optional[VehicleStatus] = None
    owner_id: Optional[str] = None
    last_service_date: Optional[datetime.datetime] = None
    next_service_date: Optional[datetime.datetime] = None


class VehicleResponse(VehicleBase):
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
def create_vehicle(db: Session, vehicle: VehicleCreate):
    db_vehicle = Vehicle(
        id=str(uuid.uuid4()),
        vin=vehicle.vin,
        make=vehicle.make,
        model=vehicle.model,
        year=vehicle.year,
        type=vehicle.type.value,
        color=vehicle.color,
        plate=vehicle.plate,
        mileage=vehicle.mileage,
        status=vehicle.status.value,
        owner_id=vehicle.owner_id,
        last_service_date=vehicle.last_service_date,
        next_service_date=vehicle.next_service_date,
    )
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle


def get_vehicle(db: Session, vehicle_id: str):
    return db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()


def get_vehicle_by_vin(db: Session, vin: str):
    return db.query(Vehicle).filter(Vehicle.vin == vin).first()


def get_vehicles(db: Session, skip: int = 0, limit: int = 100, status: str = None):
    query = db.query(Vehicle)
    if status:
        query = query.filter(Vehicle.status == status)
    return query.offset(skip).limit(limit).all()


def update_vehicle(db: Session, vehicle_id: str, vehicle_update: VehicleUpdate):
    db_vehicle = get_vehicle(db, vehicle_id)
    if db_vehicle is None:
        return None

    vehicle_data = vehicle_update.model_dump(exclude_unset=True)

    # Enum 값 처리
    if "type" in vehicle_data and vehicle_data["type"] is not None:
        vehicle_data["type"] = vehicle_data["type"].value
    if "status" in vehicle_data and vehicle_data["status"] is not None:
        vehicle_data["status"] = vehicle_data["status"].value

    for key, value in vehicle_data.items():
        setattr(db_vehicle, key, value)

    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle


def delete_vehicle(db: Session, vehicle_id: str):
    db_vehicle = get_vehicle(db, vehicle_id)
    if db_vehicle is None:
        return False

    db.delete(db_vehicle)
    db.commit()
    return True


# 엔드포인트 정의
@router.post("/", response_model=ApiResponse)
async def create_vehicle_endpoint(
    vehicle: VehicleCreate, db: Session = Depends(get_db)
):
    """새 차량 생성"""
    db_vehicle = get_vehicle_by_vin(db, vin=vehicle.vin)
    if db_vehicle:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="이미 등록된 VIN입니다"
        )

    vehicle = create_vehicle(db=db, vehicle=vehicle)
    return {
        "success": True,
        "message": "차량이 성공적으로 등록되었습니다",
        "data": {
            "id": vehicle.id,
            "vin": vehicle.vin,
            "make": vehicle.make,
            "model": vehicle.model,
            "year": vehicle.year,
            "type": vehicle.type,
            "status": vehicle.status,
        },
    }


@router.get("/", response_model=ApiResponse)
async def get_vehicles_endpoint(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """차량 목록 조회"""
    vehicles = get_vehicles(db, skip=skip, limit=limit, status=status)
    vehicles_response = []

    for vehicle in vehicles:
        vehicle_data = {
            "id": vehicle.id,
            "vin": vehicle.vin,
            "make": vehicle.make,
            "model": vehicle.model,
            "year": vehicle.year,
            "type": vehicle.type,
            "color": vehicle.color,
            "plate": vehicle.plate,
            "mileage": vehicle.mileage,
            "status": vehicle.status,
            "owner_id": vehicle.owner_id,
            "last_service_date": vehicle.last_service_date,
            "next_service_date": vehicle.next_service_date,
            "created_at": vehicle.created_at,
            "updated_at": vehicle.updated_at,
        }
        vehicles_response.append(vehicle_data)

    return {
        "success": True,
        "message": "차량 목록을 성공적으로 조회했습니다",
        "data": vehicles_response,
        "count": len(vehicles_response),
    }


@router.get("/{vehicle_id}", response_model=ApiResponse)
async def get_vehicle_endpoint(vehicle_id: str, db: Session = Depends(get_db)):
    """특정 차량 조회"""
    db_vehicle = get_vehicle(db, vehicle_id=vehicle_id)
    if db_vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="차량을 찾을 수 없습니다"
        )

    vehicle_data = {
        "id": db_vehicle.id,
        "vin": db_vehicle.vin,
        "make": db_vehicle.make,
        "model": db_vehicle.model,
        "year": db_vehicle.year,
        "type": db_vehicle.type,
        "color": db_vehicle.color,
        "plate": db_vehicle.plate,
        "mileage": db_vehicle.mileage,
        "status": db_vehicle.status,
        "owner_id": db_vehicle.owner_id,
        "last_service_date": db_vehicle.last_service_date,
        "next_service_date": db_vehicle.next_service_date,
        "created_at": db_vehicle.created_at,
        "updated_at": db_vehicle.updated_at,
    }

    return {
        "success": True,
        "message": "차량을 성공적으로 조회했습니다",
        "data": vehicle_data,
    }


@router.put("/{vehicle_id}", response_model=ApiResponse)
async def update_vehicle_endpoint(
    vehicle_id: str, vehicle: VehicleUpdate, db: Session = Depends(get_db)
):
    """차량 정보 업데이트"""
    updated_vehicle = update_vehicle(db, vehicle_id=vehicle_id, vehicle_update=vehicle)
    if updated_vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="차량을 찾을 수 없습니다"
        )

    vehicle_data = {
        "id": updated_vehicle.id,
        "vin": updated_vehicle.vin,
        "make": updated_vehicle.make,
        "model": updated_vehicle.model,
        "year": updated_vehicle.year,
        "type": updated_vehicle.type,
        "color": updated_vehicle.color,
        "plate": updated_vehicle.plate,
        "mileage": updated_vehicle.mileage,
        "status": updated_vehicle.status,
        "owner_id": updated_vehicle.owner_id,
        "last_service_date": updated_vehicle.last_service_date,
        "next_service_date": updated_vehicle.next_service_date,
        "created_at": updated_vehicle.created_at,
        "updated_at": updated_vehicle.updated_at,
    }

    return {
        "success": True,
        "message": "차량 정보가 성공적으로 업데이트되었습니다",
        "data": vehicle_data,
    }


@router.delete("/{vehicle_id}", response_model=ApiResponse)
async def delete_vehicle_endpoint(vehicle_id: str, db: Session = Depends(get_db)):
    """차량 삭제"""
    deleted = delete_vehicle(db, vehicle_id=vehicle_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="차량을 찾을 수 없습니다"
        )

    return {"success": True, "message": "차량이 성공적으로 삭제되었습니다"}


@router.get("/{vehicle_id}/full", response_model=ApiResponse)
def get_vehicle_with_full_info(vehicle_id: int, db: Session = Depends(get_db)):
    """차량의 종합 정보를 조회합니다. 차량 기본정보, 현재 위치, 최근 정비 기록, 예정된 정비 일정을 포함합니다."""
    
    # 차량 존재 여부 확인
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"차량 ID {vehicle_id}를 찾을 수 없습니다")
    
    # 현재 위치 조회 (가장 최근)
    current_location = (
        db.query(VehicleLocation)
        .filter(VehicleLocation.vehicle_id == vehicle_id)
        .order_by(VehicleLocation.timestamp.desc())
        .first()
    )
    
    # 최근 정비 기록 조회 (최대 5개)
    recent_maintenance = (
        db.query(MaintenanceModel)
        .filter(MaintenanceModel.vehicle_id == vehicle_id)
        .order_by(MaintenanceModel.date.desc())
        .limit(5)
        .all()
    )
    
    # 예정된 정비 일정 조회 (최대 5개)
    upcoming_schedules = (
        db.query(MaintenanceSchedule)
        .filter(
            MaintenanceSchedule.vehicle_id == vehicle_id,
            MaintenanceSchedule.scheduled_date >= datetime.datetime.now()
        )
        .order_by(MaintenanceSchedule.scheduled_date.asc())
        .limit(5)
        .all()
    )
    
    # 응답 데이터 구성
    result = {
        "vehicle": vehicle,
        "current_location": current_location,
        "recent_maintenance": recent_maintenance,
        "upcoming_schedules": upcoming_schedules
    }
    
    return {
        "success": True,
        "data": result,
        "message": "차량 종합 정보가 성공적으로 조회되었습니다"
    }
