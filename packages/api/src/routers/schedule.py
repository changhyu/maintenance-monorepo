"""
정비 일정 관리 라우터
"""

import logging
import os
import re
import uuid
from datetime import datetime, timedelta
from typing import Annotated, Any, Dict, List, Optional

from fastapi import (APIRouter, Body, Depends, HTTPException, Path, Query,
                     Request, Response)
from fastapi.responses import JSONResponse
from packagescontrollers.schedule_controller import ScheduleController
from packagescore.cache import cache, get_cache, ttl_cache
from packagescore.cache_decorators import cache_response
from packagescore.dependencies import get_db
from packagesmodels.schedule import (MaintenanceType, SchedulePriority,
                                     ScheduleStatus)
from packagesmodels.schemas import (ScheduleCreate, ScheduleListResponse,
                                    ScheduleNoteCreate, ScheduleNoteResponse,
                                    ScheduleReminderResponse, ScheduleResponse,
                                    ScheduleStatusUpdate, ScheduleUpdate)
from pydantic import UUID4, constr
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# UUID 형식 검증 패턴
UUID_PATTERN = r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"

# 유효한 상태값 목록
VALID_STATUSES = [s.value for s in ScheduleStatus]
VALID_PRIORITIES = [p.value for p in SchedulePriority]
VALID_MAINTENANCE_TYPES = [t.value for t in MaintenanceType]

# 정렬 가능한 필드 목록
SORTABLE_FIELDS = [
    "scheduled_date",
    "created_at",
    "updated_at",
    "status",
    "priority",
    "maintenance_type",
]

# 캐시 키 상수
CACHE_KEY_UPCOMING_SCHEDULES = "upcoming_schedules:*"
CACHE_KEY_OVERDUE_SCHEDULES = "overdue_schedules"
CACHE_KEY_SCHEDULES_STATS = "schedules_stats"

router = APIRouter(
    prefix="/schedules",
    tags=["schedules"],
    responses={404: {"description": "Not found"}},
)

# 캐싱 설정
try:
    cache = get_cache()
except Exception as e:
    logger.warning(f"캐시 초기화 실패: {str(e)}. 테스트 환경에서는 무시됩니다.")
    # 테스트 환경에서 오류 방지를 위한 더미 캐시 객체
    from packagescore.cache import CacheSettings, MemoryCache

    if os.environ.get("TESTING") == "true":
        cache = MemoryCache(CacheSettings(prefix="test_cache:"))
    else:
        raise


