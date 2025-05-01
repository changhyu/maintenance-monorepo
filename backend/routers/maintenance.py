from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.orm import Session
import logging
from datetime import datetime

from backend.dependencies import (
    get_db_session,
    get_maintenance_service,
    get_current_user
)
from backend.services.maintenance import MaintenanceService
from backend.core.maintenance import (
    Maintenance as MaintenanceModel,
    MaintenanceCreate,
    MaintenanceUpdate,
    MaintenanceStatus
)
from backend.models.maintenance import Maintenance

# 로거 설정
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

@router.post("/", 
    response_model=MaintenanceModel, 
    status_code=status.HTTP_201_CREATED,
    summary="정비 기록 생성",
    description="새로운 차량 정비 기록을 생성합니다."
)
async def create_maintenance(
    maintenance: MaintenanceCreate,
    service: MaintenanceService = Depends(get_maintenance_service),
    current_user: dict = Depends(get_current_user)
):
    """새로운 정비 기록 생성"""
    try:
        logger.info(f"정비 기록 생성 시도: 차량 ID={maintenance.vehicle_id}")
        result = service.create_maintenance(maintenance)
        logger.info(f"정비 기록 생성 성공: ID={result.id}")
        return result
    except Exception as e:
        logger.error(f"정비 기록 생성 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"정비 기록 생성 중 오류가 발생했습니다: {str(e)}"
        ) from e

@router.get("/{maintenance_id}", 
    response_model=MaintenanceModel,
    summary="정비 기록 조회",
    description="ID로 특정 정비 기록을 조회합니다."
)
async def get_maintenance(
    maintenance_id: str = Path(..., description="조회할 정비 기록 ID"),
    service: MaintenanceService = Depends(get_maintenance_service),
    current_user: dict = Depends(get_current_user)
):
    """정비 기록 조회"""
    logger.debug(f"정비 기록 조회: ID={maintenance_id}")
    maintenance = service.get_maintenance(maintenance_id)
    if not maintenance:
        logger.warning(f"정비 기록 찾지 못함: ID={maintenance_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="정비 기록을 찾을 수 없습니다"
        )
    return maintenance

@router.get("/", 
    response_model=List[MaintenanceModel],
    summary="정비 기록 목록 조회",
    description="필터 기준에 맞는 정비 기록 목록을 조회합니다."
)
async def get_maintenances(
    vehicle_id: Optional[str] = Query(None, description="차량 ID로 필터링"),
    status: Optional[str] = Query(None, description="상태로 필터링"),
    technician_id: Optional[str] = Query(None, description="기술자 ID로 필터링"),
    service: MaintenanceService = Depends(get_maintenance_service),
    current_user: dict = Depends(get_current_user)
):
    """정비 기록 목록 조회"""
    logger.debug(f"정비 기록 목록 조회: 차량={vehicle_id}, 상태={status}, 기술자={technician_id}")
    
    if vehicle_id:
        return service.get_maintenances_by_vehicle(vehicle_id)
    elif status:
        return service.get_maintenances_by_status(status)
    elif technician_id:
        return service.get_maintenances_by_technician(technician_id)
    else:
        # 필터 없음 - 모든 정비 기록 반환
        return service.get_all_maintenances()

@router.get("/vehicle/{vehicle_id}", 
    response_model=List[MaintenanceModel],
    summary="차량별 정비 기록 조회",
    description="특정 차량의 모든 정비 기록을 조회합니다."
)
async def get_maintenances_by_vehicle(
    vehicle_id: str = Path(..., description="차량 ID"),
    service: MaintenanceService = Depends(get_maintenance_service),
    current_user: dict = Depends(get_current_user)
):
    """차량별 정비 기록 조회"""
    logger.debug(f"차량별 정비 기록 조회: 차량={vehicle_id}")
    return service.get_maintenances_by_vehicle(vehicle_id)

