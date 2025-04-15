"""
정비 API 라우터.

차량 정비 관련 API 엔드포인트를 제공합니다.
"""

from typing import List, Optional, Dict, Any
from fastapi import Path, Query, Depends, Response, APIRouter, status, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import time

from .base_router import BaseRouter
from ..core.dependencies import get_db, get_current_active_user
from ..models.schemas import (
    Maintenance, MaintenanceCreate, MaintenanceUpdate, MaintenanceStatus
)
from ..modules.maintenance.service import maintenance_service
from ..core.cache import cache, cached
from ..core.cache_decorators import cache_response, CacheLevel
from ..core.parallel_processor import ParallelProcessor, DataBatcher, AsyncQueryBatcher
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
maintenance_controller = MaintenanceController()

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

# 데이터 모델: 일괄 차량 정비 정보 요청 모델
class BatchVehicleRequest(BaseModel):
    vehicle_ids: List[str]
    include_recommendations: bool = False
    include_statistics: bool = False

# 라우터 함수 구성: GET /maintenance 엔드포인트 정의
@base_router.get("/status", tags=["Maintenance"])
@cache_response(expire=30, prefix="maintenance:status")
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
    
    # 커밋으로 변경사항이 생겼을 수 있으므로 관련 캐시 삭제
    cache.clear("maintenance:status:*")
    
    return {"result": result}

@base_router.post("/push", tags=["Maintenance"])
async def push_repository():
    """정비 관련 변경사항을 원격 저장소에 푸시합니다."""
    result = maintenance_controller.push_repository()
    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result.get("error", "푸시 실패"))
    
    # 저장소 상태 변경되었으므로 관련 캐시 삭제
    cache.clear("maintenance:status:*")
    
    return {"result": result}

@base_router.post("/pull", tags=["Maintenance"])
async def pull_repository():
    """정비 관련 변경사항을 원격 저장소에서 가져옵니다."""
    result = maintenance_controller.pull_repository()
    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result.get("error", "풀 실패"))
    
    # 저장소 상태 변경되었으므로 관련 캐시 삭제
    cache.clear("maintenance:status:*")
    
    return {"result": result}

