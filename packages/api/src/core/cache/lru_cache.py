"""
LRU(Least Recently Used) 캐시 구현 모듈

이 모듈은 LRUCache 및 관련 축출 정책 클래스를 제공합니다.
"""
from abc import ABC, abstractmethod
import time
from typing import Any, Dict, List, Optional, Set, Tuple


class EvictionPolicy(ABC):
    """
    캐시 항목 축출 정책을 위한 추상 기본 클래스
    
    이 추상 클래스는 캐시 항목 축출 로직을 정의합니다.
    """
    
    @abstractmethod
    def should_evict(self, cache_size: int, max_size: int) -> bool:
        """
        항목을 축출해야 하는지 결정
        
        Args:
            cache_size: 현재 캐시 크기
            max_size: 최대 허용 캐시 크기
            
        Returns:
            축출 여부
        """
        pass
    
    @abstractmethod
    def get_eviction_candidates(self, cache: Dict[str, Dict[str, Any]], count: int = 1) -> List[str]:
        """
        축출 대상 항목 키 목록 반환
        
        Args:
            cache: 캐시 데이터
            count: 축출할 항목 수
            
        Returns:
            축출 대상 키 목록
        """
        pass


class LRUEvictionPolicy(EvictionPolicy):
    """
    Least Recently Used(LRU) 축출 정책 구현
    
    가장 오랫동안 사용되지 않은 항목부터 축출합니다.
    """
    
    def should_evict(self, cache_size: int, max_size: int) -> bool:
        """
        항목을 축출해야 하는지 결정
        
        캐시 크기가 최대 크기의 90%를 초과하면 축출을 진행합니다.
        
        Args:
            cache_size: 현재 캐시 크기
            max_size: 최대 허용 캐시 크기
            
        Returns:
            축출 여부
        """
        return cache_size >= max_size * 0.9
    
    def get_eviction_candidates(self, cache: Dict[str, Dict[str, Any]], count: int = 1) -> List[str]:
        """
        축출 대상 항목 키 목록 반환
        
        가장 마지막으로 접근한 시간이 오래된 항목부터 선택합니다.
        
        Args:
            cache: 캐시 데이터
            count: 축출할 항목 수
            
        Returns:
            축출 대상 키 목록
        """
        # last_accessed 기준으로 정렬하여 오래된 항목부터 선택
        sorted_items = sorted(
            cache.items(),
            key=lambda x: x[1].get("last_accessed", 0)
        )
        
        # 요청된 수만큼 키 반환
        return [key for key, _ in sorted_items[:count]]


class LRUCache:
    """
    Least Recently Used(LRU) 캐시 구현
    
    메모리 내 키-값 저장소로, LRU 축출 정책을 사용합니다.
    """
    
    def __init__(self, max_size: int = 1000, eviction_policy: Optional[EvictionPolicy] = None):
        """
        LRUCache 인스턴스 초기화
        
        Args:
            max_size: 최대 캐시 항목 수
            eviction_policy: 사용할 축출 정책
        """
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.max_size: int = max_size
        self.eviction_policy: EvictionPolicy = eviction_policy or LRUEvictionPolicy()
    
    def get(self, key: str) -> Optional[Any]:
        """
        캐시에서 값 조회
        
        키에 해당하는 값이 존재하고 만료되지 않았으면 반환합니다.
        
        Args:
            key: 조회할 캐시 키
            
        Returns:
            캐시된 값 또는 None
        """
        if key not in self.cache:
            return None
        
        # 현재 시간 기준으로 만료 여부 확인
        current_time = time.time()
        cache_entry = self.cache[key]
        
        # 만료 시간이 설정되어 있고 현재 시간이 만료 시간을 초과한 경우
        if "expiry" in cache_entry and cache_entry["expiry"] < current_time:
            # 만료된 항목 삭제
            del self.cache[key]
            return None
        
        # 마지막 접근 시간 업데이트
        cache_entry["last_accessed"] = current_time
        
        return cache_entry["value"]
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        캐시에 값 설정
        
        Args:
            key: 캐시 키
            value: 저장할 값
            ttl: 유효 시간(초)
        """
        current_time = time.time()
        
        # 캐시 항목 생성 (값, 마지막 접근 시간, 선택적 만료 시간)
        self.cache[key] = {
            "value": value,
            "last_accessed": current_time,
            "expiry": current_time + ttl if ttl is not None else None
        }
        
        # 캐시 크기 제한 초과 시 축출 정책에 따라 항목 제거
        if self.eviction_policy.should_evict(len(self.cache), self.max_size):
            self._evict_items()
    
    def delete(self, key: str) -> bool:
        """
        캐시에서 항목 삭제
        
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
        """모든 캐시 항목 삭제"""
        self.cache.clear()
    
    def keys(self) -> List[str]:
        """
        모든 캐시 키 목록 반환
        
        Returns:
            캐시 키 목록
        """
        return list(self.cache.keys())
    
    def has_key(self, key: str) -> bool:
        """
        키 존재 여부 확인
        
        Args:
            key: 확인할 캐시 키
            
        Returns:
            키 존재 여부
        """
        return key in self.cache
    
    def get_many(self, keys: List[str]) -> Dict[str, Any]:
        """
        여러 키에 대한 값 조회
        
        Args:
            keys: 조회할 캐시 키 목록
            
        Returns:
            키-값 쌍 딕셔너리
        """
        result = {}
        for key in keys:
            value = self.get(key)
            if value is not None:
                result[key] = value
        return result
    
    def set_many(self, items: Dict[str, Any], ttl: Optional[int] = None) -> None:
        """
        여러 항목 한 번에 설정
        
        Args:
            items: 키-값 쌍 딕셔너리
            ttl: 유효 시간(초)
        """
        for key, value in items.items():
            self.set(key, value, ttl)
    
    def delete_many(self, keys: List[str]) -> int:
        """
        여러 키 한 번에 삭제
        
        Args:
            keys: 삭제할 키 목록
            
        Returns:
            삭제된 항목 수
        """
        count = 0
        for key in keys:
            if self.delete(key):
                count += 1
        return count
    
    def get_expired_keys(self) -> List[str]:
        """
        만료된 모든 키 목록 반환
        
        Returns:
            만료된 키 목록
        """
        current_time = time.time()
        expired_keys = []
        
        for key, entry in self.cache.items():
            if "expiry" in entry and entry["expiry"] is not None and entry["expiry"] < current_time:
                expired_keys.append(key)
                
        return expired_keys
    
    def size(self) -> int:
        """
        현재 캐시 크기 반환
        
        Returns:
            캐시 항목 수
        """
        return len(self.cache)
    
    def _evict_items(self, count: int = 1) -> None:
        """
        축출 정책에 따라 항목 제거
        
        Args:
            count: 제거할 항목 수
        """
        if not self.cache:
            return
            
        # 축출 정책에 따라 제거할 항목 선택
        keys_to_evict = self.eviction_policy.get_eviction_candidates(self.cache, count)
        
        # 선택된 항목 제거
        for key in keys_to_evict:
            if key in self.cache:
                del self.cache[key] 