"""
정비 일정 API 라우터 모듈
"""

import datetime
import uuid
from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

# 공통 모델 임포트
from src.models import MaintenanceSchedule, Vehicle, get_db

# 라우터 생성
router = APIRouter()


# 정비 일정 상태 열거형
class ScheduleStatus(str, Enum):
    SCHEDULED = "SCHEDULED"  # 예약됨
    IN_PROGRESS = "IN_PROGRESS"  # 진행 중
    COMPLETED = "COMPLETED"  # 완료됨
    CANCELLED = "CANCELLED"  # 취소됨
    PENDING = "PENDING"  # 대기 중


# 일정 우선순위 열거형
class SchedulePriority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


# 정비 일정 스키마
class ScheduleBase(BaseModel):
    vehicle_id: str
    title: str
    description: Optional[str] = None
    scheduled_date: datetime.datetime
    vehicle_mileage: Optional[int] = None
    estimated_duration: Optional[int] = 60  # 분 단위
    estimated_cost: Optional[float] = None
    maintenance_type: str
    status: ScheduleStatus = ScheduleStatus.SCHEDULED
    priority: SchedulePriority = SchedulePriority.NORMAL
    assigned_to: Optional[str] = None
    shop_id: Optional[str] = None


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[datetime.datetime] = None
    vehicle_mileage: Optional[int] = None
    estimated_duration: Optional[int] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    maintenance_type: Optional[str] = None
    status: Optional[ScheduleStatus] = None
    priority: Optional[SchedulePriority] = None
    assigned_to: Optional[str] = None
    shop_id: Optional[str] = None
    completed_date: Optional[datetime.datetime] = None


