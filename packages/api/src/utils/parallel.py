"""
병렬 처리 유틸리티 모듈

이 모듈은 비동기 작업을 병렬로 처리하기 위한 유틸리티 함수들을 제공합니다.
"""

import asyncio
from typing import Any, Awaitable, Callable, Coroutine, List, TypeVar, Union

T = TypeVar("T")
R = TypeVar("R")


async def parallel_map(
    items: List[T],
    func: Union[Callable[[T], R], Callable[[T], Awaitable[R]]],
    max_concurrency: int = 10,
) -> List[R]:
    """
    리스트의 각 항목에 대해 함수를 병렬로 실행

    Args:
        items: 처리할 항목 리스트
        func: 각 항목에 적용할 함수 (동기 또는 비동기)
        max_concurrency: 최대 동시 실행 수

    Returns:
        처리 결과 리스트
    """
    if not items:
        return []

    # 세마포어로 동시 실행 수 제한
    semaphore = asyncio.Semaphore(max_concurrency)

    async def process_item(item: T) -> R:
        async with semaphore:
            try:
                if asyncio.iscoroutinefunction(func):
                    return await func(item)
                else:
                    # 동기 함수를 비동기로 실행
                    return await asyncio.create_task(asyncio.to_thread(func, item))
            except Exception as e:
                # 에러 로깅
                print(f"Error processing item {item}: {str(e)}")
                raise

    # 모든 작업을 동시에 시작하고 결과를 기다림
    tasks = [process_item(item) for item in items]
    return await asyncio.gather(*tasks, return_exceptions=False)


async def run_tasks_in_parallel(tasks: List[Awaitable[Any]]) -> List[Any]:
    """
    여러 비동기 작업을 병렬로 실행합니다.

    Args:
        tasks: 실행할 비동기 작업 리스트

    Returns:
        작업 결과 리스트
    """
    return await asyncio.gather(*tasks)


async def execute_task(task: Awaitable[Any]) -> Any:
    """
    단일 비동기 작업을 실행합니다.

    Args:
        task: 실행할 비동기 작업

    Returns:
        작업 결과
    """
    return await task
