"""
정비 API 라우터.

차량 정비 관련 API 엔드포인트를 제공합니다.
"""

from typing import List, Optional, Dict, Any
from fastapi import Path, Query, Depends, Response, APIRouter, status, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os

from .base_router import BaseRouter
from ..core.dependencies import get_db, get_current_active_user
from ..models.schemas import (
    Maintenance, MaintenanceCreate, MaintenanceUpdate, MaintenanceStatus
)
from ..modules.maintenance.service import maintenance_service
from ..core.cache import cache, CacheKey
from ..core.utils import get_etag, check_etag, paginate_list
from ..controllers.maintenance_controller import MaintenanceController

CAR_ID = "차량 ID"

# 베이스 라우터 인스턴스 생성
base_router = BaseRouter(
    prefix="/maintenance",
    tags=["maintenance"],
    response_model=Maintenance,
    create_model=MaintenanceCreate,
    update_model=MaintenanceUpdate,
    service=maintenance_service,
    cache_key_prefix="maintenance"
)

# 컨트롤러 클래스 구성: MaintenanceController 인스턴스 초기화
maintenance_controller = MaintenanceController(path=".")

# 데이터 모델 (함수 구성): CommitRequest 데이터 모델 정의
class CommitRequest(BaseModel):
    message: str

# 데이터 모델: ScheduleMaintenanceRequest 데이터 모델 정의
class ScheduleMaintenanceRequest(BaseModel):
    vehicle_id: str
    schedule_date: str
    maintenance_type: str
    description: Optional[str] = None

# 데이터 모델: CompletionNotesRequest 데이터 모델 정의
class CompletionNotesRequest(BaseModel):
    notes: Optional[str] = None

# 라우터 함수 구성: GET /maintenance 엔드포인트 정의
@base_router.get("/status", tags=["Maintenance"])
async def get_maintenance_status():
    """정비 시스템 상태를 조회합니다."""
    result = maintenance_controller.get_status()
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

# 라우터 함수 구성: POST /maintenance 엔드포인트 정의
@base_router.post("/commit", tags=["Maintenance"])
async def create_maintenance_commit(request: CommitRequest):
    """정비 관련 Git 커밋을 생성합니다."""
    result = maintenance_controller.create_maintenance_commit(request.message)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"result": result}

@base_router.post("/push", tags=["Maintenance"])
async def push_repository():
    """정비 관련 변경사항을 원격 저장소에 푸시합니다."""
    result = maintenance_controller.push_repository()
    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result.get("error", "푸시 실패"))
    return {"result": result}

@base_router.post("/pull", tags=["Maintenance"])
async def pull_repository():
    """정비 관련 변경사항을 원격 저장소에서 가져옵니다."""
    result = maintenance_controller.pull_repository()
    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result.get("error", "풀 실패"))
    return {"result": result}

