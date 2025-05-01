"""
관리자 API 라우터.

시스템 관리 관련 API 엔드포인트를 제공합니다.
"""

import os
import time
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta

import psutil
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Body, Path, BackgroundTasks
from sqlalchemy.orm import Session
from src.core.cache import cache
from src.core.cache_decorators import CacheLevel
from src.core.dependencies import get_admin_user, get_db
from src.core.metrics_collector import metrics_collector
from src.core.parallel_processor import ParallelProcessor
from pydantic import BaseModel, Field
from src.models.base import validate_uuid

router = APIRouter(
    prefix="/api/admin", tags=["admin"], dependencies=[Depends(get_admin_user)]
)


# 데이터 모델
class CacheStats(BaseModel):
    hits: int
    misses: int
    hit_rate: float
    memory_usage_mb: float
    keys_count: int
    keys_by_prefix: Dict[str, int]


# 어드민 설정 모델
class AdminSettingBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


class AdminSettingCreate(AdminSettingBase):
    pass


class AdminSetting(AdminSettingBase):
    id: str
    lastModifiedBy: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        orm_mode = True


# 시스템 메트릭 모델
class SystemMetricCreate(BaseModel):
    metric: str
    value: float
    unit: Optional[str] = None


class SystemMetric(SystemMetricCreate):
    id: str
    timestamp: datetime

    class Config:
        orm_mode = True


# 백업 로그 모델
class BackupLogCreate(BaseModel):
    filename: str
    size: int
    status: str
    startedAt: datetime
    completedAt: Optional[datetime] = None
    errorMsg: Optional[str] = None


class BackupLog(BackupLogCreate):
    id: str

    class Config:
        orm_mode = True


# 사용자 로그인 기록 모델
class UserLoginHistoryCreate(BaseModel):
    userId: str
    ip: Optional[str] = None
    userAgent: Optional[str] = None
    success: bool = True
    failReason: Optional[str] = None


class UserLoginHistory(UserLoginHistoryCreate):
    id: str
    timestamp: datetime

    class Config:
        orm_mode = True


# 어드민 대시보드 위젯 모델
class AdminDashboardWidgetBase(BaseModel):
    name: str
    type: str
    config: Dict[str, Any]
    position: int
    enabled: bool = True


class AdminDashboardWidgetCreate(AdminDashboardWidgetBase):
    pass


