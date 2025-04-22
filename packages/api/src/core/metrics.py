"""
차량 정비 관리 시스템의 메트릭 수집 및 모니터링 모듈

이 모듈은 시스템의 다양한 메트릭을 수집하고 Prometheus에 노출시키는 기능을 제공합니다.
"""

import functools
import logging
import os
import threading
import time
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

import psutil
from fastapi import FastAPI, Request, Response
from prometheus_client import (
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    start_http_server,
)

from packages.api.src.core import test_metrics

logger = logging.getLogger(__name__)


class MetricsCollector:
    """시스템 및 애플리케이션 메트릭을 수집하는 클래스"""

    def __init__(self):
        # 메트릭 데이터 초기화
        self._metrics: Dict[str, Any] = {
            "cpu_usage": 0.0,
            "memory_usage": {"total": 0, "available": 0, "percent": 0.0},
            "disk_usage": {"total": 0, "used": 0, "free": 0, "percent": 0.0},
            "network_usage": {"bytes_sent": 0, "bytes_recv": 0},
        }
        self._last_update: Optional[datetime] = None

        # Prometheus 레지스트리 초기화
        self.registry = CollectorRegistry()

        # 메트릭 초기화
        self._initialize_metrics()

        # 초기 메트릭 업데이트
        try:
            self.update_metrics()
        except Exception as e:
            logger.error(f"초기 메트릭 업데이트 중 오류 발생: {str(e)}")

    def _initialize_metrics(self):
        """Prometheus 메트릭을 초기화합니다."""
        # 캐시 메트릭
        self.cache_hits = Counter(
            "cache_hits_total", "Total number of cache hits", registry=self.registry
        )
        self.cache_misses = Counter(
            "cache_misses_total", "Total number of cache misses", registry=self.registry
        )

        # 토큰 작업 메트릭
        self.token_operations = Counter(
            "token_operations_total",
            "Total number of token operations",
            ["operation"],
            registry=self.registry,
        )

        # 활성 사용자 수
        self.active_users = Gauge(
            "active_users", "Number of active users", registry=self.registry
        )

        # API 정보
        self.api_info = Gauge(
            "api_info",
            "API version information",
            ["version", "environment"],
            registry=self.registry,
        )

        # HTTP 요청 메트릭
        self.http_request_duration_seconds = Histogram(
            "http_request_duration_seconds",
            "HTTP request duration in seconds",
            ["method", "endpoint"],
            registry=self.registry,
        )

        # HTTP 요청 카운터
        self.http_requests_total = Counter(
            "http_requests_total",
            "Total number of HTTP requests",
            ["method", "endpoint", "status"],
            registry=self.registry,
        )

    def update_metrics(self) -> None:
        """모든 메트릭을 업데이트합니다."""
        try:
            # CPU 사용량
            self._metrics["cpu_usage"] = psutil.cpu_percent(interval=1)

            # 메모리 사용량
            memory = psutil.virtual_memory()
            self._metrics["memory_usage"] = {
                "total": memory.total,
                "available": memory.available,
                "percent": memory.percent,
            }

            # 디스크 사용량
            disk = psutil.disk_usage("/")
            self._metrics["disk_usage"] = {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": disk.percent,
            }

            # 네트워크 사용량
            net_io = psutil.net_io_counters()
            self._metrics["network_usage"] = {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
            }

            self._last_update = datetime.now()

        except Exception as e:
            logger.error(f"시스템 메트릭 업데이트 중 오류 발생: {str(e)}")
            raise

    @property
    def cpu_usage(self) -> float:
        """CPU 사용량을 반환합니다."""
        if "cpu_usage" not in self._metrics:
            self.update_metrics()
        return self._metrics["cpu_usage"]

    @property
    def memory_usage(self) -> Dict[str, Any]:
        """메모리 사용량을 반환합니다."""
        if "memory_usage" not in self._metrics:
            self.update_metrics()
        return self._metrics["memory_usage"]

    @property
    def disk_usage(self) -> Dict[str, Any]:
        """디스크 사용량을 반환합니다."""
        if "disk_usage" not in self._metrics:
            self.update_metrics()
        return self._metrics["disk_usage"]

    @property
    def network_usage(self) -> Dict[str, Any]:
        """네트워크 사용량을 반환합니다."""
        if "network_usage" not in self._metrics:
            self.update_metrics()
        return self._metrics["network_usage"]

    def get_all_metrics(self) -> Dict[str, Any]:
        """모든 메트릭을 반환합니다."""
        if (
            not self._metrics
            or not self._last_update
            or (datetime.now() - self._last_update).seconds > 60
        ):
            self.update_metrics()
        return self._metrics

    def track_request(self, method: str, endpoint: str, status_code: int) -> None:
        """HTTP 요청 추적"""
        self.http_requests_total.labels(
            method=method, endpoint=endpoint, status=status_code
        ).inc()

    def track_cache_operation(self, hit: bool) -> None:
        """캐시 작업 추적"""
        if hit:
            self.cache_hits.inc()
        else:
            self.cache_misses.inc()

    def track_db_query(self, duration: float) -> None:
        """DB 쿼리 실행 시간 추적"""
        pass


