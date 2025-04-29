"""
속도 제한(Rate Limiting) 스토리지 모듈

이 모듈은 속도 제한 정보를 저장하기 위한 스토리지 클래스를 제공합니다.
- InMemoryStorage: 메모리 기반 스토리지
- RedisStorage: Redis 기반 스토리지
"""

import time
import logging
from typing import Dict, Any, Optional, Tuple, Union
from abc import ABC, abstractmethod
from collections import defaultdict
import threading

# 로거 설정
logger = logging.getLogger(__name__)

class RateLimitStorage(ABC):
    """속도 제한 정보를 저장하는 추상 기본 클래스"""
    
    @abstractmethod
    def get(self, key: str, endpoint: str) -> Optional[int]:
        """
        특정 키의 요청 카운터를 조회합니다.
        
        Args:
            key: 조회할 키
            endpoint: API 엔드포인트 이름
            
        Returns:
            Optional[int]: 요청 카운터 값, 없으면 None
        """
        pass
        
    @abstractmethod
    def increment(self, key: str, endpoint: str, window: int) -> int:
        """
        특정 키의 요청 카운터를 증가시킵니다.
        
        Args:
            key: 증가시킬 키
            endpoint: API 엔드포인트 이름
            window: 윈도우 크기(초)
            
        Returns:
            int: 증가 후 카운터 값
        """
        pass
        
    @abstractmethod
    def delete(self, key: str, endpoint: str) -> bool:
        """
        특정 키의 요청 카운터를 삭제합니다.
        
        Args:
            key: 삭제할 키
            endpoint: API 엔드포인트 이름
            
        Returns:
            bool: 삭제 성공 여부
        """
        pass
        
    @abstractmethod
    def get_expiry(self, key: str, endpoint: str) -> Optional[int]:
        """
        특정 키의 만료 시간을 조회합니다.
        
        Args:
            key: 조회할 키
            endpoint: API 엔드포인트 이름
            
        Returns:
            Optional[int]: UNIX 타임스탬프 형식의 만료 시간, 없으면 None
        """
        pass
        
class InMemoryStorage(RateLimitStorage):
    """메모리 기반 속도 제한 정보 스토리지"""
    
    def __init__(self):
        """InMemoryStorage 초기화"""
        self._counters = defaultdict(int)
        self._expiry = {}
        self._lock = threading.RLock()
        
    def _get_full_key(self, key: str, endpoint: str) -> str:
        """키와 엔드포인트를 조합한 전체 키 생성"""
        return f"{key}:{endpoint}"
        
    def get(self, key: str, endpoint: str) -> Optional[int]:
        """요청 카운터 조회"""
        full_key = self._get_full_key(key, endpoint)
        
        with self._lock:
            # 만료 확인
            if full_key in self._expiry and self._expiry[full_key] < time.time():
                # 만료된 경우 삭제하고 None 반환
                self.delete(key, endpoint)
                return None
                
            # 카운터 반환
            return self._counters.get(full_key)
            
    def increment(self, key: str, endpoint: str, window: int) -> int:
        """요청 카운터 증가"""
        full_key = self._get_full_key(key, endpoint)
        
        with self._lock:
            # 카운터가 없거나 만료된 경우 새로 생성
            if (full_key not in self._counters or 
                (full_key in self._expiry and self._expiry[full_key] < time.time())):
                self._counters[full_key] = 0
                
            # 카운터 증가
            self._counters[full_key] += 1
            
            # 만료 시간 설정/갱신
            self._expiry[full_key] = int(time.time() + window)
            
            return self._counters[full_key]
            
    def delete(self, key: str, endpoint: str) -> bool:
        """요청 카운터 삭제"""
        full_key = self._get_full_key(key, endpoint)
        
        with self._lock:
            if full_key in self._counters:
                del self._counters[full_key]
                
            if full_key in self._expiry:
                del self._expiry[full_key]
                
            return True
            
    def get_expiry(self, key: str, endpoint: str) -> Optional[int]:
        """만료 시간 조회"""
        full_key = self._get_full_key(key, endpoint)
        
        with self._lock:
            return self._expiry.get(full_key)
            
    def clear(self) -> None:
        """모든 데이터 초기화"""
        with self._lock:
            self._counters.clear()
            self._expiry.clear()
            
class RedisStorage(RateLimitStorage):
    """Redis 기반 속도 제한 정보 스토리지"""
    
    def __init__(self, redis_client, key_prefix: str = "rate_limit"):
        """
        RedisStorage 초기화
        
        Args:
            redis_client: Redis 클라이언트 인스턴스
            key_prefix: Redis 키 접두사
        """
        self.redis = redis_client
        self.key_prefix = key_prefix
        
    def _get_redis_key(self, key: str, endpoint: str) -> str:
        """Redis 키 생성"""
        return f"{self.key_prefix}:{key}:{endpoint}"
        
    def get(self, key: str, endpoint: str) -> Optional[int]:
        """요청 카운터 조회"""
        redis_key = self._get_redis_key(key, endpoint)
        value = self.redis.get(redis_key)
        
        return int(value) if value is not None else None
        
    def increment(self, key: str, endpoint: str, window: int) -> int:
        """요청 카운터 증가"""
        redis_key = self._get_redis_key(key, endpoint)
        
        # 파이프라인으로 원자적 작업 수행
        pipeline = self.redis.pipeline()
        
        # 카운터 증가하고 만료 시간 설정
        pipeline.incr(redis_key)
        pipeline.expire(redis_key, window)
        
        # 파이프라인 실행하고 증가된 값 반환
        result = pipeline.execute()
        return int(result[0])
        
    def delete(self, key: str, endpoint: str) -> bool:
        """요청 카운터 삭제"""
        redis_key = self._get_redis_key(key, endpoint)
        result = self.redis.delete(redis_key)
        
        return result > 0
        
    def get_expiry(self, key: str, endpoint: str) -> Optional[int]:
        """만료 시간 조회"""
        redis_key = self._get_redis_key(key, endpoint)
        ttl = self.redis.ttl(redis_key)
        
        if ttl < 0:
            return None
            
        return int(time.time() + ttl) 