class AdminDashboardWidget(AdminDashboardWidgetBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        orm_mode = True


# 어드민 감사 로그 모델
class AdminAuditLogCreate(BaseModel):
    userId: Optional[str] = None
    action: str
    resource: str
    resourceId: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip: Optional[str] = None
    userAgent: Optional[str] = None


class AdminAuditLog(AdminAuditLogCreate):
    id: str
    createdAt: datetime

    class Config:
        orm_mode = True


# 기존 캐시 관련 엔드포인트
@router.get("/cache/stats", response_model=CacheStats)
async def get_cache_stats():
    """
    캐시 통계 정보를 조회합니다.

    캐시 적중률, 메모리 사용량, 키 수 등 캐시 성능 지표를 제공합니다.
    """
    # 캐시 적중/미스 횟수 가져오기
    hits = metrics_collector.cache_hits.get()
    misses = metrics_collector.cache_misses.get()
    total = hits + misses
    hit_rate = hits / total if total > 0 else 0

    # 메모리 사용량 측정
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    memory_usage_mb = memory_info.rss / 1024 / 1024

    # 캐시 키 수 및 접두사별 통계
    keys = await cache.keys("*")
    keys_count = len(keys)

    # 접두사별 키 수 계산
    prefix_counts = {}
    for key in keys:
        prefix = key.split(":")[0] if ":" in key else key
        prefix_counts[prefix] = prefix_counts.get(prefix, 0) + 1

    return CacheStats(
        hits=hits,
        misses=misses,
        hit_rate=hit_rate,
        memory_usage_mb=memory_usage_mb,
        keys_count=keys_count,
        keys_by_prefix=prefix_counts,
    )


@router.get("/cache/keys", response_model=Dict[str, List[str]])
async def get_cache_keys(
    prefix: Optional[str] = Query(None, description="필터링할 키 접두사"),
    limit: int = Query(100, ge=1, le=1000, description="반환할 최대 키 수"),
):
    """
    캐시에 저장된 키 목록을 조회합니다.

    선택적으로 접두사로 필터링할 수 있으며, 반환되는 키 수를 제한할 수 있습니다.
    """
    pattern = f"{prefix}*" if prefix else "*"
    keys = await cache.keys(pattern)

    # 결과 제한
    limited_keys = keys[:limit]

    # 키를 접두사별로 그룹화
    grouped_keys = {}
    for key in limited_keys:
        prefix = key.split(":")[0] if ":" in key else "기타"
        if prefix not in grouped_keys:
            grouped_keys[prefix] = []
        grouped_keys[prefix].append(key)

    return grouped_keys


@router.delete("/cache/clear", response_model=Dict[str, Any])
async def clear_cache(
    prefix: Optional[str] = Query(None, description="삭제할 키 접두사")
):
    """
    캐시를 초기화합니다.

    접두사가 지정된 경우 해당 접두사로 시작하는 키만 삭제합니다.
    그렇지 않으면 모든 캐시를 초기화합니다.
    """
    if prefix:
        pattern = f"{prefix}*"
        deleted_count = await cache.delete_pattern(pattern)
        return {
            "success": True,
            "message": f"{deleted_count}개의 키가 삭제되었습니다",
            "pattern": pattern,
        }
    else:
        await cache.clear()
        return {"success": True, "message": "모든 캐시가 초기화되었습니다"}


@router.get("/cache/performance", response_model=Dict[str, Any])
async def get_cache_performance():
    """
    캐시 성능 지표를 조회합니다.

    캐시 적중/미스 시 평균 응답 시간 및 메모리 사용량 추이를 제공합니다.
    """
    # 병렬 처리로 여러 지표 동시 수집
    processor = ParallelProcessor()

    async def get_hit_times():
        return metrics_collector.cache_hit_times.get_samples()

    async def get_miss_times():
        return metrics_collector.cache_miss_times.get_samples()

    async def get_memory_samples():
        return metrics_collector.cache_memory_usage.get_samples()

    tasks = {
        "hit_times": get_hit_times,
        "miss_times": get_miss_times,
        "memory_samples": get_memory_samples,
    }

    results = await processor.execute_parallel(tasks)

    # 평균 계산
    hit_times = results.get("hit_times", [])
    miss_times = results.get("miss_times", [])
    memory_samples = results.get("memory_samples", [])

    avg_hit_time = sum(hit_times) / len(hit_times) if hit_times else 0
    avg_miss_time = sum(miss_times) / len(miss_times) if miss_times else 0
    avg_memory_usage = (
        sum(memory_samples) / len(memory_samples) if memory_samples else 0
    )

    # 성능 향상 계산
    performance_improvement = (
        ((avg_miss_time - avg_hit_time) / avg_miss_time * 100)
        if avg_miss_time > 0
        else 0
    )

    return {
        "avg_hit_time_ms": round(avg_hit_time * 1000, 2),  # 밀리초로 변환
        "avg_miss_time_ms": round(avg_miss_time * 1000, 2),
        "performance_improvement_percent": round(performance_improvement, 2),
        "avg_memory_usage_mb": round(avg_memory_usage, 2),
        "sample_count": {
            "hit_times": len(hit_times),
            "miss_times": len(miss_times),
            "memory_samples": len(memory_samples),
        },
    }


@router.get("/system/health", response_model=Dict[str, Any])
async def get_system_health():
    """
    시스템 건강 상태를 조회합니다.

    CPU, 메모리, 디스크 등의 사용량 및 상태를 제공합니다.
    """
    # 병렬로 시스템 정보 수집
    processor = ParallelProcessor()

    def get_cpu_info():
        return {
            "percent": psutil.cpu_percent(interval=0.5),
            "count": psutil.cpu_count(),
            "load_avg": psutil.getloadavg(),
        }

    def get_memory_info():
        vm = psutil.virtual_memory()
        return {
            "total_gb": round(vm.total / (1024**3), 2),
            "available_gb": round(vm.available / (1024**3), 2),
            "used_gb": round(vm.used / (1024**3), 2),
            "percent": vm.percent,
        }

    def get_disk_info():
        disk = psutil.disk_usage("/")
        return {
            "total_gb": round(disk.total / (1024**3), 2),
            "used_gb": round(disk.used / (1024**3), 2),
            "free_gb": round(disk.free / (1024**3), 2),
            "percent": disk.percent,
        }

    def get_network_info():
        net_io = psutil.net_io_counters()
        return {
            "bytes_sent_mb": round(net_io.bytes_sent / (1024**2), 2),
            "bytes_recv_mb": round(net_io.bytes_recv / (1024**2), 2),
            "packets_sent": net_io.packets_sent,
            "packets_recv": net_io.packets_recv,
            "errin": net_io.errin,
            "errout": net_io.errout,
        }

    tasks = {
        "cpu": get_cpu_info,
        "memory": get_memory_info,
        "disk": get_disk_info,
        "network": get_network_info,
        "uptime": lambda: time.time() - psutil.boot_time(),
    }

    return await processor.execute_parallel(tasks)


# 어드민 설정 관련 엔드포인트
@router.get("/settings", response_model=List[AdminSetting])
async def get_admin_settings(
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=1000, description="반환할 최대 설정 수"),
    offset: int = Query(0, ge=0, description="건너뛸 설정 수"),
):
    """
    관리자 설정 목록을 조회합니다.
    
    페이지네이션을 지원합니다.
    """
    from sqlalchemy import select
    from prisma.models import AdminSettings
    
    query = select(AdminSettings).offset(offset).limit(limit)
    result = db.execute(query).scalars().all()
    return result


