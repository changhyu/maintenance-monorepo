import random
import time

from fastapi import APIRouter, HTTPException
from src.core.metrics import metrics_collector

router = APIRouter(prefix="/test-metrics", tags=["메트릭 테스트"])


@router.get("/success")
async def test_success():
    """정상 응답 테스트 엔드포인트"""
    # 0.1초에서 0.5초 사이의 지연 시뮬레이션
    delay = random.uniform(0.1, 0.5)
    time.sleep(delay)
    return {"status": "success", "delay": delay}


@router.get("/slow")
async def test_slow():
    """느린 응답 테스트 엔드포인트"""
    # 2초에서 3초 사이의 지연 시뮬레이션
    delay = random.uniform(2.0, 3.0)
    time.sleep(delay)
    return {"status": "slow", "delay": delay}


@router.get("/error")
async def test_error():
    """에러 응답 테스트 엔드포인트"""
    if random.random() < 0.5:  # 50% 확률로 에러 발생
        raise HTTPException(status_code=500, detail="테스트용 서버 에러")
    return {"status": "error occurred"}


@router.get("/database")
async def test_database():
    """데이터베이스 쿼리 테스트 엔드포인트"""
    # 데이터베이스 쿼리 시뮬레이션
    query_time = random.uniform(0.1, 1.5)
    time.sleep(query_time)
    metrics_collector.track_db_query(query_time)
    return {"status": "database query completed", "query_time": query_time}


@router.get("/cache")
async def test_cache():
    """캐시 동작 테스트 엔드포인트"""
    # 캐시 히트/미스 시뮬레이션
    is_hit = random.random() < 0.7  # 70% 확률로 캐시 히트
    metrics_collector.track_cache_operation(hit=is_hit)
    return {"status": "cache operation completed", "cache_hit": is_hit}
