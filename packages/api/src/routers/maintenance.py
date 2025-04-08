"""
Maintenance API router.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session

from ..core.dependencies import get_db, get_current_active_user
from ..models.schemas import (
    Maintenance, MaintenanceCreate, MaintenanceUpdate, MaintenanceStatus
)
from ..modules.maintenance.service import maintenance_service


router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.get("/records", response_model=Dict[str, Any])
async def list_maintenance_records(
    skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
    limit: int = Query(100, ge=1, le=1000, description="최대 반환 레코드 수"),
    vehicle_id: Optional[str] = Query(None, description="차량 ID 필터"),
    status: Optional[MaintenanceStatus] = Query(None, description="상태 필터"),
    from_date: Optional[str] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비 기록 목록을 조회합니다.
    """
    filters = {}
    
    if vehicle_id:
        filters["vehicle_id"] = vehicle_id
    if status:
        filters["status"] = status
    if from_date:
        filters["from_date"] = from_date
    if to_date:
        filters["to_date"] = to_date
    
    result = maintenance_service.get_maintenance_records(
        skip=skip,
        limit=limit,
        filters=filters
    )
    
    return {
        "records": result["records"],
        "total": result["total"],
        "page": skip // limit + 1,
        "pages": (result["total"] + limit - 1) // limit
    }


@router.get("/records/{record_id}", response_model=Maintenance)
async def get_maintenance_record(
    record_id: str = Path(..., description="정비 기록 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    특정 정비 기록의 상세 정보를 조회합니다.
    """
    return maintenance_service.get_maintenance_record_by_id(record_id)


@router.get("/vehicle/{vehicle_id}", response_model=Dict[str, Any])
async def get_vehicle_maintenance_history(
    vehicle_id: str = Path(..., description="차량 ID"),
    skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
    limit: int = Query(100, ge=1, le=1000, description="최대 반환 레코드 수"),
    status: Optional[MaintenanceStatus] = Query(None, description="상태 필터"),
    from_date: Optional[str] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    차량별 정비 이력을 조회합니다.
    """
    filters = {"vehicle_id": vehicle_id}
    
    if status:
        filters["status"] = status
    if from_date:
        filters["from_date"] = from_date
    if to_date:
        filters["to_date"] = to_date
    
    result = maintenance_service.get_maintenance_records(
        skip=skip,
        limit=limit,
        filters=filters
    )
    
    return {
        "records": result["records"],
        "total": result["total"],
        "page": skip // limit + 1,
        "pages": (result["total"] + limit - 1) // limit
    }


@router.post("/records", response_model=Maintenance, status_code=status.HTTP_201_CREATED)
async def create_maintenance_record(
    maintenance_data: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    새 정비 기록을 생성합니다.
    """
    return maintenance_service.create_maintenance_record(maintenance_data)


@router.put("/records/{record_id}", response_model=Maintenance)
async def update_maintenance_record(
    maintenance_data: MaintenanceUpdate,
    record_id: str = Path(..., description="정비 기록 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비 기록을 업데이트합니다.
    """
    return maintenance_service.update_maintenance_record(record_id, maintenance_data)


@router.delete("/records/{record_id}", response_model=bool)
async def delete_maintenance_record(
    record_id: str = Path(..., description="정비 기록 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비 기록을 삭제합니다.
    """
    return maintenance_service.delete_maintenance_record(record_id)


@router.post("/records/{record_id}/documents", response_model=Dict[str, Any])
async def upload_maintenance_document(
    record_id: str = Path(..., description="정비 기록 ID"),
    file: UploadFile = File(..., description="업로드할 파일"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비 기록에 문서를 업로드합니다.
    """
    return maintenance_service.upload_maintenance_document(record_id, file)


@router.delete("/records/{record_id}/documents/{document_id}", response_model=bool)
async def delete_maintenance_document(
    record_id: str = Path(..., description="정비 기록 ID"),
    document_id: str = Path(..., description="문서 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비 기록에서 문서를 삭제합니다.
    """
    return maintenance_service.delete_maintenance_document(record_id, document_id)


@router.get("/upcoming", response_model=List[Dict[str, Any]])
async def get_upcoming_maintenance(
    days: int = Query(30, ge=1, le=365, description="앞으로의 일수"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    예정된 정비 일정을 조회합니다.
    """
    return maintenance_service.get_upcoming_maintenance(days)


@router.patch("/records/{record_id}/complete", response_model=Maintenance)
async def complete_maintenance(
    record_id: str = Path(..., description="정비 기록 ID"),
    mileage: Optional[int] = Query(None, description="완료 시 주행거리"),
    cost: Optional[float] = Query(None, description="최종 비용"),
    notes: Optional[str] = Query(None, description="완료 메모"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비를 완료 처리합니다.
    """
    return maintenance_service.complete_maintenance_record(
        record_id, 
        mileage=mileage,
        cost=cost,
        notes=notes
    )


@router.patch("/records/{record_id}/cancel", response_model=Maintenance)
async def cancel_maintenance(
    record_id: str = Path(..., description="정비 기록 ID"),
    reason: Optional[str] = Query(None, description="취소 사유"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    정비를 취소 처리합니다.
    """
    return maintenance_service.cancel_maintenance_record(record_id, reason) 