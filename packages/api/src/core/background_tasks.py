"""
백그라운드 작업 관리 모듈
애플리케이션 백그라운드에서 실행되는 비동기 작업들을 관리합니다.
"""

import asyncio
import functools
import gc
import logging
import os
import time
from datetime import datetime, timedelta
from typing import Any, Awaitable, Callable, Coroutine, Dict, List, Optional, Set

import psutil
from fastapi import FastAPI

# 병렬 처리 모듈 추가
from packages.api.src.coreparallel_processor import ParallelProcessor

logger = logging.getLogger(__name__)

# 백그라운드 작업 등록 저장소
TASK_REGISTRY: Dict[str, Callable[..., Coroutine[Any, Any, None]]] = {}

# 실행 중인 작업 목록
_running_tasks: Dict[str, asyncio.Task] = {}

# 병렬 처리 모니터링 데이터
_parallel_task_stats: Dict[str, Dict[str, Any]] = {}


def register_background_task(name: str):
    """
    백그라운드 작업을 등록하는 데코레이터

    Args:
        name: 백그라운드 작업의 고유 이름
    """

    def decorator(func: Callable[..., Coroutine[Any, Any, None]]):
        TASK_REGISTRY[name] = func
        logger.info(f"백그라운드 작업 등록됨: {name}")
        return func

    return decorator


@register_background_task("cache_memory_monitor")
async def check_cache_memory_usage(app: FastAPI):
    """
    주기적으로 캐시 메모리 사용량을 확인하고 필요시 정리하는 태스크

    Args:
        app: FastAPI 애플리케이션 인스턴스
    """
    # 모니터링 간격 (초)
    MONITORING_INTERVAL = 3600  # 1시간마다 실행

    while True:
        try:
            if hasattr(app.state, "cache_manager") and app.state.cache_manager:
                logger.info("캐시 메모리 사용량 확인 실행 중...")
                memory_usage = await app.state.cache_manager.check_memory_usage(
                    threshold_mb=500
                )
                logger.info(f"캐시 메모리 사용량: {memory_usage['local_memory_human']}")

                # 임계값 초과 시 메모리 정리
                if memory_usage.get("threshold_exceeded", False):
                    logger.warning(
                        "캐시 메모리 사용량이 임계값을 초과했습니다. 정리 작업 시작..."
                    )
                    await app.state.cache_manager.cleanup_expired()

            await asyncio.sleep(MONITORING_INTERVAL)
        except asyncio.CancelledError:
            logger.info("캐시 메모리 모니터링 작업이 취소되었습니다.")
            break
        except Exception as e:
            logger.error(f"캐시 메모리 모니터링 중 오류 발생: {str(e)}")
            await asyncio.sleep(60)  # 오류 발생 시 1분 후 재시도


@register_background_task("system_stats_collector")
async def collect_system_stats(app: FastAPI):
    """
    시스템 통계 정보를 수집하는 백그라운드 작업

    Args:
        app: FastAPI 애플리케이션 인스턴스
    """
    # 수집 간격 (초)
    COLLECTION_INTERVAL = 300  # 5분마다 실행

    while True:
        try:
            logger.debug("시스템 통계 정보 수집 중...")
            # 여기에 시스템 통계 수집 로직 구현
            # 예: CPU, 메모리, 디스크 사용량 등

            await asyncio.sleep(COLLECTION_INTERVAL)
        except asyncio.CancelledError:
            logger.info("시스템 통계 수집 작업이 취소되었습니다.")
            break
        except Exception as e:
            logger.error(f"시스템 통계 수집 중 오류 발생: {str(e)}")
            await asyncio.sleep(60)  # 오류 발생 시 1분 후 재시도