@router.get("", response_model=ScheduleListResponse)
@cache_response(expire=300, prefix="schedules", include_query_params=True)  # 5분 캐시
async def get_schedules(
    response: Response,
    request: Request,
    skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
    limit: int = Query(100, ge=1, le=500, description="최대 반환 레코드 수"),
    vehicle_id: Optional[str] = Query(
        None, pattern=UUID_PATTERN, description="차량 ID 필터"
    ),
    shop_id: Optional[str] = Query(
        None, pattern=UUID_PATTERN, description="정비소 ID 필터"
    ),
    start_date: Optional[datetime] = Query(None, description="시작 날짜 필터"),
    end_date: Optional[datetime] = Query(None, description="종료 날짜 필터"),
    status: Optional[str] = Query(None, description="상태 필터"),
    maintenance_type: Optional[str] = Query(None, description="정비 유형 필터"),
    sort_by: str = Query("scheduled_date", description="정렬 기준 필드"),
    sort_order: str = Query("asc", description="정렬 순서 (asc, desc)"),
    controller: ScheduleController = Depends(ScheduleController),
):
    """
    모든 일정 목록을 조회합니다.

    여러 필터를 적용하여 특정 조건에 맞는 일정만 조회할 수 있습니다.

    - **skip**: 건너뛸 레코드 수
    - **limit**: 최대 반환 레코드 수
    - **vehicle_id**: 특정 차량의 일정만 조회
    - **shop_id**: 특정 정비소의 일정만 조회
    - **start_date**: 이 날짜 이후의 일정만 조회
    - **end_date**: 이 날짜 이전의 일정만 조회
    - **status**: 특정 상태의 일정만 조회 (pending, confirmed, completed, cancelled)
    - **maintenance_type**: 특정 정비 유형의 일정만 조회
    - **sort_by**: 정렬 기준 필드 (scheduled_date, status, priority 등)
    - **sort_order**: 정렬 순서 (asc, desc)
    """
    # 유효성 검증
    if status and status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"유효하지 않은 상태값입니다. 가능한 값: {', '.join(VALID_STATUSES)}",
        )

    if maintenance_type and maintenance_type not in VALID_MAINTENANCE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"유효하지 않은 정비 유형입니다. 가능한 값: {', '.join(VALID_MAINTENANCE_TYPES)}",
        )

    if sort_by not in SORTABLE_FIELDS:
        raise HTTPException(
            status_code=400,
            detail=f"정렬 가능한 필드가 아닙니다. 가능한 필드: {', '.join(SORTABLE_FIELDS)}",
        )

    if sort_order.lower() not in ["asc", "desc"]:
        raise HTTPException(
            status_code=400, detail="정렬 순서는 'asc' 또는 'desc'만 가능합니다."
        )

    # 컨트롤러 호출
    result = await controller.get_schedules(
        skip=skip,
        limit=limit,
        vehicle_id=vehicle_id,
        shop_id=shop_id,
        start_date=start_date,
        end_date=end_date,
        status=status,
        maintenance_type=maintenance_type,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    return result


@router.post("", response_model=ScheduleResponse, status_code=201)
async def create_schedule(
    schedule_data: ScheduleCreate = Body(...),
    controller: ScheduleController = Depends(ScheduleController),
):
    """
    새 정비 일정을 생성합니다.

    일정의 필수 정보와 추가 정보(알림, 노트 등)를 함께 제공할 수 있습니다.

    - **schedule_data**: 생성할 일정 정보
    """
    # 유효성 검증
    if hasattr(schedule_data, "status") and schedule_data.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"유효하지 않은 상태값입니다. 가능한 값: {', '.join(VALID_STATUSES)}",
        )

    if (
        hasattr(schedule_data, "priority")
        and schedule_data.priority not in VALID_PRIORITIES
    ):
        raise HTTPException(
            status_code=400,
            detail=f"유효하지 않은 우선순위입니다. 가능한 값: {', '.join(VALID_PRIORITIES)}",
        )

    if (
        hasattr(schedule_data, "maintenance_type")
        and schedule_data.maintenance_type not in VALID_MAINTENANCE_TYPES
    ):
        raise HTTPException(
            status_code=400,
            detail=f"유효하지 않은 정비 유형입니다. 가능한 값: {', '.join(VALID_MAINTENANCE_TYPES)}",
        )

    result = await controller.create_schedule(schedule_data=schedule_data)

    # 캐시 무효화 (차량별, 통계 등의 캐시)
    if hasattr(schedule_data, "vehicle_id") and schedule_data.vehicle_id:
        await cache.delete(f"vehicle_schedules:{schedule_data.vehicle_id}")
    await cache.delete(CACHE_KEY_SCHEDULES_STATS)

    return result


@router.get("/upcoming", response_model=ScheduleListResponse)
@cache_response(
    expire=60, prefix="upcoming_schedules", include_query_params=True  # 1분 캐시
)
async def get_upcoming_schedules(
    response: Response,
    days: int = Query(7, ge=1, le=30, description="조회할 기간(일)"),
    controller: ScheduleController = Depends(ScheduleController),
):
    """
    다가오는 일정 목록을 조회합니다.

    - **days**: 현재 시점부터 몇 일 동안의 일정을 조회할지 지정 (기본값: 7, 최대: 30)
    """
    result = await controller.get_upcoming_schedules(days=days)
    return result


