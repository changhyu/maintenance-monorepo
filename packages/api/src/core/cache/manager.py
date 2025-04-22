"""
캐시 관리자 모듈

다양한 백엔드(Redis, 메모리)를 지원하는 캐시 관리자를 구현합니다.
싱글톤 패턴을 사용하여 애플리케이션 전체에서 하나의 인스턴스만 사용하도록 합니다.
"""

import asyncio
import json
import logging
import time
from datetime import timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Pattern, Set, Tuple, Union

from packages.apicache.config import CacheBackend, get_cache_config

from packages.api.src.core.cachebackends import MemoryCache, RedisCache
from packages.api.src.core.cachesettings import CacheSettings

logger = logging.getLogger(__name__)


def get_cache_manager() -> "CacheManager":
    """
    캐시 관리자의 싱글톤 인스턴스를 반환합니다.

    Returns:
        CacheManager 인스턴스
    """
    return CacheManager()


class EvictionPolicy(Enum):
    """
    캐시 제거 정책을 정의하는 열거형

    LRU: 가장 최근에 사용되지 않은 항목 제거
    FIFO: 가장 먼저 추가된 항목 제거
    TTL: 만료 시간이 가장 짧은 항목 제거
    """

    LRU = "lru"
    FIFO = "fifo"
    TTL = "ttl"


