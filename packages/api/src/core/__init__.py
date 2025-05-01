"""
Core 패키지 초기화

이 패키지는 API 서비스의 핵심 기능을 제공합니다.
주요 기능:
- 설정 관리
- 데이터베이스 연결
- 로깅 설정
- 메트릭 수집
"""

from core.config import settings
from core.exceptions import (
    AuthenticationException,
    ConfigurationException,
    DatabaseException,
    ExternalServiceException,
    NotFoundException,
    ValidationException,
)
from core.offline_manager import OfflineManager
from core.database.database import (
    AsyncSession,
    Base,
    SessionLocal,
    get_db_session,
    get_session,
)

__all__ = [
    "settings",
    "ConfigurationException",
    "ValidationException",
    "NotFoundException",
    "AuthenticationException",
    "DatabaseException",
    "ExternalServiceException",
    "OfflineManager",
    "SessionLocal",
    "Base",
    "get_db_session",
    "AsyncSession",
    "get_session",
]

"""
Core functionality for the API service.
"""

# 이 디렉토리를 패키지로 인식하기 위한 __init__.py 파일입니다.
