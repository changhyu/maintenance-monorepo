"""
속도 제한(Rate Limiting) 설정 모듈

이 모듈은 API 속도 제한 기능의 설정 값을 관리합니다.
"""

import os
from typing import Dict, Any, List, Optional

# 기본 설정 값
DEFAULT_RATE_LIMIT_ENABLED = True
DEFAULT_RATE_LIMIT = 60  # 분당 60회
DEFAULT_WINDOW_SIZE = 60  # 60초(1분)
DEFAULT_ADMIN_MULTIPLIER = 5.0  # 관리자는 5배 더 많은 요청 가능

# API 엔드포인트별 기본 제한 설정
DEFAULT_ENDPOINT_LIMITS = {
    # Git 작업 관련 API
    "git_status": 60,       # 상태 확인: 분당 60회
    "git_commit": 10,       # 커밋: 분당 10회
    "git_push": 5,          # 푸시: 분당 5회
    "git_pull": 5,          # 풀: 분당 5회
    "git_merge": 5,         # 머지: 분당 5회
    "git_branch": 20,       # 브랜치 작업: 분당 20회
    
    # 기본값
    "default": DEFAULT_RATE_LIMIT
}

# 속도 제한 제외 경로
DEFAULT_EXCLUDED_PATHS = [
    "/api/health",
    "/api/metrics",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico"
]

class RateLimitSettings:
    """속도 제한 설정 클래스"""
    
    def __init__(self):
        """설정 초기화"""
        # 환경 변수에서 설정 로드
        self.enabled = self._parse_bool(
            os.environ.get("RATE_LIMIT_ENABLED", str(DEFAULT_RATE_LIMIT_ENABLED))
        )
        
        self.default_limit = int(
            os.environ.get("RATE_LIMIT_DEFAULT", str(DEFAULT_RATE_LIMIT))
        )
        
        self.default_window = int(
            os.environ.get("RATE_LIMIT_WINDOW", str(DEFAULT_WINDOW_SIZE))
        )
        
        self.admin_multiplier = float(
            os.environ.get("RATE_LIMIT_ADMIN_MULTIPLIER", str(DEFAULT_ADMIN_MULTIPLIER))
        )
        
        # 제외 경로 설정
        excluded_paths_env = os.environ.get("RATE_LIMIT_EXCLUDED_PATHS")
        self.excluded_paths = (
            excluded_paths_env.split(",") if excluded_paths_env
            else DEFAULT_EXCLUDED_PATHS
        )
        
        # 엔드포인트별 제한 로드
        self.endpoint_limits = DEFAULT_ENDPOINT_LIMITS.copy()
        
        # 환경 변수에서 엔드포인트별 제한 값 업데이트
        for endpoint in self.endpoint_limits.keys():
            env_var = f"RATE_LIMIT_{endpoint.upper()}"
            if env_var in os.environ:
                self.endpoint_limits[endpoint] = int(os.environ[env_var])
                
    def _parse_bool(self, value: str) -> bool:
        """문자열을 불리언으로 변환"""
        return value.lower() in ("true", "1", "yes", "y", "t")
        
    def to_dict(self) -> Dict[str, Any]:
        """설정을 사전으로 변환"""
        return {
            "enabled": self.enabled,
            "default_limit": self.default_limit,
            "default_window": self.default_window,
            "admin_multiplier": self.admin_multiplier,
            "excluded_paths": self.excluded_paths,
            "endpoint_limits": self.endpoint_limits
        }

# 전역 설정 인스턴스
settings = RateLimitSettings()

def get_rate_limit_settings() -> RateLimitSettings:
    """전역 설정 인스턴스 반환"""
    return settings 