"""
병렬 처리 및 비동기 최적화 모듈
API의 성능을 향상시키기 위한 병렬 쿼리 실행 및 비동기 처리 기능을 제공합니다.
"""
import asyncio
import logging
import time
import functools
import inspect
from typing import List, Dict, Any, Callable, TypeVar, Generic, Optional, Union, Tuple, Set
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from contextlib import contextmanager

logger = logging.getLogger(__name__)

T = TypeVar('T')
R = TypeVar('R')

class ParallelExecutionError(Exception):
    """병렬 실행 중 발생한 오류를 표현하는 예외 클래스"""
    
    def __init__(self, errors: Dict[str, Exception]):
        self.errors = errors
        error_messages = '\n'.join([f"{key}: {str(err)}" for key, err in errors.items()])
        super().__init__(f"병렬 실행 중 다음 오류가 발생했습니다:\n{error_messages}")


class ParallelProcessor:
    """
    병렬 처리를 위한 클래스
    여러 작업을 동시에 실행하여 API 성능을 향상시킵니다.
    """

    def __init__(self, max_workers: int = None, use_process_pool: bool = False):
        """
        ParallelProcessor 초기화
        
        Args:
            max_workers: 동시 실행할 최대 작업자 수 (None인 경우 시스템 기본값 사용)
            use_process_pool: 프로세스 풀 사용 여부 (True: ProcessPoolExecutor, False: ThreadPoolExecutor)
        """
        self.max_workers = max_workers
        self.use_process_pool = use_process_pool
        self._executor = None
    
    @contextmanager
    def executor(self):
        """
        실행기 컨텍스트 매니저
        사용 후 자동으로 정리합니다.
        """
        executor_class = ProcessPoolExecutor if self.use_process_pool else ThreadPoolExecutor
        executor = executor_class(max_workers=self.max_workers)
        try:
            yield executor
        finally:
            executor.shutdown(wait=False)
    
    async def execute_parallel(self, tasks: Dict[str, Callable[[], T]]) -> Dict[str, T]:
        """
        여러 작업을 병렬로 실행합니다.
        
        Args:
            tasks: 실행할 작업 사전 (키: 작업 식별자, 값: 실행할 함수)
            
        Returns:
            각 작업의 결과를 담은 사전 (키: 작업 식별자, 값: 작업 결과)
            
        Raises:
            ParallelExecutionError: 하나 이상의 작업에서 오류 발생 시
        """
        start_time = time.time()
        loop = asyncio.get_event_loop()
        results = {}
        errors = {}
        
        # 프로세스 풀을 사용하는 경우 ThreadPool로 대체
        # 프로세스 풀은 로컬 함수나 람다를 직렬화할 수 없음
        if self.use_process_pool and any(not inspect.isfunction(task) for task in tasks.values()):
            logger.warning("프로세스 풀에서 로컬 함수나 람다를 실행할 수 없어 스레드 풀로 대체합니다.")
            original_setting = self.use_process_pool
            self.use_process_pool = False
            try:
                return await self.execute_parallel(tasks)
            finally:
                self.use_process_pool = original_setting
        
        with self.executor() as executor:
            # 모든 작업을 실행기에 제출
            futures = {
                key: loop.run_in_executor(executor, task)
                for key, task in tasks.items()
            }
            
            # 모든 작업 완료 대기
            for key, future in futures.items():
                try:
                    results[key] = await future
                except Exception as e:
                    logger.error(f"병렬 실행 작업 '{key}' 중 오류 발생: {str(e)}")
                    errors[key] = e
        
        execution_time = time.time() - start_time
        logger.debug(f"병렬 실행 완료: {len(results)}개 성공, {len(errors)}개 실패 (소요 시간: {execution_time:.2f}초)")
        
        # 오류가 있는 경우 예외 발생
        if errors:
            raise ParallelExecutionError(errors)
        
        return results
    
    async def execute_all(self, tasks: List[Callable[[], T]]) -> List[T]:
        """
        여러 작업을 병렬로 실행하고 결과 목록을 반환합니다.
        
        Args:
            tasks: 실행할 작업 목록
            
        Returns:
            각 작업의 결과를 담은 목록
        """
        task_dict = {f"task_{i}": task for i, task in enumerate(tasks)}
        results_dict = await self.execute_parallel(task_dict)
        # 원래 순서대로 결과 정렬
        return [results_dict[f"task_{i}"] for i in range(len(tasks))]


