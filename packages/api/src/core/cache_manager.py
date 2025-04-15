"""
캐시 관리 유틸리티

표준화된 캐시 키 생성 및 관리를 위한 유틸리티 모듈입니다.
분산 캐시 전략과 모니터링 기능을 포함합니다.
"""

from typing import Any, Dict, List, Optional, Union, Tuple, AsyncGenerator, TypeVar, Generic, Callable, cast, Set
import hashlib
import json
from datetime import datetime, timedelta
import random
import asyncio
from functools import wraps
import redis
from redis.exceptions import RedisError
from .cache import cache
from .logging import logger
from .metrics import metrics_collector
from contextlib import contextmanager, asynccontextmanager, suppress
import time
import re
import pickle
import logging
from enum import Enum, auto
import fnmatch
import math
import sys
import aioredis
import os

from .config import settings

# 상수 정의
MAX_LOCAL_CACHE_SIZE = 10000  # 최대 로컬 캐시 항목 수
CLEANUP_INTERVAL = 3600  # 캐시 클린업 주기 (초)
PREFETCH_THRESHOLD = 0.8  # 프리페칭 임계값 (TTL의 80%)
LOCK_TIMEOUT = 30  # 분산 락 타임아웃 (초)
WARMUP_BATCH_SIZE = 100  # 워밍업 배치 크기

# 제네릭 타입 정의 추가
T = TypeVar('T')

# aioredis 모듈 로딩
try:
    import aioredis
    from aioredis import RedisError
    HAS_AIOREDIS = True
except ImportError:
    HAS_AIOREDIS = False
    RedisError = Exception

# redis-py 모듈 로딩
try:
    from redis import Redis
    HAS_REDIS = True
except ImportError:
    HAS_REDIS = False
    # Redis 클래스 대체
    class Redis:
        @staticmethod
        def from_url(*args, **kwargs):
            return None

class CacheKey:
    """캐시 키 클래스는 키 이름과 관련 리소스 집합을 포함합니다."""
    
    def __init__(self, key: str, resources: Optional[Set[str]] = None) -> None:
        """
        캐시 키 초기화
        
        Args:
            key: 캐시 키 문자열
            resources: 이 키와 관련된 리소스 집합 (없으면 빈 집합 사용)
        """
        self.key: str = key
        self.resources: Set[str] = resources or set()
        
    def __str__(self) -> str:
        return self.key
        
    def __eq__(self, other: object) -> bool:
        return isinstance(other, CacheKey) and self.key == other.key
        
    def __hash__(self) -> int:
        return hash(self.key)

class EvictionPolicy:
    """캐시 항목 제거 정책 클래스"""
    
    def apply(self, cache: Dict[str, Any], max_size: int) -> List[str]:
        """
        캐시 크기 제한을 적용하고 제거할 키 목록을 반환합니다.
        
        Args:
            cache: 캐시 데이터 사전
            max_size: 최대 캐시 크기

        Returns:
            제거되어야 할 키 목록
        """
        if len(cache) <= max_size:
            return []
            
        # 제거할 항목 수 계산
        items_to_remove = len(cache) - max_size
        return self._select_items_for_eviction(cache, items_to_remove)
        
    def _select_items_for_eviction(self, cache: Dict[str, Any], count: int) -> List[str]:
        """
        제거할 항목을 선택하는 메서드
        
        Args:
            cache: 캐시 데이터 사전
            count: 제거할 항목 수
            
        Returns:
            제거할 키 목록
        """
        # 이 기본 구현은 무작위로 키를 선택합니다.
        # 하위 클래스에서 다른 전략으로 재정의할 수 있습니다.
        return list(cache.keys())[:count]