@router.post("/settings", response_model=AdminSetting)
async def create_admin_setting(
    setting: AdminSettingCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: dict = Depends(get_admin_user),
):
    """
    새 관리자 설정을 생성합니다.
    """
    from prisma.models import AdminSettings
    from packages.api.src.routers.utils import log_admin_action
    
    existing = db.execute(
        select(AdminSettings).where(AdminSettings.key == setting.key)
    ).scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"키 '{setting.key}'는 이미 존재합니다.")
    
    new_setting = AdminSettings(
        key=setting.key,
        value=setting.value,
        description=setting.description,
        lastModifiedBy=user["id"],
    )
    
    db.add(new_setting)
    db.commit()
    db.refresh(new_setting)
    
    # 관리자 작업 로깅
    await log_admin_action(
        db=db,
        user_id=user["id"],
        action="CREATE",
        resource="admin_settings",
        resource_id=new_setting.id,
        details={"key": setting.key},
        request=request,
    )
    
    return new_setting


@router.get("/settings/{setting_id}", response_model=AdminSetting)
async def get_admin_setting(
    setting_id: str = Path(..., description="설정 ID"),
    db: Session = Depends(get_db),
):
    """
    특정 관리자 설정을 조회합니다.
    """
    validate_uuid(setting_id, "설정 ID")
    
    from sqlalchemy import select
    from prisma.models import AdminSettings
    
    setting = db.execute(
        select(AdminSettings).where(AdminSettings.id == setting_id)
    ).scalar_one_or_none()
    
    if not setting:
        raise HTTPException(status_code=404, detail="설정을 찾을 수 없습니다")
    
    return setting


@router.put("/settings/{setting_id}", response_model=AdminSetting)
async def update_admin_setting(
    setting_id: str,
    setting_update: AdminSettingCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: dict = Depends(get_admin_user),
):
    """
    특정 관리자 설정을 업데이트합니다.
    """
    validate_uuid(setting_id, "설정 ID")
    
    from sqlalchemy import select
    from prisma.models import AdminSettings
    from packages.api.src.routers.utils import log_admin_action
    
    existing_setting = db.execute(
        select(AdminSettings).where(AdminSettings.id == setting_id)
    ).scalar_one_or_none()
    
    if not existing_setting:
        raise HTTPException(status_code=404, detail="설정을 찾을 수 없습니다")
    
    # 중복 키 확인 (자신은 제외)
    if setting_update.key != existing_setting.key:
        duplicate = db.execute(
            select(AdminSettings).where(
                AdminSettings.key == setting_update.key,
                AdminSettings.id != setting_id
            )
        ).scalar_one_or_none()
        
        if duplicate:
            raise HTTPException(status_code=400, detail=f"키 '{setting_update.key}'는 이미 존재합니다")
    
    # 설정 업데이트
    existing_setting.key = setting_update.key
    existing_setting.value = setting_update.value
    existing_setting.description = setting_update.description
    existing_setting.lastModifiedBy = user["id"]
    existing_setting.updatedAt = datetime.utcnow()
    
    db.commit()
    db.refresh(existing_setting)
    
    # 관리자 작업 로깅
    await log_admin_action(
        db=db,
        user_id=user["id"],
        action="UPDATE",
        resource="admin_settings",
        resource_id=setting_id,
        details={"key": setting_update.key},
        request=request,
    )
    
    return existing_setting


