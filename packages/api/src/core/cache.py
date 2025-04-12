"""
캐싱 시스템 모듈.

API 응답의 성능 개선을 위한 메모리 및 Redis 기반 캐싱 시스템.
"""

import json
import hashlib
from enum import Enum
import logging
from typing import Any, Dict, Optional, TypeVar, Generic, Union, List
from datetime import datetime

from .config import settings

logger = logging.getLogger(__name__)

# 캐시 백엔드 설정
try:
    if settings.CACHE_BACKEND == "redis":
        import redis
        redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD
        )
        logger.info("Redis 캐시 백엔드 초기화 완료")
    else:
        redis_client = None
except Exception as e:
    logger.warning(f"Redis 연결 실패: {str(e)}")
    redis_client = None


class CacheKey:
    """캐시 키 템플릿 상수"""
    # 차량 관련 캐시 키
    VEHICLE_LIST = "vehicle:list:{skip}:{limit}:{make}:{model}:{year}:{status}:{type}:{sort_by}:{sort_order}"
    VEHICLE_DETAIL = "vehicle:detail:{id}"
    VEHICLE_MAINTENANCE = "vehicle:maintenance:{id}:{skip}:{limit}"
    VEHICLE_TELEMETRY = "vehicle:telemetry:{id}:{start_date}:{end_date}:{resolution}"
    
    # 정비 관련 캐시 키
    MAINTENANCE_LIST = "maintenance:list:{skip}:{limit}:{vehicle_id}:{status}:{sort_by}:{sort_order}"
    MAINTENANCE_DETAIL = "maintenance:detail:{id}"
    
    # 상점 관련 캐시 키
    SHOP_LIST = "shop:list:{skip}:{limit}:{name}:{location}:{rating}:{sort_by}:{sort_order}"
    SHOP_DETAIL = "shop:detail:{id}"
    
    # 투두 관련 캐시 키
    TODO_LIST = "todo:list:{skip}:{limit}:{vehicle_id}:{status}:{priority}:{sort_by}:{sort_order}"
    TODO_DETAIL = "todo:detail:{id}"

    @staticmethod
    def format(cls, pattern=False, **kwargs):
        """
        캐시 키 포맷팅
        
        pattern=True인 경우 와일드카드를 포함한 패턴을 반환
        """
        if pattern:
            return cls.split('{')[0] + '*'
        
        # None 값을 'none'으로 대체
        for key, value in kwargs.items():
            if value is None:
                kwargs[key] = 'none'
        
        return cls.format(**kwargs)


class Cache:
    """캐싱 시스템 클래스"""
    
    def __init__(self):
        self.local_cache: Dict[str, Dict[str, Any]] = {}
        self.use_redis = redis_client is not None
    
    def _get_from_local(self, key: str) -> Optional[Any]:
        """로컬 캐시에서 값 조회"""
        if key in self.local_cache:
            entry = self.local_cache[key]
            if entry.get('expires_at') and entry['expires_at'] < datetime.now():
                # 만료된 엔트리 삭제
                del self.local_cache[key]
                return None
            return entry.get('value')
        return None
    
    def _set_to_local(self, key: str, value: Any, expire: Optional[int] = None) -> None:
        """로컬 캐시에 값 저장"""
        expires_at = None
        if expire:
            expires_at = datetime.now().timestamp() + expire
        
        self.local_cache[key] = {
            'value': value,
            'expires_at': expires_at
        }
    
    def _delete_from_local(self, key: str) -> None:
        """로컬 캐시에서 값 삭제"""
        if key in self.local_cache:
            del self.local_cache[key]
    
    def _invalidate_pattern_local(self, pattern: str) -> None:
        """패턴과 일치하는 로컬 캐시 항목 무효화"""
        keys_to_delete = [k for k in self.local_cache.keys() if k.startswith(pattern)]
        for key in keys_to_delete:
            del self.local_cache[key]

    def get(self, key: str) -> Optional[Any]:
        """캐시에서 값 조회"""
        # 먼저 로컬 캐시 확인
        value = self._get_from_local(key)
        if value is not None:
            logger.debug(f"로컬 캐시 히트: {key}")
            return value
        
        # Redis 캐시 확인
        if self.use_redis:
            try:
                redis_value = redis_client.get(key)
                if redis_value:
                    logger.debug(f"Redis 캐시 히트: {key}")
                    value = json.loads(redis_value)
                    # 로컬 캐시에도 추가
                    self._set_to_local(key, value)
                    return value
            except Exception as e:
                logger.warning(f"Redis 캐시 조회 오류: {str(e)}")
        
        logger.debug(f"캐시 미스: {key}")
        return None
    
    def set(self, key: str, value: Any, expire: Optional[int] = None) -> None:
        """캐시에 값 저장"""
        # 로컬 캐시에 저장
        self._set_to_local(key, value, expire)
        
        # Redis 캐시에 저장
        if self.use_redis:
            try:
                serialized = json.dumps(value)
                if expire:
                    redis_client.setex(key, expire, serialized)
                else:
                    redis_client.set(key, serialized)
                logger.debug(f"Redis 캐시 설정: {key}")
            except Exception as e:
                logger.warning(f"Redis 캐시 저장 오류: {str(e)}")
    
    def delete(self, key: str) -> None:
        """캐시에서 값 삭제"""
        # 로컬 캐시에서 삭제
        self._delete_from_local(key)
        
        # Redis 캐시에서 삭제
        if self.use_redis:
            try:
                redis_client.delete(key)
                logger.debug(f"Redis 캐시 삭제: {key}")
            except Exception as e:
                logger.warning(f"Redis 캐시 삭제 오류: {str(e)}")
    
    def invalidate_pattern(self, pattern: str) -> None:
        """패턴과 일치하는 캐시 항목 무효화"""
        # 로컬 캐시 패턴 무효화
        self._invalidate_pattern_local(pattern)
        
        # Redis 캐시 패턴 무효화
        if self.use_redis:
            try:
                keys = redis_client.keys(pattern)
                if keys:
                    redis_client.delete(*keys)
                    logger.debug(f"Redis 캐시 패턴 무효화: {pattern}, {len(keys)}개 항목 삭제")
            except Exception as e:
                logger.warning(f"Redis 캐시 패턴 무효화 오류: {str(e)}")


# 캐시 인스턴스 생성
cache = Cache() 