# 전역 메트릭 수집기 인스턴스
metrics_collector = MetricsCollector()

# 전역 레지스트리 생성
REGISTRY = metrics_collector.registry


def track_db_query_time(func: Callable) -> Callable:
    """데이터베이스 쿼리 실행 시간을 추적하는 데코레이터"""

    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            return result
        finally:
            duration = time.time() - start_time
            try:
                metrics_collector.track_db_query(duration)
            except Exception as e:
                logger.warning(f"DB 쿼리 메트릭 기록 실패: {str(e)}")

    return wrapper


def _handle_metric_error(func: Callable) -> Callable:
    """메트릭 관련 예외를 처리하는 데코레이터"""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.warning(f"메트릭 기록 실패: {str(e)}")

    return wrapper


@_handle_metric_error
def record_cache_hit():
    """캐시 히트를 기록합니다."""
    metrics_collector.track_cache_operation(hit=True)


@_handle_metric_error
def record_cache_miss():
    """캐시 미스를 기록합니다."""
    metrics_collector.track_cache_operation(hit=False)


@_handle_metric_error
def record_token_created():
    """토큰 생성을 기록합니다."""
    metrics_collector.token_operations.labels(operation="created").inc()


@_handle_metric_error
def record_token_refreshed():
    """토큰 갱신을 기록합니다."""
    metrics_collector.token_operations.labels(operation="refreshed").inc()


@_handle_metric_error
def record_token_blacklisted():
    """토큰 블랙리스트 추가를 기록합니다."""
    metrics_collector.token_operations.labels(operation="blacklisted").inc()


@_handle_metric_error
def update_active_users(count: int):
    """활성 사용자 수를 업데이트합니다."""
    metrics_collector.active_users.set(count)


@_handle_metric_error
def set_api_info(version: str, environment: str):
    """API 정보를 설정합니다."""
    metrics_collector.api_info.labels(version=version, environment=environment).set(1)


@contextmanager
def track_request_duration(method: str, endpoint: str):
    """HTTP 요청 처리 시간 추적"""
    start_time = time.time()
    try:
        yield
    finally:
        duration = time.time() - start_time
        try:
            metrics_collector.http_request_duration_seconds.labels(
                method=method, endpoint=endpoint
            ).observe(duration)
        except Exception as e:
            logger.warning(f"요청 처리 시간 메트릭 기록 실패: {str(e)}")


def init_metrics(app: FastAPI, port: int = 9090):
    """
    FastAPI 애플리케이션에 메트릭 시스템을 초기화합니다.

    Args:
        app: FastAPI 애플리케이션 인스턴스
        port: 메트릭 서버 포트 (기본값: 9090)
    """
    # 테스트 메트릭 라우터 등록
    app.include_router(test_metrics.router)

    def start_metrics_server_thread():
        try:
            start_http_server(port, registry=REGISTRY)
            logger.info(f"메트릭 서버가 포트 {port}에서 시작되었습니다.")
        except Exception as e:
            logger.error(f"메트릭 서버 시작 중 오류 발생: {str(e)}")

    # 메트릭 서버를 별도 스레드에서 시작
    metrics_thread = threading.Thread(target=start_metrics_server_thread, daemon=True)
    metrics_thread.start()

    # 시스템 메트릭 업데이트를 위한 이벤트 핸들러
    @app.on_event("startup")
    async def startup_event():
        logger.info("시스템 메트릭 모니터링을 시작합니다.")
        try:
            metrics_collector.update_metrics()
        except Exception as e:
            logger.warning(f"시스템 메트릭 업데이트 실패: {str(e)}")

    # 애플리케이션 종료 시 정리 작업
    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info("메트릭 시스템을 종료합니다.")

    # 모든 요청에 대한 메트릭 미들웨어
    @app.middleware("http")
    async def metrics_middleware(request: Request, call_next):
        method = request.method
        endpoint = request.url.path

        with track_request_duration(method, endpoint):
            response = await call_next(request)
            try:
                metrics_collector.track_request(method, endpoint, response.status_code)
            except Exception as e:
                logger.warning(f"요청 메트릭 기록 실패: {str(e)}")
            return response

    return app
