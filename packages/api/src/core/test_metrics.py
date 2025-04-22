"""
메트릭 테스트를 위한 라우터 모듈
"""

import asyncio
import random
import time

from fastapi import APIRouter, Response

from packages.api.src.coremetrics_collector import metrics_collector

router = APIRouter(prefix="/test-metrics", tags=["메트릭 테스트"])


@router.get("/generate")
async def generate_test_metrics():
    """테스트용 메트릭을 생성합니다."""
    # CPU 사용률 시뮬레이션
    metrics_collector.cpu_usage.set(random.uniform(0, 100))

    # 메모리 사용량 시뮬레이션 (바이트 단위)
    metrics_collector.memory_usage.set(random.randint(1000000, 8000000000))

    # 캐시 히트/미스 시뮬레이션
    if random.random() > 0.3:
        metrics_collector.track_cache_operation(hit=True)
    else:
        metrics_collector.track_cache_operation(hit=False)

    # 데이터베이스 쿼리 시간 시뮬레이션
    metrics_collector.track_db_query(random.uniform(0.001, 2.0))

    # 고객 대기 시간 시뮬레이션
    metrics_collector.track_customer_wait_time(random.uniform(5, 120))

    return {"message": "테스트 메트릭이 생성되었습니다."}


@router.get("/error")
async def generate_error_metrics():
    """에러 메트릭을 생성합니다."""
    # 로그인 실패 시뮬레이션
    metrics_collector.track_login_failure("192.168.1.1")

    # 권한 거부 시뮬레이션
    metrics_collector.track_permission_denial("/api/restricted")

    return Response(status_code=500, content="의도적인 에러 응답")


@router.get("/cache")
async def test_cache_metrics():
    """캐시 메트릭을 테스트합니다."""
    # 캐시 히트/미스 시뮬레이션
    hit = random.random() > 0.3
    metrics_collector.track_cache_operation(hit=hit)

    # 캐시 메모리 사용량 시뮬레이션
    metrics_collector.cache_memory_usage.set(random.randint(1000000, 100000000))

    return {"cache_hit": hit}


@router.get("/success")
async def test_success_metrics():
    """성공 케이스 메트릭을 테스트합니다."""
    # 정비 완료 시간 시뮬레이션
    completion_time = random.uniform(1, 24)
    metrics_collector.track_maintenance_completion(completion_time)

    # 부품 재고 수준 시뮬레이션
    part_id = f"PART_{random.randint(1000, 9999)}"
    inventory_level = random.uniform(0, 100)
    metrics_collector.update_parts_inventory(part_id, inventory_level)

    return {
        "completion_time": completion_time,
        "part_id": part_id,
        "inventory_level": inventory_level,
    }


@router.get("/database")
async def test_database_metrics():
    """데이터베이스 메트릭을 테스트합니다."""
    # 데이터베이스 연결 수 시뮬레이션
    connections = random.randint(1, 100)
    metrics_collector.update_db_connections(connections)

    # 데이터베이스 쿼리 시간 시뮬레이션
    query_time = random.uniform(0.001, 5.0)
    metrics_collector.track_db_query(query_time)

    return {"connections": connections, "query_time": query_time}


@router.get("/slow")
async def test_slow_response():
    """느린 응답을 시뮬레이션합니다."""
    # 1-5초 사이의 지연 시뮬레이션
    delay = random.uniform(1, 5)
    await asyncio.sleep(delay)

    return {"delay": delay}
