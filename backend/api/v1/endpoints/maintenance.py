from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, Body, Path as FastAPIPath
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import os
import sys
from datetime import datetime, date
from pathlib import Path as FilePath

from backend.core.config import settings
from backend.db.session import get_db
from backend.core.auth import get_current_active_user, permission_required
from backend.models.user import User
from backend.models.vehicle import Vehicle, VehicleStatus
from backend.models.maintenance_record import MaintenanceRecord, MaintenanceStatus
from backend.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse, VehicleListResponse, VehicleDetailFinanceResponse, VehicleDetailWithFinance
from backend.schemas.maintenance_record import (
    MaintenanceRecordCreate, 
    MaintenanceRecordUpdate, 
    MaintenanceRecordResponse,
    MaintenanceRecordListResponse,
    MaintenanceRecordDetailResponse,
    VehicleHistoryResponse,
    MaintenanceStatsResponse
)
# 정비소, 정비사, 부품 스키마 import 추가
from backend.schemas.shop import ShopCreate, ShopUpdate, ShopResponse, ShopListResponse, ShopDetailResponse
from backend.schemas.technician import TechnicianCreate, TechnicianUpdate, TechnicianResponse, TechnicianListResponse, TechnicianDetailResponse
from backend.schemas.part import PartCreate, PartUpdate, PartResponse, PartListResponse, PartDetailResponse
from backend.repositories import maintenance as maintenance_repo

# 상수 정의
ERROR_MSG_RECORD_NOT_FOUND = "정비 기록 ID {record_id}를 찾을 수 없습니다."
ERROR_MSG_VEHICLE_NOT_FOUND = "차량 ID {vehicle_id}를 찾을 수 없습니다."
ERROR_MSG_INVALID_DATE_FORMAT = "유효하지 않은 {date_type} 형식입니다. YYYY-MM-DD 형식을 사용하세요."
MAINTENANCE_RECORD_ID = "정비 기록 ID"
VEHICLE_ID = "차량 ID"

# 통합 API 라우터 
router = APIRouter(prefix="/maintenance", tags=["차량 정비"])