@router.get("/overdue", response_model=ScheduleListResponse)
@cache_response(expire=300, prefix="overdue_schedules")  # 5분 캐시
async def get_overdue_schedules(
    response: Response, controller: ScheduleController = Depends(ScheduleController)
):
    """
    기한이 지난 일정 목록을 조회합니다.

    현재 날짜 기준으로 예정 날짜가 지났으나 완료되지 않은 모든 일정을 반환합니다.
    """
    result = await controller.get_overdue_schedules()
    return result


@router.get("/statistics", response_model=Dict[str, Any])
@cache_response(
    expire=300, prefix="schedules_stats", include_query_params=True  # 5분 캐시
)
async def get_maintenance_statistics(
    response: Response,
    vehicle_id: Optional[str] = Query(
        None, pattern=UUID_PATTERN, description="통계를 조회할 차량 ID"
    ),
    controller: ScheduleController = Depends(ScheduleController),
):
    """
    정비 통계 정보를 조회합니다.

    정비 유형별 수행 횟수, 평균 비용 등의 통계 정보를 제공합니다.

    - **vehicle_id**: 특정 차량의 통계만 조회할 경우 차량 ID (선택적)
    """
    result = await controller.get_maintenance_statistics(vehicle_id=vehicle_id)
    return result


@router.get("/forecast", response_model=List[Dict[str, Any]])
async def get_maintenance_forecast(
    days: int = Query(90, ge=7, le=365, description="예측 기간(일)"),
    controller: ScheduleController = Depends(ScheduleController),
):
    """
    예상 정비 일정 예측 결과를 조회합니다.

    과거 패턴과 차량 사용 데이터를 기반으로 향후 정비 일정을 예측합니다.

    - **days**: 예측할 미래 기간 일수 (기본값: 90일, 최소: 7일, 최대: 365일)
    """
    return await controller.get_forecast(days=days)


@router.get("/vehicle/{vehicle_id}", response_model=ScheduleListResponse)
@cache_response(
    expire=120, prefix="vehicle_schedules", include_path_params=True  # 2분 캐시
)
async def get_schedules_by_vehicle(
    response: Response,
    vehicle_id: str = Path(..., pattern=UUID_PATTERN, description="차량 ID"),
    controller: ScheduleController = Depends(ScheduleController),
):
    """
    특정 차량의 모든 일정을 조회합니다.

    과거, 현재, 미래의 모든 일정을 포함합니다.

    - **vehicle_id**: 조회할 차량의 ID
    """
    result = await controller.get_vehicle_schedules(vehicle_id=vehicle_id)
    return result


