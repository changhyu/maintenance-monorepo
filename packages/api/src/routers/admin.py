"""
관리자 API 라우터.

시스템 관리 관련 API 엔드포인트를 제공합니다.
"""

from typing import Dict, List, Any, Optional
from fastapi import APIRouter, Depends, Request, HTTPException, Query
from pydantic import BaseModel
import time
import psutil
import os

from ..core.dependencies import get_admin_user
from ..core.cache import cache
from ..core.cache_decorators import CacheLevel
from ..core.metrics_collector import metrics_collector
from ..core.parallel_processor import ParallelProcessor

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_admin_user)]
)

# 데이터 모델
class CacheStats(BaseModel):
    hits: int
    misses: int
    hit_rate: float
    memory_usage_mb: float
    keys_count: int
    keys_by_prefix: Dict[str, int]

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
        keys_by_prefix=prefix_counts
    )

@router.get("/cache/keys", response_model=Dict[str, List[str]])
async def get_cache_keys(
    prefix: Optional[str] = Query(None, description="필터링할 키 접두사"),
    limit: int = Query(100, ge=1, le=1000, description="반환할 최대 키 수")
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
async def clear_cache(prefix: Optional[str] = Query(None, description="삭제할 키 접두사")):
    """
    캐시를 초기화합니다.
    
    접두사가 지정된 경우 해당 접두사로 시작하는 키만 삭제합니다.
    그렇지 않으면 모든 캐시를 초기화합니다.
    """
    if prefix:
        pattern = f"{prefix}*"
        deleted_count = await cache.delete_pattern(pattern)
        return {"success": True, "message": f"{deleted_count}개의 키가 삭제되었습니다", "pattern": pattern}
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
        "memory_samples": get_memory_samples
    }
    
    results = await processor.execute_parallel(tasks)
    
    # 평균 계산
    hit_times = results.get("hit_times", [])
    miss_times = results.get("miss_times", [])
    memory_samples = results.get("memory_samples", [])
    
    avg_hit_time = sum(hit_times) / len(hit_times) if hit_times else 0
    avg_miss_time = sum(miss_times) / len(miss_times) if miss_times else 0
    avg_memory_usage = sum(memory_samples) / len(memory_samples) if memory_samples else 0
    
    # 성능 향상 계산
    performance_improvement = ((avg_miss_time - avg_hit_time) / avg_miss_time * 100) if avg_miss_time > 0 else 0
    
    return {
        "avg_hit_time_ms": round(avg_hit_time * 1000, 2),  # 밀리초로 변환
        "avg_miss_time_ms": round(avg_miss_time * 1000, 2),
        "performance_improvement_percent": round(performance_improvement, 2),
        "avg_memory_usage_mb": round(avg_memory_usage, 2),
        "sample_count": {
            "hit_times": len(hit_times),
            "miss_times": len(miss_times),
            "memory_samples": len(memory_samples)
        }
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
            "load_avg": psutil.getloadavg()
        }
    
    def get_memory_info():
        vm = psutil.virtual_memory()
        return {
            "total_gb": round(vm.total / (1024**3), 2),
            "available_gb": round(vm.available / (1024**3), 2),
            "used_gb": round(vm.used / (1024**3), 2),
            "percent": vm.percent
        }
    
    def get_disk_info():
        disk = psutil.disk_usage('/')
        return {
            "total_gb": round(disk.total / (1024**3), 2),
            "used_gb": round(disk.used / (1024**3), 2),
            "free_gb": round(disk.free / (1024**3), 2),
            "percent": disk.percent
        }
    
    def get_network_info():
        net_io = psutil.net_io_counters()
        return {
            "bytes_sent_mb": round(net_io.bytes_sent / (1024**2), 2),
            "bytes_recv_mb": round(net_io.bytes_recv / (1024**2), 2),
            "packets_sent": net_io.packets_sent,
            "packets_recv": net_io.packets_recv,
            "errin": net_io.errin,
            "errout": net_io.errout
        }
    
    tasks = {
        "cpu": get_cpu_info,
        "memory": get_memory_info,
        "disk": get_disk_info,
        "network": get_network_info,
        "uptime": lambda: time.time() - psutil.boot_time()
    }
    
    return await processor.execute_parallel(tasks) 