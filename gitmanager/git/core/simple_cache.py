"""
간단한 메모리 캐시 구현 모듈

다른 캐시 구현을 사용할 수 없을 때 기본적인 메모리 캐시 기능을 제공합니다.
"""

import time
import threading
from typing import Any, Dict, List, Optional, Tuple, Union
import logging

logger = logging.getLogger(__name__)

class SimpleMemoryCache:
    """
    간단한 메모리 캐시 구현
    
    복잡한 캐시 구현을 사용할 수 없을 때 기본적인 캐싱 기능을 제공합니다.
    스레드 안전성을 보장하며 TTL 지원과 자동 정리 기능을 포함합니다.
    """
    
    _instance = None  # 싱글톤 인스턴스
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SimpleMemoryCache, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance
    
    def __init__(self):
        """캐시 구성 요소 초기화"""
        if self.initialized:
            return
            
        self.initialized = True
        self.cache: Dict[str, Any] = {}
        self.expires: Dict[str, float] = {}
        self.access_times: Dict[str, float] = {}
        self.lock = threading.RLock()
        self.max_size = 1000  # 최대 캐시 항목 수
        
        # 만료된 항목 정리 스레드 시작
        self.cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self.cleanup_thread.start()
        
        # 통계 데이터
        self.hits = 0
        self.misses = 0
        self.sets = 0
        self.evictions = 0
        
        logger.info("SimpleMemoryCache 초기화 완료")
    
    def _cleanup_loop(self) -> None:
        """
        백그라운드에서 정기적으로 만료된 항목을 정리합니다.
        """
        while True:
            try:
                self._cleanup_expired()
                time.sleep(60)  # 1분마다 정리
            except Exception as e:
                logger.error(f"캐시 정리 중 오류 발생: {e}")
                time.sleep(300)  # 오류 발생 시 5분 후 재시도
    
    def _cleanup_expired(self) -> int:
        """
        만료된 캐시 항목을 정리합니다.
        
        Returns:
            int: 정리된 항목 수
        """
        now = time.time()
        removed = 0
        
        with self.lock:
            # 만료된 항목 식별
            expired_keys = [k for k, exp in self.expires.items() if exp <= now]
            
            # 만료된 항목 제거
            for key in expired_keys:
                self.cache.pop(key, None)
                self.expires.pop(key, None)
                self.access_times.pop(key, None)
                removed += 1
                
        return removed
    
    def _check_size(self) -> None:
        """
        캐시 크기를 확인하고 필요하면 항목을 제거합니다.
        """
        with self.lock:
            if len(self.cache) <= self.max_size:
                return
                
            # 제거 대상 항목 수 계산
            items_to_remove = len(self.cache) - self.max_size + int(self.max_size * 0.1)
            
            # 가장 오래 사용되지 않은 항목부터 제거
            sorted_keys = sorted(self.access_times.items(), key=lambda x: x[1])
            keys_to_remove = [k for k, _ in sorted_keys[:items_to_remove]]
            
            for key in keys_to_remove:
                self.cache.pop(key, None)
                self.expires.pop(key, None)
                self.access_times.pop(key, None)
                self.evictions += 1
    
    def get(self, key: str) -> Tuple[bool, Any]:
        """
        캐시에서 값을 가져옵니다.
        
        Args:
            key: 가져올 캐시 키
            
        Returns:
            Tuple[bool, Any]: (적중 여부, 값)
        """
        with self.lock:
            now = time.time()
            
            # 키가 없으면 미스
            if key not in self.cache:
                self.misses += 1
                return False, None
                
            # 만료되었으면 미스
            if key in self.expires and self.expires[key] <= now:
                self.cache.pop(key, None)
                self.expires.pop(key, None)
                self.access_times.pop(key, None)
                self.misses += 1
                return False, None
                
            # 접근 시간 업데이트
            self.access_times[key] = now
            self.hits += 1
            
            return True, self.cache[key]
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        캐시에 값을 저장합니다.
        
        Args:
            key: 캐시 키
            value: 저장할 값
            ttl: 유효 기간(초), None이면 만료되지 않음
        """
        with self.lock:
            self.cache[key] = value
            now = time.time()
            
            if ttl is not None:
                self.expires[key] = now + ttl
            elif key in self.expires:
                # TTL이 None이면 만료 시간 제거
                del self.expires[key]
                
            self.access_times[key] = now
            self.sets += 1
            
            # 크기 확인 및 필요시 정리
            self._check_size()
    
    def delete(self, key: str) -> bool:
        """
        캐시에서 항목을 삭제합니다.
        
        Args:
            key: 삭제할 캐시 키
            
        Returns:
            bool: 삭제 성공 여부
        """
        with self.lock:
            if key not in self.cache:
                return False
                
            self.cache.pop(key, None)
            self.expires.pop(key, None)
            self.access_times.pop(key, None)
            return True
    
    def clear(self) -> None:
        """캐시를 완전히 비웁니다."""
        with self.lock:
            self.cache.clear()
            self.expires.clear()
            self.access_times.clear()
    
    def delete_by_pattern(self, pattern: str) -> int:
        """
        패턴과 일치하는 모든 키를 삭제합니다.
        간단한 와일드카드만 지원합니다 (예: 'prefix*', '*suffix').
        
        Args:
            pattern: 삭제할 키 패턴
            
        Returns:
            int: 삭제된 항목 수
        """
        deleted = 0
        with self.lock:
            # 별표로 시작하는 패턴은 접미사 검색
            if pattern.startswith('*'):
                suffix = pattern[1:]
                keys_to_delete = [k for k in self.cache.keys() if k.endswith(suffix)]
            # 별표로 끝나는 패턴은 접두사 검색
            elif pattern.endswith('*'):
                prefix = pattern[:-1]
                keys_to_delete = [k for k in self.cache.keys() if k.startswith(prefix)]
            # 별표가 중간에 있는 경우는 단순 포함 검색
            elif '*' in pattern:
                parts = pattern.split('*', 1)
                prefix, suffix = parts[0], parts[1]
                keys_to_delete = [k for k in self.cache.keys() if k.startswith(prefix) and k.endswith(suffix)]
            # 정확한 키 검색
            else:
                keys_to_delete = [k for k in self.cache.keys() if k == pattern]
                
            # 일치하는 키 삭제
            for key in keys_to_delete:
                self.cache.pop(key, None)
                self.expires.pop(key, None)
                self.access_times.pop(key, None)
                deleted += 1
                
            return deleted
    
    def get_stats(self) -> Dict[str, Any]:
        """
        캐시 통계 정보를 반환합니다.
        
        Returns:
            Dict[str, Any]: 통계 정보
        """
        with self.lock:
            total = self.hits + self.misses
            hit_ratio = self.hits / total if total > 0 else 0
            
            return {
                "hits": self.hits,
                "misses": self.misses,
                "sets": self.sets,
                "evictions": self.evictions,
                "hit_ratio": hit_ratio,
                "items": len(self.cache),
                "max_size": self.max_size
            }
    
    def get_keys(self, pattern: Optional[str] = None) -> List[str]:
        """
        캐시에 저장된 키 목록을 반환합니다.
        
        Args:
            pattern: 필터링할 패턴(옵션)
            
        Returns:
            List[str]: 캐시 키 목록
        """
        with self.lock:
            if pattern is None:
                return list(self.cache.keys())
                
            # 패턴 기반 필터링
            if pattern.startswith('*'):
                suffix = pattern[1:]
                return [k for k in self.cache.keys() if k.endswith(suffix)]
            elif pattern.endswith('*'):
                prefix = pattern[:-1]
                return [k for k in self.cache.keys() if k.startswith(prefix)]
            elif '*' in pattern:
                parts = pattern.split('*', 1)
                prefix, suffix = parts[0], parts[1]
                return [k for k in self.cache.keys() if k.startswith(prefix) and k.endswith(suffix)]
            else:
                return [k for k in self.cache.keys() if k == pattern] 