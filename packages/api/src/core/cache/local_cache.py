"""
로컬 캐시 관리자 모듈

LRU 정책을 사용하는 로컬 메모리 캐시 구현을 제공합니다.
"""
import logging
import time
from collections import OrderedDict
from typing import Any, Dict, List, Optional, Set, Tuple

from .constants import (
    DEFAULT_CACHE_TTL,
    MAX_LOCAL_CACHE_SIZE,
    MEMORY_USAGE_THRESHOLD
)
from .interfaces import CacheInterface

logger = logging.getLogger(__name__)


class LRUCache:
    """
    LRU 캐시 구현
    
    OrderedDict를 사용하여 LRU(Least Recently Used) 정책을 구현합니다.
    """
    
    def __init__(self, max_size: int = MAX_LOCAL_CACHE_SIZE):
        """
        LRU 캐시 초기화
        
        Args:
            max_size: 최대 캐시 항목 수
        """
        self.max_size = max_size
        self.cache: OrderedDict = OrderedDict()
        self.expiry: Dict[str, float] = {}
    
    def get(self, key: str) -> Optional[Any]:
        """
        캐시에서 값 검색
        
        Args:
            key: 캐시 키
            
        Returns:
            캐시된 값 또는 None
        """
        # 만료 확인
        if key in self.expiry and time.time() > self.expiry[key]:
            self._remove(key)
            return None
        
        # 값이 없으면 None 반환
        if key not in self.cache:
            return None
        
        # 값이 있으면 최근 사용 표시
        value = self.cache.pop(key)
        self.cache[key] = value
        return value
    
    def set(self, key: str, value: Any, expiry: Optional[int] = None) -> None:
        """
        캐시에 값 저장
        
        Args:
            key: 캐시 키
            value: 저장할 값
            expiry: 만료 시간(초)
        """
        # 이미 있는 키면 제거
        if key in self.cache:
            self._remove(key)
        
        # 캐시가 가득 찼으면 가장 오래된 항목 제거
        if len(self.cache) >= self.max_size:
            oldest_key = next(iter(self.cache))
            self._remove(oldest_key)
        
        # 새 값 저장
        self.cache[key] = value
        
        # 만료 시간 설정
        if expiry is not None:
            self.expiry[key] = time.time() + expiry
    
    def delete(self, key: str) -> bool:
        """
        캐시에서 키 삭제
        
        Args:
            key: 캐시 키
            
        Returns:
            성공 여부
        """
        if key in self.cache:
            self._remove(key)
            return True
        return False
    
    def exists(self, key: str) -> bool:
        """
        키가 캐시에 존재하는지 확인
        
        Args:
            key: 확인할 캐시 키
            
        Returns:
            존재 여부
        """
        # 만료 확인
        if key in self.expiry and time.time() > self.expiry[key]:
            self._remove(key)
            return False
        return key in self.cache
    
    def clear(self) -> None:
        """캐시 전체 삭제"""
        self.cache.clear()
        self.expiry.clear()
    
    def keys(self) -> List[str]:
        """
        모든 키 조회
        
        Returns:
            키 목록
        """
        return list(self.cache.keys())
    
    def _remove(self, key: str) -> None:
        """
        키 제거
        
        Args:
            key: 제거할 캐시 키
        """
        self.cache.pop(key, None)
        self.expiry.pop(key, None)
    
    def cleanup_expired(self) -> int:
        """
        만료된 키 정리
        
        Returns:
            삭제된 키 수
        """
        now = time.time()
        expired_keys = [
            key for key, expiry in self.expiry.items()
            if now > expiry
        ]
        
        for key in expired_keys:
            self._remove(key)
            
        return len(expired_keys)
    
    def get_stats(self) -> Dict[str, Any]:
        """
        캐시 통계 정보 조회
        
        Returns:
            통계 정보
        """
        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "usage_ratio": len(self.cache) / self.max_size,
            "expired_keys": len(self.expiry)
        }


class LocalCacheManager(CacheInterface):
    """
    로컬 캐시 관리자
    
    LRU 캐시를 사용하여 로컬 메모리에 데이터를 캐시합니다.
    """
    
    def __init__(
        self,
        max_size: int = MAX_LOCAL_CACHE_SIZE,
        default_ttl: int = DEFAULT_CACHE_TTL
    ):
        """
        로컬 캐시 관리자 초기화
        
        Args:
            max_size: 최대 캐시 항목 수
            default_ttl: 기본 TTL(초)
        """
        self.cache = LRUCache(max_size)
        self.default_ttl = default_ttl
        
        # 메트릭
        self.hit_count = 0
        self.miss_count = 0
    
    async def get(self, key: str) -> Any:
        """
        캐시에서 값 검색
        
        Args:
            key: 캐시 키
            
        Returns:
            캐시된 값 또는 None
        """
        value = self.cache.get(key)
        
        if value is not None:
            self.hit_count += 1
        else:
            self.miss_count += 1
            
        return value
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        expiry: Optional[int] = None
    ) -> bool:
        """
        캐시에 값 저장
        
        Args:
            key: 캐시 키
            value: 저장할 값
            expiry: 만료 시간(초)
            
        Returns:
            성공 여부
        """
        try:
            self.cache.set(
                key, 
                value, 
                expiry if expiry is not None else self.default_ttl
            )
            return True
        except Exception as e:
            logger.error(f"로컬 캐시 저장 실패 - 키: {key}, 오류: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """
        캐시에서 키 삭제
        
        Args:
            key: 캐시 키
            
        Returns:
            성공 여부
        """
        return self.cache.delete(key)
    
    async def exists(self, key: str) -> bool:
        """
        키가 캐시에 존재하는지 확인
        
        Args:
            key: 확인할 캐시 키
            
        Returns:
            존재 여부
        """
        return self.cache.exists(key)
    
    async def clear(self) -> bool:
        """
        캐시 전체 삭제
        
        Returns:
            성공 여부
        """
        try:
            self.cache.clear()
            return True
        except Exception as e:
            logger.error(f"로컬 캐시 전체 삭제 실패: {e}")
            return False
    
    async def cleanup_expired_keys(self) -> int:
        """
        만료된 키 정리
        
        Returns:
            삭제된 키 수
        """
        return self.cache.cleanup_expired()
    
    async def get_stats(self) -> Dict[str, Any]:
        """
        캐시 통계 정보 조회
        
        Returns:
            통계 정보
        """
        stats = self.cache.get_stats()
        stats.update({
            "hit_count": self.hit_count,
            "miss_count": self.miss_count,
            "hit_ratio": self.hit_count / max(self.hit_count + self.miss_count, 1)
        })
        return stats
    
    async def keys(self) -> List[str]:
        """
        모든 키 조회
        
        Returns:
            키 목록
        """
        return self.cache.keys() 