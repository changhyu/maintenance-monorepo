"""
캐시 유틸리티 모듈

Git 서비스와 API 모듈 간의 공통된 캐시 인프라를 제공합니다.
중복 캐시 구현을 통합하여 코드 재사용성과 성능을 개선합니다.
"""

import importlib.util
import logging
import os
from typing import Any, Dict, Optional, Type, TypeVar, cast

logger = logging.getLogger(__name__)

# 캐시 관리자 타입 정의
T = TypeVar('T')

def _is_module_available(module_name: str) -> bool:
    """
    지정된 모듈이 설치되어 있는지 확인합니다.
    
    Args:
        module_name: 확인할 모듈 이름
        
    Returns:
        bool: 모듈 사용 가능 여부
    """
    return importlib.util.find_spec(module_name) is not None

def get_unified_cache_manager() -> Any:
    """
    통합된 캐시 관리자 인스턴스를 반환합니다.
    
    가능하면 packages.api.src.core.cache.manager 모듈의 CacheManager를 사용하고,
    불가능하면 gitmanager.git.core.cache_manager 모듈의 CacheManager를 사용합니다.
    
    Returns:
        캐시 관리자 인스턴스
    """
    # 우선 API 모듈의 CacheManager를 사용하려고 시도
    try:
        if _is_module_available("packages.api.src.core.cache.manager"):
            from packages.api.src.core.cache.manager import get_cache_manager
            return get_cache_manager()
    except (ImportError, AttributeError) as e:
        logger.debug(f"API 캐시 관리자 가져오기 실패: {e}")
    
    # API 캐시 관리자를 사용할 수 없으면 Git 모듈의 CacheManager 사용
    try:
        from gitmanager.git.core.cache_manager import get_cache_manager
        return get_cache_manager()
    except ImportError as e:
        logger.debug(f"Git 캐시 관리자 가져오기 실패: {e}")
        
    # 둘 다 사용할 수 없으면 메모리 캐시 기본 구현으로 대체
    logger.warning("통합 캐시 관리자를 로드할 수 없어 기본 메모리 캐시를 사용합니다.")
    from gitmanager.git.core.simple_cache import SimpleMemoryCache
    return SimpleMemoryCache()

def get_cache_instance(cache_type: Type[T]) -> T:
    """
    지정된 타입의 캐시 인스턴스를 반환합니다.
    타입 안전성을 위한 래퍼 함수입니다.
    
    Args:
        cache_type: 반환할 캐시 인스턴스의 타입
        
    Returns:
        해당 타입의 캐시 인스턴스
    """
    cache_manager = get_unified_cache_manager()
    return cast(cache_type, cache_manager)

# 환경 변수
CACHE_ENABLED = os.environ.get("CACHE_ENABLED", "1").lower() in ("1", "true", "yes", "on")
CACHE_REDIS_ENABLED = os.environ.get("CACHE_REDIS_ENABLED", "0").lower() in ("1", "true", "yes", "on")
CACHE_DEBUG = os.environ.get("CACHE_DEBUG", "0").lower() in ("1", "true", "yes", "on")

# 캐시 TTL 상수 (초 단위)
SHORT_TTL = 60         # 1분
DEFAULT_TTL = 300      # 5분
MEDIUM_TTL = 1800      # 30분  
LONG_TTL = 3600        # 1시간
EXTENDED_TTL = 86400   # 24시간

# 캐시 키 네임스페이스
GIT_CACHE_NS = "git:"
API_CACHE_NS = "api:"
SYSTEM_CACHE_NS = "sys:"

def build_cache_key(namespace: str, *parts: str) -> str:
    """
    캐시 키를 생성합니다.
    
    Args:
        namespace: 키 네임스페이스
        *parts: 키 구성 요소들
        
    Returns:
        str: 생성된 캐시 키
    """
    sanitized_parts = [str(part).replace(':', '_') for part in parts if part]
    key = f"{namespace}{':'.join(sanitized_parts)}"
    return key

def get_git_cache_key(*parts: str) -> str:
    """
    Git 관련 캐시 키를 생성합니다.
    
    Args:
        *parts: 키 구성 요소들
        
    Returns:
        str: 생성된 Git 캐시 키
    """
    return build_cache_key(GIT_CACHE_NS, *parts)

def get_api_cache_key(*parts: str) -> str:
    """
    API 관련 캐시 키를 생성합니다.
    
    Args:
        *parts: 키 구성 요소들
        
    Returns:
        str: 생성된 API 캐시 키
    """
    return build_cache_key(API_CACHE_NS, *parts)

def get_system_cache_key(*parts: str) -> str:
    """
    시스템 관련 캐시 키를 생성합니다.
    
    Args:
        *parts: 키 구성 요소들
        
    Returns:
        str: 생성된 시스템 캐시 키
    """
    return build_cache_key(SYSTEM_CACHE_NS, *parts) 