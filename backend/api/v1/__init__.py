"""
API 버전 1 (v1) 모듈

이 모듈은 API v1의 모든 라우터와 엔드포인트를 포함합니다.
"""

__version__ = "1.0.0"
API_VERSION = "v1"

# API 버전 정보를 담고 있는 딕셔너리
VERSION_INFO = {
    "version": __version__,
    "api_version": API_VERSION,
    "status": "stable",
    "release_date": "2025-04-26",
    "deprecated": False,
    "sunset_date": None
}

# 이 버전의 권장 사용 기간
RECOMMENDED_USAGE_PERIOD = "2025-04-26 ~ 2026-04-26"