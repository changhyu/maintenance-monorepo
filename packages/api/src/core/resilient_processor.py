"""
탄력성을 갖춘 병렬 처리 모듈

재시도 및 회로 차단기 패턴이 통합된 병렬 처리 기능을 제공합니다.
네트워크 오류나 외부 서비스 장애에 강한 병렬 처리를 구현합니다.
"""

import asyncio
import logging
import time
from typing import Any, Callable, Dict, List, Optional, Set, TypeVar, Union

from packages.api.src.coreparallel_processor import (
    AsyncQueryBatcher,
    DataBatcher,
    ParallelExecutionError,
    ParallelProcessor,
)
from packages.api.src.coreresilience import (
    CircuitBreakerError,
    circuit_breaker,
    resilient,
    retry,
)

T = TypeVar("T")
R = TypeVar("R")

logger = logging.getLogger(__name__)


class ResilientParallelProcessor(ParallelProcessor):
    """
    탄력성을 갖춘 병렬 처리기

    일시적인 오류에 대한 재시도 및 회로 차단기 패턴이 적용된 병렬 처리기입니다.
    """

    def __init__(
        self,
        max_workers: int = None,
        use_process_pool: bool = False,
        max_retries: int = 3,
        retry_delay: float = 0.5,
        circuit_breaker_enabled: bool = True,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
    ):
        """
        ResilientParallelProcessor 초기화

        Args:
            max_workers: 최대 작업자 수
            use_process_pool: 프로세스 풀 사용 여부
            max_retries: 최대 재시도 횟수
            retry_delay: 기본 재시도 대기 시간
            circuit_breaker_enabled: 회로 차단기 활성화 여부
            failure_threshold: 회로 차단기 실패 임계값
            recovery_timeout: 회로 차단기 회복 시간
        """
        super().__init__(max_workers, use_process_pool)
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.circuit_breaker_enabled = circuit_breaker_enabled
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout

    async def execute_parallel_resilient(
        self, tasks: Dict[str, Callable[[], T]], continue_on_exception: bool = False
    ) -> Dict[str, T]:
        """
        여러 작업을 병렬로 실행하며 재시도 및 회로 차단기 패턴을 적용

        Args:
            tasks: 실행할 작업 사전 (키: 작업 식별자, 값: 실행할 함수)
            continue_on_exception: 일부 작업 실패 시에도 계속 진행할지 여부

        Returns:
            각 작업의 결과를 담은 사전 (키: 작업 식별자, 값: 작업 결과)

        Raises:
            ParallelExecutionError: 하나 이상의 작업에서 오류 발생 시 (continue_on_exception=False인 경우)
        """
        start_time = time.time()
        results = {}
        errors = {}

        # 각 작업에 탄력성 패턴 적용
        resilient_tasks = {}
        for key, task in tasks.items():
            # 각 작업마다 고유한 회로 차단기 이름 생성
            circuit_name = f"parallel_task.{key}"

            # 작업을 탄력성 패턴으로 래핑
            @resilient(
                name=circuit_name if self.circuit_breaker_enabled else None,
                retry_config={
                    "max_retries": self.max_retries,
                    "retry_delay": self.retry_delay,
                    "backoff_factor": 2.0,
                    "jitter": True,
                },
                circuit_breaker_config=(
                    {
                        "failure_threshold": self.failure_threshold,
                        "recovery_timeout": self.recovery_timeout,
                    }
                    if self.circuit_breaker_enabled
                    else None
                ),
            )
            async def resilient_task():
                return task()

            resilient_tasks[key] = resilient_task

        # 병렬 실행
        try:
            # 원래 구현 활용하여 병렬 실행
            return await super().execute_parallel(resilient_tasks)

        except ParallelExecutionError as e:
            # 원래 에러는 그대로 전달
            if not continue_on_exception:
                raise

            # 계속 진행 모드: 성공한 결과와 실패 정보 수집
            for key, error in e.errors.items():
                errors[key] = error
                logger.warning(
                    f"작업 '{key}' 실행 실패 (continue_on_exception=True): {str(error)}"
                )

            # 에러가 없는 키들에 대한 결과 추출
            for key in tasks.keys():
                if key not in e.errors and key in e.results:
                    results[key] = e.results[key]

            # 진행 상황 로깅
            execution_time = time.time() - start_time
            success_count = len(results)
            error_count = len(errors)
            logger.info(
                f"탄력적 병렬 실행 완료 (일부 실패): {success_count}개 성공, {error_count}개 실패 "
                f"(소요 시간: {execution_time:.2f}초)"
            )

            return results


