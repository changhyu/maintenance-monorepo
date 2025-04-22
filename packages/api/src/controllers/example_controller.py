"""
캐싱 예시 컨트롤러 모듈

이 모듈은 캐싱 시스템을 활용하는 다양한 예시를 제공합니다.
"""

import logging
import time
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Path, Query
from packagescore.cache import (
    CacheManager,
    cached,
    get_cache_dependency,
    get_cache_manager,
    invalidate_cache,
)
from packagescore.responses import success_response

logger = logging.getLogger(__name__)

# 라우터 생성
router = APIRouter(prefix="/examples", tags=["예시"])

# 캐시 관리자 의존성
cache_manager = get_cache_manager()


@router.get("/cached")
@cached(ttl=60)  # 60초 동안 캐싱
async def get_cached_data():
    """
    캐싱된 응답을 반환하는 엔드포인트.

    이 엔드포인트는 60초 동안 결과를 캐싱합니다.
    """
    # 무거운 처리를 시뮬레이션하기 위한 지연
    time.sleep(1)

    return success_response(
        data={"message": "이 응답은 60초 동안 캐싱됩니다.", "timestamp": time.time()}
    )


@router.get("/cached/{item_id}")
@cached(ttl=30)  # 30초 동안 캐싱
async def get_cached_item(item_id: int = Path(..., description="조회할 항목 ID")):
    """
    항목 ID별로 캐싱된 응답을 반환하는 엔드포인트.

    이 엔드포인트는 30초 동안 결과를 캐싱하며, 항목 ID별로 별도의 캐시를 유지합니다.
    """
    # 무거운 처리를 시뮬레이션하기 위한 지연
    time.sleep(0.5)

    return success_response(
        data={
            "item_id": item_id,
            "message": f"항목 {item_id}에 대한 응답은 30초 동안 캐싱됩니다.",
            "timestamp": time.time(),
        }
    )


@router.get("/cached-with-params")
@cached(ttl=45)  # 45초 동안 캐싱
async def get_cached_with_params(
    q: Optional[str] = Query(None, description="검색어"),
    limit: int = Query(10, description="결과 제한"),
):
    """
    쿼리 매개변수에 따라 캐싱된 응답을 반환하는 엔드포인트.

    이 엔드포인트는 45초 동안 결과를 캐싱하며, 쿼리 매개변수 조합별로 별도의 캐시를 유지합니다.
    """
    # 무거운 처리를 시뮬레이션하기 위한 지연
    time.sleep(0.8)

    return success_response(
        data={
            "query": q,
            "limit": limit,
            "message": "이 응답은 쿼리 매개변수 조합별로 45초 동안 캐싱됩니다.",
            "results": [f"결과 {i}" for i in range(min(limit, 20))],
            "timestamp": time.time(),
        }
    )


# 커스텀 키 생성 함수
def user_specific_key_builder(func_name: str, args: List, kwargs: Dict) -> str:
    """
    사용자별 캐시 키를 생성하는 함수.

    이 함수는 사용자 ID를 포함하여 캐시 키를 생성합니다.
    """
    user_id = kwargs.get("user_id", "anonymous")
    return f"{func_name}:user:{user_id}"


@router.get("/user/{user_id}/data")
@cached(ttl=120, key_builder=user_specific_key_builder)  # 2분 동안 캐싱, 사용자별 키
async def get_user_data(user_id: str = Path(..., description="사용자 ID")):
    """
    사용자별 캐싱된 데이터를 반환하는 엔드포인트.

    이 엔드포인트는 2분 동안 결과를 캐싱하며, 사용자 ID별로 별도의 캐시를 유지합니다.
    커스텀 키 생성 함수를 사용하여 캐시 키를 생성합니다.
    """
    # 무거운 처리를 시뮬레이션하기 위한 지연
    time.sleep(1.2)

    return success_response(
        data={
            "user_id": user_id,
            "message": f"사용자 {user_id}의 데이터는 2분 동안 캐싱됩니다.",
            "profile": {
                "name": f"사용자 {user_id}",
                "email": f"user{user_id}@example.com",
                "created_at": time.time() - 86400,  # 1일 전
            },
            "timestamp": time.time(),
        }
    )


@router.post("/invalidate/{pattern}")
@invalidate_cache("user:*")  # 모든 사용자 캐시 무효화
async def invalidate_user_caches(pattern: str = Path(..., description="무효화할 패턴")):
    """
    특정 패턴의 캐시를 무효화하는 엔드포인트.

    이 엔드포인트는 지정된 패턴과 일치하는 모든 캐시를 무효화합니다.
    """
    # 특정 패턴의 캐시 수동 무효화
    count = cache_manager.delete_pattern(pattern)

    return success_response(
        data={
            "message": f"패턴 '{pattern}'과 일치하는 {count}개의 캐시가 무효화되었습니다.",
            "invalidated_count": count,
            "timestamp": time.time(),
        }
    )


@router.get("/manual-cache")
async def manual_cache_example(cache: CacheManager = Depends(get_cache_dependency())):
    """
    수동 캐싱 예시 엔드포인트.

    이 엔드포인트는 의존성 주입을 통해 캐시 관리자를 받아 수동으로 캐싱을 처리합니다.
    """
    cache_key = "manual_cache_example"

    # 캐시에서 데이터 조회
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        cached_data["from_cache"] = True
        return success_response(data=cached_data)

    # 캐시에 없으면 새 데이터 생성
    time.sleep(1)

    data = {
        "message": "이 응답은 수동으로 캐싱됩니다.",
        "from_cache": False,
        "timestamp": time.time(),
    }

    # 데이터를 캐시에 저장 (TTL: A2분)
    cache.set(cache_key, data, ttl=120)

    return success_response(data=data)


@router.get("/cache-info")
async def get_cache_info(cache: CacheManager = Depends(get_cache_dependency())):
    """
    캐시 정보를 반환하는 엔드포인트.

    이 엔드포인트는 현재 캐시 설정 및 상태 정보를 반환합니다.
    """
    return success_response(
        data={
            "enabled": cache.settings.enable_cache,
            "backend_type": cache.settings.backend_type.value,
            "default_ttl": cache.settings.default_ttl,
            "prefix": cache.settings.prefix,
            "timestamp": time.time(),
        }
    )


@router.delete("/cache")
async def clear_all_cache(cache: CacheManager = Depends(get_cache_dependency())):
    """
    모든 캐시를 지우는 엔드포인트.

    이 엔드포인트는 모든 캐시를 삭제합니다.
    """
    success = cache.clear()

    return success_response(
        data={
            "message": (
                "모든 캐시가 삭제되었습니다."
                if success
                else "캐시 삭제 중 오류가 발생했습니다."
            ),
            "success": success,
            "timestamp": time.time(),
        }
    )