# 추가 라우트 확장
def extend_maintenance_routes(router: APIRouter):
    """정비 라우터에 추가 라우트 등록"""
    
    @router.get("/vehicle/{vehicle_id}", response_model=Dict[str, Any])
    @cache_response(expire=60, prefix="vehicle:maintenance", include_path_params=True)
    async def get_maintenance_by_vehicle(
        vehicle_id: str = Path(..., description=CAR_ID),
        skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
        limit: int = Query(100, ge=1, le=1000, description="최대 반환 레코드 수"),
        status: Optional[MaintenanceStatus] = Query(None, description="상태 필터"),
        db: Session = Depends(get_db)
    ):
        """
        차량별 정비 기록을 조회합니다.
        """
        # 컨트롤러를 통해 정비 내역 조회
        result = maintenance_controller.get_vehicle_maintenance(vehicle_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
            
        # 상태 필터링 및 페이지네이션 처리
        maintenance_records = result.get("maintenance_records", [])
        if status:
            maintenance_records = [r for r in maintenance_records if r.get("status") == status]
            
        paginated_records = paginate_list(maintenance_records, skip, limit)
        result["maintenance_records"] = paginated_records
        result["count"] = len(paginated_records)
        result["total_count"] = len(maintenance_records)
        result["skip"] = skip
        result["limit"] = limit
        
        return result

    @router.post("/scheduled", response_model=Dict[str, Any])
    async def create_scheduled_maintenance(
            request: ScheduleMaintenanceRequest,
            db: Session = Depends(get_db)
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
        cache.clear("maintenance:list:*")
        cache.clear(f"vehicle:maintenance:{request.vehicle_id}*")
        cache.clear(f"maintenance:recommendations:{request.vehicle_id}*")
        cache.clear(f"maintenance:statistics:{request.vehicle_id}*")
        
        return result

    @router.post("/complete/{maintenance_id}", response_model=Dict[str, Any])
    async def complete_maintenance(
            maintenance_id: str = Path(..., description="정비 ID"),
            request: CompletionNotesRequest = None,
            db: Session = Depends(get_db)
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
        vehicle_id = completed_maintenance.get("vehicle_id")
        cache.clear(f"maintenance:detail:{maintenance_id}")
        cache.clear("maintenance:list:*")
        
        if vehicle_id:
            cache.clear(f"vehicle:maintenance:{vehicle_id}*")
            cache.clear(f"maintenance:recommendations:{vehicle_id}*")
            cache.clear(f"maintenance:statistics:{vehicle_id}*")
            
        return completed_maintenance

    @router.get("/recommendations/{vehicle_id}", response_model=Dict[str, Any])
    @cache_response(expire=3600, prefix="maintenance:recommendations", include_path_params=True)
    async def get_maintenance_recommendations(
        vehicle_id: str = Path(..., description=CAR_ID),
        db: Session = Depends(get_db)
    ):
        """
        차량에 대한 정비 권장 사항을 조회합니다.
        """
        result = maintenance_controller.get_maintenance_recommendations(vehicle_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result

    @router.get("/statistics/{vehicle_id}", response_model=Dict[str, Any])
    @cache_response(expire=1800, prefix="maintenance:statistics", include_path_params=True, include_query_params=True)
    async def get_maintenance_statistics(
        vehicle_id: str = Path(..., description=CAR_ID),
        time_period: Optional[str] = Query("all", description="기간 (month, year, all)"),
        db: Session = Depends(get_db)
    ):
        """
        차량 정비 통계를 조회합니다.
        """
        statistics = maintenance_controller.get_maintenance_statistics(vehicle_id)
        if "error" in statistics:
            raise HTTPException(status_code=404, detail=statistics["error"])
        return statistics
        
    @router.post("/batch", response_model=Dict[str, List[Dict[str, Any]]])
    @cache_response(expire=300, prefix="maintenance:batch", cache_level=CacheLevel.HIGH)
    async def get_batch_vehicle_maintenance(
        request: Request,
        batch_request: BatchVehicleRequest,
        db: Session = Depends(get_db)
    ):
        """
        여러 차량의 정비 정보를 병렬로 조회합니다.
        
        병렬 처리와 캐싱을 결합하여 다수의 차량 정보를 빠르게 조회합니다.
        """
        vehicle_ids = batch_request.vehicle_ids
        include_recommendations = batch_request.include_recommendations
        include_statistics = batch_request.include_statistics
        
        # 병렬 처리를 위한 초기화
        batcher = DataBatcher(batch_size=5)  # 한 번에 5개 차량씩 처리
        
        async def process_vehicle_batch(vehicle_batch: List[str]) -> List[Dict[str, Any]]:
            """차량 배치 처리 함수"""
            results = []
            
            async def get_single_vehicle_info(v_id: str) -> Dict[str, Any]:
                """단일 차량 정보 조회 함수"""
                vehicle_info = maintenance_controller.get_vehicle_maintenance(v_id)
                
                # 추가 정보 조회 (옵션)
                if include_recommendations:
                    vehicle_info["recommendations"] = maintenance_controller.get_maintenance_recommendations(v_id)
                
                if include_statistics:
                    vehicle_info["statistics"] = maintenance_controller.get_maintenance_statistics(v_id)
                    
                return vehicle_info
            
            # 차량 ID별로 비동기 작업 생성
            vehicle_query_batcher = AsyncQueryBatcher(get_single_vehicle_info)
            batch_results = await vehicle_query_batcher.execute_batch(vehicle_batch)
            
            results.extend(batch_results)
            return results
        
        # 병렬 처리기 설정 및 실행
        processor = ParallelProcessor()
        batch_tasks = batcher.create_batches(vehicle_ids)
        all_results = await processor.execute_all([process_vehicle_batch(batch) for batch in batch_tasks])
        
        # 결과 병합
        flat_results = []
        for batch_result in all_results:
            flat_results.extend(batch_result)
        
        return {"results": flat_results}
        
    @router.get("/dashboard", response_model=Dict[str, Any])
    @cache_response(expire=300, prefix="maintenance:dashboard", cache_level=CacheLevel.MEDIUM)
    async def get_maintenance_dashboard(
        request: Request,
        db: Session = Depends(get_db)
    ):
        """
        정비 대시보드 정보를 병렬로 조회합니다.
        
        여러 시스템 상태와 통계를 병렬로 조회하여 대시보드 정보를 생성합니다.
        """
        # 병렬 처리기 초기화
        processor = ParallelProcessor()
        
        # 대시보드를 위한 여러 작업 정의
        tasks = {
            "system_status": lambda: maintenance_controller.get_status(),
            "recent_maintenance": lambda: maintenance_controller.get_recent_maintenance_records(limit=10),
            "scheduled_maintenance": lambda: maintenance_controller.get_scheduled_maintenance(limit=10),
            "pending_approvals": lambda: maintenance_controller.get_pending_approvals(),
            "maintenance_summary": lambda: maintenance_controller.get_maintenance_summary()
        }
        
        # 병렬 실행
        results = await processor.execute_parallel(tasks)
        
        # 오류 확인 및 결과 가공
        dashboard_data = {
            "timestamp": time.time(),
            "data": results
        }
        
        return dashboard_data

# 확장 라우트 등록
base_router.extend_router(extend_maintenance_routes)

# 최종 라우터 가져오기
router = base_router.get_router()