# 차량 목록 조회 API
@router.get("/vehicles", response_model=VehicleListResponse, summary="차량 목록 조회")
async def get_vehicles(
    status: Optional[str] = Query(None, description="상태로 필터링 (AVAILABLE, MAINTENANCE, REPAIR, OUT_OF_SERVICE)"),
    skip: int = Query(0, ge=0, description="건너뛸 결과 수"),
    limit: int = Query(100, ge=1, le=100, description="최대 결과 수"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    등록된 차량 목록을 조회합니다.
    """
    vehicles = maintenance_repo.get_vehicles(db, skip=skip, limit=limit, status=status)
    
    return {
        "success": True,
        "message": "차량 목록을 성공적으로 조회했습니다",
        "count": len(vehicles),
        "data": vehicles
    }

# 정비 기록 목록 조회 API
@router.get("/records", response_model=MaintenanceRecordListResponse, summary="정비 기록 목록 조회")
async def get_maintenance_records(
    vehicle_id: Optional[int] = Query(None, description="차량 ID로 필터링"),
    status: Optional[str] = Query(None, description="상태로 필터링 (PENDING, IN_PROGRESS, COMPLETED, CANCELED)"),
    skip: int = Query(0, ge=0, description="건너뛸 결과 수"),
    limit: int = Query(100, ge=1, le=100, description="최대 결과 수"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    정비 기록 목록을 조회합니다.
    """
    records = maintenance_repo.get_maintenance_records(
        db, skip=skip, limit=limit, vehicle_id=vehicle_id, status=status
    )
    
    # 응답 데이터 변환
    record_responses = []
    for record in records:
        record_dict = MaintenanceRecordResponse.from_orm(record)
        
        # 차량 정보 추가
        if record.vehicle:
            record_dict.vehicle_info = {
                "make": record.vehicle.make,
                "model": record.vehicle.model,
                "year": record.vehicle.year,
                "type": record.vehicle.type,
                "color": record.vehicle.color
            }
        
        record_responses.append(record_dict)
    
    return {
        "success": True,
        "message": "정비 기록 목록을 성공적으로 조회했습니다",
        "count": len(records),
        "data": record_responses
    }

# 정비 기록 상세 조회 API
@router.get("/records/{record_id}", response_model=MaintenanceRecordDetailResponse, summary="정비 기록 상세 조회")
async def get_maintenance_record_detail(
    record_id: int = FastAPIPath(..., description=MAINTENANCE_RECORD_ID),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 정비 기록의 상세 정보를 조회합니다.
    """
    record = maintenance_repo.get_maintenance_record(db, record_id)
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MSG_RECORD_NOT_FOUND.format(record_id=record_id)
        )
    
    # 응답 데이터 변환
    record_response = MaintenanceRecordResponse.from_orm(record)
    
    # 차량 정보 추가
    if record.vehicle:
        record_response.vehicle_info = {
            "make": record.vehicle.make,
            "model": record.vehicle.model,
            "year": record.vehicle.year,
            "type": record.vehicle.type,
            "color": record.vehicle.color
        }
    
    return {
        "success": True,
        "message": "정비 기록을 성공적으로 조회했습니다",
        "data": record_response
    }

# 새로운 정비 기록 생성 API
@router.post("/records", response_model=MaintenanceRecordDetailResponse, summary="정비 기록 생성", status_code=status.HTTP_201_CREATED)
async def create_maintenance_record(
    record_data: MaintenanceRecordCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    새로운 정비 기록을 생성합니다.
    """
    # 차량 존재 여부 확인
    vehicle = maintenance_repo.get_vehicle(db, record_data.vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MSG_VEHICLE_NOT_FOUND.format(vehicle_id=record_data.vehicle_id)
        )
    
    # 정비 기록 생성
    new_record = maintenance_repo.create_maintenance_record(
        db=db, record=record_data, user_id=current_user.id
    )
    
    # 응답 데이터 변환
    record_response = MaintenanceRecordResponse.from_orm(new_record)
    
    # 차량 정보 추가
    record_response.vehicle_info = {
        "make": vehicle.make,
        "model": vehicle.model,
        "year": vehicle.year,
        "type": vehicle.type,
        "color": vehicle.color
    }
    
    return {
        "success": True,
        "message": "정비 기록이 성공적으로 생성되었습니다",
        "data": record_response
    }

# 정비 기록 업데이트 API
@router.put("/records/{record_id}", response_model=MaintenanceRecordDetailResponse, summary="정비 기록 업데이트")
async def update_maintenance_record(
    record_id: int = FastAPIPath(..., description=MAINTENANCE_RECORD_ID),
    record_data: MaintenanceRecordUpdate = Body(..., description="수정할 정비 기록 데이터"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    기존 정비 기록을 업데이트합니다.
    """
    # 정비 기록 업데이트
    updated_record = maintenance_repo.update_maintenance_record(
        db=db, record_id=record_id, record=record_data, user_id=current_user.id
    )
    
    if not updated_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MSG_RECORD_NOT_FOUND.format(record_id=record_id)
        )
    
    # 응답 데이터 변환
    record_response = MaintenanceRecordResponse.from_orm(updated_record)
    
    # 차량 정보 추가
    if updated_record.vehicle:
        record_response.vehicle_info = {
            "make": updated_record.vehicle.make,
            "model": updated_record.vehicle.model,
            "year": updated_record.vehicle.year,
            "type": updated_record.vehicle.type,
            "color": updated_record.vehicle.color
        }
    
    return {
        "success": True,
        "message": f"정비 기록 ID {record_id}가 성공적으로 업데이트되었습니다",
        "data": record_response
    }

# 정비 기록 삭제 API
@router.delete("/records/{record_id}", summary="정비 기록 삭제")
async def delete_maintenance_record(
    record_id: int = FastAPIPath(..., description=MAINTENANCE_RECORD_ID),
    current_user: User = Depends(permission_required("maintenance:delete")),
    db: Session = Depends(get_db)
):
    """
    정비 기록을 삭제합니다.
    """
    success = maintenance_repo.delete_maintenance_record(db, record_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MSG_RECORD_NOT_FOUND.format(record_id=record_id)
        )
    
    return {
        "success": True,
        "message": f"정비 기록 ID {record_id}가 성공적으로 삭제되었습니다",
        "data": {
            "id": record_id,
            "deleted_at": datetime.now().isoformat(),
            "deleted_by": current_user.email
        }
    }

# 차량별 정비 이력 조회 API
@router.get("/vehicles/{vehicle_id}/history", response_model=VehicleHistoryResponse, summary="차량별 정비 이력 조회")
async def get_vehicle_maintenance_history(
    vehicle_id: int = FastAPIPath(..., description=VEHICLE_ID),
    from_date: Optional[str] = Query(None, description="특정 날짜부터 조회 (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="특정 날짜까지 조회 (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 차량의 정비 이력을 조회합니다.
    """
    # 차량 존재 여부 확인
    vehicle = maintenance_repo.get_vehicle(db, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MSG_VEHICLE_NOT_FOUND.format(vehicle_id=vehicle_id)
        )
    
    # 날짜 필터링 파라미터 처리
    from_datetime = None
    to_datetime = None
    
    if from_date:
        try:
            from_datetime = datetime.fromisoformat(from_date + "T00:00:00")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ERROR_MSG_INVALID_DATE_FORMAT.format(date_type="from_date")
            )
    
    if to_date:
        try:
            to_datetime = datetime.fromisoformat(to_date + "T23:59:59")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ERROR_MSG_INVALID_DATE_FORMAT.format(date_type="to_date")
            )
    
    # 정비 이력 및 통계 조회
    records, yearly_stats, monthly_stats = maintenance_repo.get_vehicle_maintenance_history(
        db=db, 
        vehicle_id=vehicle_id, 
        from_date=from_datetime, 
        to_date=to_datetime
    )
    
    # 응답 데이터 포맷팅
    vehicle_info = {
        "id": vehicle.id,
        "make": vehicle.make,
        "model": vehicle.model,
        "year": vehicle.year,
        "type": vehicle.type,
        "color": vehicle.color,
        "status": vehicle.status
    }
    
    record_responses = []
    for record in records:
        record_dict = {
            "id": record.id,
            "description": record.description,
            "details": record.details,
            "date": record.date.isoformat(),
            "completion_date": record.completion_date.isoformat() if record.completion_date else None,
            "status": record.status,
            "technician": record.technician,
            "cost": record.cost
        }
        record_responses.append(record_dict)
    
    return {
        "success": True,
        "message": f"차량 ID {vehicle_id}의 정비 이력을 성공적으로 조회했습니다",
        "data": {
            "vehicle_id": vehicle_id,
            "vehicle_info": vehicle_info,
            "maintenance_count": len(records),
            "records": record_responses,
            "statistics": {
                "yearly": yearly_stats,
                "monthly": monthly_stats
            }
        }
    }

# 정비 통계 API
@router.get("/statistics", response_model=MaintenanceStatsResponse, summary="정비 통계 조회")
async def get_maintenance_statistics(
    period: str = Query("month", description="통계 기간 (day, month, year)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    정비 통계 정보를 조회합니다.
    """
    if period not in ["day", "month", "year"]:
        period = "month"  # 기본값은 월별 통계
    
    statistics = maintenance_repo.get_maintenance_statistics(db=db, period=period)
    
    return {
        "success": True,
        "message": f"{period} 단위 정비 통계를 성공적으로 조회했습니다",
        "period": period,
        "data": statistics
    }

# 차량 생성 API
@router.post("/vehicles", response_model=VehicleListResponse, summary="차량 등록", status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    current_user: User = Depends(permission_required("vehicle:create")),
    db: Session = Depends(get_db)
):
    """
    새로운 차량을 등록합니다.
    """
    new_vehicle = maintenance_repo.create_vehicle(db=db, vehicle=vehicle_data)
    
    return {
        "success": True,
        "message": "차량이 성공적으로 등록되었습니다",
        "count": 1,
        "data": [new_vehicle]
    }

# 차량 정보 업데이트 API
@router.put("/vehicles/{vehicle_id}", response_model=VehicleListResponse, summary="차량 정보 업데이트")
async def update_vehicle(
    vehicle_id: int = FastAPIPath(..., description=VEHICLE_ID),
    vehicle_data: VehicleUpdate = Body(..., description="수정할 차량 정보"),
    current_user: User = Depends(permission_required("vehicle:update")),
    db: Session = Depends(get_db)
):
    """
    기존 차량 정보를 업데이트합니다.
    """
    updated_vehicle = maintenance_repo.update_vehicle(db=db, vehicle_id=vehicle_id, vehicle=vehicle_data)
    
    if not updated_vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MSG_VEHICLE_NOT_FOUND.format(vehicle_id=vehicle_id)
        )
    
    return {
        "success": True,
        "message": f"차량 ID {vehicle_id}의 정보가 성공적으로 업데이트되었습니다",
        "count": 1,
        "data": [updated_vehicle]
    }

# 차량 삭제 API
@router.delete("/vehicles/{vehicle_id}", summary="차량 삭제")
async def delete_vehicle(
    vehicle_id: int = FastAPIPath(..., description=VEHICLE_ID),
    current_user: User = Depends(permission_required("vehicle:delete")),
    db: Session = Depends(get_db)
):
    """
    차량을 삭제합니다.
    """
    success = maintenance_repo.delete_vehicle(db, vehicle_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MSG_VEHICLE_NOT_FOUND.format(vehicle_id=vehicle_id)
        )
    
    return {
        "success": True,
        "message": f"차량 ID {vehicle_id}가 성공적으로 삭제되었습니다",
        "data": {
            "id": vehicle_id,
            "deleted_at": datetime.now().isoformat(),
            "deleted_by": current_user.email
        }
    }

# 차량 재무 정보 조회 API
@router.get("/vehicles/{vehicle_id}/finance", response_model=VehicleDetailFinanceResponse, summary="차량 재무 정보 조회")
async def get_vehicle_finance(
    vehicle_id: int = FastAPIPath(..., description=VEHICLE_ID),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 차량의 재무 정보를 조회합니다.
    
    - 구매 및 판매 정보
    - 감가상각 및 현재 가치
    - 정비 비용 요약
    - 투자 수익률(ROI)
    - 보험 정보
    """
    # 차량 존재 여부 확인
    vehicle = maintenance_repo.get_vehicle(db, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MSG_VEHICLE_NOT_FOUND.format(vehicle_id=vehicle_id)
        )
    
    # 차량 재무 정보 및 정비 요약 정보 조회
    finance_data = maintenance_repo.get_vehicle_finance_summary(db, vehicle_id)
    if not finance_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"차량 ID {vehicle_id}의 재무 정보를 찾을 수 없습니다."
        )
    
    # 응답 데이터 준비
    vehicle_data = VehicleResponse.from_orm(vehicle)
    vehicle_with_finance = VehicleDetailWithFinance(
        **vehicle_data.dict(),
        finance_summary=finance_data["finance_summary"],
        maintenance_summary=finance_data["maintenance_summary"]
    )
    
    return {
        "success": True,
        "message": f"차량 ID {vehicle_id}의 재무 정보를 성공적으로 조회했습니다",
        "data": vehicle_with_finance
    }

# 차량 재무 정보 업데이트 API
@router.put("/vehicles/{vehicle_id}/finance", response_model=VehicleResponse, summary="차량 재무 정보 업데이트")
async def update_vehicle_finance(
    vehicle_id: int = FastAPIPath(..., description=VEHICLE_ID),
    finance_data: Dict[str, Any] = Body(..., description="재무 정보 업데이트 데이터"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 차량의 재무 정보를 업데이트합니다.
    
    업데이트할 수 있는 필드:
    - purchase_price: 구매 가격
    - purchase_date: 구매 일자
    - sale_price: 판매 가격
    - sale_date: 판매 일자
    - depreciation_rate: 감가상각률
    - current_value: 현재 가치
    - finance_notes: 재무 관련 메모
    - insurance_cost: 보험 비용
    - insurance_expiry: 보험 만료일
    - calculate_current_value: 현재 가치를 자동 계산할지 여부 (Boolean)
    """
    # 차량 존재 여부 확인
    vehicle = maintenance_repo.get_vehicle(db, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MSG_VEHICLE_NOT_FOUND.format(vehicle_id=vehicle_id)
        )
    
    # 재무 정보 업데이트
    updated_vehicle = maintenance_repo.update_vehicle_finance_info(db, vehicle_id, finance_data)
    if not updated_vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"차량 ID {vehicle_id}의 재무 정보를 업데이트할 수 없습니다."
        )
    
    return {
        "success": True,
        "message": f"차량 ID {vehicle_id}의 재무 정보가 성공적으로 업데이트되었습니다",
        "data": updated_vehicle
    }

# 플릿(전체 차량) 재무 요약 API
@router.get("/fleet/finance", summary="플릿 재무 요약")
async def get_fleet_finance_summary(
    current_user: User = Depends(permission_required("vehicle:read")),
    db: Session = Depends(get_db)
):
    """
    전체 차량 플릿에 대한 재무 요약 정보를 조회합니다.
    
    반환 정보:
    - 전체 차량 수
    - 현재 보유 차량 수
    - 판매된 차량 수
    - 총 구매 가치
    - 총 현재 가치
    - 총 판매 가치
    - 총 정비 비용
    - 평균 투자 수익률(ROI)
    - 총 감가상각 금액 및 비율
    """
    # 플릿 재무 요약 정보 조회
    fleet_summary = maintenance_repo.get_fleet_finance_summary(db)
    
    return {
        "success": True,
        "message": "플릿 재무 요약 정보를 성공적으로 조회했습니다",
        "data": fleet_summary
    }

# 차량 판매 API
@router.put("/vehicles/{vehicle_id}/sell", response_model=VehicleResponse, summary="차량 판매 등록")
async def sell_vehicle(
    vehicle_id: int = FastAPIPath(..., description=VEHICLE_ID),
    sale_data: Dict[str, Any] = Body(..., description="판매 정보", examples={
        "default": {
            "summary": "기본 판매 정보",
            "value": {
                "sale_price": 15000000,
                "sale_date": "2025-04-29",
                "notes": "개인 판매, 완전 정비 후 판매"
            }
        }
    }),
    current_user: User = Depends(permission_required("vehicle:update")),
    db: Session = Depends(get_db)
):
    """
    차량 판매 정보를 등록합니다.
    
    필수 필드:
    - sale_price: 판매 가격
    - sale_date: 판매 일자
    
    선택적 필드:
    - notes: 판매 관련 메모
    """
    # 차량 존재 여부 확인
    vehicle = maintenance_repo.get_vehicle(db, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MSG_VEHICLE_NOT_FOUND.format(vehicle_id=vehicle_id)
        )
    
    # 필수 필드 확인
    if 'sale_price' not in sale_data or 'sale_date' not in sale_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="판매 가격(sale_price)과 판매 일자(sale_date)는 필수 항목입니다."
        )
    
    # 판매일 형식 확인 및 변환
    try:
        if isinstance(sale_data['sale_date'], str):
            sale_data['sale_date'] = date.fromisoformat(sale_data['sale_date'])
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="판매 일자 형식이 잘못되었습니다. YYYY-MM-DD 형식을 사용하세요."
        )
    
    # 재무 정보 업데이트
    finance_data = {
        "sale_price": sale_data['sale_price'],
        "sale_date": sale_data['sale_date'],
        "status": VehicleStatus.SOLD
    }
    
    # 메모가 있으면 추가
    if 'notes' in sale_data:
        finance_data["finance_notes"] = sale_data['notes']
    
    updated_vehicle = maintenance_repo.update_vehicle_finance_info(db, vehicle_id, finance_data)
    if not updated_vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"차량 ID {vehicle_id}의 판매 정보를 업데이트할 수 없습니다."
        )
    
    # ROI 계산
    roi = updated_vehicle.calculate_roi()
    roi_percent = f"{roi * 100:.2f}%" if roi is not None else "N/A"
    
    return {
        "success": True,
        "message": f"차량 ID {vehicle_id}가 성공적으로 판매 처리되었습니다. 투자 수익률(ROI): {roi_percent}",
        "data": updated_vehicle
    }

# 구매 예정 차량의 예상 감가상각 계산 API
@router.post("/vehicles/depreciation-forecast", summary="차량 감가상각 예측")
async def calculate_depreciation_forecast(
    forecast_data: Dict[str, Any] = Body(..., description="예측 정보", examples={
        "default": {
            "summary": "기본 감가상각 예측 정보",
            "value": {
                "purchase_price": 30000000,
                "purchase_date": "2025-05-15",
                "years": 5,
                "depreciation_rate": 0.15
            }
        }
    }),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    구매 예정 차량에 대한 향후 감가상각 예측 정보를 계산합니다.
    
    필수 필드:
    - purchase_price: 구매 예정 가격
    - purchase_date: 구매 예정 일자
    
    선택적 필드:
    - years: 예측 기간 (연 단위, 기본값: 5)
    - depreciation_rate: 연간 감가상각률 (기본값: 0.15, 즉 15%)
    """
    # 필수 필드 확인
    if 'purchase_price' not in forecast_data or 'purchase_date' not in forecast_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="구매 가격(purchase_price)과 구매 일자(purchase_date)는 필수 항목입니다."
        )
    
    # 구매일 형식 확인 및 변환
    try:
        if isinstance(forecast_data['purchase_date'], str):
            purchase_date = date.fromisoformat(forecast_data['purchase_date'])
        else:
            purchase_date = forecast_data['purchase_date']
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="구매 일자 형식이 잘못되었습니다. YYYY-MM-DD 형식을 사용하세요."
        )
    
    # 기본값 설정
    purchase_price = forecast_data['purchase_price']
    years = forecast_data.get('years', 5)
    depreciation_rate = forecast_data.get('depreciation_rate', 0.15)
    
    # 감가상각 예측 계산
    depreciation_forecast = []
    for year in range(years + 1):
        # 해당 연도의 가치 계산
        value_factor = (1 - depreciation_rate) ** year
        year_value = purchase_price * value_factor
        
        # 예측 날짜 (구매일로부터 N년 후)
        forecast_date = date(
            purchase_date.year + year,
            purchase_date.month,
            purchase_date.day
        )
        
        depreciation_forecast.append({
            "year": year,
            "date": forecast_date.isoformat(),
            "value": year_value,
            "depreciation_amount": purchase_price - year_value,
            "depreciation_percentage": (1 - value_factor) * 100
        })
    
    return {
        "success": True,
        "message": f"{years}년 동안의 감가상각 예측 정보가 계산되었습니다",
        "data": {
            "purchase_price": purchase_price,
            "purchase_date": purchase_date.isoformat(),
            "depreciation_rate": depreciation_rate,
            "forecast_years": years,
            "forecast": depreciation_forecast
        }
    }

# 정비소 목록 조회 API
@router.get("/shops", response_model=ShopListResponse, summary="정비소 목록 조회")
async def get_shops(
    skip: int = Query(0, ge=0, description="건너뛸 결과 수"),
    limit: int = Query(100, ge=1, le=100, description="최대 결과 수"),
    name: Optional[str] = Query(None, description="정비소 이름으로 필터링"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    등록된 정비소 목록을 조회합니다.
    """
    from backend.repositories.shop import get_shops
    shops = get_shops(db=db, skip=skip, limit=limit, name=name)
    
    return {
        "success": True,
        "message": "정비소 목록을 성공적으로 조회했습니다",
        "count": len(shops),
        "data": shops
    }

# 정비소 상세 조회 API
@router.get("/shops/{shop_id}", response_model=ShopDetailResponse, summary="정비소 상세 조회")
async def get_shop_details(
    shop_id: int = FastAPIPath(..., description="정비소 ID"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 정비소의 상세 정보를 조회합니다.
    """
    from backend.repositories.shop import get_shop
    shop = get_shop(db=db, shop_id=shop_id)
    
    if not shop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"정비소 ID {shop_id}를 찾을 수 없습니다."
        )
    
    return {
        "success": True,
        "message": "정비소 정보를 성공적으로 조회했습니다",
        "data": shop
    }

# 정비소 생성 API
@router.post("/shops", response_model=ShopDetailResponse, summary="정비소 등록", status_code=status.HTTP_201_CREATED)
async def create_shop(
    shop_data: ShopCreate = Body(..., description="정비소 생성 정보"),
    current_user: User = Depends(permission_required("shop:create")),
    db: Session = Depends(get_db)
):
    """
    새로운 정비소를 등록합니다.
    """
    from backend.repositories.shop import create_shop
    new_shop = create_shop(db=db, shop=shop_data)
    
    return {
        "success": True,
        "message": "정비소가 성공적으로 등록되었습니다",
        "data": new_shop
    }

# 정비소 업데이트 API
@router.put("/shops/{shop_id}", response_model=ShopDetailResponse, summary="정비소 정보 업데이트")
async def update_shop_info(
    shop_id: int = FastAPIPath(..., description="정비소 ID"),
    shop_data: ShopUpdate = Body(..., description="수정할 정비소 정보"),
    current_user: User = Depends(permission_required("shop:update")),
    db: Session = Depends(get_db)
):
    """
    기존 정비소 정보를 업데이트합니다.
    """
    from backend.repositories.shop import update_shop
    updated_shop = update_shop(db=db, shop_id=shop_id, shop=shop_data)
    
    if not updated_shop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"정비소 ID {shop_id}를 찾을 수 없습니다."
        )
    
    return {
        "success": True,
        "message": f"정비소 ID {shop_id}의 정보가 성공적으로 업데이트되었습니다",
        "data": updated_shop
    }

# 정비소 삭제 API
@router.delete("/shops/{shop_id}", summary="정비소 삭제")
async def delete_shop_info(
    shop_id: int = FastAPIPath(..., description="정비소 ID"),
    current_user: User = Depends(permission_required("shop:delete")),
    db: Session = Depends(get_db)
):
    """
    정비소를 삭제합니다.
    """
    from backend.repositories.shop import delete_shop
    success = delete_shop(db=db, shop_id=shop_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"정비소 ID {shop_id}를 찾을 수 없습니다."
        )
    
    return {
        "success": True,
        "message": f"정비소 ID {shop_id}가 성공적으로 삭제되었습니다",
        "data": {
            "id": shop_id,
            "deleted_at": datetime.now().isoformat(),
            "deleted_by": current_user.email
        }
    }

# 정비사 목록 조회 API
@router.get("/technicians", response_model=TechnicianListResponse, summary="정비사 목록 조회")
async def get_technicians(
    skip: int = Query(0, ge=0, description="건너뛸 결과 수"),
    limit: int = Query(100, ge=1, le=100, description="최대 결과 수"),
    name: Optional[str] = Query(None, description="정비사 이름으로 필터링"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    등록된 정비사 목록을 조회합니다.
    """
    from backend.repositories.technician import get_technicians
    technicians = get_technicians(db=db, skip=skip, limit=limit, name=name)
    
    # 응답 데이터 변환
    technician_responses = []
    for tech in technicians:
        tech_dict = TechnicianResponse.from_orm(tech)
        
        # 정비소 정보 추가
        if tech.shop:
            tech_dict.shop_info = {
                "id": tech.shop.id,
                "name": tech.shop.name,
                "address": tech.shop.address,
                "city": tech.shop.city
            }
        
        technician_responses.append(tech_dict)
    
    return {
        "success": True,
        "message": "정비사 목록을 성공적으로 조회했습니다",
        "count": len(technicians),
        "data": technician_responses
    }

# 정비사 상세 조회 API
@router.get("/technicians/{technician_id}", response_model=TechnicianDetailResponse, summary="정비사 상세 조회")
async def get_technician_details(
    technician_id: int = FastAPIPath(..., description="정비사 ID"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 정비사의 상세 정보를 조회합니다.
    """
    from backend.repositories.technician import get_technician
    technician = get_technician(db=db, technician_id=technician_id)
    
    if not technician:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"정비사 ID {technician_id}를 찾을 수 없습니다."
        )
    
    # 응답 데이터 준비
    tech_response = TechnicianResponse.from_orm(technician)
    
    # 정비소 정보 추가
    if technician.shop:
        tech_response.shop_info = {
            "id": technician.shop.id,
            "name": technician.shop.name,
            "address": technician.shop.address,
            "city": technician.shop.city
        }
    
    return {
        "success": True,
        "message": "정비사 정보를 성공적으로 조회했습니다",
        "data": tech_response
    }

# 정비사 생성 API
@router.post("/technicians", response_model=TechnicianDetailResponse, summary="정비사 등록", status_code=status.HTTP_201_CREATED)
async def create_technician(
    technician_data: TechnicianCreate = Body(..., description="정비사 생성 정보"),
    current_user: User = Depends(permission_required("technician:create")),
    db: Session = Depends(get_db)
):
    """
    새로운 정비사를 등록합니다.
    """
    # 정비소 존재 확인
    from backend.repositories.shop import get_shop
    shop = get_shop(db=db, shop_id=technician_data.shop_id)
    if not shop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"정비소 ID {technician_data.shop_id}를 찾을 수 없습니다."
        )
    
    from backend.repositories.technician import create_technician
    new_technician = create_technician(db=db, technician=technician_data)
    
    # 응답 데이터 준비
    tech_response = TechnicianResponse.from_orm(new_technician)
    
    # 정비소 정보 추가
    tech_response.shop_info = {
        "id": shop.id,
        "name": shop.name,
        "address": shop.address,
        "city": shop.city
    }
    
    return {
        "success": True,
        "message": "정비사가 성공적으로 등록되었습니다",
        "data": tech_response
    }

# 정비사 업데이트 API
@router.put("/technicians/{technician_id}", response_model=TechnicianDetailResponse, summary="정비사 정보 업데이트")
async def update_technician_info(
    technician_id: int = FastAPIPath(..., description="정비사 ID"),
    technician_data: TechnicianUpdate = Body(..., description="수정할 정비사 정보"),
    current_user: User = Depends(permission_required("technician:update")),
    db: Session = Depends(get_db)
):
    """
    기존 정비사 정보를 업데이트합니다.
    """
    # 정비소 변경 시 존재 확인
    if technician_data.shop_id:
        from backend.repositories.shop import get_shop
        shop = get_shop(db=db, shop_id=technician_data.shop_id)
        if not shop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"정비소 ID {technician_data.shop_id}를 찾을 수 없습니다."
            )
    
    from backend.repositories.technician import update_technician, get_technician
    updated_technician = update_technician(db=db, technician_id=technician_id, technician=technician_data)
    
    if not updated_technician:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"정비사 ID {technician_id}를 찾을 수 없습니다."
        )
    
    # 응답 데이터 준비
    tech_response = TechnicianResponse.from_orm(updated_technician)
    
    # 정비소 정보 추가
    if updated_technician.shop:
        tech_response.shop_info = {
            "id": updated_technician.shop.id,
            "name": updated_technician.shop.name,
            "address": updated_technician.shop.address,
            "city": updated_technician.shop.city
        }
    
    return {
        "success": True,
        "message": f"정비사 ID {technician_id}의 정보가 성공적으로 업데이트되었습니다",
        "data": tech_response
    }

# 정비사 삭제 API
@router.delete("/technicians/{technician_id}", summary="정비사 삭제")
async def delete_technician_info(
    technician_id: int = FastAPIPath(..., description="정비사 ID"),
    current_user: User = Depends(permission_required("technician:delete")),
    db: Session = Depends(get_db)
):
    """
    정비사를 삭제합니다.
    """
    from backend.repositories.technician import delete_technician
    success = delete_technician(db=db, technician_id=technician_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"정비사 ID {technician_id}를 찾을 수 없습니다."
        )
    
    return {
        "success": True,
        "message": f"정비사 ID {technician_id}가 성공적으로 삭제되었습니다",
        "data": {
            "id": technician_id,
            "deleted_at": datetime.now().isoformat(),
            "deleted_by": current_user.email
        }
    }

# 정비소별 정비사 목록 API
@router.get("/shops/{shop_id}/technicians", response_model=TechnicianListResponse, summary="정비소별 정비사 목록")
async def get_shop_technicians(
    shop_id: int = FastAPIPath(..., description="정비소 ID"),
    skip: int = Query(0, ge=0, description="건너뛸 결과 수"),
    limit: int = Query(100, ge=1, le=100, description="최대 결과 수"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 정비소에 소속된 정비사 목록을 조회합니다.
    """
    # 정비소 존재 확인
    from backend.repositories.shop import get_shop
    shop = get_shop(db=db, shop_id=shop_id)
    if not shop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"정비소 ID {shop_id}를 찾을 수 없습니다."
        )
        
    from backend.repositories.technician import get_technicians_by_shop
    technicians = get_technicians_by_shop(db=db, shop_id=shop_id, skip=skip, limit=limit)
    
    # 응답 데이터 준비
    technician_responses = []
    for tech in technicians:
        tech_dict = TechnicianResponse.from_orm(tech)
        tech_dict.shop_info = {
            "id": shop.id,
            "name": shop.name,
            "address": shop.address,
            "city": shop.city
        }
        technician_responses.append(tech_dict)
    
    return {
        "success": True,
        "message": f"정비소 ID {shop_id}의 정비사 목록을 성공적으로 조회했습니다",
        "count": len(technicians),
        "data": technician_responses
    }

# 부품 목록 조회 API
@router.get("/parts", response_model=PartListResponse, summary="부품 목록 조회")
async def get_parts(
    skip: int = Query(0, ge=0, description="건너뛸 결과 수"),
    limit: int = Query(100, ge=1, le=100, description="최대 결과 수"),
    name: Optional[str] = Query(None, description="부품 이름으로 필터링"),
    part_number: Optional[str] = Query(None, description="부품 번호로 필터링"),
    category: Optional[str] = Query(None, description="카테고리로 필터링"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    등록된 부품 목록을 조회합니다.
    """
    from backend.repositories.part import get_parts
    parts = get_parts(db=db, skip=skip, limit=limit, name=name, part_number=part_number, category=category)
    
    return {
        "success": True,
        "message": "부품 목록을 성공적으로 조회했습니다",
        "count": len(parts),
        "data": parts
    }

# 부품 상세 조회 API
@router.get("/parts/{part_id}", response_model=PartDetailResponse, summary="부품 상세 조회")
async def get_part_details(
    part_id: int = FastAPIPath(..., description="부품 ID"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 부품의 상세 정보를 조회합니다.
    """
    from backend.repositories.part import get_part
    part = get_part(db=db, part_id=part_id)
    
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"부품 ID {part_id}를 찾을 수 없습니다."
        )
    
    return {
        "success": True,
        "message": "부품 정보를 성공적으로 조회했습니다",
        "data": part
    }

# 부품 생성 API
@router.post("/parts", response_model=PartDetailResponse, summary="부품 등록", status_code=status.HTTP_201_CREATED)
async def create_part(
    part_data: PartCreate = Body(..., description="부품 생성 정보"),
    current_user: User = Depends(permission_required("part:create")),
    db: Session = Depends(get_db)
):
    """
    새로운 부품을 등록합니다.
    """
    from backend.repositories.part import get_part_by_number, create_part
    
    # 중복 부품 번호 확인
    existing_part = get_part_by_number(db=db, part_number=part_data.part_number)
    if existing_part:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"부품 번호 {part_data.part_number}는 이미 사용 중입니다."
        )
    
    new_part = create_part(db=db, part=part_data)
    
    return {
        "success": True,
        "message": "부품이 성공적으로 등록되었습니다",
        "data": new_part
    }

# 부품 업데이트 API
@router.put("/parts/{part_id}", response_model=PartDetailResponse, summary="부품 정보 업데이트")
async def update_part_info(
    part_id: int = FastAPIPath(..., description="부품 ID"),
    part_data: PartUpdate = Body(..., description="수정할 부품 정보"),
    current_user: User = Depends(permission_required("part:update")),
    db: Session = Depends(get_db)
):
    """
    기존 부품 정보를 업데이트합니다.
    """
    from backend.repositories.part import update_part
    updated_part = update_part(db=db, part_id=part_id, part=part_data)
    
    if not updated_part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"부품 ID {part_id}를 찾을 수 없습니다."
        )
    
    return {
        "success": True,
        "message": f"부품 ID {part_id}의 정보가 성공적으로 업데이트되었습니다",
        "data": updated_part
    }

# 부품 삭제 API
@router.delete("/parts/{part_id}", summary="부품 삭제")
async def delete_part_info(
    part_id: int = FastAPIPath(..., description="부품 ID"),
    current_user: User = Depends(permission_required("part:delete")),
    db: Session = Depends(get_db)
):
    """
    부품을 삭제합니다.
    """
    from backend.repositories.part import delete_part
    success = delete_part(db=db, part_id=part_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"부품 ID {part_id}를 찾을 수 없습니다."
        )
    
    return {
        "success": True,
        "message": f"부품 ID {part_id}가 성공적으로 삭제되었습니다",
        "data": {
            "id": part_id,
            "deleted_at": datetime.now().isoformat(),
            "deleted_by": current_user.email
        }
    }

# 부품 재고 업데이트 API
@router.patch("/parts/{part_id}/stock", response_model=PartDetailResponse, summary="부품 재고 업데이트")
async def update_part_stock(
    part_id: int = FastAPIPath(..., description="부품 ID"),
    quantity: int = Body(..., description="변경할 수량 (양수: 입고, 음수: 출고)"),
    current_user: User = Depends(permission_required("part:update-stock")),
    db: Session = Depends(get_db)
):
    """
    부품의 재고를 업데이트합니다.
    """
    from backend.repositories.part import update_part_stock
    updated_part = update_part_stock(db=db, part_id=part_id, quantity=quantity)
    
    if not updated_part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"부품 ID {part_id}를 찾을 수 없습니다."
        )
    
    # 재고 변동 메시지 생성
    action = "입고" if quantity > 0 else "출고"
    quantity_abs = abs(quantity)
    
    return {
        "success": True,
        "message": f"부품 ID {part_id}의 재고가 {quantity_abs}개 {action}되었습니다",
        "data": updated_part
    }