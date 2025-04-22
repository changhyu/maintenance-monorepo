"""
애플리케이션 환경 설정
"""

import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from pydantic import PostgresDsn, validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from packages.api.src.core.exceptions import ConfigurationException

# yaml 의존성 조건부 임포트
try:
    import yaml
except ImportError:
    yaml = None

# 환경 변수 로드
load_dotenv()


# 상수 정의
class AppConstants:
    """애플리케이션 상수 정의"""

    # 애플리케이션 정보
    APP_NAME = "Maintenance API"
    APP_VERSION = "1.0.0"
    APP_DESCRIPTION = "Maintenance API 서비스"
    APP_TAGS = ["maintenance", "api", "service"]

    # API 설정
    API_V1_STR = "/api/v1"

    # 데이터베이스 설정
    DEFAULT_DB_HOST = "localhost"
    DEFAULT_DB_USER = "postgres"
    DEFAULT_DB_NAME = "maintenance"

    # 로깅 설정
    DEFAULT_LOG_LEVEL = "INFO"
    DEFAULT_LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    DEFAULT_LOG_FILE = "logs/maintenance.log"

    # 이메일 설정
    DEFAULT_SMTP_PORT = 587
    DEFAULT_SMTP_TLS = True

    # 미들웨어 설정
    DEFAULT_CORS_ORIGINS = "*"
    DEFAULT_ALLOWED_HOSTS = "*"


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # API 설정
    API_V1_STR: str = AppConstants.API_V1_STR
    PROJECT_NAME: str = AppConstants.APP_NAME
    VERSION: str = AppConstants.APP_VERSION
    DESCRIPTION: str = AppConstants.APP_DESCRIPTION
    TAGS: List[str] = AppConstants.APP_TAGS

    # 데이터베이스 설정
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", AppConstants.DEFAULT_DB_HOST)
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", AppConstants.DEFAULT_DB_USER)
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", AppConstants.DEFAULT_DB_NAME)
    SQLALCHEMY_DATABASE_URI: Optional[str] = None

    # 데이터베이스 추가 설정
    DATABASE_URL: Optional[str] = None
    DB_POOL_SIZE: Optional[int] = 5
    DB_MAX_OVERFLOW: Optional[int] = 10
    DB_HOST: Optional[str] = "db"
    DB_PORT: Optional[str] = "5432"
    DB_USER: Optional[str] = "postgres"
    DB_PASSWORD: Optional[str] = "postgres"
    DB_NAME: Optional[str] = "maintenance"
    DB_MAX_CONNECTIONS: Optional[int] = 10

    # Redis 설정
    REDIS_HOST: Optional[str] = "redis"
    REDIS_PORT: Optional[str] = "6379"

    # API 설정
    API_HOST: Optional[str] = "0.0.0.0"
    API_PORT: Optional[str] = "8000"
    ENVIRONMENT: Optional[str] = "development"
    DEBUG: Optional[bool] = True
    SECRET_KEY: Optional[str] = "dev_secret_key_replace_in_production"

    # CORS 설정
    CORS_ORIGINS: Optional[str] = (
        '["http://localhost:3000", "http://localhost:8080", "http://localhost"]'
    )
    VITE_API_URL: Optional[str] = "http://localhost:8000"

    @validator("SQLALCHEMY_DATABASE_URI", pre=True)
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v.replace("postgresql://", "postgresql+asyncpg://")

        # Pydantic v2 스타일로 PostgreSQL DSN 생성
        username = values.get("POSTGRES_USER")
        password = values.get("POSTGRES_PASSWORD")
        host = values.get("POSTGRES_SERVER")
        db_name = values.get("POSTGRES_DB", "")

        # 기본 포트 사용
        port = "5432"

        if not all([username, host]):
            return None

        # URL 형식: postgresql+asyncpg://user:pass@host:port/db
        return f"postgresql+asyncpg://{username}:{password}@{host}:{port}/{db_name}"

    # 로깅 설정
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", AppConstants.DEFAULT_LOG_LEVEL)
    LOG_FORMAT: str = AppConstants.DEFAULT_LOG_FORMAT
    LOG_FILE: str = AppConstants.DEFAULT_LOG_FILE

    # 이메일 설정
    SMTP_TLS: bool = AppConstants.DEFAULT_SMTP_TLS
    SMTP_PORT: Optional[int] = int(
        os.getenv("SMTP_PORT", str(AppConstants.DEFAULT_SMTP_PORT))
    )
    SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST")
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    EMAILS_FROM_EMAIL: Optional[str] = os.getenv("EMAILS_FROM_EMAIL")
    EMAILS_FROM_NAME: Optional[str] = AppConstants.APP_NAME

    # 미들웨어 설정
    BACKEND_CORS_ORIGINS: List[str] = os.getenv(
        "BACKEND_CORS_ORIGINS", AppConstants.DEFAULT_CORS_ORIGINS
    ).split(",")
    ALLOWED_HOSTS: List[str] = os.getenv(
        "ALLOWED_HOSTS", AppConstants.DEFAULT_ALLOWED_HOSTS
    ).split(",")

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow",  # 추가 필드 허용
    )


