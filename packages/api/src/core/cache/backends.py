"""
캐시 백엔드 구현 모듈

이 모듈은 다양한 캐시 백엔드 구현을 제공합니다.
- Redis 기반 캐시
- 메모리 기반 캐시
"""

import json
import random
import time
from abc import ABC, abstractmethod
from datetime import timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Type, TypeVar, Union

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')


class CacheBackendType(str, Enum):
    """캐시 백엔드 유형을 정의하는 열거형."""
    REDIS = "redis"
    MEMORY = "memory"


class CacheSettings:
    """캐시 설정을 위한 클래스."""
    
    def __init__(
        self,
        default_ttl: Union[int, timedelta] = 60,  # 기본 TTL (초 또는 timedelta)
        backend_type: CacheBackendType = CacheBackendType.MEMORY,
        redis_url: Optional[str] = None,
        redis_password: Optional[str] = None,
        redis_db: int = 0,
        prefix: str = "api_cache:",
        enable_cache: bool = True,
        redis_ssl: bool = False  # SSL 지원 추가
    ):
        # timedelta 객체도 지원하도록 개선
        if isinstance(default_ttl, timedelta):
            self.default_ttl = int(default_ttl.total_seconds())
        else:
            self.default_ttl = default_ttl
        self.backend_type = backend_type
        self.redis_url = redis_url
        self.redis_password = redis_password
        self.redis_db = redis_db
        self.prefix = prefix
        self.enable_cache = enable_cache
        self.redis_ssl = redis_ssl


class CacheBackend(ABC):
    """캐시 백엔드를 위한 추상 기본 클래스."""
    
    @abstractmethod
    def get(self, key: str) -> Optional[Any]:
        """캐시에서 값을 가져옵니다."""
        pass
    
    @abstractmethod
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """캐시에 값을 설정합니다."""
        pass
    
    @abstractmethod
    def delete(self, key: str) -> bool:
        """캐시에서 키를 삭제합니다."""
        pass
    
    @abstractmethod
    def delete_pattern(self, pattern: str) -> int:
        """패턴과 일치하는 모든 키를 삭제합니다."""
        pass
    
    @abstractmethod
    def exists(self, key: str) -> bool:
        """키가 캐시에 존재하는지 확인합니다."""
        pass
    
    @abstractmethod
    def clear(self) -> bool:
        """모든 캐시를 지웁니다."""
        pass

    @abstractmethod
    def get_ttl(self, key: str) -> Optional[int]:
        """키의 남은 TTL을 가져옵니다."""
        pass


