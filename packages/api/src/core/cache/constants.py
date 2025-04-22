"""
캐시 설정 상수

환경 변수를 통해 설정 가능한 캐시 관련 상수들을 정의합니다.
"""

import os
from typing import Final

# Redis 연결 설정
REDIS_HOST: Final[str] = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT: Final[int] = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD: Final[str] = os.getenv("REDIS_PASSWORD", "")
REDIS_DB: Final[int] = int(os.getenv("REDIS_DB", "0"))
REDIS_SSL: Final[bool] = os.getenv("REDIS_SSL", "false").lower() == "true"

# Redis 연결 풀 설정
REDIS_POOL_SIZE: Final[int] = int(os.getenv("REDIS_POOL_SIZE", "10"))
REDIS_POOL_TIMEOUT: Final[float] = float(os.getenv("REDIS_POOL_TIMEOUT", "5.0"))

# Redis 타임아웃 설정
REDIS_SOCKET_TIMEOUT: Final[float] = float(os.getenv("REDIS_SOCKET_TIMEOUT", "5.0"))
REDIS_CONNECT_TIMEOUT: Final[float] = float(os.getenv("REDIS_CONNECT_TIMEOUT", "10.0"))

# 캐시 TTL 설정
DEFAULT_CACHE_TTL: Final[int] = int(os.getenv("DEFAULT_CACHE_TTL", "3600"))  # 1시간
MAX_CACHE_TTL: Final[int] = int(os.getenv("MAX_CACHE_TTL", "86400"))  # 24시간
MIN_CACHE_TTL: Final[int] = int(os.getenv("MIN_CACHE_TTL", "60"))  # 1분

# 캐시 크기 제한
MAX_CACHE_SIZE: Final[int] = int(os.getenv("MAX_CACHE_SIZE", "1073741824"))  # 1GB
CACHE_SIZE_WARNING_THRESHOLD: Final[float] = float(
    os.getenv("CACHE_SIZE_WARNING_THRESHOLD", "0.8")
)

# 압축 설정
COMPRESSION_ENABLED: Final[bool] = (
    os.getenv("COMPRESSION_ENABLED", "true").lower() == "true"
)
COMPRESSION_THRESHOLD: Final[int] = int(
    os.getenv("COMPRESSION_THRESHOLD", "1024")
)  # 1KB
COMPRESSION_LEVEL: Final[int] = int(os.getenv("COMPRESSION_LEVEL", "6"))

# 인코딩 설정
REDIS_ENCODING: Final[str] = os.getenv("REDIS_ENCODING", "utf-8")
REDIS_DECODE_RESPONSES: Final[bool] = (
    os.getenv("REDIS_DECODE_RESPONSES", "true").lower() == "true"
)

# 재시도 설정
MAX_RETRY_ATTEMPTS: Final[int] = int(os.getenv("MAX_RETRY_ATTEMPTS", "3"))
RETRY_DELAY: Final[float] = float(os.getenv("RETRY_DELAY", "0.1"))

# 배치 처리 설정
REDIS_BATCH_SIZE: Final[int] = int(os.getenv("REDIS_BATCH_SIZE", "100"))
MAX_PIPELINE_SIZE: Final[int] = int(os.getenv("MAX_PIPELINE_SIZE", "1000"))

# 모니터링 설정
METRICS_ENABLED: Final[bool] = os.getenv("METRICS_ENABLED", "true").lower() == "true"
METRICS_PORT: Final[int] = int(os.getenv("METRICS_PORT", "9090"))
METRICS_PATH: Final[str] = os.getenv("METRICS_PATH", "/metrics")

# 로깅 설정
LOG_LEVEL: Final[str] = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT: Final[str] = os.getenv(
    "LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# 보안 설정
REDIS_USERNAME: Final[str] = os.getenv("REDIS_USERNAME", "")
REDIS_ACL_ENABLED: Final[bool] = (
    os.getenv("REDIS_ACL_ENABLED", "false").lower() == "true"
)
REDIS_TLS_CERT_PATH: Final[str] = os.getenv("REDIS_TLS_CERT_PATH", "")
REDIS_TLS_KEY_PATH: Final[str] = os.getenv("REDIS_TLS_KEY_PATH", "")
REDIS_TLS_CA_PATH: Final[str] = os.getenv("REDIS_TLS_CA_PATH", "")

# 캐시 크기 및 제한
MAX_LOCAL_CACHE_SIZE = 10000  # 로컬 캐시 최대 항목 수
MAX_CACHE_VALUE_SIZE = 1024 * 1024  # 최대 캐시 값 크기 (1MB)

# 시간 관련 설정 (초 단위)
CLEANUP_INTERVAL = 300  # 만료 키 정리 주기 (5분)
MEMORY_CHECK_INTERVAL = 60  # 메모리 사용량 확인 주기 (1분)
LOCK_TIMEOUT = 10  # 분산 락 타임아웃

# 메모리 임계값
MEMORY_USAGE_THRESHOLD = 0.9  # 메모리 사용량 경고 임계값 (90%)
CRITICAL_MEMORY_THRESHOLD = 0.95  # 메모리 사용량 위험 임계값 (95%)

# 일관성 검사
INCONSISTENCY_THRESHOLD = 0.1  # 캐시 일관성 경고 임계값 (10%)

# 중요 키 패턴
CRITICAL_KEY_PATTERNS = [
    "session:*",  # 세션 데이터
    "user:*",  # 사용자 데이터
    "auth:*",  # 인증 관련 데이터
    "perm:*",  # 권한 데이터
    "config:*",  # 설정 데이터
]

# 메트릭 수집
STATS_COLLECTION_INTERVAL = 60  # 통계 수집 주기 (1분)
MAX_STATS_HISTORY = 1440  # 통계 기록 보관 기간 (24시간)

# 보호된 키 프리픽스 상수
PROTECTED_KEY_PREFIX = "protected:"