@router.delete("/settings/{setting_id}", response_model=Dict[str, Any])
async def delete_admin_setting(
    setting_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: dict = Depends(get_admin_user),
):
    """
    특정 관리자 설정을 삭제합니다.
    """
    validate_uuid(setting_id, "설정 ID")
    
    from sqlalchemy import select
    from prisma.models import AdminSettings
    from packages.api.src.routers.utils import log_admin_action
    
    setting = db.execute(
        select(AdminSettings).where(AdminSettings.id == setting_id)
    ).scalar_one_or_none()
    
    if not setting:
        raise HTTPException(status_code=404, detail="설정을 찾을 수 없습니다")
    
    setting_key = setting.key  # 로깅용으로 저장
    
    db.delete(setting)
    db.commit()
    
    # 관리자 작업 로깅
    await log_admin_action(
        db=db,
        user_id=user["id"],
        action="DELETE",
        resource="admin_settings",
        resource_id=setting_id,
        details={"key": setting_key},
        request=request,
    )
    
    return {"success": True, "message": "설정이 삭제되었습니다"}


# 대시보드 위젯 관련 엔드포인트
@router.get("/dashboard/widgets", response_model=List[AdminDashboardWidget])
async def get_dashboard_widgets(
    db: Session = Depends(get_db),
    enabled_only: bool = Query(False, description="활성화된 위젯만 조회"),
):
    """
    관리자 대시보드 위젯 목록을 조회합니다.
    """
    from sqlalchemy import select
    from prisma.models import AdminDashboardWidget
    
    query = select(AdminDashboardWidget)
    if enabled_only:
        query = query.where(AdminDashboardWidget.enabled == True)
    
    query = query.order_by(AdminDashboardWidget.position)
    result = db.execute(query).scalars().all()
    
    return result


@router.post("/dashboard/widgets", response_model=AdminDashboardWidget)
async def create_dashboard_widget(
    widget: AdminDashboardWidgetCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: dict = Depends(get_admin_user),
):
    """
    새 대시보드 위젯을 생성합니다.
    """
    from prisma.models import AdminDashboardWidget
    from packages.api.src.routers.utils import log_admin_action
    
    new_widget = AdminDashboardWidget(
        name=widget.name,
        type=widget.type,
        config=widget.config,
        position=widget.position,
        enabled=widget.enabled
    )
    
    db.add(new_widget)
    db.commit()
    db.refresh(new_widget)
    
    # 관리자 작업 로깅
    await log_admin_action(
        db=db,
        user_id=user["id"],
        action="CREATE",
        resource="dashboard_widget",
        resource_id=new_widget.id,
        details={"name": widget.name, "type": widget.type},
        request=request,
    )
    
    return new_widget


@router.put("/dashboard/widgets/{widget_id}", response_model=AdminDashboardWidget)
async def update_dashboard_widget(
    widget_id: str,
    widget_update: AdminDashboardWidgetCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: dict = Depends(get_admin_user),
):
    """
    특정 대시보드 위젯을 업데이트합니다.
    """
    validate_uuid(widget_id, "위젯 ID")
    
    from sqlalchemy import select
    from prisma.models import AdminDashboardWidget
    from packages.api.src.routers.utils import log_admin_action
    
    widget = db.execute(
        select(AdminDashboardWidget).where(AdminDashboardWidget.id == widget_id)
    ).scalar_one_or_none()
    
    if not widget:
        raise HTTPException(status_code=404, detail="위젯을 찾을 수 없습니다")
    
    # 위젯 업데이트
    widget.name = widget_update.name
    widget.type = widget_update.type
    widget.config = widget_update.config
    widget.position = widget_update.position
    widget.enabled = widget_update.enabled
    widget.updatedAt = datetime.utcnow()
    
    db.commit()
    db.refresh(widget)
    
    # 관리자 작업 로깅
    await log_admin_action(
        db=db,
        user_id=user["id"],
        action="UPDATE",
        resource="dashboard_widget",
        resource_id=widget_id,
        details={"name": widget_update.name},
        request=request,
    )
    
    return widget


