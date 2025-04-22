"""
Vehicle API router.
"""

from typing import Any, Dict, List, Optional

from fastapi import (APIRouter, Depends, HTTPException, Path, Query, Response,
                     status)
from modules.vehicle.service import vehicle_service
from packagescore.cache import CacheKey, cache
from packagescore.cache_decorators import cache_response
from packagescore.dependencies import get_current_active_user, get_db
from packagescore.utils import check_etag, get_etag
from packagesmodels.schemas import (PaginatedResponse, Vehicle, VehicleCreate,
                                    VehicleListResponse, VehicleStatus,
                                    VehicleType, VehicleUpdate)
from sqlalchemy.orm import Session

# 문자열 상수 정의
VEHICLE_ID_DESC = "차량 ID"


router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("/", response_model=PaginatedResponse[Vehicle])
@cache_response(prefix="vehicles:list", expire=60)
async def list_vehicles(
    response: Response,
    skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
    limit: int = Query(100, ge=1, le=1000, description="최대 반환 레코드 수"),
    make: Optional[str] = Query(None, description="제조사 필터"),
    model: Optional[str] = Query(None, description="모델 필터"),
    year: Optional[int] = Query(None, description="연도 필터"),
    status: Optional[VehicleStatus] = Query(None, description="상태 필터"),
    type: Optional[VehicleType] = Query(None, description="차량 유형 필터"),
    sort_by: Optional[str] = Query("created_at", description="정렬 기준 필드"),
    sort_order: Optional[str] = Query("desc", description="정렬 순서 (asc/desc)"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """
    차량 목록을 조회합니다.

    쿼리 결과는 캐싱되며, 성능이 최적화되었습니다.
    페이지네이션 정보와 함께 응답을 반환합니다.
    """
    # 필터 구성
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

    # 최적화된 쿼리로 결과 조회
    result = vehicle_service.get_vehicle_list_paginated(
        skip=skip, limit=limit, filters=filters, sort_by=sort_by, sort_order=sort_order
    )

    # ETag 설정
    etag = get_etag(result)
    response.headers["ETag"] = etag

    return result


@router.get("/{vehicle_id}", response_model=Vehicle)
@cache_response(prefix="vehicles:details", expire=120)
async def get_vehicle(
    response: Response,
    vehicle_id: str = Path(..., description=VEHICLE_ID_DESC),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """
    특정 차량의 상세 정보를 조회합니다.

    결과는 캐싱되어 빠른 응답을 제공합니다.
    """
    # 차량 정보 조회
    vehicle = vehicle_service.get_vehicle_by_id(vehicle_id)

    # ETag 설정
    etag = get_etag(vehicle)
    response.headers["ETag"] = etag

    return vehicle


@router.post("/", response_model=Vehicle, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    _db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """
    새 차량을 등록합니다.
    """
    vehicle = vehicle_service.create_vehicle(vehicle_data)

    # 관련 캐시 무효화
    cache.invalidate_pattern(CacheKey.VEHICLE_LIST.format(pattern=True))

    return vehicle


@router.put("/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(
    vehicle_data: VehicleUpdate,
    vehicle_id: str = Path(..., description=VEHICLE_ID_DESC),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """
    차량 정보를 업데이트합니다.
    """
    vehicle = vehicle_service.update_vehicle(vehicle_id, vehicle_data)

    # 관련 캐시 무효화
    cache.delete(CacheKey.VEHICLE_DETAIL.format(id=vehicle_id))
    cache.invalidate_pattern(CacheKey.VEHICLE_LIST.format(pattern=True))

    return vehicle


@router.delete("/{vehicle_id}", response_model=bool)
async def delete_vehicle(
    vehicle_id: str = Path(..., description=VEHICLE_ID_DESC),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """
    차량을 삭제합니다.
    """
    result = vehicle_service.delete_vehicle(vehicle_id)

    # 관련 캐시 무효화
    cache.delete(CacheKey.VEHICLE_DETAIL.format(id=vehicle_id))
    cache.invalidate_pattern(CacheKey.VEHICLE_LIST.format(pattern=True))

    return result


@router.get(
    "/{vehicle_id}/maintenance", response_model=PaginatedResponse[Dict[str, Any]]
)
@cache_response(prefix="vehicles:history", expire=60)
async def get_maintenance_history(
    response: Response,
    vehicle_id: str = Path(..., description=VEHICLE_ID_DESC),
    skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
    limit: int = Query(100, ge=1, le=1000, description="최대 반환 레코드 수"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """
    차량의 정비 이력을 조회합니다.
    페이지네이션을 지원합니다.
    """
    # 정비 이력 조회 (페이지네이션 적용)
    result = vehicle_service.get_vehicle_maintenance_history_paginated(
        vehicle_id, skip=skip, limit=limit
    )

    # ETag 설정
    etag = get_etag(result)
    response.headers["ETag"] = etag

    return result


@router.post("/{vehicle_id}/diagnostics", response_model=Dict[str, Any])
async def perform_diagnostics(
    vehicle_id: str = Path(..., description=VEHICLE_ID_DESC),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """
    차량 진단을 실행합니다.
    결과는 캐싱되지 않고 항상 새로 생성됩니다.
    """
    result = vehicle_service.perform_vehicle_diagnostics(vehicle_id)

    # 관련 캐시 무효화 (차량 상태가 변경될 수 있음)
    cache.delete(CacheKey.VEHICLE_DETAIL.format(id=vehicle_id))

    return result


@router.get("/{vehicle_id}/telemetry", response_model=Dict[str, Any])
@cache_response(prefix="vehicles:telemetry", expire=1800)
async def get_telemetry(
    response: Response,
    vehicle_id: str = Path(..., description=VEHICLE_ID_DESC),
    start_date: Optional[str] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    resolution: Optional[str] = Query(
        "day", description="데이터 해상도 (hour/day/week/month)"
    ),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """
    차량의 원격 측정 데이터를 조회합니다.
    시계열 데이터 최적화 및 집계가 적용되었습니다.
    """
    # 텔레메트리 데이터 조회 (집계 및 최적화 적용)
    result = vehicle_service.get_telemetry_data_optimized(
        vehicle_id, start_date, end_date, resolution
    )

    # ETag 설정
    etag = get_etag(result)
    response.headers["ETag"] = etag

    return result


@router.patch("/{vehicle_id}/status", response_model=Vehicle)
@cache_response(prefix="vehicles:status", expire=300)
async def update_vehicle_status(
    status: VehicleStatus,
    vehicle_id: str = Path(..., description=VEHICLE_ID_DESC),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """
    차량 상태를 변경합니다.
    """
    vehicle = vehicle_service.change_vehicle_status(vehicle_id, status)

    # 관련 캐시 무효화
    cache.delete(CacheKey.VEHICLE_DETAIL.format(id=vehicle_id))
    cache.invalidate_pattern(CacheKey.VEHICLE_LIST.format(pattern=True))

    return vehicle


@router.post("/batch", response_model=List[Vehicle])
async def create_vehicles_batch(
    vehicles_data: List[VehicleCreate],
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """
    여러 차량을 일괄 등록합니다.
    배치 처리로 성능이 최적화되었습니다.
    """
    vehicles = vehicle_service.create_vehicles_batch(vehicles_data)

    # 관련 캐시 무효화
    cache.invalidate_pattern(CacheKey.VEHICLE_LIST.format(pattern=True))

    return vehicles
