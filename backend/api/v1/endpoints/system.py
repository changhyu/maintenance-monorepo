from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import Dict, Any, List, Optional
import os
import platform
import psutil
import json
import datetime
import shutil
import sys
from pathlib import Path
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.core.cache import cached, invalidate_cache
from backend.core.config import settings

router = APIRouter(prefix="/system", tags=["시스템"])

def get_size(bytes, suffix="B"):
    """
    바이트를 사람이 읽기 쉬운 형식으로 변환합니다.
    """
    factor = 1024
    for unit in ["", "K", "M", "G", "T", "P"]:
        if bytes < factor:
            return f"{bytes:.2f}{unit}{suffix}"
        bytes /= factor

@router.get("/info")
async def system_info():
    """
    시스템 기본 정보를 제공합니다.
    """
    try:
        info = {
            "system": platform.system(),
            "node": platform.node(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "python_version": sys.version,
            "current_directory": os.getcwd(),
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        return info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"시스템 정보를 가져오는 중 오류 발생: {str(e)}"
        )

@router.get("/memory")
async def memory_info():
    """
    메모리 사용량 정보를 제공합니다.
    """
    try:
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        memory_info = {
            "total": get_size(memory.total),
            "available": get_size(memory.available),
            "used": get_size(memory.used),
            "percentage": memory.percent,
            "swap": {
                "total": get_size(swap.total),
                "free": get_size(swap.free),
                "used": get_size(swap.used),
                "percentage": swap.percent
            }
        }
        
        return memory_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"메모리 정보를 가져오는 중 오류 발생: {str(e)}"
        )

@router.get("/disk")
async def disk_info(path: str = Query("/", description="확인할 디스크 경로")):
    """
    디스크 사용량 정보를 제공합니다.
    """
    try:
        disk = shutil.disk_usage(path)
        disk_info = {
            "path": path,
            "total": get_size(disk.total),
            "used": get_size(disk.used),
            "free": get_size(disk.free),
            "percentage": round(disk.used / disk.total * 100, 2)
        }
        
        return disk_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"디스크 정보를 가져올 수 없습니다: {str(e)}"
        )

@router.get("/cpu")
async def cpu_info():
    """
    CPU 정보 및 사용량을 제공합니다.
    """
    try:
        cpu_freq = psutil.cpu_freq()
        max_freq = cpu_freq.max if cpu_freq and hasattr(cpu_freq, 'max') else None
        current_freq = cpu_freq.current if cpu_freq and hasattr(cpu_freq, 'current') else None
        
        cpu_info = {
            "physical_cores": psutil.cpu_count(logical=False),
            "total_cores": psutil.cpu_count(logical=True),
            "max_frequency": f"{max_freq:.2f}Mhz" if max_freq else "Unknown",
            "current_frequency": f"{current_freq:.2f}Mhz" if current_freq else "Unknown",
        }
        
        try:
            # 이 부분은 시간이 걸리므로 예외 처리
            cpu_percentages = psutil.cpu_percent(percpu=True, interval=0.1)
            cpu_info["cpu_usage_per_core"] = [f"{percentage:.2f}%" for percentage in cpu_percentages]
            cpu_info["total_cpu_usage"] = f"{psutil.cpu_percent(interval=0.1):.2f}%"
        except Exception:
            cpu_info["cpu_usage_per_core"] = []
            cpu_info["total_cpu_usage"] = "Unknown"
        
        return cpu_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"CPU 정보를 가져오는 중 오류 발생: {str(e)}"
        )

@router.get("/processes")
async def process_info(limit: int = Query(10, description="표시할 프로세스 수")):
    """
    실행 중인 프로세스 정보를 제공합니다.
    """
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username', 'memory_percent', 'cpu_percent', 'create_time', 'status']):
            try:
                process_info = proc.info
                create_time = process_info.get('create_time')
                if create_time:
                    try:
                        process_info['create_time'] = datetime.datetime.fromtimestamp(create_time).isoformat()
                    except (TypeError, ValueError, OverflowError):
                        process_info['create_time'] = None
                
                # None 값 처리
                memory_percent = process_info.get('memory_percent')
                cpu_percent = process_info.get('cpu_percent')
                
                process_info['memory_percent'] = f"{memory_percent:.2f}%" if memory_percent is not None else "0.00%"
                process_info['cpu_percent'] = f"{cpu_percent:.2f}%" if cpu_percent is not None else "0.00%"
                
                processes.append(process_info)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess, Exception):
                continue
        
        # CPU 사용량 기준으로 정렬 - 오류 처리 추가
        try:
            processes.sort(key=lambda x: float(x['cpu_percent'].replace('%', '')) if x['cpu_percent'] != "0.00%" else 0, reverse=True)
        except (ValueError, TypeError, AttributeError):
            # 정렬 중 오류 발생 시 원래 순서 유지
            pass
        
        return {"processes": processes[:limit]}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"프로세스 정보를 가져오는 중 오류 발생: {str(e)}"
        )

@router.get("/settings", response_model=List[dict])
@cached(ttl=3600)  # 1시간 캐시
async def get_settings(db: Session = Depends(get_db)):
    """시스템 설정을 조회합니다."""
    settings_list = [
        {"key": "API_VERSION", "value": settings.API_VERSION},
        {"key": "PROJECT_NAME", "value": settings.PROJECT_NAME},
        {"key": "ENVIRONMENT", "value": settings.ENVIRONMENT},
        {"key": "DEBUG", "value": settings.DEBUG},
        {"key": "ALLOWED_ORIGINS", "value": settings.ALLOWED_ORIGINS},
    ]
    return settings_list

@router.get("/cache/stats")
async def get_cache_stats():
    """캐시 사용 통계를 조회합니다."""
    from backend.core.cache import get_cache_stats
    return get_cache_stats()

@router.post("/cache/invalidate/{pattern}")
async def invalidate_cache_pattern(pattern: str):
    """지정된 패턴과 일치하는 캐시를 무효화합니다."""
    await invalidate_cache(pattern)
    return {"message": f"'{pattern}' 패턴과 일치하는 캐시가 무효화되었습니다."} 