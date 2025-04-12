"""
Vehicle API router.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status, Response
from sqlalchemy.orm import Session
from ..core.dependencies import get_db, get_current_active_user
from ..models.schemas import (
    Vehicle, VehicleCreate, VehicleUpdate, VehicleStatus, VehicleType,
    VehicleListResponse, PaginatedResponse
)
from ..modules.vehicle.service import vehicle_service
from ..core.cache import cache, CacheKey
from ..core.utils import get_etag, check_etag


# 문자열 상수 정의
VEHICLE_ID_DESC = "차량 ID"


router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("/", response_model=PaginatedResponse[Vehicle])
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
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    차량 목록을 조회합니다.
    
    쿼리 결과는 캐싱되며, 성능이 최적화되었습니다.
    페이지네이션 정보와 함께 응답을 반환합니다.
    """
    # 캐시 키 생성
    cache_key = CacheKey.VEHICLE_LIST.format(
        skip=skip, limit=limit, make=make, model=model, 
        year=year, status=status, type=type,
        sort_by=sort_by, sort_order=sort_order
    )
    
    # 캐시에서 결과 조회
    if (cached_result := cache.get(cache_key)):
        etag = get_etag(cached_result)
        if check_etag(response, etag):
            return Response(status_code=304)  # Not Modified
        response.headers["ETag"] = etag
        return cached_result
    
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
        skip=skip,
        limit=limit,
        filters=filters,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    # 결과 캐싱 (60초)
    cache.set(cache_key, result, expire=60)
    
    # ETag 설정
    etag = get_etag(result)
    response.headers["ETag"] = etag
    
    return result


@router.get("/{vehicle_id}", response_model=Vehicle)
async def get_vehicle(
    response: Response,
    vehicle_id: str = Path(..., description=VEHICLE_ID_DESC),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    특정 차량의 상세 정보를 조회합니다.
    
    결과는 캐싱되어 빠른 응답을 제공합니다.
    """
    # 캐시 키 생성
    cache_key = CacheKey.VEHICLE_DETAIL.format(id=vehicle_id)
    
    # 캐시에서 결과 조회
    if (cached_vehicle := cache.get(cache_key)):
        etag = get_etag(cached_vehicle)
        if check_etag(response, etag):
            return Response(status_code=304)  # Not Modified
        response.headers["ETag"] = etag
        return cached_vehicle
    
    # 차량 정보 조회
    vehicle = vehicle_service.get_vehicle_by_id(vehicle_id)
    
    # 결과 캐싱 (2분)
    cache.set(cache_key, vehicle, expire=120)
    
    # ETag 설정
    etag = get_etag(vehicle)
    response.headers["ETag"] = etag
    
    return vehicle


@router.post("/", response_model=Vehicle, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    _db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
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
    current_user: Dict[str, Any] = Depends(get_current_active_user)
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
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    차량을 삭제합니다.
    """
    result = vehicle_service.delete_vehicle(vehicle_id)
    
    # 관련 캐시 무효화
    cache.delete(CacheKey.VEHICLE_DETAIL.format(id=vehicle_id))
    cache.invalidate_pattern(CacheKey.VEHICLE_LIST.format(pattern=True))
    
    return result


@router.get("/{vehicle_id}/maintenance", response_model=PaginatedResponse[Dict[str, Any]])
async def get_maintenance_history(
    response: Response,
    vehicle_id: str = Path(..., description=VEHICLE_ID_DESC),
    skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
    limit: int = Query(100, ge=1, le=1000, description="최대 반환 레코드 수"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    차량의 정비 이력을 조회합니다.
    페이지네이션을 지원합니다.
    """
    # 캐시 키 생성
    cache_key = CacheKey.VEHICLE_MAINTENANCE.format(id=vehicle_id, skip=skip, limit=limit)
    
    # 캐시에서 결과 조회
    if (cached_result := cache.get(cache_key)):
        etag = get_etag(cached_result)
        if check_etag(response, etag):
            return Response(status_code=304)  # Not Modified
        response.headers["ETag"] = etag
        return cached_result
    
    # 정비 이력 조회 (페이지네이션 적용)
    result = vehicle_service.get_vehicle_maintenance_history_paginated(
        vehicle_id, skip=skip, limit=limit
    )
    
    # 결과 캐싱 (1분)
    cache.set(cache_key, result, expire=60)
    
    # ETag 설정
    etag = get_etag(result)
    response.headers["ETag"] = etag
    
    return result


@router.post("/{vehicle_id}/diagnostics", response_model=Dict[str, Any])
async def perform_diagnostics(
    vehicle_id: str = Path(..., description=VEHICLE_ID_DESC),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
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
async def get_telemetry(
    response: Response,
    vehicle_id: str = Path(..., description=VEHICLE_ID_DESC),
    start_date: Optional[str] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    resolution: Optional[str] = Query("day", description="데이터 해상도 (hour/day/week/month)"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    차량의 원격 측정 데이터를 조회합니다.
    시계열 데이터 최적화 및 집계가 적용되었습니다.
    """
    # 캐시 키 생성
    cache_key = CacheKey.VEHICLE_TELEMETRY.format(
        id=vehicle_id, start_date=start_date, end_date=end_date, resolution=resolution
    )
    
    # 캐시에서 결과 조회 
    if (cached_result := cache.get(cache_key)):
        etag = get_etag(cached_result)
        if check_etag(response, etag):
            return Response(status_code=304)  # Not Modified
        response.headers["ETag"] = etag
        return cached_result
    
    # 텔레메트리 데이터 조회 (집계 및 최적화 적용)
    result = vehicle_service.get_telemetry_data_optimized(
        vehicle_id,
        start_date,
        end_date,
        resolution
    )
    
    # 결과 캐싱 (해상도에 따라 캐시 시간 조정)
    cache_time = {
        "hour": 10 * 60,  # 10분
        "day": 30 * 60,   # 30분
        "week": 2 * 60 * 60,  # 2시간
        "month": 6 * 60 * 60  # 6시간
    }.get(resolution, 30 * 60)
    
    cache.set(cache_key, result, expire=cache_time)
    
    # ETag 설정
    etag = get_etag(result)
    response.headers["ETag"] = etag
    
    return result


@router.patch("/{vehicle_id}/status", response_model=Vehicle)
async def update_vehicle_status(
    status: VehicleStatus,
    vehicle_id: str = Path(..., description=VEHICLE_ID_DESC),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
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
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    여러 차량을 일괄 등록합니다.
    배치 처리로 성능이 최적화되었습니다.
    """
    vehicles = vehicle_service.create_vehicles_batch(vehicles_data)
    
    # 관련 캐시 무효화
    cache.invalidate_pattern(CacheKey.VEHICLE_LIST.format(pattern=True))
    
    return vehicles