class ScheduleResponse(ScheduleBase):
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
def create_schedule(db: Session, schedule: ScheduleCreate):
    db_schedule = MaintenanceSchedule(
        id=str(uuid.uuid4()),
        vehicle_id=schedule.vehicle_id,
        title=schedule.title,
        description=schedule.description,
        scheduled_date=schedule.scheduled_date,
        vehicle_mileage=schedule.vehicle_mileage,
        estimated_duration=schedule.estimated_duration,
        estimated_cost=schedule.estimated_cost,
        maintenance_type=schedule.maintenance_type,
        status=schedule.status.value,
        priority=schedule.priority.value,
        assigned_to=schedule.assigned_to,
        shop_id=schedule.shop_id,
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule


def get_schedule(db: Session, schedule_id: str):
    return db.query(MaintenanceSchedule).filter(MaintenanceSchedule.id == schedule_id).first()


def get_schedules(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    vehicle_id: str = None,
    status: str = None,
    start_date: datetime.datetime = None,
    end_date: datetime.datetime = None,
):
    query = db.query(MaintenanceSchedule)
    
    if vehicle_id:
        query = query.filter(MaintenanceSchedule.vehicle_id == vehicle_id)
    if status:
        query = query.filter(MaintenanceSchedule.status == status)
    if start_date:
        query = query.filter(MaintenanceSchedule.scheduled_date >= start_date)
    if end_date:
        query = query.filter(MaintenanceSchedule.scheduled_date <= end_date)
        
    return query.order_by(MaintenanceSchedule.scheduled_date).offset(skip).limit(limit).all()


def update_schedule(db: Session, schedule_id: str, schedule_update: ScheduleUpdate):
    db_schedule = get_schedule(db, schedule_id)
    if db_schedule is None:
        return None

    schedule_data = schedule_update.model_dump(exclude_unset=True)

    # Enum 값 처리
    if "status" in schedule_data and schedule_data["status"] is not None:
        schedule_data["status"] = schedule_data["status"].value
    if "priority" in schedule_data and schedule_data["priority"] is not None:
        schedule_data["priority"] = schedule_data["priority"].value

    for key, value in schedule_data.items():
        setattr(db_schedule, key, value)

    db.commit()
    db.refresh(db_schedule)
    return db_schedule


def delete_schedule(db: Session, schedule_id: str):
    db_schedule = get_schedule(db, schedule_id)
    if db_schedule is None:
        return False

    db.delete(db_schedule)
    db.commit()
    return True


# 엔드포인트 정의
@router.post("/", response_model=ApiResponse)
async def create_schedule_endpoint(
    schedule: ScheduleCreate, db: Session = Depends(get_db)
):
    """새 정비 일정 생성"""
    # 차량 존재 여부 확인
    vehicle = db.query(Vehicle).filter(Vehicle.id == schedule.vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"차량을 찾을 수 없습니다: {schedule.vehicle_id}"
        )
        
    schedule = create_schedule(db=db, schedule=schedule)
    return {
        "success": True,
        "message": "정비 일정이 성공적으로 생성되었습니다",
        "data": {
            "id": schedule.id,
            "vehicle_id": schedule.vehicle_id,
            "title": schedule.title,
            "scheduled_date": schedule.scheduled_date,
            "status": schedule.status,
            "priority": schedule.priority,
        },
    }


@router.get("/", response_model=ApiResponse)
async def get_schedules_endpoint(
    vehicle_id: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[datetime.datetime] = None,
    end_date: Optional[datetime.datetime] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """정비 일정 목록 조회"""
    schedules = get_schedules(
        db, 
        skip=skip, 
        limit=limit, 
        vehicle_id=vehicle_id, 
        status=status,
        start_date=start_date,
        end_date=end_date
    )
    schedules_response = []

    for schedule in schedules:
        schedule_data = {
            "id": schedule.id,
            "vehicle_id": schedule.vehicle_id,
            "title": schedule.title,
            "description": schedule.description,
            "scheduled_date": schedule.scheduled_date,
            "vehicle_mileage": schedule.vehicle_mileage,
            "estimated_duration": schedule.estimated_duration,
            "estimated_cost": schedule.estimated_cost,
            "actual_cost": schedule.actual_cost,
            "maintenance_type": schedule.maintenance_type,
            "status": schedule.status,
            "priority": schedule.priority,
            "assigned_to": schedule.assigned_to,
            "shop_id": schedule.shop_id,
            "completed_date": schedule.completed_date,
            "created_at": schedule.created_at,
            "updated_at": schedule.updated_at,
        }
        schedules_response.append(schedule_data)

    return {
        "success": True,
        "message": "정비 일정 목록을 성공적으로 조회했습니다",
        "data": schedules_response,
        "count": len(schedules_response),
    }


@router.get("/vehicles/{vehicle_id}", response_model=ApiResponse)
async def get_vehicle_schedules_endpoint(
    vehicle_id: str,
    status: Optional[str] = None,
    start_date: Optional[datetime.datetime] = None,
    end_date: Optional[datetime.datetime] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """특정 차량의 정비 일정 목록 조회"""
    # 차량 존재 여부 확인
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"차량을 찾을 수 없습니다: {vehicle_id}"
        )
        
    schedules = get_schedules(
        db, 
        skip=skip, 
        limit=limit, 
        vehicle_id=vehicle_id, 
        status=status,
        start_date=start_date,
        end_date=end_date
    )
    schedules_response = []

    for schedule in schedules:
        schedule_data = {
            "id": schedule.id,
            "title": schedule.title,
            "description": schedule.description,
            "scheduled_date": schedule.scheduled_date,
            "maintenance_type": schedule.maintenance_type,
            "status": schedule.status,
            "priority": schedule.priority,
            "estimated_duration": schedule.estimated_duration,
            "estimated_cost": schedule.estimated_cost,
        }
        schedules_response.append(schedule_data)

    return {
        "success": True,
        "message": f"차량 ID {vehicle_id}의 정비 일정 목록을 조회했습니다",
        "data": {
            "vehicle_id": vehicle_id,
            "vehicle_info": {
                "make": vehicle.make,
                "model": vehicle.model,
                "year": vehicle.year,
            },
            "schedules": schedules_response,
        },
        "count": len(schedules_response),
    }


@router.get("/{schedule_id}", response_model=ApiResponse)
async def get_schedule_endpoint(
    schedule_id: str, db: Session = Depends(get_db)
):
    """특정 정비 일정 조회"""
    schedule = get_schedule(db, schedule_id)
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"정비 일정을 찾을 수 없습니다: {schedule_id}"
        )

    return {
        "success": True,
        "message": "정비 일정을 성공적으로 조회했습니다",
        "data": {
            "id": schedule.id,
            "vehicle_id": schedule.vehicle_id,
            "title": schedule.title,
            "description": schedule.description,
            "scheduled_date": schedule.scheduled_date,
            "vehicle_mileage": schedule.vehicle_mileage,
            "estimated_duration": schedule.estimated_duration,
            "estimated_cost": schedule.estimated_cost,
            "actual_cost": schedule.actual_cost,
            "maintenance_type": schedule.maintenance_type,
            "status": schedule.status,
            "priority": schedule.priority,
            "assigned_to": schedule.assigned_to,
            "shop_id": schedule.shop_id,
            "completed_date": schedule.completed_date,
            "created_at": schedule.created_at,
            "updated_at": schedule.updated_at,
        },
    }


@router.put("/{schedule_id}", response_model=ApiResponse)
async def update_schedule_endpoint(
    schedule_id: str, schedule: ScheduleUpdate, db: Session = Depends(get_db)
):
    """정비 일정 업데이트"""
    db_schedule = update_schedule(db, schedule_id, schedule)
    if not db_schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"정비 일정을 찾을 수 없습니다: {schedule_id}"
        )

    return {
        "success": True,
        "message": "정비 일정이 성공적으로 업데이트되었습니다",
        "data": {
            "id": db_schedule.id,
            "vehicle_id": db_schedule.vehicle_id,
            "title": db_schedule.title,
            "scheduled_date": db_schedule.scheduled_date,
            "status": db_schedule.status,
            "updated_at": db_schedule.updated_at,
        },
    }


@router.delete("/{schedule_id}", response_model=ApiResponse)
async def delete_schedule_endpoint(
    schedule_id: str, db: Session = Depends(get_db)
):
    """정비 일정 삭제"""
    success = delete_schedule(db, schedule_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"정비 일정을 찾을 수 없습니다: {schedule_id}"
        )

    return {
        "success": True,
        "message": "정비 일정이 성공적으로 삭제되었습니다",
        "data": {"id": schedule_id},
    }


@router.put("/{schedule_id}/status", response_model=ApiResponse)
async def update_schedule_status_endpoint(
    schedule_id: str, 
    status: ScheduleStatus, 
    completed_date: Optional[datetime.datetime] = None,
    actual_cost: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """정비 일정 상태 업데이트"""
    db_schedule = get_schedule(db, schedule_id)
    if not db_schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"정비 일정을 찾을 수 없습니다: {schedule_id}"
        )
    
    # 상태 업데이트
    db_schedule.status = status.value
    
    # 완료된 경우, 완료 날짜 설정
    if status == ScheduleStatus.COMPLETED:
        db_schedule.completed_date = completed_date or datetime.datetime.now()
        if actual_cost is not None:
            db_schedule.actual_cost = actual_cost
    
    db.commit()
    db.refresh(db_schedule)

    return {
        "success": True,
        "message": f"정비 일정 상태가 {status.value}로 업데이트되었습니다",
        "data": {
            "id": db_schedule.id,
            "status": db_schedule.status,
            "completed_date": db_schedule.completed_date,
            "actual_cost": db_schedule.actual_cost,
        },
    } 