class ResilientDataBatcher(DataBatcher):
    """
    탄력성을 갖춘 데이터 배치 처리기

    재시도 및 회로 차단기 패턴이 적용된 데이터 배치 처리기입니다.
    """

    def __init__(
        self,
        batch_size: int = 1000,
        max_retries: int = 3,
        retry_delay: float = 0.5,
        circuit_breaker_enabled: bool = True,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
    ):
        """
        ResilientDataBatcher 초기화

        Args:
            batch_size: 배치 크기
            max_retries: 최대 재시도 횟수
            retry_delay: 기본 재시도 대기 시간
            circuit_breaker_enabled: 회로 차단기 활성화 여부
            failure_threshold: 회로 차단기 실패 임계값
            recovery_timeout: 회로 차단기 회복 시간
        """
        super().__init__(batch_size)
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.circuit_breaker_enabled = circuit_breaker_enabled
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout

    async def process_batches_resilient(
        self,
        items: List[T],
        processor: Callable[[List[T]], R],
        max_workers: int = None,
        continue_on_exception: bool = False,
    ) -> List[R]:
        """
        항목 목록을 배치로 나누어 병렬로 처리하고 재시도 메커니즘 적용

        Args:
            items: 처리할 항목 목록
            processor: 각 배치를 처리할 함수
            max_workers: 최대 작업자 수
            continue_on_exception: 일부 배치 실패 시에도 계속 진행할지 여부

        Returns:
            각 배치 처리 결과의 목록
        """
        batches = self.create_batches(items)
        logger.info(
            f"{len(items)} 항목을 {len(batches)}개 배치로 나누어 탄력적으로 처리합니다."
        )

        # 탄력성 병렬 처리기 생성
        parallel = ResilientParallelProcessor(
            max_workers=max_workers,
            max_retries=self.max_retries,
            retry_delay=self.retry_delay,
            circuit_breaker_enabled=self.circuit_breaker_enabled,
            failure_threshold=self.failure_threshold,
            recovery_timeout=self.recovery_timeout,
        )

        # 각 배치에 대한 작업 생성
        tasks = {
            f"batch_{i}": lambda batch=batch: processor(batch)
            for i, batch in enumerate(batches)
        }

        # 탄력적 실행
        results_dict = await parallel.execute_parallel_resilient(
            tasks, continue_on_exception=continue_on_exception
        )

        # 결과를 원래 순서대로 정렬
        results = []
        for i in range(len(batches)):
            batch_key = f"batch_{i}"
            if batch_key in results_dict:
                results.append(results_dict[batch_key])

        return results


