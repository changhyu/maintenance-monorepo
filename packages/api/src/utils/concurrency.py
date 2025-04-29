"""
비동기 작업 및 구조적 동시성을 관리하기 위한 유틸리티 모듈
"""

import asyncio
import functools
import logging
import time
from contextlib import asynccontextmanager
from typing import (Any, Awaitable, Callable, Dict, List, Optional, Tuple,
                    TypeVar, cast)

from packages.api.srccore.logging_setup import get_logger

# 제네릭 타입 변수 정의
T = TypeVar("T")
R = TypeVar("R")

# 로거 설정
logger = get_logger(__name__)

# 기본 타임아웃 설정 (초)
DEFAULT_TIMEOUT = 30.0


async def gather_with_concurrency(
    tasks: List[Awaitable[T]],
    limit: int = 10,
    timeout: float = DEFAULT_TIMEOUT,
    return_exceptions: bool = False,
) -> List[T]:
    """
    동시성 제한이 있는 비동기 작업 모음 실행

    Args:
        tasks: 실행할 비동기 작업(코루틴) 목록
        limit: 최대 동시 실행 수
        timeout: 작업별 타임아웃 (초)
        return_exceptions: 예외를 반환할지 여부

    Returns:
        실행 결과 목록
    """
    # 동시성을 제한하는 세마포어
    semaphore = asyncio.Semaphore(limit)

    async def _wrap_task(task: Awaitable[T]) -> T:
        """작업에 세마포어와 타임아웃을 적용하는 래퍼 함수"""
        try:
            async with semaphore:
                # 타임아웃 적용
                return await asyncio.wait_for(task, timeout=timeout)
        except asyncio.TimeoutError:
            logger.warning(f"Task timed out after {timeout} seconds")
            if return_exceptions:
                return asyncio.TimeoutError(f"Task timed out after {timeout} seconds")  # type: ignore
            raise
        except Exception as e:
            logger.error(f"Task failed with error: {str(e)}")
            if return_exceptions:
                return e  # type: ignore
            raise

    # 각 작업을 래퍼로 감싸서 실행
    wrapped_tasks = [_wrap_task(task) for task in tasks]
    return await asyncio.gather(*wrapped_tasks, return_exceptions=return_exceptions)


async def run_in_executor(func: Callable[..., R], *args: Any, **kwargs: Any) -> R:
    """
    CPU 바운드 작업을 스레드 풀에서 실행

    Args:
        func: 실행할 함수
        *args: 함수에 전달할 위치 인자
        **kwargs: 함수에 전달할 키워드 인자

    Returns:
        함수 실행 결과
    """
    # 부분 함수 적용으로 인자 바인딩
    bound_func = functools.partial(func, *args, **kwargs)
    loop = asyncio.get_event_loop()

    # 스레드 풀에서 실행
    return await loop.run_in_executor(None, bound_func)


@asynccontextmanager
async def timed_operation(operation_name: str):
    """
    작업 실행 시간을 측정하는 비동기 컨텍스트 매니저

    Args:
        operation_name: 작업 이름 (로깅용)
    """
    start_time = time.time()
    try:
        yield
    finally:
        elapsed_time = time.time() - start_time
        logger.info(
            f"Operation '{operation_name}' completed in {elapsed_time:.2f} seconds"
        )


class AsyncBatcher:
    """
    비동기 일괄 처리 유틸리티
    여러 작업을 배치로 처리하여 효율을 높입니다.
    """

    def __init__(
        self,
        batch_size: int = 100,
        flush_interval: float = 1.0,
        max_concurrent_batches: int = 5,
    ):
        """
        초기화

        Args:
            batch_size: 단일 배치의 최대 항목 수
            flush_interval: 자동 플러시 간격 (초)
            max_concurrent_batches: 최대 동시 실행 배치 수
        """
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.items: List[Any] = []
        self.last_flush_time = time.time()
        self.batch_semaphore = asyncio.Semaphore(max_concurrent_batches)

    async def add(self, item: Any) -> None:
        """
        배치에 항목 추가

        Args:
            item: 추가할 항목
        """
        self.items.append(item)

        # 배치 크기 도달 시 자동 플러시
        if len(self.items) >= self.batch_size:
            await self.flush()
        # 시간 간격 도달 시 자동 플러시
        elif time.time() - self.last_flush_time >= self.flush_interval and self.items:
            await self.flush()

    async def flush(self) -> None:
        """현재 배치 처리 및 초기화"""
        if not self.items:
            return

        items_to_process = self.items.copy()
        self.items.clear()
        self.last_flush_time = time.time()

        async with self.batch_semaphore:
            try:
                await self._process_batch(items_to_process)
            except Exception as e:
                logger.error(f"Batch processing failed: {str(e)}")
                raise

    async def _process_batch(self, batch: List[Any]) -> None:
        """
        배치 처리 구현 (하위 클래스에서 재정의)

        Args:
            batch: 처리할 항목 배치
        """
        # 이 메서드는 하위 클래스에서 구현해야 함
        pass
