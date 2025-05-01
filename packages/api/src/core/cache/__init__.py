"""
캐시 관리 모듈

다양한 캐시 백엔드를 지원하는 캐시 관리 모듈입니다.
Redis와 메모리 기반 캐싱을 지원하며 설정에 따라 자동으로 적절한 백엔드를 선택합니다.
"""

import hashlib
import json
import logging
import os
import time
from enum import Enum
from functools import wraps
from typing import Any, Awaitable, Callable, Dict, List, Optional, Type, Union

# 임포트 경로 수정
from core.cache.decorators import ttl_cache
from core.cache.interfaces import (
    CacheBackend,
    CacheInterface,
    CacheMetrics,
    CacheMonitor,
)
from core.cache.key_patterns import (
    CACHE_SECTIONS,
    RESOURCE_KEY_PATTERNS,
)
from core.cache.lru_cache import LRUCache
from core.cache.manager import CacheManager
from core.cache.memory_cache import MemoryCacheManager
from core.cache.redis_cache import RedisCache, RedisLock
from core.cache.settings import (
    CacheBackendType,
    CacheSettings,
    EvictionPolicy,
)

# 로거 설정
logger = logging.getLogger(__name__)

__all__ = [
    "CacheManager",
    "CacheBackendType",
    "EvictionPolicy",
    "CacheSettings",
    "RedisCache",
    "RedisLock",
    "MemoryCacheManager",
    "CacheBackend",
    "CacheInterface",
    "CacheMetrics",
    "CacheMonitor",
    "LRUCache",
    "CacheKey",
    "setup_cache",
    "get_cache_manager",
    "get_cache",
    "cached",
    "cache_response",
    "cache",
    "cache_manager",
    "ttl_cache",
]

# 캐시 매니저 인스턴스를 저장할 전역 변수
_cache_manager_instance = None


def setup_cache() -> CacheManager:
    """
    애플리케이션에서 사용할 캐시 매니저를 초기화합니다.

    Returns:
        CacheManager: 초기화된 캐시 매니저 인스턴스
    """
    global _cache_manager_instance

    if _cache_manager_instance is not None:
        return _cache_manager_instance

    # 전역 캐시 매니저 인스턴스가 없으면 새로 생성
    # CacheManager는 싱글톤이므로 파라미터 없이 호출합니다
    _cache_manager_instance = CacheManager()
    return _cache_manager_instance


def get_cache_manager() -> CacheManager:
    """
    현재 애플리케이션에서 사용 중인 캐시 매니저를 반환합니다.

    Returns:
        CacheManager: 현재 애플리케이션의 캐시 매니저

    Raises:
        RuntimeError: 캐시가 설정되지 않은 경우
    """
    global _cache_manager_instance

    if _cache_manager_instance is None:
        _cache_manager_instance = setup_cache()

    return _cache_manager_instance


# 캐시 키 생성 유틸리티 클래스
class CacheKey:
    """캐시 키 생성 유틸리티 클래스"""

    @staticmethod
    def for_user(user_id: str, suffix: Optional[str] = None) -> str:
        """사용자 관련 캐시 키 생성"""
        key = f"user:{user_id}"
        if suffix:
            key = f"{key}:{suffix}"
        return key

    @staticmethod
    def for_session(session_id: str) -> str:
        """세션 관련 캐시 키 생성"""
        return f"session:{session_id}"

    @staticmethod
    def for_token(token_id: str, token_type: str = "access") -> str:
        """토큰 관련 캐시 키 생성"""
        return f"token:{token_type}:{token_id}"

    @staticmethod
    def for_maintenance(maintenance_id: str) -> str:
        """정비 기록 관련 캐시 키 생성"""
        return f"maintenance:{maintenance_id}"

    @staticmethod
    def for_vehicle(vehicle_id: str, suffix: Optional[str] = None) -> str:
        """차량 관련 캐시 키 생성"""
        key = f"vehicle:{vehicle_id}"
        if suffix:
            key = f"{key}:{suffix}"
        return key

    @staticmethod
    def for_shop(shop_id: str, suffix: Optional[str] = None) -> str:
        """정비소 관련 캐시 키 생성"""
        key = f"shop:{shop_id}"
        if suffix:
            key = f"{key}:{suffix}"
        return key


