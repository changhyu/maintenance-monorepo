"""
Configuration settings for the API service.
"""

# 기본 모듈 임포트
import logging
import os
import secrets
from typing import List, Dict, Any, Optional

# 로거 설정
logger = logging.getLogger(__name__)

# 상수 정의
APP_NAME_KR = "차량정비관리 API"
API_VERSION = "0.1.0"

try:
    # pydantic v2 임포트 시도
    from pydantic_settings import BaseSettings, SettingsConfigDict
    from pydantic import Field, field_validator, PostgresDsn
    
    class Settings(BaseSettings):
        """
        API 환경 설정 관리 클래스
        """
        # 애플리케이션 설정
        APP_NAME: str = "Maintenance API"
        API_V1_PREFIX: str = "/api/v1"
        SECRET_KEY: str = secrets.token_urlsafe(32)
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7일
        ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        DEBUG: bool = ENVIRONMENT == "development"
        
        # CORS 설정
        BACKEND_CORS_ORIGINS: List[str] = ["*"]
        
        @classmethod
        @field_validator("BACKEND_CORS_ORIGINS", mode='before')
        def assemble_cors_origins(cls, v: Any) -> List[str]:
            if isinstance(v, str) and not v.startswith("["):
                return [i.strip() for i in v.split(",")]
            elif isinstance(v, (list, str)):
                return v
            raise ValueError(v)
        
        # 데이터베이스 설정
        POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
        POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
        POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
        POSTGRES_DB: str = os.getenv("POSTGRES_DB", "maintenance")
        POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
        DATABASE_URI: Optional[PostgresDsn] = None
        
        @classmethod
        @field_validator("DATABASE_URI", mode='before')
        def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
            if isinstance(v, str):
                return v
            # URL 직접 구성
            user = values.get("POSTGRES_USER")
            password = values.get("POSTGRES_PASSWORD")
            host = values.get("POSTGRES_SERVER")
            port = values.get("POSTGRES_PORT")
            db = values.get("POSTGRES_DB", "")
            
            url = f"postgresql://{user}:{password}@{host}:{port}/{db}"
            # PostgresDsn으로 변환하여 유효성 검사
            return url
        
        # 로깅 설정
        LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
        
        # 인증 설정
        JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
        JWT_ALGORITHM: str = "HS256"
        
        # 보안 설정
        SSL_REDIRECT: bool = False
        
        # 필드 추가
        HOST: str = Field(default="0.0.0.0")
        PORT: int = Field(default=8081)
        DATABASE_URL: str = Field(default="postgresql://postgres:zD...alhost:5432/maintenance")
        
        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            extra="ignore"  # extra 필드 허용
        )
except ImportError:
    # pydantic v1 임포트로 대체
    from pydantic import BaseSettings, Field
    
    class Settings(BaseSettings):
        """API 서비스 설정."""

        # 기본 설정
        APP_NAME: str = APP_NAME_KR
        VERSION: str = API_VERSION
        DEBUG: bool = Field(default=False, env="DEBUG")
        ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")

        # API 경로 설정
        API_V1_STR: str = "/api/v1"

        # 프로젝트 메타데이터
        PROJECT_NAME: str = APP_NAME_KR
        PROJECT_DESCRIPTION: str = "차량 정비 관리를 위한 API 서비스"
        PROJECT_VERSION: str = API_VERSION

        # 서버 설정
        HOST: str = Field(default="0.0.0.0", env="HOST")
        PORT: int = Field(default=8080, env="PORT")

        # 데이터베이스 설정
        DATABASE_URL: str = Field(
            default="postgresql://postgres:${DB_PASSWORD}@localhost:5432/maintenance",
            env="DATABASE_URL"
        )
        DB_POOL_SIZE: int = Field(default=5, env="DB_POOL_SIZE")
        DB_MAX_OVERFLOW: int = Field(default=10, env="DB_MAX_OVERFLOW")
        DB_CONNECT_ARGS: dict = {}

        # 보안 설정
        SECRET_KEY: str = Field(
            default="development_secret_key_please_change_in_production",
            env="SECRET_KEY"
        )
        ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
            default=30,
            env="ACCESS_TOKEN_EXPIRE_MINUTES"
        )
        REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
            default=7,
            env="REFRESH_TOKEN_EXPIRE_DAYS"
        )

        # CORS 설정
        CORS_ORIGINS: List[str] = Field(
            default=["*"],
            env="CORS_ORIGINS"
        )

        # 로깅 설정
        LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
        LOG_FORMAT: str = Field(
            default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            env="LOG_FORMAT"
        )

        # 스토리지 설정
        UPLOAD_DIR: str = Field(default="./uploads", env="UPLOAD_DIR")
        MAX_UPLOAD_SIZE_MB: int = Field(default=10, env="MAX_UPLOAD_SIZE_MB")
        ALLOWED_EXTENSIONS: List[str] = Field(
            default=["jpg", "jpeg", "png", "pdf"],
            env="ALLOWED_EXTENSIONS"
        )
        CACHE_BACKEND: str = Field(default="redis", env="CACHE_BACKEND")
        REDIS_HOST: str = "localhost"  # Redis 연결 호스트
        REDIS_PORT: int = 6379  # Redis 연결 포트 (기본 6379)
        REDIS_DB: int = 0  # Redis DB (기본 0)
        REDIS_PASSWORD: str = Field(default="", env="REDIS_PASSWORD")
        REDIS_URL: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")

# 설정 인스턴스 생성
try:
    settings = Settings()

    # 주요 설정 로깅
    if settings.DEBUG:
        logger.debug("환경: %s", settings.ENVIRONMENT)
        logger.debug("API 버전: %s", settings.VERSION if hasattr(settings, 'VERSION') else API_VERSION)
        logger.debug("API 경로: %s", settings.API_V1_STR if hasattr(settings, 'API_V1_STR') else settings.API_V1_PREFIX)
        logger.debug("서버: %s:%s", settings.HOST if hasattr(settings, 'HOST') else "0.0.0.0", 
                    settings.PORT if hasattr(settings, 'PORT') else 8080)
        logger.debug("로그 레벨: %s", settings.LOG_LEVEL)
except Exception as e:
    logger.error("설정 로드 중 오류 발생: %s", e)
    # 기본 설정으로 대체
    settings = Settings()