@router.get("/{schedule_id}", response_model=ScheduleResponse)
@cache_response(
    expire=60, prefix="schedule_detail", include_path_params=True  # 1분 캐시
)
async def get_schedule_by_id(
    response: Response,
    schedule_id: str = Path(..., pattern=UUID_PATTERN, description="조회할 일정 ID"),
    controller: ScheduleController = Depends(ScheduleController),
):
    """
    특정 일정의 상세 정보를 조회합니다.

    일정 ID로 특정 일정의 모든 세부 정보를 제공합니다.

    - **schedule_id**: 조회할 일정 ID
    """
    result = await controller.get_schedule_by_id(schedule_id=schedule_id)
    if not result:
        raise HTTPException(
            status_code=404, detail=f"일정을 찾을 수 없습니다: {schedule_id}"
        )
    return result


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: str = Path(..., pattern=UUID_PATTERN, description="수정할 일정 ID"),
    schedule_data: ScheduleUpdate = Body(...),
    controller: ScheduleController = Depends(ScheduleController),
):
    """
    기존 일정을 수정합니다.

    일정 ID로 특정 일정의 정보를 업데이트합니다.

    - **schedule_id**: 수정할 일정 ID
    - **schedule_data**: 업데이트할 정보
    """
    # 유효성 검증
    if (
        hasattr(schedule_data, "status")
        and schedule_data.status
        and schedule_data.status not in VALID_STATUSES
    ):
        raise HTTPException(
            status_code=400,
            detail=f"유효하지 않은 상태값입니다. 가능한 값: {', '.join(VALID_STATUSES)}",
        )

    if (
        hasattr(schedule_data, "priority")
        and schedule_data.priority
        and schedule_data.priority not in VALID_PRIORITIES
    ):
        raise HTTPException(
            status_code=400,
            detail=f"유효하지 않은 우선순위입니다. 가능한 값: {', '.join(VALID_PRIORITIES)}",
        )

    result = await controller.update_schedule(
        schedule_id=schedule_id, schedule_data=schedule_data
    )
    if not result:
        raise HTTPException(
            status_code=404, detail=f"일정을 찾을 수 없습니다: {schedule_id}"
        )

    # 관련 캐시 무효화
    await cache.delete(f"schedule_detail:{schedule_id}")

    # 차량 ID가 있는 경우 해당 차량의 일정 캐시도 무효화
    if hasattr(result, "vehicle_id") and result.vehicle_id:
        await cache.delete(f"vehicle_schedules:{result.vehicle_id}")

    # 전체 일정 및 기타 관련 캐시 무효화
    await cache.delete(CACHE_KEY_UPCOMING_SCHEDULES)
    await cache.delete(CACHE_KEY_OVERDUE_SCHEDULES)
    await cache.delete(CACHE_KEY_SCHEDULES_STATS)

    return result


@router.delete("/{schedule_id}", response_model=Dict[str, Any])
async def delete_schedule(
    schedule_id: str = Path(..., pattern=UUID_PATTERN, description="삭제할 일정 ID"),
    controller: ScheduleController = Depends(ScheduleController),
):
    """
    일정을 삭제합니다.

    일정 ID로 특정 일정을 삭제합니다.

    - **schedule_id**: 삭제할 일정 ID
    """
    # 먼저 일정 조회하여 삭제 전 정보 저장
    schedule = await controller.get_schedule_by_id(schedule_id)
    if not schedule:
        raise HTTPException(
            status_code=404, detail=f"일정을 찾을 수 없습니다: {schedule_id}"
        )

    vehicle_id = getattr(schedule, "vehicle_id", None)

    # 일정 삭제
    result = await controller.delete_schedule(schedule_id)
    if not result:
        raise HTTPException(status_code=500, detail="일정 삭제 실패")

    # 관련 캐시 무효화
    await cache.delete(f"schedule_detail:{schedule_id}")

    # 차량 ID가 있는 경우 해당 차량의 일정 캐시도 무효화
    if vehicle_id:
        await cache.delete(f"vehicle_schedules:{vehicle_id}")

    # 전체 일정 및 기타 관련 캐시 무효화
    await cache.delete(CACHE_KEY_UPCOMING_SCHEDULES)
    await cache.delete(CACHE_KEY_OVERDUE_SCHEDULES)
    await cache.delete(CACHE_KEY_SCHEDULES_STATS)

    return {"success": True, "message": "일정이 성공적으로 삭제되었습니다"}