# 전역 캐시 매니저 인스턴스 생성
cache = setup_cache()
# cache_manager는 cache와 동일하게 전역 캐시 인스턴스를 참조 (기존 코드 호환성 유지)
cache_manager = cache


def get_cache() -> CacheManager:
    """
    현재 캐시 매니저 인스턴스를 반환합니다.

    Returns:
        CacheManager: 전역 캐시 매니저 인스턴스
    """
    return cache


def cached(ttl: int = 300, prefix: str = "", key_fn=None):
    """
    함수 결과를 캐싱하는 데코레이터

    Args:
        ttl: 캐시 유효 시간(초)
        prefix: 캐시 키 접두사
        key_fn: 캐시 키 생성 함수(None인 경우 기본 함수 사용)
    """

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 캐시 키 생성
            if key_fn:
                cache_key = key_fn(*args, **kwargs)
            else:
                # 기본 키 생성 로직
                arg_str = ":".join([str(arg) for arg in args])
                kwarg_str = ":".join([f"{k}={v}" for k, v in sorted(kwargs.items())])
                func_name = func.__name__
                cache_key = f"{prefix}:{func_name}:{arg_str}:{kwarg_str}"

            # 캐시된 결과 확인
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"캐시 히트: {cache_key}")
                return cached_result

            # 캐시 미스인 경우 함수 실행하고 결과 캐싱
            logger.debug(f"캐시 미스: {cache_key}")
            result = await func(*args, **kwargs)
            await cache.set(cache_key, result, ttl=ttl)
            return result

        return wrapper

    return decorator


async def cache_response(
    expire: int = 60,
    prefix: str = "",
    include_query_params: bool = False,
    include_path_params: bool = False,
    key_builder: Optional[Callable] = None,
):
    """
    FastAPI 라우트 응답을 캐싱하기 위한 비동기 데코레이터.

    Args:
        expire (int): 캐시 만료 시간(초)
        prefix (str): 캐시 키 접두사
        include_query_params (bool): 쿼리 매개변수를 캐시 키에 포함할지 여부
        include_path_params (bool): 경로 매개변수를 캐시 키에 포함할지 여부
        key_builder (Callable, optional): 사용자 정의 캐시 키 생성 함수

    Returns:
        Callable: 데코레이터 함수
    """

    def decorator(func: Callable[..., Awaitable[Any]]) -> Callable[..., Awaitable[Any]]:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 전역 캐시 인스턴스 사용
            cache = get_cache()

            # 캐시 키 생성
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # 기본 키 생성 로직
                request = kwargs.get("request")
                arg_str = ""
                kwarg_str = ""

                if (
                    include_query_params
                    and request
                    and hasattr(request, "query_params")
                ):
                    kwarg_str = hashlib.md5(
                        json.dumps(dict(request.query_params)).encode()
                    ).hexdigest()

                if include_path_params and request and hasattr(request, "path_params"):
                    arg_str = hashlib.md5(
                        json.dumps(dict(request.path_params)).encode()
                    ).hexdigest()

                func_name = func.__name__
                cache_key = f"{prefix}:{func_name}:{arg_str}:{kwarg_str}"

            # 캐시된 결과 확인
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"캐시 히트: {cache_key}")
                return cached_result

            # 캐시 미스인 경우 함수 실행하고 결과 캐싱
            logger.debug(f"캐시 미스: {cache_key}")
            result = await func(*args, **kwargs)
            await cache.set(cache_key, result, ttl=expire)
            return result

        return wrapper

    return decorator