class CacheManager:
    """
    캐시 관리자 클래스

    Redis 및 메모리 캐시 백엔드를 지원하는 통합 캐시 인터페이스를 제공합니다.
    싱글톤 패턴을 사용하여 애플리케이션 전체에서 하나의 인스턴스를 공유합니다.
    """

    _instance = None

    def __new__(cls):
        if not hasattr(cls, "_instance"):
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, "initialized"):
            self.initialized = True
            self.config = get_cache_config()
            self.backend = (
                CacheBackend(self.config.backend)
                if isinstance(self.config.backend, str)
                else self.config.backend
            )

            # 메모리 캐시 초기화
            self._memory_cache = {}
            self._memory_cache_expiry = {}
            self._memory_cache_max_size = self.config.memory_max_size
            self._memory_cache_cleanup_factor = getattr(
                self.config, "memory_cache_cleanup_factor", 0.25
            )  # 기본값 25%
            self._eviction_policy = getattr(
                self.config, "eviction_policy", EvictionPolicy.TTL
            )  # 기본값 TTL
            self._memory_cache_access_times = {}  # LRU 정책을 위한 접근 시간 기록
            self._memory_cache_insert_order = []  # FIFO 정책을 위한 삽입 순서 기록

            # Redis 초기화
            self._redis_client = None
            self._redis_async_client = None

            if self.backend == CacheBackend.REDIS:
                self._init_redis()

            logger.info(
                f"캐시 관리자 초기화 완료: 백엔드={self.backend.value}, TTL={self.config.default_ttl}초, 정책={self._eviction_policy.value}"
            )

        self._cleanup_memory_cache()

    def _init_redis(self):
        """Redis 클라이언트를 초기화합니다."""
        try:
            import redis
            import redis.asyncio as aioredis

            # 동기 클라이언트
            params = self.config.get_redis_connection_params()
            self._redis_client = redis.Redis(**params)

            # 비동기 클라이언트
            self._redis_async_client = aioredis.Redis(**params)

            logger.info("Redis 캐시 백엔드 초기화 완료")
        except ImportError:
            logger.warning(
                "redis 패키지를 찾을 수 없습니다. redis 백엔드를 사용하려면 'pip install redis' 명령을 실행하세요."
            )
            self.backend = CacheBackend.MEMORY
            logger.info("백엔드를 메모리로 전환합니다.")
        except Exception as e:
            logger.error(f"Redis 연결 오류: {str(e)}")
            self.backend = CacheBackend.MEMORY
            logger.info("백엔드를 메모리로 전환합니다.")

    def _cleanup_memory_cache(self):
        """
        메모리 캐시가 최대 크기를 초과하면 정리합니다.
        설정된 제거 정책에 따라 다르게 동작합니다.
        """
        current_size = len(self._memory_cache)
        if current_size <= self._memory_cache_max_size:
            return

        # 만료된 항목 먼저 제거
        current_time = time.time()
        expired_keys = [
            k
            for k, t in self._memory_cache_expiry.items()
            if t is not None and current_time > t
        ]

        for key in expired_keys:
            self._memory_cache.pop(key, None)
            self._memory_cache_expiry.pop(key, None)
            if key in self._memory_cache_access_times:
                del self._memory_cache_access_times[key]
            if key in self._memory_cache_insert_order:
                self._memory_cache_insert_order.remove(key)

        # 여전히 크기를 초과하는 경우 제거 정책에 따라 항목 제거
        current_size = len(self._memory_cache)
        if current_size <= self._memory_cache_max_size:
            return

        # 정리 대상 항목 수 계산
        items_to_remove = int(current_size * self._memory_cache_cleanup_factor)

        if self._eviction_policy == EvictionPolicy.LRU:
            # 가장 최근에 사용되지 않은 항목부터 제거
            sorted_keys = sorted(
                self._memory_cache_access_times.items(), key=lambda x: x[1]
            )
            keys_to_remove = [k for k, _ in sorted_keys[:items_to_remove]]

        elif self._eviction_policy == EvictionPolicy.FIFO:
            # 가장 먼저 삽입된 항목부터 제거
            keys_to_remove = self._memory_cache_insert_order[:items_to_remove]

        else:  # TTL 정책 또는 기본값
            # TTL이 가장 짧은 항목부터 제거
            non_expired_keys = {
                k: v for k, v in self._memory_cache_expiry.items() if v is not None
            }
            sorted_keys = sorted(non_expired_keys.items(), key=lambda x: x[1])
            keys_to_remove = [k for k, _ in sorted_keys[:items_to_remove]]

            # TTL 설정된 항목이 충분하지 않으면 임의로 제거
            if len(keys_to_remove) < items_to_remove:
                remaining = items_to_remove - len(keys_to_remove)
                all_keys = set(self._memory_cache.keys())
                remaining_keys = list(all_keys - set(keys_to_remove))
                keys_to_remove.extend(remaining_keys[:remaining])

        # 선택된 키 제거
        for key in keys_to_remove:
            self._memory_cache.pop(key, None)
            self._memory_cache_expiry.pop(key, None)
            self._memory_cache_access_times.pop(key, None)
            if key in self._memory_cache_insert_order:
                self._memory_cache_insert_order.remove(key)

    async def get(self, key: str, default: Any = None) -> Any:
        """
        캐시에서 키에 해당하는 값을 비동기적으로 가져옵니다.

        Args:
            key: 가져올 캐시 키
            default: 키가 없을 경우 반환할 기본값

        Returns:
            캐시된 값 또는 기본값
        """
        if not self.config.enabled:
            return default

        try:
            result = None

            if self.backend == CacheBackend.REDIS:
                raw_value = await self._redis_async_client.get(key)
                if raw_value:
                    result = json.loads(raw_value)

            elif self.backend == CacheBackend.MEMORY:
                self._cleanup_memory_cache()

                if key in self._memory_cache:
                    # 만료 확인
                    expiry = self._memory_cache_expiry.get(key)
                    if expiry is None or time.time() < expiry:
                        result = self._memory_cache[key]

                        # LRU 정책인 경우 접근 시간 업데이트
                        if self._eviction_policy == EvictionPolicy.LRU:
                            self._memory_cache_access_times[key] = time.time()
                    else:
                        # 만료된 경우 삭제
                        self._memory_cache.pop(key, None)
                        self._memory_cache_expiry.pop(key, None)
                        self._memory_cache_access_times.pop(key, None)
                        if key in self._memory_cache_insert_order:
                            self._memory_cache_insert_order.remove(key)

            return result if result is not None else default
        except Exception as e:
            logger.error(f"캐시 조회 실패 (키: {key}): {str(e)}")
            return default

    def get_sync(self, key: str, default: Any = None) -> Any:
        """
        캐시에서 키에 해당하는 값을 동기적으로 가져옵니다.

        Args:
            key: 가져올 캐시 키
            default: 키가 없을 경우 반환할 기본값

        Returns:
            캐시된 값 또는 기본값
        """
        if not self.config.enabled:
            return default

        try:
            result = None

            if self.backend == CacheBackend.REDIS:
                raw_value = self._redis_client.get(key)
                if raw_value:
                    result = json.loads(raw_value)

            elif self.backend == CacheBackend.MEMORY:
                self._cleanup_memory_cache()

                if key in self._memory_cache:
                    # 만료 확인
                    expiry = self._memory_cache_expiry.get(key)
                    if expiry is None or time.time() < expiry:
                        result = self._memory_cache[key]

                        # LRU 정책인 경우 접근 시간 업데이트
                        if self._eviction_policy == EvictionPolicy.LRU:
                            self._memory_cache_access_times[key] = time.time()
                    else:
                        # 만료된 경우 삭제
                        self._memory_cache.pop(key, None)
                        self._memory_cache_expiry.pop(key, None)
                        self._memory_cache_access_times.pop(key, None)
                        if key in self._memory_cache_insert_order:
                            self._memory_cache_insert_order.remove(key)

            return result if result is not None else default
        except Exception as e:
            logger.error(f"캐시 조회 실패 (키: {key}): {str(e)}")
            return default

    async def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """
        캐시에 키-값 쌍을 비동기적으로 설정합니다.

        Args:
            key: 캐시 키
            value: 저장할 값
            expire: 만료 시간(초)

        Returns:
            성공 여부
        """
        if not self.config.enabled:
            return False

        try:
            if expire is None:
                expire = self.config.default_ttl

            if self.backend == CacheBackend.REDIS:
                serialized_value = json.dumps(value)
                await self._redis_async_client.set(key, serialized_value, ex=expire)

            elif self.backend == CacheBackend.MEMORY:
                self._memory_cache[key] = value

                # FIFO 정책인 경우 삽입 순서 기록
                if self._eviction_policy == EvictionPolicy.FIFO:
                    if key in self._memory_cache_insert_order:
                        self._memory_cache_insert_order.remove(key)
                    self._memory_cache_insert_order.append(key)

                # LRU 정책인 경우 접근 시간 업데이트
                if self._eviction_policy == EvictionPolicy.LRU:
                    self._memory_cache_access_times[key] = time.time()

                # 만료 시간 설정
                if expire is not None:
                    self._memory_cache_expiry[key] = time.time() + expire
                else:
                    self._memory_cache_expiry[key] = None

                self._cleanup_memory_cache()

            return True
        except Exception as e:
            logger.error(f"캐시 설정 실패 (키: {key}): {str(e)}")
            return False

    def set_sync(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """
        캐시에 키-값 쌍을 동기적으로 설정합니다.

        Args:
            key: 캐시 키
            value: 저장할 값
            expire: 만료 시간(초)

        Returns:
            성공 여부
        """
        if not self.config.enabled:
            return False

        try:
            if expire is None:
                expire = self.config.default_ttl

            if self.backend == CacheBackend.REDIS:
                serialized_value = json.dumps(value)
                self._redis_client.set(key, serialized_value, ex=expire)

            elif self.backend == CacheBackend.MEMORY:
                self._memory_cache[key] = value

                # FIFO 정책인 경우 삽입 순서 기록
                if self._eviction_policy == EvictionPolicy.FIFO:
                    if key in self._memory_cache_insert_order:
                        self._memory_cache_insert_order.remove(key)
                    self._memory_cache_insert_order.append(key)

                # LRU 정책인 경우 접근 시간 업데이트
                if self._eviction_policy == EvictionPolicy.LRU:
                    self._memory_cache_access_times[key] = time.time()

                # 만료 시간 설정
                if expire is not None:
                    self._memory_cache_expiry[key] = time.time() + expire
                else:
                    self._memory_cache_expiry[key] = None

                self._cleanup_memory_cache()

            return True
        except Exception as e:
            logger.error(f"캐시 설정 실패 (키: {key}): {str(e)}")
            return False

    async def delete(self, key: str) -> bool:
        """
        캐시에서 키를 비동기적으로 삭제합니다.

        Args:
            key: 삭제할 캐시 키

        Returns:
            성공 여부
        """
        if not self.config.enabled:
            return False

        try:
            if self.backend == CacheBackend.REDIS:
                await self._redis_async_client.delete(key)

            elif self.backend == CacheBackend.MEMORY:
                self._memory_cache.pop(key, None)
                self._memory_cache_expiry.pop(key, None)
                self._memory_cache_access_times.pop(key, None)
                if key in self._memory_cache_insert_order:
                    self._memory_cache_insert_order.remove(key)

            return True
        except Exception as e:
            logger.error(f"캐시 삭제 실패 (키: {key}): {str(e)}")
            return False

    def delete_sync(self, key: str) -> bool:
        """
        캐시에서 키를 동기적으로 삭제합니다.

        Args:
            key: 삭제할 캐시 키

        Returns:
            성공 여부
        """
        if not self.config.enabled:
            return False

        try:
            if self.backend == CacheBackend.REDIS:
                self._redis_client.delete(key)

            elif self.backend == CacheBackend.MEMORY:
                self._memory_cache.pop(key, None)
                self._memory_cache_expiry.pop(key, None)
                self._memory_cache_access_times.pop(key, None)
                if key in self._memory_cache_insert_order:
                    self._memory_cache_insert_order.remove(key)

            return True
        except Exception as e:
            logger.error(f"캐시 삭제 실패 (키: {key}): {str(e)}")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """
        패턴과 일치하는 모든 키를 비동기적으로 삭제합니다.

        Args:
            pattern: 삭제할 키 패턴 (Redis의 경우 glob 패턴, 메모리의 경우 부분 문자열)

        Returns:
            삭제된 키의 수
        """
        if not self.config.enabled:
            return 0

        try:
            if self.backend == CacheBackend.REDIS:
                keys = []
                async for key in self._redis_async_client.scan_iter(match=pattern):
                    keys.append(key)

                if keys:
                    return await self._redis_async_client.delete(*keys)
                return 0

            elif self.backend == CacheBackend.MEMORY:
                keys_to_delete = [k for k in self._memory_cache.keys() if pattern in k]
                for key in keys_to_delete:
                    self._memory_cache.pop(key, None)
                    self._memory_cache_expiry.pop(key, None)
                return len(keys_to_delete)

            return 0
        except Exception as e:
            logger.error(f"패턴 삭제 실패 (패턴: {pattern}): {str(e)}")
            return 0

    def delete_pattern_sync(self, pattern: str) -> int:
        """
        패턴과 일치하는 모든 키를 동기적으로 삭제합니다.

        Args:
            pattern: 삭제할 키 패턴 (Redis의 경우 glob 패턴, 메모리의 경우 부분 문자열)

        Returns:
            삭제된 키의 수
        """
        if not self.config.enabled:
            return 0

        try:
            if self.backend == CacheBackend.REDIS:
                keys = list(self._redis_client.scan_iter(match=pattern))
                if keys:
                    return self._redis_client.delete(*keys)
                return 0

            elif self.backend == CacheBackend.MEMORY:
                keys_to_delete = [k for k in self._memory_cache.keys() if pattern in k]
                for key in keys_to_delete:
                    self._memory_cache.pop(key, None)
                    self._memory_cache_expiry.pop(key, None)
                return len(keys_to_delete)

            return 0
        except Exception as e:
            logger.error(f"패턴 삭제 실패 (패턴: {pattern}): {str(e)}")
            return 0

    async def flush(self) -> bool:
        """
        모든 캐시를 비동기적으로 지웁니다.

        Returns:
            성공 여부
        """
        if not self.config.enabled:
            return False

        try:
            if self.backend == CacheBackend.REDIS:
                await self._redis_async_client.flushdb()

            elif self.backend == CacheBackend.MEMORY:
                self._memory_cache.clear()
                self._memory_cache_expiry.clear()
                self._memory_cache_access_times.clear()
                self._memory_cache_insert_order.clear()

            return True
        except Exception as e:
            logger.error(f"캐시 비우기 실패: {str(e)}")
            return False

    def flush_sync(self) -> bool:
        """
        모든 캐시를 동기적으로 지웁니다.

        Returns:
            성공 여부
        """
        if not self.config.enabled:
            return False

        try:
            if self.backend == CacheBackend.REDIS:
                self._redis_client.flushdb()

            elif self.backend == CacheBackend.MEMORY:
                self._memory_cache.clear()
                self._memory_cache_expiry.clear()
                self._memory_cache_access_times.clear()
                self._memory_cache_insert_order.clear()

            return True
        except Exception as e:
            logger.error(f"캐시 비우기 실패: {str(e)}")
            return False

    async def keys(self, pattern: str = "*") -> List[str]:
        """
        패턴과 일치하는 모든 키를 비동기적으로 반환합니다.

        Args:
            pattern: 검색할 키 패턴

        Returns:
            일치하는 키 목록
        """
        if not self.config.enabled:
            return []

        try:
            if self.backend == CacheBackend.REDIS:
                keys = []
                async for key in self._redis_async_client.scan_iter(match=pattern):
                    keys.append(key.decode("utf-8"))
                return keys

            elif self.backend == CacheBackend.MEMORY:
                self._cleanup_memory_cache()
                if pattern == "*":
                    return list(self._memory_cache.keys())
                else:
                    return [
                        k
                        for k in self._memory_cache.keys()
                        if pattern.replace("*", "") in k
                    ]

            return []
        except Exception as e:
            logger.error(f"키 조회 실패 (패턴: {pattern}): {str(e)}")
            return []

    def keys_sync(self, pattern: str = "*") -> List[str]:
        """
        패턴과 일치하는 모든 키를 동기적으로 반환합니다.

        Args:
            pattern: 검색할 키 패턴

        Returns:
            일치하는 키 목록
        """
        if not self.config.enabled:
            return []

        try:
            if self.backend == CacheBackend.REDIS:
                keys = []
                for key in self._redis_client.scan_iter(match=pattern):
                    keys.append(key.decode("utf-8"))
                return keys

            elif self.backend == CacheBackend.MEMORY:
                self._cleanup_memory_cache()
                if pattern == "*":
                    return list(self._memory_cache.keys())
                else:
                    return [
                        k
                        for k in self._memory_cache.keys()
                        if pattern.replace("*", "") in k
                    ]

            return []
        except Exception as e:
            logger.error(f"키 조회 실패 (패턴: {pattern}): {str(e)}")
            return []

    async def health_check(self) -> Dict[str, Any]:
        """
        캐시 백엔드의 건강 상태를 비동기적으로 확인합니다.

        Returns:
            상태 정보가 포함된 딕셔너리
        """
        status = {
            "backend": self.backend.value,
            "enabled": self.config.enabled,
            "status": "healthy",
            "details": {},
        }

        try:
            if self.backend == CacheBackend.REDIS:
                # Redis 연결 테스트
                start_time = time.time()
                await self._redis_async_client.ping()
                latency = time.time() - start_time

                status["details"] = {
                    "latency_ms": round(latency * 1000, 2),
                    "connection": "ok",
                }

            elif self.backend == CacheBackend.MEMORY:
                # 메모리 캐시 상태
                status["details"] = {
                    "items_count": len(self._memory_cache),
                    "max_size": self._memory_cache_max_size,
                    "usage_percent": (
                        round(
                            len(self._memory_cache) / self._memory_cache_max_size * 100,
                            2,
                        )
                        if self._memory_cache_max_size > 0
                        else 0
                    ),
                }

        except Exception as e:
            status["status"] = "unhealthy"
            status["details"]["error"] = str(e)

        return status

    def health_check_sync(self) -> Dict[str, Any]:
        """
        캐시 백엔드의 건강 상태를 동기적으로 확인합니다.

        Returns:
            상태 정보가 포함된 딕셔너리
        """
        status = {
            "backend": self.backend.value,
            "enabled": self.config.enabled,
            "status": "healthy",
            "details": {},
        }

        try:
            if self.backend == CacheBackend.REDIS:
                # Redis 연결 테스트
                start_time = time.time()
                self._redis_client.ping()
                latency = time.time() - start_time

                status["details"] = {
                    "latency_ms": round(latency * 1000, 2),
                    "connection": "ok",
                }

            elif self.backend == CacheBackend.MEMORY:
                # 메모리 캐시 상태
                status["details"] = {
                    "items_count": len(self._memory_cache),
                    "max_size": self._memory_cache_max_size,
                    "usage_percent": (
                        round(
                            len(self._memory_cache) / self._memory_cache_max_size * 100,
                            2,
                        )
                        if self._memory_cache_max_size > 0
                        else 0
                    ),
                }

        except Exception as e:
            status["status"] = "unhealthy"
            status["details"]["error"] = str(e)

        return status


# 전역 캐시 관리자 인스턴스
cache_manager = CacheManager()


def get_cache_manager() -> CacheManager:
    """
    캐시 관리자의 싱글톤 인스턴스를 반환합니다.

    Returns:
        CacheManager: 캐시 관리자 인스턴스
    """
    return cache_manager