class LRUCache:
    """LRU 알고리즘을 사용하는 캐시 구현 클래스"""
    
    def __init__(self, max_size: int = 1000):
        """
        LRU 캐시 초기화
        
        Args:
            max_size: 최대 캐시 항목 수
        """
        self.max_size: int = max_size
        self.cache: Dict[str, Any] = {}
        self.order: List[str] = []
    
    def __getitem__(self, key: str) -> Any:
        """
        키로 항목 접근 ([] 연산자 지원)
        
        Args:
            key: 캐시 키
            
        Returns:
            캐시 값
            
        Raises:
            KeyError: 키가 존재하지 않는 경우
        """
        if key not in self.cache:
            raise KeyError(key)
            
        # 최근 사용 순서 업데이트
        self.order.remove(key)
        self.order.append(key)
        
        return self.cache[key]
    
    def __setitem__(self, key: str, value: Any) -> None:
        """
        키에 값 설정 ([] 연산자 지원)
        
        Args:
            key: 캐시 키
            value: 설정할 값
        """
        if key in self.cache:
            # 이미 존재하는 키는 순서만 업데이트
            self.order.remove(key)
        elif len(self.cache) >= self.max_size:
            # 캐시가 가득 찬 경우 가장 오래된 항목 제거
            oldest = self.order.pop(0)
            del self.cache[oldest]
            
        # 새 값 설정 및 순서 업데이트
        self.cache[key] = value
        self.order.append(key)
    
    def __delitem__(self, key: str) -> None:
        """
        키 삭제 (del 연산자 지원)
        
        Args:
            key: 삭제할 캐시 키
            
        Raises:
            KeyError: 키가 존재하지 않는 경우
        """
        if key not in self.cache:
            raise KeyError(key)
            
        del self.cache[key]
        self.order.remove(key)
    
    def __contains__(self, key: str) -> bool:
        """
        키 존재 여부 확인 (in 연산자 지원)
        
        Args:
            key: 확인할 캐시 키
            
        Returns:
            키 존재 여부
        """
        return key in self.cache
    
    def __len__(self) -> int:
        """
        캐시 크기 반환 (len() 함수 지원)
        
        Returns:
            캐시에 저장된 항목 수
        """
        return len(self.cache)
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        키에 해당하는 값 조회, 없으면 기본값 반환
        
        Args:
            key: 캐시 키
            default: 기본값
            
        Returns:
            캐시 값 또는 기본값
        """
        try:
            return self[key]
        except KeyError:
            return default
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        캐시에 값을 설정합니다.
        
        Args:
            key: 캐시 키
            value: 저장할 값
            ttl: 만료 시간(초), None인 경우 만료 없음
        """
        current_time = time.time()
        # 한 줄에 사전 생성 및 할당
        self.cache[key] = {
            "value": value,
            "last_accessed": current_time,
            "expiry": (current_time + ttl) if ttl is not None else None
        }
        
        # 일관된 순서 유지
        if key in self.order:
            self.order.remove(key)
        self.order.append(key)
        
        # 캐시 크기 제한 적용
        self._enforce_size_limit()
    
    def keys(self) -> List[str]:
        """
        모든 캐시 키 반환
        
        Returns:
            캐시 키 목록
        """
        return list(self.cache.keys())
    
    def get_ttl(self, key: str) -> Optional[float]:
        """
        캐시 항목의 남은 TTL(Time To Live)을 반환합니다.
        
        Args:
            key: 조회할 캐시 키
            
        Returns:
            남은 TTL(초), 만료 없는 경우 None, 키가 없는 경우 0.0
        """
        if key not in self.cache:
            return 0.0
            
        entry = self.cache[key]
        if entry["expiry"] is None:
            return None
            
        ttl = entry["expiry"] - time.time()
        return max(0.0, ttl)

    def _enforce_size_limit(self) -> None:
        """
        캐시 크기가 최대 크기를 초과하는 경우 가장 오래된 항목을 제거합니다.
        """
        while len(self.cache) > self.max_size:
            # 가장 오래 전에 접근한 항목 제거
            oldest_key = self.order.pop(0)
            if oldest_key in self.cache:
                del self.cache[oldest_key]

class DefaultKeyBuilder:
    """기본 캐시 키 생성 클래스"""
    
    def __init__(self, prefix: str = "cache"):
        """
        Args:
            prefix: 모든 캐시 키에 사용할 접두사
        """
        self.prefix: str = prefix
        
    def build(self, *args, **kwargs) -> str:
        """
        제공된 인수와 키워드 인수로부터 캐시 키를 생성합니다.
        
        Args:
            *args: 캐시 키에 포함할 위치 인수
            **kwargs: 캐시 키에 포함할 키워드 인수
            
        Returns:
            생성된 캐시 키
        """
        # 인수를 문자열로 변환하고 정렬
        key_parts = [str(arg) for arg in args]
        
        # 키워드 인수를 정렬하여 일관된 키 생성 보장
        if kwargs:
            sorted_items = sorted(kwargs.items())
            key_parts.extend(f"{k}:{v}" for k, v in sorted_items)
            
        # 최종 키 반환
        return f"{self.prefix}:{':'.join(key_parts)}" if key_parts else self.prefix