@router.delete("/dashboard/widgets/{widget_id}", response_model=Dict[str, Any])
async def delete_dashboard_widget(
    widget_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: dict = Depends(get_admin_user),
):
    """
    특정 대시보드 위젯을 삭제합니다.
    """
    validate_uuid(widget_id, "위젯 ID")
    
    from sqlalchemy import select
    from prisma.models import AdminDashboardWidget
    from packages.api.src.routers.utils import log_admin_action
    
    widget = db.execute(
        select(AdminDashboardWidget).where(AdminDashboardWidget.id == widget_id)
    ).scalar_one_or_none()
    
    if not widget:
        raise HTTPException(status_code=404, detail="위젯을 찾을 수 없습니다")
    
    widget_name = widget.name  # 로깅용으로 저장
    
    db.delete(widget)
    db.commit()
    
    # 관리자 작업 로깅
    await log_admin_action(
        db=db,
        user_id=user["id"],
        action="DELETE",
        resource="dashboard_widget",
        resource_id=widget_id,
        details={"name": widget_name},
        request=request,
    )
    
    return {"success": True, "message": "위젯이 삭제되었습니다"}


# 백업 관련 엔드포인트
@router.get("/backups", response_model=List[BackupLog])
async def get_backup_logs(
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100, description="반환할 최대 로그 수"),
    offset: int = Query(0, ge=0, description="건너뛸 로그 수"),
):
    """
    백업 로그 목록을 조회합니다.
    """
    from sqlalchemy import select
    from prisma.models import BackupLog
    
    query = select(BackupLog).order_by(BackupLog.startedAt.desc()).offset(offset).limit(limit)
    result = db.execute(query).scalars().all()
    
    return result


@router.post("/backups/create", response_model=Dict[str, Any])
async def create_backup(
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
    user: dict = Depends(get_admin_user),
):
    """
    새 백업을 생성합니다. 백업은 비동기적으로 처리됩니다.
    """
    from packages.api.src.services.backup_service import create_backup_async
    from packages.api.src.routers.utils import log_admin_action
    
    # 백업 작업 예약
    backup_id = await create_backup_async(db, background_tasks)
    
    # 관리자 작업 로깅
    await log_admin_action(
        db=db,
        user_id=user["id"],
        action="CREATE",
        resource="backup",
        resource_id=backup_id,
        details={"type": "manual"},
        request=request,
    )
    
    return {"success": True, "message": "백업이 예약되었습니다", "backup_id": backup_id}


@router.delete("/backups/{backup_id}", response_model=Dict[str, Any])
async def delete_backup(
    backup_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: dict = Depends(get_admin_user),
):
    """
    특정 백업을 삭제합니다.
    """
    validate_uuid(backup_id, "백업 ID")
    
    from sqlalchemy import select
    from prisma.models import BackupLog
    from packages.api.src.services.backup_service import delete_backup_file
    from packages.api.src.routers.utils import log_admin_action
    
    backup = db.execute(
        select(BackupLog).where(BackupLog.id == backup_id)
    ).scalar_one_or_none()
    
    if not backup:
        raise HTTPException(status_code=404, detail="백업을 찾을 수 없습니다")
    
    # 백업 파일 삭제
    try:
        await delete_backup_file(backup.filename)
    except Exception as e:
        # 파일 삭제 실패해도 로그 레코드는 삭제
        pass
    
    # 로그에서 백업 삭제
    db.delete(backup)
    db.commit()
    
    # 관리자 작업 로깅
    await log_admin_action(
        db=db,
        user_id=user["id"],
        action="DELETE",
        resource="backup",
        resource_id=backup_id,
        details={"filename": backup.filename},
        request=request,
    )
    
    return {"success": True, "message": "백업이 삭제되었습니다"}