@router.post("/{schedule_id}/notes", response_model=ScheduleNoteResponse)
async def add_schedule_note(
    schedule_id: str = Path(
        ..., pattern=UUID_PATTERN, description="노트를 추가할 일정 ID"
    ),
    note_data: ScheduleNoteCreate = Body(...),
    controller: ScheduleController = Depends(ScheduleController),
):
    """
    일정에 노트를 추가합니다.

    일정에 관련된 메모, 기록 등을 추가하는 기능입니다.

    - **schedule_id**: 노트를 추가할 일정 ID
    - **note_data**: 노트 내용
    """
    result = await controller.add_schedule_note(
        schedule_id=schedule_id, note_data=note_data
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    # 관련 캐시 무효화
    await cache.delete(f"schedule_detail:{schedule_id}")
    await cache.delete(f"schedule_notes:{schedule_id}")

    return result


@router.get("/{schedule_id}/notes", response_model=List[ScheduleNoteResponse])
@cache_response(
    expire=60, prefix="schedule_notes", include_path_params=True  # 1분 캐시
)
async def get_schedule_notes(
    response: Response,
    schedule_id: str = Path(
        ..., pattern=UUID_PATTERN, description="노트를 조회할 일정 ID"
    ),
    controller: ScheduleController = Depends(ScheduleController),
):
    """
    일정에 추가된 모든 노트를 조회합니다.

    - **schedule_id**: 노트를 조회할 일정 ID
    """
    results = await controller.get_schedule_notes(schedule_id=schedule_id)

    if isinstance(results, dict) and "error" in results:
        status_code = 404 if "not found" in results["error"].lower() else 400
        raise HTTPException(status_code=status_code, detail=results["error"])

    return results


@router.get("/{schedule_id}/reminders", response_model=List[ScheduleReminderResponse])
@cache_response(
    expire=60, prefix="schedule_reminders", include_path_params=True  # 1분 캐시
)
async def get_schedule_reminders(
    response: Response,
    schedule_id: str = Path(
        ..., pattern=UUID_PATTERN, description="알림을 조회할 일정 ID"
    ),
    controller: ScheduleController = Depends(ScheduleController),
):
    """
    일정에 설정된 모든 알림을 조회합니다.

    - **schedule_id**: 알림을 조회할 일정 ID
    """
    results = await controller.get_schedule_reminders(schedule_id=schedule_id)

    if isinstance(results, dict) and "error" in results:
        status_code = 404 if "not found" in results["error"].lower() else 400
        raise HTTPException(status_code=status_code, detail=results["error"])

    return results


@router.patch("/{schedule_id}/status", response_model=ScheduleResponse)
async def update_schedule_status(
    schedule_id: str = Path(
        ..., pattern=UUID_PATTERN, description="상태를 변경할 일정 ID"
    ),
    status_data: ScheduleStatusUpdate = Body(...),
    controller: ScheduleController = Depends(ScheduleController),
):
    """
    일정의 상태를 업데이트합니다.

    대기중, 확정됨, 완료됨, 취소됨 등의 상태로 변경할 수 있습니다.

    - **schedule_id**: 상태를 변경할 일정 ID
    - **status_data**: 새로운 상태 정보
    """
    # 유효성 검증
    if status_data.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"유효하지 않은 상태값입니다. 가능한 값: {', '.join(VALID_STATUSES)}",
        )

    result = await controller.update_schedule_status(
        schedule_id=schedule_id, status=status_data.status
    )

    if isinstance(result, dict) and "error" in result:
        status_code = 404 if "not found" in result["error"].lower() else 400
        raise HTTPException(status_code=status_code, detail=result["error"])

    # 관련 캐시 무효화
    await cache.delete(f"schedule_detail:{schedule_id}")

    # 차량 ID가 있는 경우 해당 차량의 일정 캐시도 무효화
    vehicle_id = getattr(result, "vehicle_id", None)
    if vehicle_id:
        await cache.delete(f"vehicle_schedules:{vehicle_id}")

    # 전체 일정 및 기타 관련 캐시 무효화
    await cache.delete(CACHE_KEY_UPCOMING_SCHEDULES)
    await cache.delete(CACHE_KEY_OVERDUE_SCHEDULES)

    return result


@router.get("/scheduled-maintenance-forecast")
async def scheduled_maintenance_forecast(
    days: int = Query(90, ge=1, le=365, description="예측 범위(일): 1~365"),
    controller: ScheduleController = Depends(ScheduleController),
):
    """
    예정된 정비 일정 예측을 제공합니다.
    차량 정보, 정비 이력, 그리고 제조사 권장 정비 주기를 기반으로 합니다.

    - **days**: 예측할 미래 기간 일수 (기본값: 90일, 최소: 1일, 최대: 365일)
    """
    result = await controller.get_maintenance_forecast(days=days)
    return result
