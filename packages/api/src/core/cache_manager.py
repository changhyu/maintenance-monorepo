"""
캐시 관리 유틸리티

표준화된 캐시 키 생성 및 관리를 위한 유틸리티 모듈입니다.
"""

from typing import Any, Dict, List, Optional, Union, Tuple
import hashlib
import json
from datetime import datetime, timedelta
import random

from .cache import cache
from .logging import logger


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
        
    def add(self, key: str, value: Any) -> 'CacheKeyBuilder':
        """
        캐시 키에 파트 추가
        
        Args:
            key: 키 이름
            value: 값
            
        Returns:
            체이닝을 위한 self
        """
        if value is not None and key not in ["current_user", "_db", "response", "request"]:
            if isinstance(value, (int, float)) and key in ["latitude", "longitude"]:
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


class CacheManager:
    """캐시 관리 클래스"""
    
    @staticmethod
    def generate_key(prefix: str, **kwargs) -> str:
        """
        캐시 키 생성
        
        Args:
            prefix: 캐시 키 접두사
            **kwargs: 키-값 파라미터
            
        Returns:
            생성된 캐시 키
        """
        builder = CacheKeyBuilder(prefix)
        for key, value in kwargs.items():
            builder.add(key, value)
        return builder.build()
        
    @staticmethod
    def get_data(
        key: str, 
        ttl: Optional[int] = None, 
        callback: Optional[callable] = None,
        add_jitter: bool = False
    ) -> Any:
        """
        캐시에서 데이터 조회 또는 콜백 실행
        
        Args:
            key: 캐시 키
            ttl: 캐시 유효 시간(초)
            callback: 캐시 미스 시 실행할 콜백 함수
            add_jitter: 지터 추가 여부
            
        Returns:
            캐시된 데이터 또는 콜백 결과
        """
        # 캐시에서 조회
        cached_data = cache.get(key)
        if cached_data is not None:
            logger.debug(f"캐시 히트: {key}")
            return cached_data
            
        # 콜백 실행
        if callback is not None:
            logger.debug(f"캐시 미스: {key}, 콜백 실행")
            result = callback()
            
            # 결과 캐싱
            if ttl is not None and result is not None:
                # 지터 추가 (±20%)
                if add_jitter:
                    jitter = random.uniform(0.8, 1.2)
                    actual_ttl = int(ttl * jitter)
                else:
                    actual_ttl = ttl
                    
                cache.set(key, result, expire=actual_ttl)
                
            return result
            
        return None
        
    @staticmethod
    def invalidate_resources(entity_type: str, entity_id: Optional[str] = None) -> None:
        """
        리소스 관련 캐시 무효화
        
        Args:
            entity_type: 엔티티 타입 (shop, review 등)
            entity_id: 특정 엔티티 ID
        """
        if entity_id:
            # 특정 엔티티 관련 캐시 무효화
            cache.invalidate_pattern(f"{entity_type}:*:{entity_id}:*")
            cache.invalidate_pattern(f"{entity_type}:detail:{entity_id}")
        else:
            # 엔티티 타입 전체 관련 캐시 무효화
            cache.invalidate_pattern(f"{entity_type}:*")
        
        logger.debug(f"캐시 무효화: {entity_type}" + (f":{entity_id}" if entity_id else ""))


# 편의성 함수
def generate_cache_key(prefix: str, **kwargs) -> str:
    """캐시 키 생성 헬퍼 함수"""
    return CacheManager.generate_key(prefix, **kwargs)


def invalidate_cache_for(entity_type: str, entity_id: Optional[str] = None) -> None:
    """캐시 무효화 헬퍼 함수"""
    CacheManager.invalidate_resources(entity_type, entity_id) 