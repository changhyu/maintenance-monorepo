from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, HTTPException, Path, Query, UploadFile
from fastapi.responses import StreamingResponse
from modules.maintenance.service import maintenance_service
from packagesmodels.schemas import (MaintenanceCreate, MaintenanceStatus,
                                    MaintenanceUpdate)
from pydantic import BaseModel

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


# 정비 기록 완료 요청 모델
class CompleteMaintenanceRequest(BaseModel):
    mileage: Optional[int] = None
    cost: Optional[float] = None
    notes: Optional[str] = None


# 정비 기록 취소 요청 모델
class CancelMaintenanceRequest(BaseModel):
    reason: Optional[str] = None


@router.get("/records", response_model=Dict[str, Any])
def get_maintenance_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    vehicle_id: Optional[str] = Query(None),
    status: Optional[MaintenanceStatus] = Query(None),
    from_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
):
    filters = {}
    if vehicle_id:
        filters["vehicle_id"] = vehicle_id
    if status:
        filters["status"] = status
    if from_date:
        filters["from_date"] = from_date
    if to_date:
        filters["to_date"] = to_date
    try:
        return maintenance_service.get_maintenance_records(
            skip=skip, limit=limit, filters=filters
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/records/{record_id}", response_model=Dict[str, Any])
def get_maintenance_record(record_id: str = Path(...)):
    try:
        return maintenance_service.get_maintenance_record_by_id(record_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/records", response_model=Dict[str, Any])
def create_maintenance_record(data: MaintenanceCreate):
    try:
        return maintenance_service.create_maintenance_record(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.patch("/records/{record_id}", response_model=Dict[str, Any])
def update_maintenance_record(record_id: str, data: MaintenanceUpdate):
    try:
        return maintenance_service.update_maintenance_record(record_id, data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/records/{record_id}", response_model=Dict[str, Any])
def delete_maintenance_record(record_id: str):
    try:
        return {"deleted": maintenance_service.delete_maintenance_record(record_id)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/upcoming", response_model=List[Dict[str, Any]])
def get_upcoming_maintenance(days: int = Query(30, ge=1)):
    try:
        return maintenance_service.get_upcoming_maintenance(days=days)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/records/{record_id}/complete", response_model=Dict[str, Any])
def complete_maintenance_record(record_id: str, request: CompleteMaintenanceRequest):
    try:
        return maintenance_service.complete_maintenance_record(
            record_id, mileage=request.mileage, cost=request.cost, notes=request.notes
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/records/{record_id}/cancel", response_model=Dict[str, Any])
def cancel_maintenance_record(record_id: str, request: CancelMaintenanceRequest):
    try:
        return maintenance_service.cancel_maintenance_record(
            record_id, reason=request.reason
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/records/{record_id}/documents", response_model=Dict[str, Any])
def upload_maintenance_document(record_id: str, file: UploadFile = File(...)):
    try:
        return maintenance_service.upload_maintenance_document(record_id, file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete(
    "/records/{record_id}/documents/{document_id}", response_model=Dict[str, Any]
)
def delete_maintenance_document(record_id: str, document_id: str):
    try:
        return {
            "deleted": maintenance_service.delete_maintenance_document(
                record_id, document_id
            )
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/summary", response_model=Dict[str, Any])
def get_maintenance_summary():
    try:
        return maintenance_service.get_maintenance_summary()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/alerts", response_model=Dict[str, Any])
def get_maintenance_alerts(days: int = Query(1, ge=1)):
    """엔드포인트: 정해진 일수(days) 내 예정된 정비 알림을 전송합니다."""
    try:
        return maintenance_service.send_maintenance_alerts(days=days)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/export", response_class=StreamingResponse)
def export_maintenance_records(
    vehicle_id: Optional[str] = Query(None),
    status: Optional[MaintenanceStatus] = Query(None),
    from_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
):
    """정비 기록을 CSV 파일로 내보냅니다."""
    filters = {}
    if vehicle_id:
        filters["vehicle_id"] = vehicle_id
    if status:
        filters["status"] = status
    if from_date:
        filters["from_date"] = from_date
    if to_date:
        filters["to_date"] = to_date

    try:
        result = maintenance_service.get_maintenance_records(
            skip=0, limit=1000, filters=filters
        )
        records = result.get("records", [])

        import csv
        from io import StringIO

        from fastapi.responses import StreamingResponse

        output = StringIO()
        writer = csv.writer(output)

        # CSV 헤더 작성
        writer.writerow(
            [
                "id",
                "vehicle_id",
                "description",
                "date",
                "status",
                "cost",
                "performed_by",
                "notes",
            ]
        )

        # 각 정비 기록에 대해 CSV 행 작성
        for record in records:
            writer.writerow(
                [
                    record.get("id"),
                    record.get("vehicle_id"),
                    record.get("description"),
                    record.get("date"),
                    record.get("status"),
                    record.get("cost"),
                    record.get("performed_by"),
                    record.get("notes"),
                ]
            )

        output.seek(0)
        headers = {"Content-Disposition": "attachment; filename=maintenance_export.csv"}
        return StreamingResponse(
            iter([output.getvalue()]), media_type="text/csv", headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
