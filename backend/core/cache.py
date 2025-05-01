"""
캐시 시스템 모듈 (인메모리 캐시 구현)
"""
import logging
from functools import wraps
from typing import Any, Callable, Optional
import time
import json
from fastapi import Request, Response

logger = logging.getLogger(__name__)

# 메모리 캐시
_memory_cache = {}
_is_initialized = False

async def initialize_cache():
    """캐시 시스템을 초기화합니다."""
    global _is_initialized
    try:
        if not _is_initialized:
            # 인메모리 백엔드로 초기화
            logger.info("인메모리 캐시가 성공적으로 초기화되었습니다.")
            _is_initialized = True
        return True
    except Exception as e:
        logger.error(f"캐시 초기화 중 오류 발생: {str(e)}")
        return False

def get_cache_status():
    """현재 캐시 시스템의 상태를 반환합니다."""
    return {
        "initialized": _is_initialized,
        "type": "In-Memory",
        "status": "active" if _is_initialized else "inactive"
    }

# 캐시 키 생성 함수
def _make_cache_key(func_name: str, *args, **kwargs) -> str:
    """
    함수 호출에 대한 고유한 캐시 키를 생성합니다.
    """
    key_parts = [
        func_name,
        str(args),
        str(sorted(kwargs.items()))
    ]
    return ":".join(key_parts)

# 캐시 데코레이터 
def cached(ttl: int = 300, key_prefix: str = "", exclude: Optional[list] = None):
    """
    함수 결과를 캐시하는 데코레이터
    
    Args:
        ttl: 캐시 유효 시간 (초)
        key_prefix: 캐시 키 접두사
        exclude: 캐시에서 제외할 파라미터 이름 목록
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if not _is_initialized:
                # 캐시가 초기화되지 않은 경우 함수 결과 직접 반환
                return await func(*args, **kwargs)
                
            # 캐시에서 제외할 파라미터 제거
            cache_kwargs = kwargs.copy()
            if exclude:
                for param in exclude:
                    cache_kwargs.pop(param, None)
            
            # 캐시 키 생성
            cache_key = f"{key_prefix}:{_make_cache_key(func.__qualname__, *args, **cache_kwargs)}"
            
            try:
                # 로컬 메모리 캐시에서 조회
                if cache_key in _memory_cache:
                    item = _memory_cache[cache_key]
                    # 만료 확인
                    if item["expires"] > time.time():
                        logger.debug(f"캐시 Hit: {cache_key}")
                        return item["value"]
                    else:
                        # 만료된 항목 제거
                        del _memory_cache[cache_key]
                
                # 캐시에 없으면 함수 실행
                result = await func(*args, **kwargs)
                
                # 결과를 캐시에 저장
                _memory_cache[cache_key] = {
                    "value": result,
                    "expires": time.time() + ttl
                }
                logger.debug(f"캐시 저장: {cache_key}, TTL: {ttl}초")
                
                return result
            except Exception as e:
                logger.warning(f"캐시 처리 중 오류 발생: {str(e)}")
                # 오류가 발생해도 원본 함수 결과는 반환
                return await func(*args, **kwargs)
        return wrapper
    return decorator

# fastapi_cache2 대체 구현
def use_cache(expire: int = 60, namespace: str = None, key_builder: Callable = None):
    """
    fastapi-cache2 라이브러리의 cache 데코레이터를 대체
    
    Args:
        expire: 캐시 만료 시간(초)
        namespace: 캐시 네임스페이스
        key_builder: 캐시 키 생성 함수
    """
    # 자체 구현된 캐시 데코레이터 사용
    return cached(ttl=expire, key_prefix=namespace or "")

# 캐시 무효화 함수
async def invalidate_cache(pattern: str) -> None:
    """지정된 패턴과 일치하는 모든 캐시를 무효화합니다."""
    global _memory_cache
    
    try:
        # 패턴과 일치하는 키 찾기
        invalidated = 0
        for key in list(_memory_cache.keys()):
            if pattern in key:
                del _memory_cache[key]
                invalidated += 1
        
        logger.info(f"{invalidated}개의 캐시 항목이 무효화되었습니다. (패턴: {pattern})")
    except Exception as e:
        logger.error(f"캐시 무효화 중 오류 발생: {str(e)}")
        
    return None