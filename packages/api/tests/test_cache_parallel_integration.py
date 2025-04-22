import asyncio
import time
from typing import Any, Dict, List, Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from src.core.cache.config import CacheBackend, CacheConfig
from src.core.cache_decorators import (CacheLevel, cache_function,
                                       compress_data, decompress_data)
from src.core.parallel_processor import (AsyncQueryBatcher, DataBatcher,
                                         ParallelProcessor)

# 테스트 데이터
TEST_ITEMS = [i for i in range(100)]


# 캐시 관리자 모의 객체
class MockCacheManager:
    """테스트용 캐시 매니저"""

    def __init__(self):
        self._cache = {}
        self._lock = asyncio.Lock()
        self.config = CacheConfig(
            enabled=True,
            backend=CacheBackend.MEMORY,
            default_ttl=60,
            memory_max_size=1000,
        )
        self._initialized = True

    async def get(self, key: str, default: Any = None) -> Optional[Any]:
        """캐시된 값 조회"""
        async with self._lock:
            return self._cache.get(key, default)

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """캐시에 값 저장"""
        async with self._lock:
            self._cache[key] = value
            return True

    async def delete(self, key: str) -> bool:
        """캐시된 값 삭제"""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def get_sync(self, key: str, default: Any = None) -> Optional[Any]:
        """캐시된 값 동기적 조회"""
        return self._cache.get(key, default)

    def set_sync(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """캐시에 값 동기적 저장"""
        self._cache[key] = value
        return True

    def delete_sync(self, key: str) -> bool:
        """캐시된 값 동기적 삭제"""
        if key in self._cache:
            del self._cache[key]
            return True
        return False

    async def delete_pattern(self, pattern: str) -> int:
        """패턴과 일치하는 모든 키 삭제"""
        async with self._lock:
            keys_to_delete = [k for k in self._cache.keys() if pattern in k]
            for key in keys_to_delete:
                del self._cache[key]
            return len(keys_to_delete)

    def delete_pattern_sync(self, pattern: str) -> int:
        """패턴과 일치하는 모든 키 동기적 삭제"""
        keys_to_delete = [k for k in self._cache.keys() if pattern in k]
        for key in keys_to_delete:
            del self._cache[key]
        return len(keys_to_delete)

    async def flush(self) -> bool:
        """모든 캐시 삭제"""
        async with self._lock:
            self._cache.clear()
            return True

    def flush_sync(self) -> bool:
        """모든 캐시 동기적 삭제"""
        self._cache.clear()
        return True

    async def keys(self, pattern: str = "*") -> List[str]:
        """패턴과 일치하는 모든 키 조회"""
        async with self._lock:
            if pattern == "*":
                return list(self._cache.keys())
            return [k for k in self._cache.keys() if pattern.replace("*", "") in k]

    def keys_sync(self, pattern: str = "*") -> List[str]:
        """패턴과 일치하는 모든 키 동기적 조회"""
        if pattern == "*":
            return list(self._cache.keys())
        return [k for k in self._cache.keys() if pattern.replace("*", "") in k]

    async def health_check(self) -> Dict[str, Any]:
        """캐시 상태 확인"""
        return {
            "backend": self.config.backend.value,
            "enabled": self.config.enabled,
            "status": "healthy",
            "details": {
                "items_count": len(self._cache),
                "max_size": self.config.memory_max_size,
            },
        }

    def health_check_sync(self) -> Dict[str, Any]:
        """캐시 상태 동기적 확인"""
        return {
            "backend": self.config.backend.value,
            "enabled": self.config.enabled,
            "status": "healthy",
            "details": {
                "items_count": len(self._cache),
                "max_size": self.config.memory_max_size,
            },
        }

    def generate_key(self, func_name: str, *args, **kwargs) -> str:
        """캐시 키 생성"""
        key_parts = [func_name]
        if args:
            key_parts.extend(str(arg) for arg in args)
        if kwargs:
            key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
        return ":".join(key_parts)


# 비용이 많이 드는 함수 (시뮬레이션)
async def expensive_async_operation(item: int, delay: float = 0.1) -> Dict[str, Any]:
    """비용이 많이 드는 비동기 작업 시뮬레이션"""
    await asyncio.sleep(delay)
    return {"item": item, "result": item * item, "processed_at": time.time()}


def expensive_sync_operation(item: int, delay: float = 0.1) -> Dict[str, Any]:
    """비용이 많이 드는 동기 작업 시뮬레이션"""
    time.sleep(delay)
    return {"item": item, "result": item * item, "processed_at": time.time()}


# 캐시 데코레이터가 적용된 병렬 처리 함수
@cache_function(expire=60, key_prefix="parallel_batch")
async def process_items_with_cache(
    items: List[int], batch_size: int = 10
) -> List[Dict[str, Any]]:
    """캐시를 적용한 병렬 처리 함수"""
    batcher = DataBatcher(batch_size=batch_size)

    async def process_batch(batch: List[int]) -> List[Dict[str, Any]]:
        processor = ParallelProcessor(max_workers=len(batch))
        tasks = {
            f"item_{item}": lambda i=item: expensive_sync_operation(i, 0.05)
            for item in batch
        }
        results = await processor.execute_parallel(tasks)
        return list(results.values())

    return await batcher.process_batches(items, process_batch)


# 캐시 + 병렬 쿼리 함수
@cache_function(expire=60, key_prefix="parallel_query")
async def query_data_parallel(item_ids: List[int]) -> Dict[int, Dict[str, Any]]:
    """캐시를 적용한 병렬 쿼리 함수"""
    batcher = AsyncQueryBatcher(concurrency_limit=5)

    async def query_item(item_id: int) -> tuple:
        """단일 항목 쿼리"""
        result = await expensive_async_operation(item_id, 0.05)
        return (item_id, result)

    queries = [lambda id=item_id: query_item(id) for item_id in item_ids]
    return await batcher.execute_queries(queries)


# 테스트 클래스
@pytest.mark.asyncio
class TestCacheParallelIntegration:
    """캐시와 병렬 처리 통합 테스트"""

    @pytest.fixture
    async def mock_cache(self):
        """모의 캐시 픽스처"""
        mock_cache = MockCacheManager()

        # 캐시 관리자 패치
        with patch("src.core.cache.get_cache_manager", return_value=mock_cache):
            yield mock_cache

    async def test_cached_parallel_processing(self, mock_cache):
        """캐싱된 병렬 처리 테스트"""
        # 테스트 데이터
        items = [1, 2, 3, 4, 5]

        # 첫 번째 실행 (캐시 미스)
        start_time = time.time()
        results1 = await process_items_with_cache(items, batch_size=2)
        first_execution_time = time.time() - start_time

        # 결과 검증
        assert len(results1) == 5
        assert all(
            result["result"] == item * item for result, item in zip(results1, items)
        )

        # 두 번째 실행 (캐시 적중)
        start_time = time.time()
        results2 = await process_items_with_cache(items, batch_size=2)
        second_execution_time = time.time() - start_time

        # 결과 검증
        assert results1 == results2

        # 캐시 적중으로 실행 시간이 크게 단축되어야 함
        assert second_execution_time < first_execution_time * 0.1

    async def test_cached_parallel_queries(self, mock_cache):
        """캐싱된 병렬 쿼리 테스트"""
        # 테스트 데이터
        item_ids = [10, 20, 30, 40, 50]

        # 첫 번째 실행 (캐시 미스)
        start_time = time.time()
        results1 = await query_data_parallel(item_ids)
        first_execution_time = time.time() - start_time

        # 결과 검증
        assert len(results1) == 5
        assert all(
            results1[item_id]["result"] == item_id * item_id for item_id in item_ids
        )

        # 두 번째 실행 (캐시 적중)
        start_time = time.time()
        results2 = await query_data_parallel(item_ids)
        second_execution_time = time.time() - start_time

        # 결과 검증
        assert results1 == results2

        # 캐시 적중으로 실행 시간이 크게 단축되어야 함
        assert second_execution_time < first_execution_time * 0.1

    async def test_compression_with_parallel_results(self, mock_cache):
        """병렬 처리 결과 압축 테스트"""
        # 대용량 테스트 데이터 생성
        large_data = [{"id": i, "data": "x" * 1000} for i in range(20)]

        # 데이터 압축
        compressed, is_compressed = compress_data(large_data)

        # 압축 여부 확인
        assert is_compressed
        assert "_compressed" in compressed

        # 압축 해제
        decompressed = decompress_data(compressed)

        # 원본 데이터와 비교
        assert decompressed == large_data

    async def test_parallel_processing_with_cache_invalidation(self, mock_cache):
        """캐시 무효화와 함께 병렬 처리 테스트"""
        # 테스트 데이터
        items = [1, 2, 3]

        # 첫 번째 실행
        results1 = await process_items_with_cache(items)

        # 캐시에서 직접 확인
        cache_keys = list(mock_cache._cache.keys())
        assert len(cache_keys) == 1

        # 캐시 수동 삭제
        await mock_cache.delete(cache_keys[0])

        # 두 번째 실행 (캐시 미스 - 새로운 결과)
        results2 = await process_items_with_cache(items)

        # 처리 시간 비교 (다른 시간에 처리됨)
        processing_times1 = [r["processed_at"] for r in results1]
        processing_times2 = [r["processed_at"] for r in results2]

        # 두 번째 결과의 처리 시간이 더 늦어야 함
        assert all(t2 > t1 for t1, t2 in zip(processing_times1, processing_times2))


# 비동기 유틸리티 함수 테스트
@pytest.mark.asyncio
async def test_cached_parallel_map():
    """캐시된 병렬 맵 함수 테스트"""
    from src.core.parallel_processor import parallel_map

    # 테스트 함수
    def square(x):
        time.sleep(0.01)  # 작은 지연
        return x * x

    # 병렬 맵 실행
    items = list(range(10))
    results = await parallel_map(square, items)

    # 결과 검증
    assert results == [x * x for x in items]