async def start_background_tasks(app: FastAPI) -> Set[asyncio.Task]:
    """
    등록된 모든 백그라운드 작업을 시작합니다.

    Args:
        app: FastAPI 애플리케이션 인스턴스

    Returns:
        실행 중인 작업 Task 객체 집합
    """
    tasks: Set[asyncio.Task] = set()

    for name, task_func in TASK_REGISTRY.items():
        logger.info(f"백그라운드 작업 시작: {name}")
        task = asyncio.create_task(task_func(app))
        task.set_name(name)  # 작업 이름 설정 (디버깅용)
        tasks.add(task)

        # 작업 완료 시 tasks 집합에서 제거하도록 콜백 등록
        task.add_done_callback(lambda t: tasks.discard(t))

    return tasks


async def cancel_background_tasks(tasks: Set[asyncio.Task]) -> None:
    """
    실행 중인 모든 백그라운드 작업을 취소합니다.

    Args:
        tasks: 취소할 작업 Task 객체 집합
    """
    if not tasks:
        logger.info("취소할 백그라운드 작업이 없습니다.")
        return

    logger.info(f"{len(tasks)}개의 백그라운드 작업 취소 중...")

    # 모든 작업 취소
    for task in tasks:
        if not task.done():
            task.cancel()

    # 취소된 작업들이 완료될 때까지 대기
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)

    logger.info("모든 백그라운드 작업이 취소되었습니다.")


# 병렬 처리 모니터링 기능 추가
async def monitor_parallel_tasks() -> None:
    """
    병렬 처리 작업의 성능과 리소스 사용량을 모니터링하는 백그라운드 태스크입니다.
    병렬 처리 작업의 실행 시간, 성공/실패 횟수, 리소스 사용량 등을 추적합니다.
    """
    monitor_interval_seconds = 60  # 1분
    retention_period_hours = 24  # 통계 데이터 보존 기간 (시간)

    while True:
        try:
            current_time = datetime.now()

            # 오래된 통계 데이터 제거
            for task_name in list(_parallel_task_stats.keys()):
                task_data = _parallel_task_stats[task_name]
                last_update = datetime.fromisoformat(
                    task_data.get("last_update", "2000-01-01T00:00:00")
                )

                if current_time - last_update > timedelta(hours=retention_period_hours):
                    logger.debug(f"오래된 병렬 작업 통계 제거: {task_name}")
                    del _parallel_task_stats[task_name]

            # 현재 통계 로깅
            active_tasks = len(_parallel_task_stats)
            if active_tasks > 0:
                total_executions = sum(
                    data.get("total_executions", 0)
                    for data in _parallel_task_stats.values()
                )
                avg_execution_time = sum(
                    data.get("avg_execution_time", 0) * data.get("total_executions", 0)
                    for data in _parallel_task_stats.values()
                ) / max(total_executions, 1)

                logger.info(
                    f"병렬 작업 모니터링: {active_tasks}개 작업, "
                    f"총 {total_executions}회 실행, "
                    f"평균 실행 시간: {avg_execution_time:.2f}초"
                )

        except Exception as e:
            logger.error(f"병렬 작업 모니터링 중 오류 발생: {str(e)}")

        await asyncio.sleep(monitor_interval_seconds)


def register_parallel_task_execution(
    task_name: str,
    execution_time: float,
    success: bool = True,
    error: Optional[Exception] = None,
) -> None:
    """
    병렬 작업 실행 결과를 기록합니다.

    Args:
        task_name: 작업 이름
        execution_time: 실행 시간(초)
        success: 성공 여부
        error: 오류 발생 시 예외 객체
    """
    if task_name not in _parallel_task_stats:
        _parallel_task_stats[task_name] = {
            "total_executions": 0,
            "successful_executions": 0,
            "failed_executions": 0,
            "avg_execution_time": 0.0,
            "min_execution_time": float("inf"),
            "max_execution_time": 0.0,
            "last_update": datetime.now().isoformat(),
            "last_error": None,
        }

    stats = _parallel_task_stats[task_name]
    stats["total_executions"] += 1

    if success:
        stats["successful_executions"] += 1
    else:
        stats["failed_executions"] += 1
        stats["last_error"] = str(error) if error else "Unknown error"

    # 실행 시간 통계 업데이트
    stats["avg_execution_time"] = (
        stats["avg_execution_time"] * (stats["total_executions"] - 1) + execution_time
    ) / stats["total_executions"]
    stats["min_execution_time"] = min(stats["min_execution_time"], execution_time)
    stats["max_execution_time"] = max(stats["max_execution_time"], execution_time)
    stats["last_update"] = datetime.now().isoformat()