@router.get("/technician/{technician_id}", 
    response_model=List[MaintenanceModel],
    summary="기술자별 정비 기록 조회",
    description="특정 기술자가 담당한 모든 정비 기록을 조회합니다."
)
async def get_maintenances_by_technician(
    technician_id: str = Path(..., description="기술자 ID"),
    service: MaintenanceService = Depends(get_maintenance_service),
    current_user: dict = Depends(get_current_user)
):
    """기술자별 정비 기록 조회"""
    logger.debug(f"기술자별 정비 기록 조회: 기술자={technician_id}")
    return service.get_maintenances_by_technician(technician_id)

@router.get("/status/{status}", 
    response_model=List[MaintenanceModel],
    summary="상태별 정비 기록 조회",
    description="특정 상태의 모든 정비 기록을 조회합니다."
)
async def get_maintenances_by_status(
    status: str = Path(..., description="정비 상태 (pending, in_progress, completed, cancelled, failed)"),
    service: MaintenanceService = Depends(get_maintenance_service),
    current_user: dict = Depends(get_current_user)
):
    """상태별 정비 기록 조회"""
    logger.debug(f"상태별 정비 기록 조회: 상태={status}")
    try:
        maintenance_status = MaintenanceStatus(status)
        return service.get_maintenances_by_status(maintenance_status)
    except ValueError:
        logger.warning(f"잘못된 정비 상태: {status}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않은 상태입니다. 유효한 값: {[s.value for s in MaintenanceStatus]}"
        )

@router.get("/date-range/", 
    response_model=List[MaintenanceModel],
    summary="기간별 정비 기록 조회",
    description="지정된 기간 내의 모든 정비 기록을 조회합니다."
)
async def get_maintenances_by_date_range(
    start_date: str = Query(..., description="시작 날짜 (YYYY-MM-DD)"),
    end_date: str = Query(..., description="종료 날짜 (YYYY-MM-DD)"),
    service: MaintenanceService = Depends(get_maintenance_service),
    current_user: dict = Depends(get_current_user)
):
    """기간별 정비 기록 조회"""
    logger.debug(f"기간별 정비 기록 조회: {start_date} ~ {end_date}")
    try:
        return service.get_maintenances_by_date_range(start_date, end_date)
    except ValueError as e:
        logger.warning(f"날짜 형식 오류: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용하세요."
        ) from e

@router.put("/{maintenance_id}", 
    response_model=MaintenanceModel,
    summary="정비 기록 업데이트",
    description="기존 정비 기록을 업데이트합니다."
)
async def update_maintenance(
    maintenance_id: str = Path(..., description="업데이트할 정비 기록 ID"),
    maintenance: MaintenanceUpdate = ...,
    service: MaintenanceService = Depends(get_maintenance_service),
    current_user: dict = Depends(get_current_user)
):
    """정비 기록 업데이트"""
    logger.info(f"정비 기록 업데이트: ID={maintenance_id}")
    try:
        updated_maintenance = service.update_maintenance(maintenance_id, maintenance)
        if not updated_maintenance:
            logger.warning(f"업데이트할 정비 기록 없음: ID={maintenance_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="정비 기록을 찾을 수 없습니다"
            )
        logger.info(f"정비 기록 업데이트 성공: ID={maintenance_id}")
        return updated_maintenance
    except Exception as e:
        logger.error(f"정비 기록 업데이트 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"정비 기록 업데이트 중 오류가 발생했습니다: {str(e)}"
        ) from e

@router.delete("/{maintenance_id}", 
    status_code=status.HTTP_204_NO_CONTENT,
    summary="정비 기록 삭제",
    description="기존 정비 기록을 삭제합니다."
)
async def delete_maintenance(
    maintenance_id: str = Path(..., description="삭제할 정비 기록 ID"),
    service: MaintenanceService = Depends(get_maintenance_service),
    current_user: dict = Depends(get_current_user)
):
    """정비 기록 삭제"""
    logger.info(f"정비 기록 삭제: ID={maintenance_id}")
    try:
        success = service.delete_maintenance(maintenance_id)
        if not success:
            logger.warning(f"삭제할 정비 기록 없음: ID={maintenance_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="정비 기록을 찾을 수 없습니다"
            )
        logger.info(f"정비 기록 삭제 성공: ID={maintenance_id}")
    except Exception as e:
        logger.error(f"정비 기록 삭제 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"정비 기록 삭제 중 오류가 발생했습니다: {str(e)}"
        ) from e 