class CacheStrategy:
    """캐시 전략 열거형"""
    LOCAL_ONLY = "local_only"          # 로컬 캐시만 사용
    REDIS_ONLY = "redis_only"          # Redis만 사용
    LOCAL_REDIS = "local_redis"        # 로컬 캐시 우선, Redis 백업
    REDIS_LOCAL = "redis_local"        # Redis 우선, 로컬 캐시 백업
    DISTRIBUTED = "distributed"        # 분산 캐시 (Redis Cluster)
    WRITE_THROUGH = "write_through"    # 쓰기 시 모든 캐시 계층에 동시에 쓰기

class CacheKeyBuilder:
    """캐시 키 생성 클래스"""
    
    def __init__(self, prefix: str):
        """
        캐시 키 빌더 초기화
        
        Args:
            prefix: 캐시 키 접두사
        """
        self.prefix = prefix
        self.parts = []
        self._excluded_keys = {"current_user", "_db", "response", "request"}
        
    def add(self, key: str, value: Any) -> 'CacheKeyBuilder':
        """
        캐시 키에 파트 추가
        
        Args:
            key: 키 이름
            value: 값
            
        Returns:
            체이닝을 위한 self
        """
        if value is not None and key not in self._excluded_keys:
            if isinstance(value, (int, float)) and key in {"latitude", "longitude"}:
                # 위치 정보는 높은 정밀도가 필요
                self.parts.append(f"{key}:{value:.6f}")
            else:
                self.parts.append(f"{key}:{value}")
        return self
        
    def add_dict(self, data: Dict[str, Any], exclude: Optional[List[str]] = None) -> 'CacheKeyBuilder':
        """
        딕셔너리에서 여러 파트 추가
        
        Args:
            data: 키-값 딕셔너리
            exclude: 제외할 키 목록
            
        Returns:
            체이닝을 위한 self
        """
        exclude_keys = exclude or []
        for key, value in data.items():
            if key not in exclude_keys:
                self.add(key, value)
        return self
        
    def build(self) -> str:
        """
        최종 캐시 키 생성
        
        Returns:
            생성된 캐시 키
        """
        if not self.parts:
            return f"{self.prefix}:default"
            
        return f"{self.prefix}:{':'.join(self.parts)}"

class CachePolicy:
    """세밀한 캐시 정책 설정"""
    def __init__(
        self,
        ttl: int,
        prefetch: bool = False,
        consistency_check: bool = False,
        use_lock: bool = False,
        warmup: bool = False
    ):
        self.ttl = ttl
        self.prefetch = prefetch
        self.consistency_check = consistency_check
        self.use_lock = use_lock
        self.warmup = warmup

class DistributedLockError(Exception):
    """분산 락 획득 실패 시 발생하는 예외"""
    pass

class CacheBackend(str, Enum):
    """캐시 백엔드 유형"""
    REDIS = "redis"
    MEMORY = "memory"
    NONE = "none"