class ParallelTaskMonitor:
    """
    병렬 작업 모니터링을 위한 컨텍스트 매니저
    작업 실행 시간과 결과를 자동으로 기록합니다.
    """

    def __init__(self, task_name: str):
        """
        ParallelTaskMonitor 초기화

        Args:
            task_name: 모니터링할 작업 이름
        """
        self.task_name = task_name
        self.start_time = None

    async def __aenter__(self):
        self.start_time = time.time()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        execution_time = time.time() - self.start_time
        success = exc_type is None
        register_parallel_task_execution(
            self.task_name, execution_time, success, exc_val
        )
        # 예외를 처리하지 않고 전파
        return False


def get_parallel_task_stats() -> Dict[str, Dict[str, Any]]:
    """
    모든 병렬 작업의 통계 데이터를 반환합니다.

    Returns:
        작업별 통계 데이터 사전
    """
    return _parallel_task_stats


def get_parallelizable_tasks() -> List[str]:
    """
    병렬 처리에 적합한 태스크 목록을 반환합니다.

    Returns:
        병렬 처리 가능한 태스크 이름 목록
    """
    return [
        name
        for name, task in TASK_REGISTRY.items()
        if hasattr(task, "__parallelizable__") and task.__parallelizable__
    ]


def initialize_background_tasks() -> None:
    """
    모든 기본 백그라운드 태스크를 초기화하고 시작합니다.
    """
    # 기본 태스크 등록
    register_background_task("cache_memory_monitor", check_cache_memory_usage)
    register_background_task("system_stats_collector", collect_system_stats)
    register_background_task("parallel_task_monitor", monitor_parallel_tasks)

    # 기본 태스크 시작
    start_background_tasks(None)

    logger.info("백그라운드 태스크 초기화 완료")


def cleanup_background_tasks() -> None:
    """
    모든 실행 중인 백그라운드 태스크를 중지합니다.
    애플리케이션 종료 시 호출해야 합니다.
    """
    for task_name in list(_running_tasks.keys()):
        try:
            cancel_background_tasks({_running_tasks[task_name]})
        except Exception as e:
            logger.error(f"태스크 '{task_name}' 중지 중 오류 발생: {str(e)}")

    logger.info("모든 백그라운드 태스크 정리 완료")


# 백그라운드 태스크를 병렬로 실행하기 위한 유틸리티 함수
async def run_tasks_in_parallel(
    tasks: List[str], max_workers: int = None
) -> Dict[str, Any]:
    """
    여러 백그라운드 태스크를 병렬로 한 번 실행합니다.

    Args:
        tasks: 실행할 태스크 이름 목록
        max_workers: 최대 작업자 수

    Returns:
        각 태스크의 실행 결과를 담은 사전
    """
    processor = ParallelProcessor(max_workers=max_workers)

    # 태스크 함수를 비동기 실행 가능한 형태로 변환
    async def execute_task(task_name: str):
        if task_name not in TASK_REGISTRY:
            raise KeyError(f"'{task_name}' 태스크가 등록되어 있지 않습니다.")

        task_func = TASK_REGISTRY[task_name]
        async with ParallelTaskMonitor(task_name):
            # 태스크 함수가 코루틴 함수인지 확인
            if asyncio.iscoroutinefunction(task_func):
                return await task_func(None)
            else:
                return task_func(None)

    # 병렬 실행
    task_dict = {
        task_name: functools.partial(execute_task, task_name) for task_name in tasks
    }

    try:
        return await processor.execute_parallel(task_dict)
    except Exception as e:
        logger.error(f"병렬 태스크 실행 중 오류 발생: {str(e)}")
        raise