class ResilientAsyncQueryBatcher(AsyncQueryBatcher):
    """
    탄력성을 갖춘 비동기 쿼리 배치 처리기

    재시도 및 회로 차단기 패턴이 적용된 비동기 쿼리 배치 처리기입니다.
    """

    def __init__(
        self,
        concurrency_limit: int = 5,
        max_retries: int = 3,
        retry_delay: float = 0.5,
        circuit_breaker_enabled: bool = True,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
    ):
        """
        ResilientAsyncQueryBatcher 초기화

        Args:
            concurrency_limit: 동시성 제한
            max_retries: 최대 재시도 횟수
            retry_delay: 기본 재시도 대기 시간
            circuit_breaker_enabled: 회로 차단기 활성화 여부
            failure_threshold: 회로 차단기 실패 임계값
            recovery_timeout: 회로 차단기 회복 시간
        """
        super().__init__(concurrency_limit)
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.circuit_breaker_enabled = circuit_breaker_enabled
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout

    async def execute_queries_resilient(
        self, queries: List[Callable[[], Any]], continue_on_exception: bool = False
    ) -> Dict[str, Any]:
        """
        여러 쿼리를 제한된 동시성으로 실행하고 재시도 및 회로 차단기 적용

        Args:
            queries: 실행할 쿼리 함수 목록 (각 함수는 (key, result) 튜플을 반환해야 함)
            continue_on_exception: 일부 쿼리 실패 시에도 계속 진행할지 여부

        Returns:
            쿼리 결과를 담은 사전 (키: 쿼리 식별자, 값: 쿼리 결과)
        """
        # 각 쿼리에 탄력성 패턴 적용
        resilient_queries = []

        for i, query_func in enumerate(queries):
            # 각 쿼리마다 고유한 회로 차단기 이름 생성
            circuit_name = f"async_query.{i}"

            # 쿼리 함수 래핑
            @resilient(
                name=circuit_name if self.circuit_breaker_enabled else None,
                retry_config={
                    "max_retries": self.max_retries,
                    "retry_delay": self.retry_delay,
                    "backoff_factor": 2.0,
                    "jitter": True,
                },
                circuit_breaker_config=(
                    {
                        "failure_threshold": self.failure_threshold,
                        "recovery_timeout": self.recovery_timeout,
                    }
                    if self.circuit_breaker_enabled
                    else None
                ),
            )
            async def resilient_query(query=query_func):
                return await query()

            resilient_queries.append(resilient_query)

        # 세마포어로 제어된 실행
        async def _execute_with_semaphore(query_func):
            async with self.semaphore:
                try:
                    return await query_func()
                except Exception as e:
                    if continue_on_exception:
                        logger.warning(
                            f"쿼리 실행 실패 (continue_on_exception=True): {str(e)}"
                        )
                        return None
                    raise

        # 모든 쿼리 동시 실행 (세마포어로 제한됨)
        results = await asyncio.gather(
            *[_execute_with_semaphore(query) for query in resilient_queries],
            return_exceptions=continue_on_exception,
        )

        # 결과를 사전으로 변환 (None 및 예외 필터링)
        result_dict = {}
        for result in results:
            if result is not None and not isinstance(result, Exception):
                key, value = result
                result_dict[key] = value

        return result_dict


# 편의 함수들


async def parallel_map_resilient(
    func: Callable[[T], R],
    items: List[T],
    max_workers: int = None,
    max_retries: int = 3,
    retry_delay: float = 0.5,
    circuit_breaker_enabled: bool = True,
    continue_on_exception: bool = False,
) -> List[R]:
    """
    리스트의 각 항목에 함수를 병렬로 적용하고 재시도 메커니즘 적용

    Args:
        func: 각 항목에 적용할 함수
        items: 처리할 항목 목록
        max_workers: 최대 작업자 수
        max_retries: 최대 재시도 횟수
        retry_delay: 기본 재시도 대기 시간
        circuit_breaker_enabled: 회로 차단기 활성화 여부
        continue_on_exception: 일부 작업 실패 시에도 계속 진행할지 여부

    Returns:
        함수를 적용한 결과 목록
    """
    processor = ResilientParallelProcessor(
        max_workers=max_workers,
        max_retries=max_retries,
        retry_delay=retry_delay,
        circuit_breaker_enabled=circuit_breaker_enabled,
    )

    # 각 항목에 대한 작업 생성
    tasks = {f"item_{i}": lambda item=item: func(item) for i, item in enumerate(items)}

    # 병렬 실행
    results = await processor.execute_parallel_resilient(tasks, continue_on_exception)

    # 결과를 원래 순서대로 정렬
    return [
        results.get(f"item_{i}") for i in range(len(items)) if f"item_{i}" in results
    ]
