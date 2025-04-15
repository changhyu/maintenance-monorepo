# 병렬 처리와 캐싱 통합 가이드

이 문서는 `parallel_processor`와 `cache_decorators` 모듈을 함께 사용하여 API 성능을 최적화하는 방법을 설명합니다.

## 개요

병렬 처리와 캐싱을 결합하면 다음과 같은 이점이 있습니다:

1. **첫 번째 요청 가속화**: 병렬 처리로 첫 번째(캐시 미스) 요청의 성능 향상
2. **반복 요청 최적화**: 캐싱을 통해 후속 요청의 성능 대폭 향상
3. **리소스 효율성**: 계산 비용이 높은 작업의 중복 실행 방지
4. **확장성**: 대량 데이터 처리 시 부하 분산 및 효율적인 처리

## 주요 컴포넌트

### 병렬 처리 모듈 (`parallel_processor.py`)

- `ParallelProcessor`: 여러 작업을 동시에 실행하는 클래스
- `DataBatcher`: 대량 데이터를 배치로 나누어 처리하는 클래스
- `AsyncQueryBatcher`: 비동기 쿼리를 제한된 동시성으로 실행하는 클래스

### 캐싱 모듈 (`cache_decorators.py`)

- `cache_response`: API 응답을 캐싱하는 데코레이터
- `cache_function`: 함수 결과를 캐싱하는 데코레이터
- `CacheLevel`: 캐시 세분화 레벨 (LOW, MEDIUM, HIGH)

## 통합 패턴

### 1. 캐시된 병렬 함수 패턴

캐시 데코레이터 내부에서 병렬 처리를 사용하는 패턴입니다.

```python
@cache_function(expire=300, key_prefix="parallel_batch")
async def process_items_with_cache(items: List[str], batch_size: int = 10):
    batcher = DataBatcher(batch_size=batch_size)
    
    async def process_batch(batch: List[str]):
        processor = ParallelProcessor(max_workers=len(batch))
        tasks = {f"item_{item}": lambda i=item: process_item(i) for item in batch}
        results = await processor.execute_parallel(tasks)
        return list(results.values())
    
    return await batcher.process_batches(items, process_batch)
```

### 2. 병렬 API 엔드포인트 패턴

API 엔드포인트 내에서 여러 리소스를 병렬로 조회하고 결과를 캐싱합니다.

```python
@router.post("/batch")
@cache_response(expire=300, prefix="batch_endpoint")
async def batch_endpoint(request: Request, batch_request: BatchRequest):
    # 병렬 처리기 초기화
    processor = ParallelProcessor()
    
    # 여러 작업 정의
    tasks = {
        f"resource_{id}": lambda r_id=id: fetch_resource(r_id)
        for id in batch_request.resource_ids
    }
    
    # 병렬 실행
    results = await processor.execute_parallel(tasks)
    
    return {"results": results}
```

### 3. 대시보드 패턴

여러 독립적인 데이터 소스에서 정보를 병렬로 가져와 대시보드를 구성하고 캐싱합니다.

```python
@router.get("/dashboard")
@cache_response(expire=180, prefix="dashboard")
async def get_dashboard(request: Request):
    processor = ParallelProcessor()
    
    # 대시보드 구성 요소 정의
    tasks = {
        "statistics": get_statistics,
        "recent_items": get_recent_items,
        "alerts": get_alerts,
        "user_count": get_user_count
    }
    
    # 병렬 실행
    results = await processor.execute_parallel(tasks)
    
    return results
```

## 최적화 팁

### 적절한 배치 크기 선택

- 큰 배치 크기: 작업이 가벼운 경우 (I/O 바운드)
- 작은 배치 크기: 작업이 무거운 경우 (CPU 바운드)

```python
# I/O 바운드 작업 (네트워크 요청 등)
batcher = DataBatcher(batch_size=20)

# CPU 바운드 작업 (계산 집약적)
batcher = DataBatcher(batch_size=5)
```

### 적절한 캐시 레벨 선택

- `CacheLevel.LOW`: 자주 변경되는 데이터 (짧은 TTL)
- `CacheLevel.MEDIUM`: 일반적인 데이터 (중간 TTL)
- `CacheLevel.HIGH`: 거의 변경되지 않는 데이터 (긴 TTL)

```python
# 빠르게 변하는 데이터
@cache_response(expire=60, cache_level=CacheLevel.LOW)

# 일반적인 데이터
@cache_response(expire=300, cache_level=CacheLevel.MEDIUM)

# 거의 변하지 않는 데이터
@cache_response(expire=3600, cache_level=CacheLevel.HIGH)
```

### 캐시 무효화 전략

데이터가 변경되면 관련 캐시를 명시적으로 삭제합니다.

```python
# 데이터 변경 후
cache.clear(f"user:profile:{user_id}*")
cache.clear("dashboard:summary*")
```

## 성능 모니터링

통합 솔루션의 성능을 모니터링하려면:

1. 메트릭 수집: 실행 시간, 캐시 적중률, 메모리 사용량
2. 로깅: 주요 작업의 실행 시간 및 캐시 상태 기록
3. 적응적 조정: 부하에 따라 배치 크기 및 캐시 TTL 조정

## 사용 사례 예시

### 다중 차량 정보 조회

```python
@router.post("/vehicles/batch")
@cache_response(expire=300, prefix="vehicles:batch")
async def get_batch_vehicles(request: Request, batch_request: BatchVehicleRequest):
    vehicle_ids = batch_request.vehicle_ids
    batcher = DataBatcher(batch_size=5)
    
    async def process_vehicle_batch(vehicle_batch):
        processor = ParallelProcessor(max_workers=len(vehicle_batch))
        tasks = {
            f"vehicle_{v_id}": lambda id=v_id: fetch_vehicle_data(id)
            for v_id in vehicle_batch
        }
        return await processor.execute_parallel(tasks)
    
    batch_results = await batcher.process_batches(vehicle_ids, process_vehicle_batch)
    
    # 결과 합치기
    all_results = {}
    for batch_result in batch_results:
        all_results.update(batch_result)
    
    return {"results": all_results}
```

### 마스터 데이터 대시보드

```python
@router.get("/dashboard/master")
@cache_response(expire=600, prefix="dashboard:master")
async def get_master_dashboard(request: Request):
    processor = ParallelProcessor()
    
    tasks = {
        "sales": get_sales_data,
        "inventory": get_inventory_data,
        "users": get_user_stats,
        "orders": get_order_stats,
        "performance": get_performance_metrics
    }
    
    return await processor.execute_parallel(tasks)
```

## 결론

병렬 처리와 캐싱을 함께 사용하면 API 성능을 크게 향상시킬 수 있습니다. 첫 번째 요청은 병렬 처리를 통해 가속화되고, 후속 요청은 캐싱을 통해 거의 즉시 응답할 수 있습니다. 이 통합 접근 방식은 특히 다중 리소스 조회, 대시보드, 일괄 처리 작업에 매우 효과적입니다. 