def parallel_map(func: Callable[[T], R], items: List[T], 
                max_workers: int = None, use_process_pool: bool = False) -> List[R]:
    """
    리스트의 각 항목에 함수를 병렬로 적용합니다.
    
    Args:
        func: 각 항목에 적용할 함수
        items: 처리할 항목 목록
        max_workers: 최대 작업자 수
        use_process_pool: 프로세스 풀 사용 여부
        
    Returns:
        함수를 적용한 결과 목록
    """
    processor = ParallelProcessor(max_workers=max_workers, use_process_pool=use_process_pool)
    
    async def _run():
        tasks = [functools.partial(func, item) for item in items]
        return await processor.execute_all(tasks)
    
    # 이미 이벤트 루프 내부인 경우 바로 실행, 그렇지 않으면 새 이벤트 루프 생성
    if asyncio.get_event_loop().is_running():
        return asyncio.run_coroutine_threadsafe(_run(), asyncio.get_event_loop()).result()
    else:
        return asyncio.run(_run())


class DataBatcher:
    """
    대량 데이터 처리를 위한 배치 처리 클래스
    """
    
    def __init__(self, batch_size: int = 1000):
        """
        DataBatcher 초기화
        
        Args:
            batch_size: 각 배치의 크기
        """
        self.batch_size = batch_size
    
    def create_batches(self, items: List[T]) -> List[List[T]]:
        """
        항목 리스트를 배치로 분할합니다.
        
        Args:
            items: 배치로 나눌 항목 목록
            
        Returns:
            배치 목록
        """
        return [items[i:i + self.batch_size] for i in range(0, len(items), self.batch_size)]
    
    async def process_batches(self, 
                             items: List[T], 
                             processor: Callable[[List[T]], R],
                             max_workers: int = None) -> List[R]:
        """
        항목 목록을 배치로 나누어 병렬로 처리합니다.
        
        Args:
            items: 처리할 항목 목록
            processor: 각 배치를 처리할 함수
            max_workers: 최대 작업자 수
            
        Returns:
            각 배치 처리 결과의 목록
        """
        batches = self.create_batches(items)
        logger.info(f"{len(items)} 항목을 {len(batches)}개 배치로 나누어 처리합니다.")
        
        parallel = ParallelProcessor(max_workers=max_workers)
        tasks = {f"batch_{i}": functools.partial(processor, batch) 
                for i, batch in enumerate(batches)}
        
        return list((await parallel.execute_parallel(tasks)).values())


class AsyncQueryBatcher:
    """
    비동기 쿼리 배치 처리를 위한 클래스
    """
    
    def __init__(self, concurrency_limit: int = 5):
        """
        AsyncQueryBatcher 초기화
        
        Args:
            concurrency_limit: 동시 실행할 최대 쿼리 수
        """
        self.semaphore = asyncio.Semaphore(concurrency_limit)
    
    async def execute_queries(self, queries: List[Callable[[], Tuple[str, Any]]]) -> Dict[str, Any]:
        """
        여러 쿼리를 제한된 동시성으로 실행합니다.
        
        Args:
            queries: 실행할 쿼리 함수 목록 (각 함수는 (key, result) 튜플을 반환해야 함)
            
        Returns:
            쿼리 결과를 담은 사전 (키: 쿼리 식별자, 값: 쿼리 결과)
        """
        async def _execute_with_semaphore(query_func):
            async with self.semaphore:
                if inspect.iscoroutinefunction(query_func):
                    return await query_func()
                else:
                    return query_func()
        
        # 모든 쿼리 동시 실행 (세마포어로 제한됨)
        results = await asyncio.gather(*[_execute_with_semaphore(query) for query in queries])
        
        # 결과를 사전으로 변환
        return {key: value for key, value in results}


def parallel_db_query(max_concurrency: int = 3):
    """
    데이터베이스 쿼리를 병렬로 실행하는 데코레이터
    
    Args:
        max_concurrency: 최대 동시 실행 쿼리 수
        
    Returns:
        데코레이터 함수
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # 원래 함수가 비동기 함수인지 확인
            is_async = inspect.iscoroutinefunction(func)
            
            # 쿼리 함수 실행
            start_time = time.time()
            
            if is_async:
                result = await func(*args, **kwargs)
            else:
                # 동기 함수를 별도 스레드에서 실행
                loop = asyncio.get_event_loop()
                with ThreadPoolExecutor(max_workers=1) as executor:
                    result = await loop.run_in_executor(
                        executor, functools.partial(func, *args, **kwargs))
            
            execution_time = time.time() - start_time
            logger.debug(f"병렬 DB 쿼리 실행 완료: {func.__name__} (소요 시간: {execution_time:.2f}초)")
            
            return result
        return wrapper
    return decorator 