# 시스템 메트릭 관련 엔드포인트
@router.get("/metrics", response_model=List[SystemMetric])
async def get_system_metrics(
    db: Session = Depends(get_db),
    metric_name: Optional[str] = Query(None, description="필터링할 메트릭 이름"),
    limit: int = Query(100, ge=1, le=1000, description="반환할 최대 메트릭 수"),
    offset: int = Query(0, ge=0, description="건너뛸 메트릭 수"),
    time_range: int = Query(24, description="조회할 시간 범위(시간)"),
):
    """
    시스템 메트릭을 조회합니다.
    특정 메트릭 이름으로 필터링할 수 있습니다.
    """
    from sqlalchemy import select
    from prisma.models import SystemMetrics
    
    # 시간 범위 필터링
    time_limit = datetime.utcnow() - timedelta(hours=time_range)
    
    query = select(SystemMetrics).where(SystemMetrics.timestamp >= time_limit)
    
    if metric_name:
        query = query.where(SystemMetrics.metric == metric_name)
    
    query = query.order_by(SystemMetrics.timestamp.desc()).offset(offset).limit(limit)
    result = db.execute(query).scalars().all()
    
    return result


@router.post("/metrics", response_model=SystemMetric)
async def create_system_metric(
    metric: SystemMetricCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_admin_user),
):
    """
    새 시스템 메트릭을 기록합니다.
    """
    from prisma.models import SystemMetrics
    
    new_metric = SystemMetrics(
        metric=metric.metric,
        value=metric.value,
        unit=metric.unit
    )
    
    db.add(new_metric)
    db.commit()
    db.refresh(new_metric)
    
    return new_metric


# 감사 로그 관련 엔드포인트
@router.get("/audit-logs", response_model=List[AdminAuditLog])
async def get_audit_logs(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=1000, description="반환할 최대 로그 수"),
    offset: int = Query(0, ge=0, description="건너뛸 로그 수"),
    user_id: Optional[str] = Query(None, description="필터링할 사용자 ID"),
    action: Optional[str] = Query(None, description="필터링할 작업 유형"),
    resource: Optional[str] = Query(None, description="필터링할 리소스 유형"),
    start_date: Optional[datetime] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[datetime] = Query(None, description="조회 종료 날짜"),
):
    """
    관리자 감사 로그를 조회합니다.
    다양한 필터링 옵션을 지원합니다.
    """
    from sqlalchemy import select
    from prisma.models import AdminAuditLog
    
    query = select(AdminAuditLog)
    
    # 필터 적용
    if user_id:
        query = query.where(AdminAuditLog.userId == user_id)
    if action:
        query = query.where(AdminAuditLog.action == action)
    if resource:
        query = query.where(AdminAuditLog.resource == resource)
    if start_date:
        query = query.where(AdminAuditLog.createdAt >= start_date)
    if end_date:
        query = query.where(AdminAuditLog.createdAt <= end_date)
    
    query = query.order_by(AdminAuditLog.createdAt.desc()).offset(offset).limit(limit)
    result = db.execute(query).scalars().all()
    
    return result


# 사용자 로그인 기록 엔드포인트
@router.get("/login-history", response_model=List[UserLoginHistory])
async def get_login_history(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=1000, description="반환할 최대 로그 수"),
    offset: int = Query(0, ge=0, description="건너뛸 로그 수"),
    user_id: Optional[str] = Query(None, description="필터링할 사용자 ID"),
    success: Optional[bool] = Query(None, description="성공/실패 여부로 필터링"),
    start_date: Optional[datetime] = Query(None, description="조회 시작 날짜"),
    end_date: Optional[datetime] = Query(None, description="조회 종료 날짜"),
):
    """
    사용자 로그인 기록을 조회합니다.
    """
    from sqlalchemy import select
    from prisma.models import UserLoginHistory
    
    query = select(UserLoginHistory)
    
    # 필터 적용
    if user_id:
        query = query.where(UserLoginHistory.userId == user_id)
    if success is not None:
        query = query.where(UserLoginHistory.success == success)
    if start_date:
        query = query.where(UserLoginHistory.timestamp >= start_date)
    if end_date:
        query = query.where(UserLoginHistory.timestamp <= end_date)
    
    query = query.order_by(UserLoginHistory.timestamp.desc()).offset(offset).limit(limit)
    result = db.execute(query).scalars().all()
    
    return result


# Git 관련 모델
class GitCommitRequest(BaseModel):
    message: str
    files: Optional[List[str]] = None


