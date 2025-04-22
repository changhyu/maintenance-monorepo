import asyncio
import time
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from src.core.background_tasks import (ParallelTaskMonitor,
                                       _parallel_task_stats,
                                       get_parallel_task_stats,
                                       monitor_parallel_tasks,
                                       register_background_task,
                                       register_parallel_task_execution,
                                       run_tasks_in_parallel)


@pytest.fixture
def clear_task_stats():
    """테스트 전후 태스크 통계 초기화"""
    _parallel_task_stats.clear()
    yield
    _parallel_task_stats.clear()


@pytest.fixture
def clear_task_registry():
    """테스트 전후 태스크 레지스트리 초기화"""
    from src.core.background_tasks import TASK_REGISTRY

    TASK_REGISTRY.clear()
    yield
    TASK_REGISTRY.clear()


class TestBackgroundTasks:
    """백그라운드 작업 모듈 테스트"""

    def test_register_background_task(self):
        """백그라운드 작업 등록 테스트"""
        # Given
        task_name = "test_task"

        # When
        @register_background_task(task_name)
        async def test_task(app):
            return "test_result"

        # Then
        from src.core.background_tasks import TASK_REGISTRY

        assert task_name in TASK_REGISTRY
        assert TASK_REGISTRY[task_name] == test_task

    def test_register_parallel_task_execution(self, clear_task_stats):
        """병렬 작업 실행 결과 등록 테스트"""
        # Given
        task_name = "test_parallel_task"
        execution_time = 0.5

        # When
        register_parallel_task_execution(task_name, execution_time, True)

        # Then
        stats = get_parallel_task_stats()
        assert task_name in stats
        assert stats[task_name]["total_executions"] == 1
        assert stats[task_name]["successful_executions"] == 1
        assert stats[task_name]["failed_executions"] == 0
        assert stats[task_name]["avg_execution_time"] == execution_time
        assert stats[task_name]["min_execution_time"] == execution_time
        assert stats[task_name]["max_execution_time"] == execution_time

    def test_register_parallel_task_execution_failure(self, clear_task_stats):
        """병렬 작업 실행 실패 등록 테스트"""
        # Given
        task_name = "test_parallel_task"
        execution_time = 0.5
        error = ValueError("테스트 에러")

        # When
        register_parallel_task_execution(task_name, execution_time, False, error)

        # Then
        stats = get_parallel_task_stats()
        assert task_name in stats
        assert stats[task_name]["total_executions"] == 1
        assert stats[task_name]["successful_executions"] == 0
        assert stats[task_name]["failed_executions"] == 1
        assert stats[task_name]["last_error"] == str(error)

    def test_register_multiple_executions(self, clear_task_stats):
        """여러 작업 실행 등록 테스트"""
        # Given
        task_name = "test_task"

        # When
        register_parallel_task_execution(task_name, 0.5, True)
        register_parallel_task_execution(task_name, 1.5, True)
        register_parallel_task_execution(task_name, 1.0, False, ValueError("에러"))

        # Then
        stats = get_parallel_task_stats()
        assert stats[task_name]["total_executions"] == 3
        assert stats[task_name]["successful_executions"] == 2
        assert stats[task_name]["failed_executions"] == 1
        # 평균 실행 시간: (0.5 + 1.5 + 1.0) / 3 = 1.0
        assert stats[task_name]["avg_execution_time"] == 1.0
        assert stats[task_name]["min_execution_time"] == 0.5
        assert stats[task_name]["max_execution_time"] == 1.5

    @pytest.mark.asyncio
    async def test_parallel_task_monitor(self, clear_task_stats):
        """병렬 작업 모니터링 컨텍스트 매니저 테스트"""
        # Given
        task_name = "monitored_task"

        # When - 성공 케이스
        async with ParallelTaskMonitor(task_name):
            await asyncio.sleep(0.1)

        # Then
        stats = get_parallel_task_stats()
        assert task_name in stats
        assert stats[task_name]["total_executions"] == 1
        assert stats[task_name]["successful_executions"] == 1

        # When - 실패 케이스
        try:
            async with ParallelTaskMonitor(task_name):
                await asyncio.sleep(0.1)
                raise ValueError("모니터링 테스트 에러")
        except ValueError:
            pass

        # Then
        stats = get_parallel_task_stats()
        assert stats[task_name]["total_executions"] == 2
        assert stats[task_name]["successful_executions"] == 1
        assert stats[task_name]["failed_executions"] == 1

    @pytest.mark.asyncio
    async def test_monitor_parallel_tasks(self, clear_task_stats):
        """병렬 작업 모니터링 태스크 테스트"""
        # Given
        register_parallel_task_execution("task1", 0.5, True)
        register_parallel_task_execution("task2", 1.0, True)
        register_parallel_task_execution("task2", 2.0, False, ValueError("에러"))

        # 하루 전 데이터 추가 (삭제되어야 함)
        old_task = "old_task"
        register_parallel_task_execution(old_task, 0.1, True)
        _parallel_task_stats[old_task]["last_update"] = (
            datetime.now() - timedelta(hours=25)
        ).isoformat()

        # When
        # 실제 태스크는 무한 루프이므로 목업으로 대체
        with patch("asyncio.sleep", new_callable=AsyncMock):
            # 한 번만 실행되도록 설정
            asyncio.sleep.side_effect = [None, asyncio.CancelledError]
            try:
                await monitor_parallel_tasks()
            except asyncio.CancelledError:
                pass

        # Then
        stats = get_parallel_task_stats()
        assert "task1" in stats
        assert "task2" in stats
        assert old_task not in stats  # 오래된 작업은 제거되어야 함

    @pytest.mark.asyncio
    async def test_run_tasks_in_parallel(self, clear_task_registry):
        """여러 백그라운드 태스크 병렬 실행 테스트"""
        # Given
        task1_mock = AsyncMock(return_value="결과1")
        task2_mock = AsyncMock(return_value="결과2")

        from src.core.background_tasks import TASK_REGISTRY

        TASK_REGISTRY["task1"] = task1_mock
        TASK_REGISTRY["task2"] = task2_mock

        # When
        results = await run_tasks_in_parallel(["task1", "task2"])

        # Then
        assert len(results) == 2
        assert results["task1"] == "결과1"
        assert results["task2"] == "결과2"
        task1_mock.assert_called_once_with(None)
        task2_mock.assert_called_once_with(None)

    @pytest.mark.asyncio
    async def test_run_tasks_in_parallel_with_error(self, clear_task_registry):
        """병렬 실행 중 오류 발생 테스트"""
        # Given
        task1_mock = AsyncMock(return_value="결과1")
        task2_mock = AsyncMock(side_effect=ValueError("태스크 오류"))

        from src.core.background_tasks import TASK_REGISTRY

        TASK_REGISTRY["task1"] = task1_mock
        TASK_REGISTRY["task2"] = task2_mock

        # When/Then
        with pytest.raises(ValueError, match="태스크 오류"):
            await run_tasks_in_parallel(["task1", "task2"])


# 통합 테스트 (실제 태스크 등록 및 실행)
@pytest.mark.skip(reason="통합 테스트는 실제 환경에서 수행")
class TestBackgroundTasksIntegration:
    """백그라운드 작업 통합 테스트"""

    @pytest.mark.asyncio
    async def test_task_lifecycle(self):
        """작업 생명주기 (등록-실행-취소) 테스트"""
        # 테스트 구현...
        pass
