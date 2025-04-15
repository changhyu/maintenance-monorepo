"""
캐시 설정 모듈

캐시 관련 설정 및 구성을 위한 클래스와 함수를 제공합니다.
"""

import os
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field


class CacheBackend(str, Enum):
    """캐시 백엔드 유형"""
    REDIS = "redis"
    MEMORY = "memory"
    NONE = "none"


class CacheConfig(BaseModel):
    """
    캐시 구성을 위한 설정 클래스
    
    모든 캐시 관련 설정을 저장하고 관리합니다.
    """
    # 전역 설정
    enabled: bool = Field(
        default=True,
        description="캐싱 기능 활성화 여부"
    )
    backend: CacheBackend = Field(
        default=CacheBackend.MEMORY,
        description="사용할 캐시 백엔드 (redis, memory, none)"
    )
    default_ttl: int = Field(
        default=300,
        description="기본 캐시 만료 시간(초)"
    )
    
    # Redis 설정
    redis_url: Optional[str] = Field(
        default=None,
        description="Redis 연결 URL (예: redis://localhost:6379/0)"
    )
    redis_host: str = Field(
        default="localhost",
        description="Redis 호스트"
    )
    redis_port: int = Field(
        default=6379,
        description="Redis 포트"
    )
    redis_db: int = Field(
        default=0,
        description="Redis DB 번호"
    )
    redis_password: Optional[str] = Field(
        default=None,
        description="Redis 비밀번호"
    )
    redis_ssl: bool = Field(
        default=False,
        description="Redis SSL 사용 여부"
    )
    redis_socket_timeout: int = Field(
        default=5,
        description="Redis 소켓 타임아웃(초)"
    )
    redis_connection_pool_size: int = Field(
        default=10,
        description="Redis 연결 풀 크기"
    )
    redis_max_connections: int = Field(
        default=10,
        description="Redis 최대 연결 수"
    )
    
    # 메모리 캐시 설정
    memory_max_size: int = Field(
        default=1000,
        description="메모리 캐시의 최대 항목 수"
    )
    
    # API 캐싱 설정
    api_cache_enabled: bool = Field(
        default=True,
        description="API 응답 캐싱 활성화 여부"
    )
    api_default_ttl: int = Field(
        default=60,
        description="API 캐시 기본 만료 시간(초)"
    )
    api_exclude_paths: List[str] = Field(
        default=[],
        description="캐싱에서 제외할 API 경로 패턴 목록"
    )
    
    # 함수 캐싱 설정
    function_cache_enabled: bool = Field(
        default=True,
        description="함수 결과 캐싱 활성화 여부"
    )
    function_default_ttl: int = Field(
        default=300,
        description="함수 캐시 기본 만료 시간(초)"
    )
    
    # 키 관련 설정
    key_prefix: str = Field(
        default="app",
        description="모든 캐시 키의 전역 접두사"
    )
    
    # 기타 설정
    debug_mode: bool = Field(
        default=False,
        description="디버그 모드 활성화 여부 (로깅 증가)"
    )
    
    def get_redis_connection_params(self) -> Dict[str, Any]:
        """Redis 연결 매개변수 딕셔너리를 반환합니다."""
        # Redis URL이 있으면 그것을 우선 사용
        if self.redis_url:
            return {"url": self.redis_url}
        
        # 개별 매개변수로 구성
        params = {
            "host": self.redis_host,
            "port": self.redis_port,
            "db": self.redis_db,
            "socket_timeout": self.redis_socket_timeout,
            "ssl": self.redis_ssl,
        }
        
        # 선택적 매개변수
        if self.redis_password:
            params["password"] = self.redis_password
        
        # 연결 풀 관련 매개변수
        params["connection_pool_size"] = self.redis_connection_pool_size
        params["max_connections"] = self.redis_max_connections
        
        return params
    
    @classmethod
    def from_environment(cls) -> "CacheConfig":
        """
        환경 변수에서 캐시 설정을 로드합니다.
        
        환경 변수는 다음과 같은 접두사를 사용합니다: CACHE_
        예: CACHE_ENABLED, CACHE_BACKEND, CACHE_REDIS_HOST 등
        
        Returns:
            환경 변수에서 로드된 CacheConfig 인스턴스
        """
        config_dict = {}
        
        # 환경 변수 조회 함수
        def get_env(key: str, default: Any = None) -> Any:
            env_key = f"CACHE_{key.upper()}"
            return os.getenv(env_key, default)
        
        # 불리언 변환 함수
        def parse_bool(value: str) -> bool:
            if value is None:
                return False
            return value.lower() in ("true", "1", "yes", "y", "t")
        
        # 전역 설정
        enabled = get_env("ENABLED")
        if enabled is not None:
            config_dict["enabled"] = parse_bool(enabled)
        
        backend = get_env("BACKEND")
        if backend:
            try:
                config_dict["backend"] = CacheBackend(backend.lower())
            except ValueError:
                pass  # 유효하지 않은 백엔드는 무시
        
        default_ttl = get_env("DEFAULT_TTL")
        if default_ttl:
            try:
                config_dict["default_ttl"] = int(default_ttl)
            except ValueError:
                pass
        
        # Redis 설정
        redis_url = get_env("REDIS_URL")
        if redis_url:
            config_dict["redis_url"] = redis_url
        
        redis_host = get_env("REDIS_HOST")
        if redis_host:
            config_dict["redis_host"] = redis_host
        
        redis_port = get_env("REDIS_PORT")
        if redis_port:
            try:
                config_dict["redis_port"] = int(redis_port)
            except ValueError:
                pass
        
        redis_db = get_env("REDIS_DB")
        if redis_db:
            try:
                config_dict["redis_db"] = int(redis_db)
            except ValueError:
                pass
        
        redis_password = get_env("REDIS_PASSWORD")
        if redis_password:
            config_dict["redis_password"] = redis_password
        
        redis_ssl = get_env("REDIS_SSL")
        if redis_ssl is not None:
            config_dict["redis_ssl"] = parse_bool(redis_ssl)
        
        # API 캐싱 설정
        api_cache_enabled = get_env("API_CACHE_ENABLED")
        if api_cache_enabled is not None:
            config_dict["api_cache_enabled"] = parse_bool(api_cache_enabled)
        
        api_default_ttl = get_env("API_DEFAULT_TTL")
        if api_default_ttl:
            try:
                config_dict["api_default_ttl"] = int(api_default_ttl)
            except ValueError:
                pass
        
        # 함수 캐싱 설정
        function_cache_enabled = get_env("FUNCTION_CACHE_ENABLED")
        if function_cache_enabled is not None:
            config_dict["function_cache_enabled"] = parse_bool(function_cache_enabled)
        
        function_default_ttl = get_env("FUNCTION_DEFAULT_TTL")
        if function_default_ttl:
            try:
                config_dict["function_default_ttl"] = int(function_default_ttl)
            except ValueError:
                pass
        
        # 키 관련 설정
        key_prefix = get_env("KEY_PREFIX")
        if key_prefix:
            config_dict["key_prefix"] = key_prefix
        
        # 디버그 모드
        debug_mode = get_env("DEBUG_MODE")
        if debug_mode is not None:
            config_dict["debug_mode"] = parse_bool(debug_mode)
        
        return cls(**config_dict)


# 애플리케이션 전체에서 사용할 기본 캐시 설정
default_cache_config = CacheConfig.from_environment()


def get_cache_config() -> CacheConfig:
    """
    현재 캐시 구성을 반환합니다.
    
    이 함수는 애플리케이션 어디에서나 일관된 캐시 설정을 얻기 위해 사용됩니다.
    
    Returns:
        CacheConfig: 현재 활성화된 캐시 구성
    """
    return default_cache_config 