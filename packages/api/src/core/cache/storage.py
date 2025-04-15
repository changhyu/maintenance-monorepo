"""
캐시 저장소 모듈

이 모듈은 캐시 저장 메커니즘 및 정책을 구현하는 클래스들을 제공합니다.
"""
from typing import Any, Dict, List, Optional, Set, Tuple, Union
import time
import logging
from enum import Enum


logger = logging.getLogger(__name__)


class EvictionPolicy(Enum):
    """캐시 항목 제거 정책"""
    LRU = "lru"  # Least Recently Used
    LFU = "lfu"  # Least Frequently Used
    FIFO = "fifo"  # First In First Out


class LRUCache:
    """
    LRU(Least Recently Used) 캐시 구현
    
    가장 최근에 사용되지 않은 항목을 제거하는 캐시 정책을 구현합니다.
    """
    
    def __init__(self, max_size: int = 1000):
        """
        LRUCache 초기화
        
        Args:
            max_size: 캐시의 최대 항목 수 (기본값: 1000)
        """
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.max_size: int = max_size
        
    def get(self, key: str) -> Optional[Any]:
        """
        캐시에서 키에 해당하는 값을 검색합니다.
        
        Args:
            key: 검색할 캐시 키
            
        Returns:
            캐시된 값 또는 키가 없는 경우 None
        """
        if key in self.cache:
            cache_entry = self.cache[key]
            current_time = time.time()
            
            # 만료 확인
            if "expiry" in cache_entry and cache_entry["expiry"] < current_time:
                # 만료된 항목 제거
                del self.cache[key]
                return None
            
            # 마지막 접근 시간 업데이트
            cache_entry["last_accessed"] = current_time
            return cache_entry["value"]
        
        return None
        
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        값을 캐시에 저장합니다.
        
        Args:
            key: 캐시 키
            value: 저장할 값
            ttl: 캐시 항목의 TTL(Time To Live) (초 단위, 선택적)
        """
        current_time = time.time()
        self.cache[key] = {
            "value": value,
            "last_accessed": current_time,
            "expiry": current_time + ttl if ttl is not None else None
        }
        
        # 캐시 크기 제한 관리
        self._enforce_size_limit()
        
    def delete(self, key: str) -> bool:
        """
        캐시에서 키를 삭제합니다.
        
        Args:
            key: 삭제할 캐시 키
            
        Returns:
            삭제 성공 여부
        """
        if key in self.cache:
            del self.cache[key]
            return True
        return False
        
    def clear(self) -> None:
        """캐시의 모든 항목을 삭제합니다."""
        self.cache.clear()
        
    def _enforce_size_limit(self) -> None:
        """캐시 크기가 최대 크기를 초과하면 가장 오래된 항목을 제거합니다."""
        if len(self.cache) > self.max_size:
            # LRU 정책: 가장 오래 전에 접근한 항목 제거
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k]["last_accessed"])
            if oldest_key:
                logger.debug(f"LRU 캐시 크기 제한 초과, 삭제: {oldest_key}")
                del self.cache[oldest_key]
                
    def keys(self) -> List[str]:
        """
        캐시의 모든 키를 반환합니다.
        
        Returns:
            캐시에 저장된 모든 키의 리스트
        """
        return list(self.cache.keys())
        
    def size(self) -> int:
        """
        현재 캐시 크기(항목 수)를 반환합니다.
        
        Returns:
            캐시에 저장된 항목 수
        """
        return len(self.cache) 