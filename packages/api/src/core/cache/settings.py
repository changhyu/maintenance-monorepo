from enum import Enum
from typing import Optional, Union

from pydantic import BaseModel, Field


class EvictionPolicy(str, Enum):
    """캐시 항목 제거 정책"""

    LRU = "lru"  # 가장 오래 전에 사용된 항목부터 제거 (Least Recently Used)
    LFU = "lfu"  # 가장 적게 사용된 항목부터 제거 (Least Frequently Used)
    FIFO = "fifo"  # 먼저 들어온 항목부터 제거 (First In First Out)
    TTL = "ttl"  # 만료 시간이 가장 짧은 항목부터 제거 (Time To Live)
    RANDOM = "random"  # 무작위 제거


class CacheBackendType(str, Enum):
    """캐싱 백엔드 유형"""

    REDIS = "redis"  # Redis 서버 기반 백엔드
    MEMORY = "memory"  # 애플리케이션 메모리 기반 백엔드
    HYBRID = "hybrid"  # 로컬 메모리와 Redis를 계층적으로 사용하는 하이브리드 백엔드


class CacheSettings(BaseModel):
    """
    캐시 설정 관리 모델

    이 클래스는 캐싱 시스템의 모든 설정을 관리합니다. 설정은 환경 변수, 구성 파일 또는
    코드에서 제공할 수 있으며, 적절한 기본값이 제공됩니다.

    Attributes:
        default_ttl (int): 기본 캐시 만료 시간 (초)
        backend_type (CacheBackendType): 사용할 캐시 백엔드 유형
        redis_url (str): Redis 서버 연결 URL
        redis_password (str): Redis 서버 패스워드
        redis_db (int): 사용할 Redis 데이터베이스 번호
        redis_ssl (bool): Redis TLS/SSL 연결 사용 여부
        prefix (str): 캐시 키에 적용할 접두사
        max_memory_size (int): 메모리 캐시 최대 크기 (항목 수)
        max_memory_bytes (int): 최대 메모리 사용량 (바이트, Redis 또는 로컬 메모리)
        eviction_policy (EvictionPolicy): 캐시 제거 정책
        enable_stats (bool): 캐시 통계 수집 활성화 여부
        compression_enabled (bool): 큰 값에 대한 압축 활성화 여부
        compression_threshold (int): 압축 적용 임계값 (바이트)
        encoding (str): 인코딩 방식
        socket_timeout (float): 소켓 타임아웃 (초)
        decode_responses (bool): 응답 자동 디코딩 여부
    """

    default_ttl: int = Field(default=3600, ge=1, description="기본 캐시 만료 시간 (초)")
    backend_type: CacheBackendType = Field(
        default=CacheBackendType.REDIS, description="사용할 캐시 백엔드 유형"
    )

    # Redis 관련 설정
    redis_url: Optional[str] = Field(
        default="redis://localhost:6379/0", description="Redis 서버 연결 URL"
    )
    redis_password: Optional[str] = Field(
        default=None, description="Redis 서버 패스워드"
    )
    redis_db: int = Field(default=0, ge=0, description="사용할 Redis 데이터베이스 번호")
    redis_ssl: bool = Field(default=False, description="Redis TLS/SSL 연결 사용 여부")

    # 일반 캐시 설정
    prefix: str = Field(default="app_cache:", description="캐시 키에 적용할 접두사")
    max_memory_size: Optional[int] = Field(
        default=10000, ge=100, description="메모리 캐시 최대 항목 수"
    )
    max_memory_bytes: Optional[int] = Field(
        default=None, description="최대 메모리 사용량 (바이트)"
    )
    eviction_policy: EvictionPolicy = Field(
        default=EvictionPolicy.LRU, description="캐시 제거 정책"
    )
    enable_stats: bool = Field(default=True, description="캐시 통계 수집 활성화 여부")

    # 압축 및 인코딩 설정
    compression_enabled: bool = Field(
        default=True, description="큰 값에 대한 압축 활성화 여부"
    )
    compression_threshold: int = Field(
        default=1024, ge=512, description="압축 적용 임계값 (바이트)"
    )
    encoding: str = Field(default="utf-8", description="인코딩 방식")
    socket_timeout: float = Field(default=5.0, ge=0.1, description="소켓 타임아웃 (초)")
    decode_responses: bool = Field(default=True, description="응답 자동 디코딩 여부")

    class Config:
        """Pydantic 모델 설정"""

        validate_assignment = True
        extra = "allow"
        use_enum_values = True

    def get_redis_connection_params(self) -> dict:
        """Redis 연결 파라미터 반환"""
        params = {
            "url": self.redis_url,
            "db": self.redis_db,
            "decode_responses": self.decode_responses,
            "encoding": self.encoding,
            "socket_timeout": self.socket_timeout,
        }

        if self.redis_password:
            params["password"] = self.redis_password

        if self.redis_ssl:
            params["ssl"] = True
            params["ssl_cert_reqs"] = None

        return params