class CacheManager:
    """
    캐시 관리 클래스

    다양한 백엔드(Redis, 메모리 등)에 대한 통합 인터페이스 제공
    애플리케이션 전체에서 단일 인스턴스로 사용
    """
    _instance = None
    _initialized = False
    _memory_cache: Dict[str, Tuple[Any, Optional[int]]] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CacheManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        # 백엔드 설정 - 환경 변수 또는 기본값 사용
        self.backend = os.environ.get("CACHE_BACKEND", CacheBackend.MEMORY)
        
        # Redis 연결 설정
        self.redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        self.redis_client = None
        self.sync_redis_client = None
        
        # Redis 백엔드 초기화
        if self.backend == CacheBackend.REDIS:
            try:
                if HAS_AIOREDIS:
                    self.redis_client = aioredis.from_url(self.redis_url)
                else:
                    logger.warning("aioredis 모듈이 설치되지 않아 비동기 Redis 캐시를 사용할 수 없습니다.")
                    self.redis_client = None
                    
                if HAS_REDIS:
                    self.sync_redis_client = Redis.from_url(self.redis_url)
                else:
                    logger.warning("redis-py 모듈이 설치되지 않아 동기 Redis 캐시를 사용할 수 없습니다.")
                    self.sync_redis_client = None
                    
                if not self.redis_client and not self.sync_redis_client:
                    logger.error("Redis 라이브러리가 설치되지 않아 메모리 캐시로 전환합니다.")
                    self.backend = CacheBackend.MEMORY
                else:
                    logger.info(f"Redis 캐시 백엔드 초기화 완료: {self.redis_url}")
            except RedisError as e:
                logger.error(f"Redis 연결 실패, 메모리 캐시로 전환: {e}")
                self.backend = CacheBackend.MEMORY
        
        if self.backend == CacheBackend.MEMORY:
            logger.info("메모리 캐시 백엔드 초기화 완료")
        elif self.backend == CacheBackend.NONE:
            logger.info("캐싱 비활성화")
        
        self._initialized = True

    async def get(self, key: str) -> Any:
        """
        캐시에서 값 조회 (비동기)

        Args:
            key: 캐시 키

        Returns:
            캐시된 값 또는 None
        """
        if self.backend == CacheBackend.NONE:
            return None
            
        try:
            if self.backend == CacheBackend.REDIS:
                value = await self.redis_client.get(key)
                if value:
                    return json.loads(value)
                return None
                
            elif self.backend == CacheBackend.MEMORY:
                if key in self._memory_cache:
                    return self._memory_cache[key][0]
                return None
                
        except Exception as e:
            logger.error(f"캐시 조회 중 오류 발생: {e}")
            return None

    def get_sync(self, key: str) -> Any:
        """
        캐시에서 값 조회 (동기)

        Args:
            key: 캐시 키

        Returns:
            캐시된 값 또는 None
        """
        if self.backend == CacheBackend.NONE:
            return None
            
        try:
            if self.backend == CacheBackend.REDIS:
                value = self.sync_redis_client.get(key)
                if value:
                    return json.loads(value)
                return None
                
            elif self.backend == CacheBackend.MEMORY:
                if key in self._memory_cache:
                    return self._memory_cache[key][0]
                return None
                
        except Exception as e:
            logger.error(f"캐시 조회 중 오류 발생: {e}")
            return None

    async def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """
        캐시에 값 저장 (비동기)

        Args:
            key: 캐시 키
            value: 저장할 값
            expire: 만료 시간(초)

        Returns:
            성공 여부
        """
        if self.backend == CacheBackend.NONE:
            return True
            
        try:
            json_value = json.dumps(value)
            
            if self.backend == CacheBackend.REDIS:
                if expire:
                    await self.redis_client.setex(key, expire, json_value)
                else:
                    await self.redis_client.set(key, json_value)
                    
            elif self.backend == CacheBackend.MEMORY:
                self._memory_cache[key] = (value, expire)
                
            logger.debug(f"캐시 저장 완료: {key}")
            return True
            
        except Exception as e:
            logger.error(f"캐시 저장 중 오류 발생: {e}")
            return False

    def set_sync(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """
        캐시에 값 저장 (동기)

        Args:
            key: 캐시 키
            value: 저장할 값
            expire: 만료 시간(초)

        Returns:
            성공 여부
        """
        if self.backend == CacheBackend.NONE:
            return True
            
        try:
            json_value = json.dumps(value)
            
            if self.backend == CacheBackend.REDIS:
                if expire:
                    self.sync_redis_client.setex(key, expire, json_value)
                else:
                    self.sync_redis_client.set(key, json_value)
                    
            elif self.backend == CacheBackend.MEMORY:
                self._memory_cache[key] = (value, expire)
                
            logger.debug(f"캐시 저장 완료: {key}")
            return True
            
        except Exception as e:
            logger.error(f"캐시 저장 중 오류 발생: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """
        캐시에서 값 삭제 (비동기)

        Args:
            key: 캐시 키

        Returns:
            성공 여부
        """
        if self.backend == CacheBackend.NONE:
            return True
            
        try:
            if self.backend == CacheBackend.REDIS:
                await self.redis_client.delete(key)
                
            elif self.backend == CacheBackend.MEMORY:
                if key in self._memory_cache:
                    del self._memory_cache[key]
                    
            logger.debug(f"캐시 삭제 완료: {key}")
            return True
            
        except Exception as e:
            logger.error(f"캐시 삭제 중 오류 발생: {e}")
            return False

    def delete_sync(self, key: str) -> bool:
        """
        캐시에서 값 삭제 (동기)

        Args:
            key: 캐시 키

        Returns:
            성공 여부
        """
        if self.backend == CacheBackend.NONE:
            return True
            
        try:
            if self.backend == CacheBackend.REDIS:
                self.sync_redis_client.delete(key)
                
            elif self.backend == CacheBackend.MEMORY:
                if key in self._memory_cache:
                    del self._memory_cache[key]
                    
            logger.debug(f"캐시 삭제 완료: {key}")
            return True
            
        except Exception as e:
            logger.error(f"캐시 삭제 중 오류 발생: {e}")
            return False

    async def delete_pattern(self, pattern: str) -> bool:
        """
        패턴과 일치하는 캐시 키 삭제 (비동기)

        Args:
            pattern: 캐시 키 패턴

        Returns:
            성공 여부
        """
        if self.backend == CacheBackend.NONE:
            return True
            
        try:
            if self.backend == CacheBackend.REDIS:
                # Redis SCAN 사용하여 패턴 일치 키 찾기
                keys_to_delete = []
                async for key in self.redis_client.scan_iter(match=pattern):
                    keys_to_delete.append(key)
                
                if keys_to_delete:
                    await self.redis_client.delete(*keys_to_delete)
                    logger.debug(f"패턴에 일치하는 {len(keys_to_delete)}개 키 삭제 완료: {pattern}")
                
            elif self.backend == CacheBackend.MEMORY:
                # 메모리 캐시에서 패턴 일치 키 찾기
                import re
                compiled_pattern = re.compile(pattern.replace("*", ".*"))
                keys_to_delete = [
                    k for k in self._memory_cache.keys() 
                    if compiled_pattern.match(k)
                ]
                
                for key in keys_to_delete:
                    del self._memory_cache[key]
                    
                logger.debug(f"패턴에 일치하는 {len(keys_to_delete)}개 키 삭제 완료: {pattern}")
                
            return True
            
        except Exception as e:
            logger.error(f"패턴 캐시 삭제 중 오류 발생: {e}")
            return False

    def delete_pattern_sync(self, pattern: str) -> bool:
        """
        패턴과 일치하는 캐시 키 삭제 (동기)

        Args:
            pattern: 캐시 키 패턴

        Returns:
            성공 여부
        """
        if self.backend == CacheBackend.NONE:
            return True
            
        try:
            if self.backend == CacheBackend.REDIS:
                # Redis SCAN 사용하여 패턴 일치 키 찾기
                keys_to_delete = []
                for key in self.sync_redis_client.scan_iter(match=pattern):
                    keys_to_delete.append(key)
                
                if keys_to_delete:
                    self.sync_redis_client.delete(*keys_to_delete)
                    logger.debug(f"패턴에 일치하는 {len(keys_to_delete)}개 키 삭제 완료: {pattern}")
                
            elif self.backend == CacheBackend.MEMORY:
                # 메모리 캐시에서 패턴 일치 키 찾기
                import re
                compiled_pattern = re.compile(pattern.replace("*", ".*"))
                keys_to_delete = [
                    k for k in self._memory_cache.keys() 
                    if compiled_pattern.match(k)
                ]
                
                for key in keys_to_delete:
                    del self._memory_cache[key]
                    
                logger.debug(f"패턴에 일치하는 {len(keys_to_delete)}개 키 삭제 완료: {pattern}")
                
            return True
            
        except Exception as e:
            logger.error(f"패턴 캐시 삭제 중 오류 발생: {e}")
            return False

    async def flush(self) -> bool:
        """
        모든 캐시 삭제 (비동기)

        Returns:
            성공 여부
        """
        if self.backend == CacheBackend.NONE:
            return True
            
        try:
            if self.backend == CacheBackend.REDIS:
                await self.redis_client.flushdb()
                
            elif self.backend == CacheBackend.MEMORY:
                self._memory_cache.clear()
                
            logger.info("모든 캐시 삭제 완료")
            return True
            
        except Exception as e:
            logger.error(f"모든 캐시 삭제 중 오류 발생: {e}")
            return False

    def flush_sync(self) -> bool:
        """
        모든 캐시 삭제 (동기)

        Returns:
            성공 여부
        """
        if self.backend == CacheBackend.NONE:
            return True
            
        try:
            if self.backend == CacheBackend.REDIS:
                self.sync_redis_client.flushdb()
                
            elif self.backend == CacheBackend.MEMORY:
                self._memory_cache.clear()
                
            logger.info("모든 캐시 삭제 완료")
            return True
            
        except Exception as e:
            logger.error(f"모든 캐시 삭제 중 오류 발생: {e}")
            return False

    async def keys(self, pattern: str = "*") -> List[str]:
        """
        패턴과 일치하는 캐시 키 목록 조회 (비동기)

        Args:
            pattern: 캐시 키 패턴

        Returns:
            캐시 키 목록
        """
        if self.backend == CacheBackend.NONE:
            return []
            
        try:
            if self.backend == CacheBackend.REDIS:
                # Redis SCAN 사용하여 패턴 일치 키 찾기
                keys = []
                async for key in self.redis_client.scan_iter(match=pattern):
                    keys.append(key.decode('utf-8'))
                return keys
                
            elif self.backend == CacheBackend.MEMORY:
                # 메모리 캐시에서 패턴 일치 키 찾기
                import re
                compiled_pattern = re.compile(pattern.replace("*", ".*"))
                return [
                    k for k in self._memory_cache.keys() 
                    if compiled_pattern.match(k)
                ]
                
        except Exception as e:
            logger.error(f"캐시 키 조회 중 오류 발생: {e}")
            return []

    def keys_sync(self, pattern: str = "*") -> List[str]:
        """
        패턴과 일치하는 캐시 키 목록 조회 (동기)

        Args:
            pattern: 캐시 키 패턴

        Returns:
            캐시 키 목록
        """
        if self.backend == CacheBackend.NONE:
            return []
            
        try:
            if self.backend == CacheBackend.REDIS:
                # Redis SCAN 사용하여 패턴 일치 키 찾기
                keys = []
                for key in self.sync_redis_client.scan_iter(match=pattern):
                    keys.append(key.decode('utf-8'))
                return keys
                
            elif self.backend == CacheBackend.MEMORY:
                # 메모리 캐시에서 패턴 일치 키 찾기
                import re
                compiled_pattern = re.compile(pattern.replace("*", ".*"))
                return [
                    k for k in self._memory_cache.keys() 
                    if compiled_pattern.match(k)
                ]
                
        except Exception as e:
            logger.error(f"캐시 키 조회 중 오류 발생: {e}")
            return []

    async def health_check(self) -> bool:
        """
        캐시 백엔드 상태 확인 (비동기)

        Returns:
            정상 여부
        """
        if self.backend == CacheBackend.NONE:
            return True
            
        try:
            if self.backend == CacheBackend.REDIS:
                await self.redis_client.ping()
                
            return True
            
        except Exception as e:
            logger.error(f"캐시 상태 확인 중 오류 발생: {e}")
            return False

    def health_check_sync(self) -> bool:
        """
        캐시 백엔드 상태 확인 (동기)

        Returns:
            정상 여부
        """
        if self.backend == CacheBackend.NONE:
            return True
            
        try:
            if self.backend == CacheBackend.REDIS:
                self.sync_redis_client.ping()
                
            return True
            
        except Exception as e:
            logger.error(f"캐시 상태 확인 중 오류 발생: {e}")
            return False

# 편의성 함수
def generate_cache_key(prefix: str, **kwargs) -> str:
    """캐시 키 생성 헬퍼 함수"""
    builder = CacheKeyBuilder(prefix)
    for key, value in kwargs.items():
        builder.add(key, value)
    return builder.build()


def invalidate_cache_for(entity_type: str, entity_id: Optional[str] = None) -> None:
    """
    지정된 엔티티 타입과 ID에 대한 캐시를 무효화하는 헬퍼 함수
    
    Args:
        entity_type: 엔티티 타입 (예: 'user', 'article')
        entity_id: 엔티티 ID (None인 경우 전체 타입에 대한 캐시 무효화)
    """
    # entity_id가 None이면 타입 전체에 대한, 아니면 특정 리소스에 대한 무효화
    resource_id = f"{entity_type}:{entity_id}" if entity_id else entity_type
    
    # 로깅을 통해 무효화 대상 리소스 식별 기록
    logger.debug(f"캐시 무효화 요청: {resource_id}")
    
    # 비동기 태스크로 무효화 작업 실행
    asyncio.create_task(
        cache_manager.invalidate_resources(entity_type, [entity_id] if entity_id else None)
    )


# 캐시 매니저 인스턴스 생성
cache_manager = CacheManager()