# 추가 라우트 확장
def extend_maintenance_routes(router: APIRouter):
    """정비 라우터에 추가 라우트 등록"""
    
    @router.get("/vehicle/{vehicle_id}", response_model=Dict[str, Any])
    async def get_maintenance_by_vehicle(
        response: Response,
        vehicle_id: str = Path(..., description=CAR_ID),
        skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
        limit: int = Query(100, ge=1, le=1000, description="최대 반환 레코드 수"),
        status: Optional[MaintenanceStatus] = Query(None, description="상태 필터"),
        db: Session = Depends(get_db),
        current_user: Dict[str, Any] = Depends(get_current_active_user)
    ):
        """
        차량별 정비 기록을 조회합니다.
        """
        # 캐시 키 생성
        cache_key = CacheKey.VEHICLE_MAINTENANCE.format(
            id=vehicle_id, skip=skip, limit=limit, status=status or 'all'
        )

        # 캐시에서 결과 조회
        cached_result = cache.get(cache_key)
        if cached_result:
            etag = get_etag(cached_result)
            if check_etag(response, etag):
                return Response(status_code=304)  # Not Modified
            response.headers["ETag"] = etag
            return cached_result

        # 컨트롤러를 통해 정비 내역 조회
        result = maintenance_controller.get_vehicle_maintenance(vehicle_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])

        # 결과 캐싱 (60초)
        cache.set(cache_key, result, expire=60)

        # ETag 설정
        etag = get_etag(result)
        response.headers["ETag"] = etag

        return result

    @router.post("/scheduled", response_model=Dict[str, Any])
    async def create_scheduled_maintenance(
            request: ScheduleMaintenanceRequest,
            db: Session = Depends(get_db),
            current_user: Dict[str, Any] = Depends(get_current_active_user)
        ):
        """
        예약 정비를 생성합니다.
        """
        result = maintenance_controller.schedule_maintenance(
            request.vehicle_id, 
            request.schedule_date, 
            request.maintenance_type,
            request.description
        )

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        # 관련 캐시 무효화
        cache.invalidate_pattern("maintenance:list:*")
        cache.invalidate_pattern(f"vehicle:maintenance:{request.vehicle_id}:*")

        return result

    @router.post("/complete/{maintenance_id}", response_model=Dict[str, Any])
    async def complete_maintenance(
            maintenance_id: str = Path(..., description="정비 ID"),
            request: CompletionNotesRequest = None,
            db: Session = Depends(get_db),
            current_user: Dict[str, Any] = Depends(get_current_active_user)
        ):
        """
        정비를 완료 상태로 변경합니다.
        """
        completed_maintenance = maintenance_controller.complete_maintenance(
            maintenance_id, 
            completion_notes=request.notes if request else None
        )

        if "error" in completed_maintenance:
            raise HTTPException(status_code=400, detail=completed_maintenance["error"])

        # 관련 캐시 무효화
        cache.delete(f"maintenance:detail:{maintenance_id}")
        cache.invalidate_pattern("maintenance:list:*")
        vehicle_id = completed_maintenance.get("vehicle_id")
        if vehicle_id:
            cache.invalidate_pattern(f"vehicle:maintenance:{vehicle_id}:*")

        return completed_maintenance

    @router.get("/recommendations/{vehicle_id}", response_model=Dict[str, Any])
    async def get_maintenance_recommendations(
        vehicle_id: str = Path(..., description=CAR_ID),
        db: Session = Depends(get_db),
        current_user: Dict[str, Any] = Depends(get_current_active_user)
    ):
        """
        차량에 대한 정비 권장 사항을 조회합니다.
        """
        result = maintenance_controller.get_maintenance_recommendations(vehicle_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result

    @router.get("/statistics/{vehicle_id}", response_model=Dict[str, Any])
    async def get_maintenance_statistics(
        response: Response,
        vehicle_id: str = Path(..., description=CAR_ID),
        time_period: Optional[str] = Query("all", description="기간 (month, year, all)"),
        db: Session = Depends(get_db),
        current_user: Dict[str, Any] = Depends(get_current_active_user)
    ):
        """
        차량 정비 통계를 조회합니다.
        """
        # 캐시 키 생성
        cache_key = f"maintenance:statistics:{vehicle_id}:{time_period}"

        # 캐시에서 결과 조회
        cached_result = cache.get(cache_key)
        if cached_result:
            etag = get_etag(cached_result)
            if check_etag(response, etag):
                return Response(status_code=304)  # Not Modified
            response.headers["ETag"] = etag
            return cached_result

        # 통계 조회
        statistics = maintenance_controller.get_maintenance_statistics(vehicle_id)
        if "error" in statistics:
            raise HTTPException(status_code=404, detail=statistics["error"])

        # 결과 캐싱
        cache.set(cache_key, statistics, expire=3600)  # 1시간

        # ETag 설정
        etag = get_etag(statistics)
        response.headers["ETag"] = etag

        return statistics

# 확장 라우트 등록
base_router.extend_router(extend_maintenance_routes)

# 최종 라우터 가져오기
router = base_router.get_router()