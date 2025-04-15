import pytest
import asyncio
import time
from typing import Dict, List, Tuple, Any
from unittest.mock import MagicMock, patch

from src.core.parallel_processor import (
    ParallelProcessor, 
    ParallelExecutionError,
    DataBatcher, 
    AsyncQueryBatcher,
    parallel_map,
    parallel_db_query
)

# 테스트 도우미 함수
async def async_sleep_and_return(value: Any, sleep_time: float = 0.1) -> Any:
    """비동기 지연 후 값 반환 함수"""
    await asyncio.sleep(sleep_time)
    return value

def sleep_and_return(value: Any, sleep_time: float = 0.1) -> Any:
    """동기 지연 후 값 반환 함수"""
    time.sleep(sleep_time)
    return value

def raise_exception() -> None:
    """예외 발생 함수"""
    raise ValueError("테스트 예외")

# CPU 바운드 작업을 위한 전역 함수 정의 (프로세스 풀에서 직렬화 가능)
def cpu_bound_task_10000():
    return sum(i * i for i in range(10000))

def cpu_bound_task_20000():
    return sum(i * i for i in range(20000))

# ParallelProcessor 테스트
class TestParallelProcessor:
    """ParallelProcessor 클래스 테스트"""
    
    @pytest.mark.asyncio
    async def test_execute_parallel_success(self):
        """병렬 실행 성공 테스트"""
        # Given
        processor = ParallelProcessor()
        tasks = {
            "task1": lambda: sleep_and_return("결과1"),
            "task2": lambda: sleep_and_return("결과2"),
            "task3": lambda: sleep_and_return("결과3")
        }
        
        # When
        results = await processor.execute_parallel(tasks)
        
        # Then
        assert len(results) == 3
        assert results["task1"] == "결과1"
        assert results["task2"] == "결과2"
        assert results["task3"] == "결과3"
    
    @pytest.mark.asyncio
    async def test_execute_parallel_error(self):
        """병렬 실행 오류 테스트"""
        # Given
        processor = ParallelProcessor()
        tasks = {
            "task1": lambda: sleep_and_return("결과1"),
            "task2": lambda: raise_exception(),
            "task3": lambda: sleep_and_return("결과3")
        }
        
        # When/Then
        with pytest.raises(ParallelExecutionError) as exc_info:
            await processor.execute_parallel(tasks)
        
        # 예외에 오류 정보가 포함되었는지 확인
        assert "task2" in exc_info.value.errors
        assert isinstance(exc_info.value.errors["task2"], ValueError)
    
    @pytest.mark.asyncio
    async def test_execute_all(self):
        """모든 작업 병렬 실행 테스트"""
        # Given
        processor = ParallelProcessor()
        tasks = [
            lambda: sleep_and_return(1),
            lambda: sleep_and_return(2),
            lambda: sleep_and_return(3)
        ]
        
        # When
        results = await processor.execute_all(tasks)
        
        # Then
        assert results == [1, 2, 3]
    
    @pytest.mark.asyncio
    async def test_process_pool_execution(self):
        """프로세스 풀 실행 테스트"""
        # Given
        processor = ParallelProcessor(use_process_pool=True)
        
        # 전역 함수를 사용하여 피클 가능한 작업 생성
        tasks = {
            "task1": cpu_bound_task_10000,
            "task2": cpu_bound_task_20000
        }
        
        # When
        results = await processor.execute_parallel(tasks)
        
        # Then
        assert results["task1"] == sum(i * i for i in range(10000))
        assert results["task2"] == sum(i * i for i in range(20000))

# DataBatcher 테스트
class TestDataBatcher:
    """DataBatcher 클래스 테스트"""
    
    def test_create_batches(self):
        """배치 생성 테스트"""
        # Given
        batcher = DataBatcher(batch_size=3)
        items = [1, 2, 3, 4, 5, 6, 7, 8]
        
        # When
        batches = batcher.create_batches(items)
        
        # Then
        assert len(batches) == 3
        assert batches[0] == [1, 2, 3]
        assert batches[1] == [4, 5, 6]
        assert batches[2] == [7, 8]
    
    @pytest.mark.asyncio
    async def test_process_batches(self):
        """배치 처리 테스트"""
        # Given
        batcher = DataBatcher(batch_size=3)
        items = [1, 2, 3, 4, 5, 6, 7, 8]
        
        # 배치 처리 함수: 각 배치의 합 반환
        def process_batch(batch):
            return sum(batch)
        
        # When
        results = await batcher.process_batches(items, process_batch)
        
        # Then
        assert len(results) == 3
        assert results[0] == 6  # 1+2+3
        assert results[1] == 15  # 4+5+6
        assert results[2] == 15  # 7+8

# AsyncQueryBatcher 테스트
class TestAsyncQueryBatcher:
    """AsyncQueryBatcher 클래스 테스트"""
    
    @pytest.mark.asyncio
    async def test_execute_queries(self):
        """쿼리 동시 실행 테스트"""
        # Given
        batcher = AsyncQueryBatcher(concurrency_limit=2)
        
        # 비동기 쿼리 함수 목록
        async def query1():
            await asyncio.sleep(0.1)
            return "query1", "결과1"
        
        async def query2():
            await asyncio.sleep(0.1)
            return "query2", "결과2"
        
        async def query3():
            await asyncio.sleep(0.1)
            return "query3", "결과3"
        
        queries = [query1, query2, query3]
        
        # When
        start_time = time.time()
        results = await batcher.execute_queries(queries)
        execution_time = time.time() - start_time
        
        # Then
        assert len(results) == 3
        assert results["query1"] == "결과1"
        assert results["query2"] == "결과2"
        assert results["query3"] == "결과3"
        
        # 동시성 제한으로 인해 최소한 2번의 쿼리 배치가 실행되어야 함
        # (concurrency_limit=2, 총 3개 쿼리, 각 0.1초)
        assert execution_time >= 0.2

# 유틸리티 함수 테스트
class TestUtilityFunctions:
    """유틸리티 함수 테스트"""
    
    def test_parallel_map(self):
        """parallel_map 함수 테스트"""
        # Given
        items = [1, 2, 3, 4, 5]
        
        # When
        results = parallel_map(lambda x: x * 2, items)
        
        # Then
        assert results == [2, 4, 6, 8, 10]
    
    @pytest.mark.asyncio
    async def test_parallel_db_query_decorator(self):
        """parallel_db_query 데코레이터 테스트"""
        # Given
        @parallel_db_query(max_concurrency=3)
        async def async_query():
            await asyncio.sleep(0.1)
            return {"result": "비동기 쿼리 결과"}
        
        @parallel_db_query(max_concurrency=3)
        def sync_query():
            time.sleep(0.1)
            return {"result": "동기 쿼리 결과"}
        
        # When
        async_result = await async_query()
        sync_result = await sync_query()
        
        # Then
        assert async_result["result"] == "비동기 쿼리 결과"
        assert sync_result["result"] == "동기 쿼리 결과"

# 실제 통합 테스트 (API 라우트와 연동)
@pytest.mark.skip(reason="실제 API 서버 필요")
class TestIntegration:
    """실제 API와의 통합 테스트"""
    
    @pytest.mark.asyncio
    async def test_parallel_api_calls(self):
        """병렬 API 호출 테스트"""
        # 여기에 실제 API 호출 테스트 구현
        pass 