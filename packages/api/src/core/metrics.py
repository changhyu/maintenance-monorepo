"""
차량 정비 관리 시스템의 메트릭 수집 및 모니터링 모듈

이 모듈은 시스템의 다양한 메트릭을 수집하고 Prometheus에 노출시키는 기능을 제공합니다.
"""

import time
import functools
from typing import Dict, List, Optional, Callable, Any
from prometheus_client import start_http_server
from contextlib import contextmanager
from fastapi import Request, Response, FastAPI
import logging
from datetime import datetime
import threading
from . import test_metrics
from .metrics_collector import metrics_collector

logger = logging.getLogger(__name__)

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
            metrics_collector.track_db_query(duration)
    return wrapper

def record_cache_hit():
    """캐시 히트를 기록합니다."""
    metrics_collector.track_cache_operation(hit=True)

def record_cache_miss():
    """캐시 미스를 기록합니다."""
    metrics_collector.track_cache_operation(hit=False)

def record_token_created():
    """토큰 생성을 기록합니다."""
    metrics_collector.token_operations.labels(operation="created").inc()

def record_token_refreshed():
    """토큰 갱신을 기록합니다."""
    metrics_collector.token_operations.labels(operation="refreshed").inc()

def record_token_blacklisted():
    """토큰 블랙리스트 추가를 기록합니다."""
    metrics_collector.token_operations.labels(operation="blacklisted").inc()

def update_active_users(count: int):
    """활성 사용자 수를 업데이트합니다."""
    metrics_collector.active_users.set(count)

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
        metrics_collector.http_request_duration_seconds.labels(method=method, endpoint=endpoint).observe(duration)

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
            start_http_server(port, registry=metrics_collector.registry)
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
        metrics_collector.update_system_metrics()
    
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
            metrics_collector.track_request(method, endpoint, response.status_code)
            return response
    
    return app