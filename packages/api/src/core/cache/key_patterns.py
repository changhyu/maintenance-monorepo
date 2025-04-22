"""
캐시 키 패턴 모듈

이 모듈은 애플리케이션에서 사용되는 캐시 키 패턴을 정의합니다.
"""

from typing import Dict, List, Set

# 중요 캐시 키 패턴 - 사용자 인증, 세션 및 권한과 관련된 키
CRITICAL_KEY_PATTERNS: Set[str] = {
    "user:",
    "session:",
    "permission:",
    "auth:",
    "token:",
    "role:",
}

# 리소스 유형별 키 패턴
RESOURCE_KEY_PATTERNS: Dict[str, str] = {
    "user": "user:{id}",
    "session": "session:{id}",
    "profile": "profile:{id}",
    "post": "post:{id}",
    "comment": "comment:{id}",
    "notification": "notification:{id}",
    "message": "message:{id}",
    "file": "file:{id}",
}

# 다양한 캐시 섹션 패턴
CACHE_SECTIONS: Dict[str, str] = {
    "metadata": "metadata:{resource_type}:{resource_id}",
    "list": "list:{resource_type}",
    "count": "count:{resource_type}",
    "search": "search:{resource_type}:{query_hash}",
    "aggregation": "aggregation:{resource_type}:{metric}",
}

# 기본 TTL 설정 (초 단위)
DEFAULT_TTL_SETTINGS: Dict[str, int] = {
    "user": 3600,  # 1시간
    "session": 86400,  # 24시간
    "profile": 3600,  # 1시간
    "post": 1800,  # 30분
    "comment": 1800,  # 30분
    "notification": 900,  # 15분
    "message": 1800,  # 30분
    "file": 7200,  # 2시간
    "search": 600,  # 10분
    "aggregation": 300,  # 5분
    "list": 600,  # 10분
    "count": 300,  # 5분
    "metadata": 1800,  # 30분
}
