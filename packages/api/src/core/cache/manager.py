"""
캐시 관리자 모듈

다양한 백엔드(Redis, 메모리)를 지원하는 캐시 관리자를 구현합니다.
싱글톤 패턴을 사용하여 애플리케이션 전체에서 하나의 인스턴스만 사용하도록 합니다.
"""

import asyncio
import json
import logging
import time
from typing import Any, Dict, List, Optional, Pattern, Set, Tuple, Union

from ..cache.config import CacheBackend, get_cache_config

logger = logging.getLogger(__name__)


class CacheManager:
    """
    캐시 관리자 클래스
    
    Redis 및 메모리 캐시 백엔드를 지원하는 통합 캐시 인터페이스를 제공합니다.
    싱글톤 패턴을 사용하여 애플리케이션 전체에서 하나의 인스턴스를 공유합니다.
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CacheManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self.config = get_cache_config()
        self.backend = self.config.backend
        self._redis_client = None
        self._memory_cache = {}
        self._memory_cache_expiry = {}
        self._memory_cache_max_size = self.config.memory_max_size
        self._initialized = True
        
        # 선택한 백엔드 초기화
        if self.backend == CacheBackend.REDIS:
            self._init_redis()
        
        logger.info(f"캐시 관리자 초기화 완료: 백엔드={self.backend.value}")
    
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
            logger.warning("redis 패키지를 찾을 수 없습니다. redis 백엔드를 사용하려면 'pip install redis' 명령을 실행하세요.")
            self.backend = CacheBackend.MEMORY
            logger.info("백엔드를 메모리로 전환합니다.")
        except Exception as e:
            logger.error(f"Redis 연결 오류: {str(e)}")
            self.backend = CacheBackend.MEMORY
            logger.info("백엔드를 메모리로 전환합니다.")
    
    def _cleanup_memory_cache(self):
        """
        메모리 캐시 정리
        
        만료된 항목을 제거하고 최대 크기를 초과할 경우 가장 오래된 항목을 제거합니다.
        """
        current_time = time.time()
        
        # 만료된 항목 제거
        expired_keys = [
            k for k, expire_time in self._memory_cache_expiry.items()
            if expire_time is not None and expire_time < current_time
        ]
        
        for key in expired_keys:
            self._memory_cache.pop(key, None)
            self._memory_cache_expiry.pop(key, None)
        
        # 최대 크기를 초과할 경우 가장 오래된 항목 제거
        if len(self._memory_cache) > self._memory_cache_max_size:
            # 만료 시간이 가장 빠른 항목부터 제거
            sorted_keys = sorted(
                self._memory_cache_expiry.items(),
                key=lambda x: x[1] if x[1] is not None else float('inf')
            )
            
            # 최대 크기를 맞출 때까지 항목 제거
            keys_to_remove = sorted_keys[:len(self._memory_cache) - self._memory_cache_max_size]
            for key, _ in keys_to_remove:
                self._memory_cache.pop(key, None)
                self._memory_cache_expiry.pop(key, None)
    
    async def get(self, key: str, default: Any = None) -> Any:
        """
        캐시에서 키에 해당하는 값을 비동기적으로 가져옵니다.
        
        Args:
            key: 가져올 캐시 키
            default: 키가 존재하지 않을 경우 반환할 기본값
            
        Returns:
            캐시된 값 또는 기본값
        """
        if not self.config.enabled:
            return default
        
        try:
            if self.backend == CacheBackend.REDIS:
                value = await self._redis_async_client.get(key)
                if value is None:
                    return default
                return json.loads(value)
            
            elif self.backend == CacheBackend.MEMORY:
                self._cleanup_memory_cache()
                value = self._memory_cache.get(key)
                if value is None:
                    return default
                return value
            
            return default
        except Exception as e:
            logger.error(f"캐시 가져오기 실패 (키: {key}): {str(e)}")
            return default
    
    def get_sync(self, key: str, default: Any = None) -> Any:
        """
        캐시에서 키에 해당하는 값을 동기적으로 가져옵니다.
        
        Args:
            key: 가져올 캐시 키
            default: 키가 존재하지 않을 경우 반환할 기본값
            
        Returns:
            캐시된 값 또는 기본값
        """
        if not self.config.enabled:
            return default
        
        try:
            if self.backend == CacheBackend.REDIS:
                value = self._redis_client.get(key)
                if value is None:
                    return default
                return json.loads(value)
            
            elif self.backend == CacheBackend.MEMORY:
                self._cleanup_memory_cache()
                value = self._memory_cache.get(key)
                if value is None:
                    return default
                return value
            
            return default
        except Exception as e:
            logger.error(f"캐시 가져오기 실패 (키: {key}): {str(e)}")
            return default
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        expire: Optional[int] = None
    ) -> bool:
        """
        값을 캐시에 비동기적으로 저장합니다.
        
        Args:
            key: 캐시 키
            value: 저장할 값
            expire: 만료 시간(초), None인 경우 만료되지 않음
            
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
    
    def set_sync(
        self, 
        key: str, 
        value: Any, 
        expire: Optional[int] = None
    ) -> bool:
        """
        값을 캐시에 동기적으로 저장합니다.
        
        Args:
            key: 캐시 키
            value: 저장할 값
            expire: 만료 시간(초), None인 경우 만료되지 않음
            
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
                    keys.append(key.decode('utf-8'))
                return keys
            
            elif self.backend == CacheBackend.MEMORY:
                self._cleanup_memory_cache()
                if pattern == "*":
                    return list(self._memory_cache.keys())
                else:
                    return [k for k in self._memory_cache.keys() if pattern.replace("*", "") in k]
            
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
                    keys.append(key.decode('utf-8'))
                return keys
            
            elif self.backend == CacheBackend.MEMORY:
                self._cleanup_memory_cache()
                if pattern == "*":
                    return list(self._memory_cache.keys())
                else:
                    return [k for k in self._memory_cache.keys() if pattern.replace("*", "") in k]
            
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
            "details": {}
        }
        
        try:
            if self.backend == CacheBackend.REDIS:
                # Redis 연결 테스트
                start_time = time.time()
                await self._redis_async_client.ping()
                latency = time.time() - start_time
                
                status["details"] = {
                    "latency_ms": round(latency * 1000, 2),
                    "connection": "ok"
                }
            
            elif self.backend == CacheBackend.MEMORY:
                # 메모리 캐시 상태
                status["details"] = {
                    "items_count": len(self._memory_cache),
                    "max_size": self._memory_cache_max_size,
                    "usage_percent": round(len(self._memory_cache) / self._memory_cache_max_size * 100, 2) if self._memory_cache_max_size > 0 else 0
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
            "details": {}
        }
        
        try:
            if self.backend == CacheBackend.REDIS:
                # Redis 연결 테스트
                start_time = time.time()
                self._redis_client.ping()
                latency = time.time() - start_time
                
                status["details"] = {
                    "latency_ms": round(latency * 1000, 2),
                    "connection": "ok"
                }
            
            elif self.backend == CacheBackend.MEMORY:
                # 메모리 캐시 상태
                status["details"] = {
                    "items_count": len(self._memory_cache),
                    "max_size": self._memory_cache_max_size,
                    "usage_percent": round(len(self._memory_cache) / self._memory_cache_max_size * 100, 2) if self._memory_cache_max_size > 0 else 0
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
