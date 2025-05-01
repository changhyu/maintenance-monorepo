"""
공통 설정 모듈
환경 변수와 설정 파일을 기반으로 한 애플리케이션 구성을 제공합니다.
"""

import os
from typing import Any, Dict, List, Optional, Set, Union

from pydantic import BaseSettings as PydanticBaseSettings
from pydantic import Field


class BaseAppSettings(PydanticBaseSettings):
    """
    기본 애플리케이션 설정 클래스
    Pydantic BaseSettings를 확장하여 환경 변수 및 설정 파일 지원을 제공합니다.
    """

    # 기본 애플리케이션 설정
    PROJECT_NAME: str = "차량 정비 서비스 앱"
    DEBUG: bool = Field(default=False, description="디버그 모드 활성화")
    ENVIRONMENT: str = Field(
        default="development",
        description="실행 환경 (development, staging, production)",
    )
    PORT: int = Field(default=8000, description="애플리케이션 포트")
    WORKERS: int = Field(default=1, description="워커 프로세스 수")

    # CORS 설정
    CORS_ORIGINS: List[str] = Field(default=["*"], description="CORS 허용 출처")
    CORS_CREDENTIALS: bool = Field(default=True, description="자격 증명 포함 여부")

    # 보안 설정
    SECRET_KEY: Optional[str] = Field(
        default=None, description="암호화에 사용되는 비밀 키"
    )
    ALGORITHM: str = Field(default="HS256", description="JWT 암호화 알고리즘")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30, description="액세스 토큰 만료 시간(분)"
    )

    # 로깅 설정
    LOG_LEVEL: str = Field(default="INFO", description="로깅 레벨")
    LOG_FORMAT: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        description="로그 형식",
    )
    LOG_FILE: Optional[str] = Field(default=None, description="로그 파일 경로")

    # 데이터베이스 설정
    DATABASE_URL: Optional[str] = Field(
        default=None, description="데이터베이스 연결 URL"
    )
    DATABASE_POOL_SIZE: int = Field(default=20, description="데이터베이스 연결 풀 크기")
    DATABASE_POOL_TIMEOUT: int = Field(
        default=30, description="데이터베이스 연결 타임아웃(초)"
    )

    # 캐시 설정
    REDIS_URL: Optional[str] = Field(default=None, description="Redis 연결 URL")
    CACHE_TTL: int = Field(default=60 * 5, description="캐시 만료 시간(초)")

    class Config:
        """Pydantic 설정 클래스"""

        # 환경 변수 파일 경로
        env_file = ".env"

        # 환경 변수 우선순위를 높게 설정
        env_file_encoding = "utf-8"

        # 케이스 민감성 활성화 (환경 변수는 대문자 사용)
        case_sensitive = True

        # 추가 환경 변수 파일들 (개발, 테스트, 스테이징, 프로덕션)
        @classmethod
        def customise_sources(
            cls,
            init_settings,
            env_settings,
            file_secret_settings,
        ):
            # 기본 설정 소스
            return (
                init_settings,  # 인스턴스화 시 직접 전달된 값
                env_settings,  # 환경 변수
                file_secret_settings,  # .env 파일
            )


def get_environment() -> str:
    """현재 실행 환경을 반환합니다."""
    return os.environ.get("ENVIRONMENT", "development")


def is_development() -> bool:
    """개발 환경인지 확인합니다."""
    return get_environment().lower() == "development"


def is_production() -> bool:
    """프로덕션 환경인지 확인합니다."""
    return get_environment().lower() == "production"


def is_testing() -> bool:
    """테스트 환경인지 확인합니다."""
    return get_environment().lower() == "testing"


def get_settings_path(service_name: str) -> str:
    """서비스별 설정 파일 경로를 반환합니다."""
    env = get_environment()
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_path, f"{service_name}/config/{env}.env")
