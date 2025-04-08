"""
Vehicle API router.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from sqlalchemy.orm import Session

from ..core.dependencies import get_db, get_current_active_user
from ..models.schemas import (
    Vehicle, VehicleCreate, VehicleUpdate, VehicleStatus, VehicleType
)
from ..modules.vehicle.service import vehicle_service


router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("/", response_model=List[Vehicle])
async def list_vehicles(
    skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
    limit: int = Query(100, ge=1, le=1000, description="최대 반환 레코드 수"),
    make: Optional[str] = Query(None, description="제조사 필터"),
    model: Optional[str] = Query(None, description="모델 필터"),
    year: Optional[int] = Query(None, description="연도 필터"),
    status: Optional[VehicleStatus] = Query(None, description="상태 필터"),
    type: Optional[VehicleType] = Query(None, description="차량 유형 필터"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    차량 목록을 조회합니다.
    """
    filters = {}
    
    if make:
        filters["make"] = make
    if model:
        filters["model"] = model
    if year:
        filters["year"] = year
    if status:
        filters["status"] = status
    if type:
        filters["type"] = type
    
    return vehicle_service.get_vehicle_list(
        skip=skip,
        limit=limit,
        filters=filters
    )


@router.get("/{vehicle_id}", response_model=Vehicle)
async def get_vehicle(
    vehicle_id: str = Path(..., description="차량 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    특정 차량의 상세 정보를 조회합니다.
    """
    return vehicle_service.get_vehicle_by_id(vehicle_id)


@router.post("/", response_model=Vehicle, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    새 차량을 등록합니다.
    """
    return vehicle_service.create_vehicle(vehicle_data)


@router.put("/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(
    vehicle_data: VehicleUpdate,
    vehicle_id: str = Path(..., description="차량 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    차량 정보를 업데이트합니다.
    """
    return vehicle_service.update_vehicle(vehicle_id, vehicle_data)


@router.delete("/{vehicle_id}", response_model=bool)
async def delete_vehicle(
    vehicle_id: str = Path(..., description="차량 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    차량을 삭제합니다.
    """
    return vehicle_service.delete_vehicle(vehicle_id)


@router.get("/{vehicle_id}/maintenance", response_model=List[Dict[str, Any]])
async def get_maintenance_history(
    vehicle_id: str = Path(..., description="차량 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    차량의 정비 이력을 조회합니다.
    """
    return vehicle_service.get_vehicle_maintenance_history(vehicle_id)


@router.post("/{vehicle_id}/diagnostics", response_model=Dict[str, Any])
async def perform_diagnostics(
    vehicle_id: str = Path(..., description="차량 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    차량 진단을 실행합니다.
    """
    return vehicle_service.perform_vehicle_diagnostics(vehicle_id)


@router.get("/{vehicle_id}/telemetry", response_model=Dict[str, Any])
async def get_telemetry(
    vehicle_id: str = Path(..., description="차량 ID"),
    start_date: Optional[str] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    차량의 원격 측정 데이터를 조회합니다.
    """
    return vehicle_service.get_telemetry_data(
        vehicle_id,
        start_date,
        end_date
    )


@router.patch("/{vehicle_id}/status", response_model=Vehicle)
async def update_vehicle_status(
    status: VehicleStatus,
    vehicle_id: str = Path(..., description="차량 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    차량 상태를 변경합니다.
    """
    return vehicle_service.change_vehicle_status(vehicle_id, status) 