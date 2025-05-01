"""
공통 설정 관리 모듈
모든 마이크로서비스에서 환경 설정 관리를 위한 기본 클래스 제공
"""

import os
from functools import lru_cache
from typing import Any, Dict, List, Optional, Set, Union

# pydantic v2+에서는 BaseSettings가 pydantic-settings 패키지로 이동했습니다
try:
    from pydantic_settings import BaseSettings
except ImportError:
    # 이전 버전 호환성 유지
    from pydantic import BaseSettings

from pydantic import Field


class BaseAppSettings(BaseSettings):
    """
    모든 서비스에서 공통적으로 사용되는 기본 설정 클래스
    """

    # 환경 설정
    ENVIRONMENT: str = Field(
        "development", description="실행 환경 (development, staging, production)"
    )
    DEBUG: bool = Field(False, description="디버그 모드 활성화 여부")

    # 서버 설정
    HOST: str = Field("0.0.0.0", description="서버 호스트")
    PORT: int = Field(8000, description="서버 포트")
    WORKERS: int = Field(1, description="워커 프로세스 수")

    # API 설정
    API_PREFIX: str = Field("/api", description="API 접두사")
    API_VERSION: str = Field("1.0.0", description="API 버전")
    PROJECT_NAME: str = Field("Vehicle Maintenance API", description="프로젝트 이름")

    # CORS 설정
    CORS_ORIGINS: List[str] = Field(
        ["*"],
        description="CORS 허용 출처 (기본값은 모든 출처 허용. 프로덕션에서는 구체적인 도메인 지정 권장)",
    )

    # 로깅 설정
    LOG_LEVEL: str = Field("INFO", description="로깅 레벨")

    class Config:
        """Pydantic 설정 클래스"""

        env_file = ".env"
        case_sensitive = True

    def get_full_api_path(self, path: str) -> str:
        """
        API 경로 앞에 API 접두사와 버전을 추가하여 전체 API 경로 생성

        Args:
            path: API 엔드포인트 경로

        Returns:
            전체 API 경로
        """
        # 경로가 이미 / 로 시작하는 경우 처리
        if not path.startswith("/"):
            path = f"/{path}"

        return f"{self.API_PREFIX}{path}"


@lru_cache()
def get_settings() -> BaseAppSettings:
    """
    애플리케이션 설정 가져오기 (캐싱됨)

    Returns:
        BaseAppSettings 인스턴스
    """
    return BaseAppSettings()