def yaml_config_settings_source() -> Dict[str, Any]:
    """
    YAML 설정 파일에서 설정 로드 (yaml 모듈이 있는 경우만 동작)

    Returns:
        설정 딕셔너리
    """
    config_file = os.environ.get("CONFIG_FILE", "config.yaml")

    if not os.path.exists(config_file) or yaml is None:
        return {}

    try:
        with open(config_file, "r") as f:
            return yaml.safe_load(f)
    except Exception as e:
        print(f"설정 파일 로드 중 오류 발생: {str(e)}")
        return {}


@lru_cache()
def get_settings() -> Settings:
    """
    애플리케이션 설정 가져오기

    Returns:
        Settings: 설정 객체
    """
    return Settings()


settings = get_settings()


class Config:
    """설정 관리 클래스"""

    def __init__(self):
        """설정 초기화"""
        self._settings = get_settings()
        self._config: Dict[str, Any] = {}
        self._load_config()

    def _load_config(self) -> None:
        """설정 로드"""
        try:
            # 환경 변수에서 설정 로드
            self._config = self._settings.dict()

            # YAML 설정 파일 로드
            config_path = Path("config.yaml")
            if config_path.exists():
                with open(config_path, "r") as f:
                    yaml_config = yaml.safe_load(f)
                    self._config.update(yaml_config)

        except Exception as e:
            raise ConfigurationException(f"설정 로드 실패: {str(e)}")

    def get(self, key: str, default: Any = None) -> Any:
        """설정값 조회"""
        try:
            keys = key.split(".")
            value = self._config
            for k in keys:
                value = value[k]
            return value
        except (KeyError, TypeError):
            return default

    def get_env(self, key: str, default: Any = None) -> Any:
        """환경 변수 조회"""
        return os.environ.get(key, default)

    def get_path(self, key: str) -> Path:
        """경로 설정 조회"""
        path_str = self.get(key)
        if not path_str:
            raise ConfigurationException(f"경로 설정이 없습니다: {key}")
        return Path(path_str)

    def get_database_config(self) -> Dict[str, Any]:
        """데이터베이스 설정 조회"""
        return {
            "url": self.get("DATABASE_URL"),
            "pool_size": self.get("DB_POOL_SIZE"),
            "max_overflow": self.get("DB_MAX_OVERFLOW"),
        }

    def get_git_config(self) -> Dict[str, Any]:
        """
        Git 설정 조회

        Returns:
            Git 설정
        """
        return self.get("git", {})

    def get_logging_config(self) -> Dict[str, Any]:
        """로깅 설정 조회"""
        return {"level": self.get("LOG_LEVEL"), "format": self.get("LOG_FORMAT")}

    def get_security_config(self) -> Dict[str, Any]:
        """
        보안 설정 조회

        Returns:
            보안 설정
        """
        return self.get("security", {})

    def get_api_config(self) -> Dict[str, Any]:
        """API 설정 조회"""
        return {
            "host": self.get("HOST"),
            "port": self.get("PORT"),
            "debug": self.get("DEBUG"),
        }

    def reload(self) -> None:
        """설정 재로드"""
        self._load_config()


# 전역 설정 인스턴스
config = Config()