class RedisCache(CacheBackend):
    """Redis 기반 캐시 구현."""
    
    def __init__(self, settings: CacheSettings):
        """Redis 캐시 초기화."""
        if not REDIS_AVAILABLE:
            raise ImportError("Redis 패키지가 설치되어 있지 않습니다. `pip install redis`를 실행하세요.")
        
        if not settings.redis_url:
            raise ValueError("Redis URL이 제공되지 않았습니다.")
        
        self.settings = settings
        self.prefix = settings.prefix
        
        # SSL 지원 추가
        ssl_params = None
        if settings.redis_ssl:
            ssl_params = {"ssl": True, "ssl_cert_reqs": None}
            
        self.client = redis.Redis.from_url(
            settings.redis_url,
            password=settings.redis_password,
            db=settings.redis_db,
            decode_responses=True,
            **ssl_params if ssl_params else {}
        )
        
        try:
            self.client.ping()
            logger.info("Redis 서버에 성공적으로 연결되었습니다.")
        except redis.ConnectionError:
            logger.error("Redis 서버에 연결할 수 없습니다. 설정을 확인하세요.")
            raise
    
    def _get_prefixed_key(self, key: str) -> str:
        """키에 프리픽스를 추가합니다."""
        return f"{self.prefix}{key}"
    
    def get(self, key: str) -> Optional[Any]:
        """Redis에서 값을 가져옵니다."""
        prefixed_key = self._get_prefixed_key(key)
        value = self.client.get(prefixed_key)
        if value is None:
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Redis에 값을 설정합니다."""
        prefixed_key = self._get_prefixed_key(key)
        serialized_value = json.dumps(value)
        ttl = ttl or self.settings.default_ttl
        return self.client.setex(prefixed_key, ttl, serialized_value)
    
    def delete(self, key: str) -> bool:
        """Redis에서 키를 삭제합니다."""
        prefixed_key = self._get_prefixed_key(key)
        return bool(self.client.delete(prefixed_key))
    
    def delete_pattern(self, pattern: str) -> int:
        """패턴과 일치하는 모든 키를 삭제합니다."""
        prefixed_pattern = self._get_prefixed_key(pattern)
        keys = self.client.keys(prefixed_pattern)
        return self.client.delete(*keys) if keys else 0
    
    def exists(self, key: str) -> bool:
        """키가 Redis에 존재하는지 확인합니다."""
        prefixed_key = self._get_prefixed_key(key)
        return bool(self.client.exists(prefixed_key))
    
    def clear(self) -> bool:
        """Redis에서 모든 키를 삭제합니다."""
        prefixed_pattern = self._get_prefixed_key("*")
        keys = self.client.keys(prefixed_pattern)
        return bool(self.client.delete(*keys)) if keys else True

    def get_ttl(self, key: str) -> Optional[int]:
        """Redis에서 키의 남은 TTL을 가져옵니다."""
        prefixed_key = self._get_prefixed_key(key)
        ttl = self.client.ttl(prefixed_key)
        if ttl == -2:  # 키가 존재하지 않음
            return None
        return -1 if ttl == -1 else ttl  # -1은 키가 만료되지 않음을 의미


class MemoryCache(CacheBackend):
    """메모리 기반 캐시 구현."""
    
    def __init__(self, settings: CacheSettings):
        """메모리 캐시 초기화."""
        self.settings = settings
        self.prefix = settings.prefix
        # 캐시 구조: Dict[key, (value, expiry_timestamp)]
        self._cache: Dict[str, tuple[Any, Optional[float]]] = {}
    
    def _get_prefixed_key(self, key: str) -> str:
        """키에 프리픽스를 추가합니다."""
        return f"{self.prefix}{key}"
    
    def _is_expired(self, key: str) -> bool:
        """키가 만료되었는지 확인합니다."""
        if key not in self._cache:
            return True
            
        value, expiry = self._cache[key]
        if expiry is None:
            return False  # 만료 시간이 없음
            
        return expiry < time.time()
    
    def _clean_expired(self) -> None:
        """만료된 모든 키를 정리합니다."""
        now = time.time()
        expired_keys = [
            key for key, (_, expiry) in self._cache.items()
            if expiry is not None and expiry < now
        ]
        
        for key in expired_keys:
            del self._cache[key]
    
    def get(self, key: str) -> Optional[Any]:
        """메모리 캐시에서 값을 가져옵니다."""
        prefixed_key = self._get_prefixed_key(key)
        
        # 간헐적으로 만료된 항목 정리
        if random.random() < 0.01:  # 1% 확률로 정리
            self._clean_expired()
            
        # 키가 만료됐는지 확인
        if self._is_expired(prefixed_key):
            if prefixed_key in self._cache:
                del self._cache[prefixed_key]
            return None
            
        # 값 반환
        value, _ = self._cache.get(prefixed_key, (None, None))
        return value
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """메모리 캐시에 값을 설정합니다."""
        prefixed_key = self._get_prefixed_key(key)
        
        # 만료 시간 계산
        expiry = None
        if ttl is not None:
            expiry = time.time() + ttl
        elif self.settings.default_ttl > 0:
            expiry = time.time() + self.settings.default_ttl
            
        # 값 저장
        self._cache[prefixed_key] = (value, expiry)
        return True
    
    def delete(self, key: str) -> bool:
        """메모리 캐시에서 키를 삭제합니다."""
        prefixed_key = self._get_prefixed_key(key)
        if prefixed_key in self._cache:
            del self._cache[prefixed_key]
            return True
        return False
    
    def delete_pattern(self, pattern: str) -> int:
        """패턴과 일치하는 모든 키를 삭제합니다."""
        import fnmatch
        prefixed_pattern = self._get_prefixed_key(pattern)
        
        # 와일드카드를 정규식으로 변환
        import re
        regex_pattern = fnmatch.translate(prefixed_pattern)
        pattern_re = re.compile(regex_pattern)
        
        # 패턴과 일치하는 키 찾기
        matching_keys = [
            key for key in self._cache.keys()
            if pattern_re.match(key)
        ]
        
        # 일치하는 키 삭제
        for key in matching_keys:
            del self._cache[key]
            
        return len(matching_keys)
    
    def exists(self, key: str) -> bool:
        """키가 메모리 캐시에 존재하며 만료되지 않았는지 확인합니다."""
        prefixed_key = self._get_prefixed_key(key)
        return prefixed_key in self._cache and not self._is_expired(prefixed_key)
    
    def clear(self) -> bool:
        """메모리 캐시의 모든 키를 지웁니다."""
        self._cache.clear()
        return True
        
    def get_ttl(self, key: str) -> Optional[int]:
        """메모리 캐시에서 키의 남은 TTL을 가져옵니다."""
        prefixed_key = self._get_prefixed_key(key)
        
        if prefixed_key not in self._cache:
            return None
            
        _, expiry = self._cache[prefixed_key]
        if expiry is None:
            return -1  # 영구 캐시
            
        ttl = expiry - time.time()
        return int(ttl) if ttl > 0 else 0  # 0 이하면 곧 만료됨