class GitCheckoutRequest(BaseModel):
    branch: str


class GitStatusResponse(BaseModel):
    branch: str
    modified: List[str]
    staged: List[str]
    untracked: List[str]
    ahead: int
    behind: int


class GitCommitResponse(BaseModel):
    hash: str
    author: str
    date: str
    message: str
    files_changed: int

    class Config:
        orm_mode = True


class GitBranchResponse(BaseModel):
    name: str
    display_name: str
    current: bool
    remote: bool
    last_commit: str
    last_commit_date: str

    class Config:
        orm_mode = True


# Git 관련 엔드포인트
@router.get("/git/status", response_model=Dict[str, Any])
async def get_git_status(
    repo_path: Optional[str] = Query(None, description="Git 저장소 경로 (기본값: 현재 디렉토리)")
):
    """
    Git 저장소의 현재 상태를 조회합니다.

    브랜치, 수정된 파일, 스테이지된 파일, 추적되지 않은 파일 등의 정보를 제공합니다.
    """
    from packages.api.src.utils.git_utils import get_repo_status
    
    try:
        status = get_repo_status(repo_path)
        return {
            "success": True,
            "data": status
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@router.get("/git/log", response_model=Dict[str, Any])
async def get_git_log(
    limit: int = Query(10, ge=1, le=100, description="조회할 최대 커밋 수"),
    path: Optional[str] = Query(None, description="특정 파일/디렉토리로 필터링"),
    repo_path: Optional[str] = Query(None, description="Git 저장소 경로 (기본값: 현재 디렉토리)")
):
    """
    Git 저장소의 커밋 이력을 조회합니다.

    최근 커밋들의 해시, 작성자, 날짜, 메시지 등의 정보를 제공합니다.
    """
    from packages.api.src.utils.git_utils import get_commit_logs
    
    try:
        commits = get_commit_logs(limit, repo_path, path)
        return {
            "success": True,
            "data": commits
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@router.get("/git/branches", response_model=Dict[str, Any])
async def get_git_branches(
    repo_path: Optional[str] = Query(None, description="Git 저장소 경로 (기본값: 현재 디렉토리)")
):
    """
    Git 저장소의 브랜치 목록을 조회합니다.

    로컬 및 원격 브랜치 정보를 제공합니다.
    """
    from packages.api.src.utils.git_utils import get_branches
    
    try:
        branches = get_branches(repo_path)
        return {
            "success": True,
            "data": branches
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@router.post("/git/checkout", response_model=Dict[str, Any])
async def checkout_git_branch(
    checkout_request: GitCheckoutRequest,
    repo_path: Optional[str] = Query(None, description="Git 저장소 경로 (기본값: 현재 디렉토리)")
):
    """
    지정된 브랜치로 체크아웃합니다.

    로컬 또는 원격 브랜치로 전환할 수 있습니다.
    """
    from packages.api.src.utils.git_utils import checkout_branch
    
    try:
        result = checkout_branch(checkout_request.branch, repo_path)
        return result
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@router.post("/git/commit", response_model=Dict[str, Any])
async def commit_git_changes(
    commit_request: GitCommitRequest,
    request: Request,
    repo_path: Optional[str] = Query(None, description="Git 저장소 경로 (기본값: 현재 디렉토리)"),
    user: dict = Depends(get_admin_user)
):
    """
    변경사항을 커밋합니다.

    커밋 메시지와 선택적으로 특정 파일들을 지정할 수 있습니다.
    커밋 결과 및 새로 생성된 커밋의 정보를 반환합니다.
    """
    from packages.api.src.utils.git_utils import commit_changes
    
    try:
        # 감사 로그 기록
        admin_audit_log = AdminAuditLogCreate(
            userId=user.get('id'),
            action="GIT_COMMIT",
            resource="git_repository",
            details={
                "message": commit_request.message,
                "files": commit_request.files
            },
            ip=request.client.host,
            userAgent=request.headers.get("user-agent", "")
        )
        
        # Git 작업 수행
        result = commit_changes(commit_request.message, commit_request.files, repo_path)
        
        # 감사 로그 저장 (비동기로 처리 가능)
        # await save_audit_log(admin_audit_log, get_db())
        
        return result
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@router.post("/git/pull", response_model=Dict[str, Any])
async def pull_git_changes(
    request: Request,
    repo_path: Optional[str] = Query(None, description="Git 저장소 경로 (기본값: 현재 디렉토리)"),
    user: dict = Depends(get_admin_user)
):
    """
    원격 저장소에서 변경사항을 가져옵니다 (pull).

    현재 브랜치에 대한 pull 작업을 수행합니다.
    """
    from packages.api.src.utils.git_utils import pull_changes
    
    try:
        # 감사 로그 기록
        admin_audit_log = AdminAuditLogCreate(
            userId=user.get('id'),
            action="GIT_PULL",
            resource="git_repository",
            ip=request.client.host,
            userAgent=request.headers.get("user-agent", "")
        )
        
        # Git 작업 수행
        result = pull_changes(repo_path)
        
        # 감사 로그 저장
        # await save_audit_log(admin_audit_log, get_db())
        
        return result
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@router.post("/git/push", response_model=Dict[str, Any])
async def push_git_changes(
    request: Request,
    repo_path: Optional[str] = Query(None, description="Git 저장소 경로 (기본값: 현재 디렉토리)"),
    user: dict = Depends(get_admin_user)
):
    """
    원격 저장소로 변경사항을 전송합니다 (push).

    현재 브랜치에 대한 push 작업을 수행합니다.
    """
    from packages.api.src.utils.git_utils import push_changes
    
    try:
        # 감사 로그 기록
        admin_audit_log = AdminAuditLogCreate(
            userId=user.get('id'),
            action="GIT_PUSH",
            resource="git_repository",
            ip=request.client.host,
            userAgent=request.headers.get("user-agent", "")
        )
        
        # Git 작업 수행
        result = push_changes(repo_path)
        
        # 감사 로그 저장
        # await save_audit_log(admin_audit_log, get_db())
        
        return result
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@router.get("/git/diff", response_model=Dict[str, Any])
async def get_git_diff(
    file: Optional[str] = Query(None, description="특정 파일 경로 (None인 경우 모든 변경사항)"),
    repo_path: Optional[str] = Query(None, description="Git 저장소 경로 (기본값: 현재 디렉토리)")
):
    """
    변경사항의 diff를 조회합니다.

    특정 파일 또는 전체 변경사항에 대한 diff 정보를 제공합니다.
    """
    from packages.api.src.utils.git_utils import get_diff
    
    try:
        result = get_diff(file, repo_path)
        return result
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@router.get("/git/history", response_model=Dict[str, Any])
async def get_git_file_history(
    path: str = Query(..., description="파일 경로"),
    limit: int = Query(10, ge=1, le=100, description="조회할 최대 커밋 수"),
    repo_path: Optional[str] = Query(None, description="Git 저장소 경로 (기본값: 현재 디렉토리)")
):
    """
    특정 파일의 변경 이력을 조회합니다.

    파일에 대한 커밋 이력을 제공합니다.
    """
    from packages.api.src.utils.git_utils import get_file_history
    
    try:
        commits = get_file_history(path, limit, repo_path)
        return {
            "success": True,
            "data": commits
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }


@router.get("/git/file-content", response_model=Dict[str, Any])
async def get_git_file_content(
    commit: str = Query(..., description="커밋 해시"),
    path: str = Query(..., description="파일 경로"),
    repo_path: Optional[str] = Query(None, description="Git 저장소 경로 (기본값: 현재 디렉토리)")
):
    """
    특정 커밋 시점의 파일 내용을 조회합니다.

    지정된 커밋 시점의 파일 내용을 제공합니다.
    """
    try:
        # Git 명령어로 특정 커밋 시점의 파일 내용 가져오기
        from packages.api.src.utils.git_utils import run_git_command
        
        try:
            # show 명령어 사용하여 해당 커밋의 파일 내용 가져오기
            output, _ = run_git_command(["show", f"{commit}:{path}"], repo_path)
            
            return {
                "success": True,
                "data": {
                    "content": output,
                    "commit": commit,
                    "path": path
                }
            }
        except Exception as e:
            # 파일이나 커밋을 찾을 수 없는 경우
            return {
                "success": False,
                "message": f"파일이나 커밋을 찾을 수 없습니다: {str(e)}"
            }
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }
