"""
Configuration settings for the API service.
"""

# 기본 모듈 임포트
import logging
from typing import List, Dict, Any

# 로거 설정
logger = logging.getLogger(__name__)

# 상수 정의
APP_NAME_KR = "차량정비관리 API"
API_VERSION = "0.1.0"

try:
    # pydantic v2 임포트 시도
    from pydantic_settings import BaseSettings
    from pydantic import Field, field_validator
    
    class Settings(BaseSettings):
        """API 서비스 설정."""

        # 기본 설정
        APP_NAME: str = APP_NAME_KR
        VERSION: str = API_VERSION
        DEBUG: bool = Field(default=False, env="DEBUG")
        ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")

        # 프로젝트 메타데이터
        PROJECT_NAME: str = APP_NAME_KR
        PROJECT_DESCRIPTION: str = "차량 정비 관리를 위한 API 서비스"
        PROJECT_VERSION: str = API_VERSION

        # 서버 설정
        HOST: str = Field(default="0.0.0.0", env="HOST")
        PORT: int = Field(default=8001, env="PORT")

        # 데이터베이스 설정
        DATABASE_URL: str = Field(
            default="postgresql://postgres:${DB_PASSWORD}@localhost:5432/maintenance",
            env="DATABASE_URL"
        )
        DB_POOL_SIZE: int = Field(default=5, env="DB_POOL_SIZE")
        DB_MAX_OVERFLOW: int = Field(default=10, env="DB_MAX_OVERFLOW")

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

        @classmethod
        @field_validator("SECRET_KEY")
        def validate_secret_key(cls, v: str, info) -> str:
            """SECRET_KEY 검증"""
            values = info.data
            env = values.get("ENVIRONMENT", "development")
            if env != "development" and (v == "development_secret_key_please_change_in_production" or len(v) < 32):
                msg = "프로덕션 환경에서는 안전한 SECRET_KEY를 설정해야 합니다"
                logger.warning(msg)
                if env == "production":
                    raise ValueError(msg)
            return v

        @classmethod
        @field_validator("CORS_ORIGINS", mode="before")
        def parse_cors_origins(cls, v: Any) -> List[str]:
            """CORS_ORIGINS 파싱"""
            if isinstance(v, str):
                return [origin.strip() for origin in v.split(",")]
            return v

        @classmethod
        @field_validator("ALLOWED_EXTENSIONS", mode="before")
        def parse_allowed_extensions(cls, v: Any) -> List[str]:
            """ALLOWED_EXTENSIONS 파싱"""
            if isinstance(v, str):
                return [ext.strip().lower() for ext in v.split(",")]
            return v

        @classmethod
        @field_validator("LOG_LEVEL")
        def validate_log_level(cls, v: str) -> str:
            """LOG_LEVEL 검증"""
            allowed_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
            if v.upper() not in allowed_levels:
                msg = f"유효하지 않은 로그 레벨: {v}. 허용된 값: {', '.join(allowed_levels)}"
                logger.warning(msg)
                return "INFO"  # 기본값 반환
            return v.upper()

        def get_database_settings(self) -> Dict[str, Any]:
            """데이터베이스 설정을 딕셔너리로 반환"""
            return {
                "url": self.DATABASE_URL,
                "pool_size": self.DB_POOL_SIZE,
                "max_overflow": self.DB_MAX_OVERFLOW
            }

        model_config = {
            "env_file": ".env",
            "env_file_encoding": "utf-8",
            "case_sensitive": True
        }
except ImportError:
    # pydantic v1 임포트로 대체
    from pydantic import BaseSettings, Field, validator
    
    class Settings(BaseSettings):
        """API 서비스 설정."""

        # 기본 설정
        APP_NAME: str = APP_NAME_KR
        VERSION: str = API_VERSION
        DEBUG: bool = Field(default=False, env="DEBUG")
        ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")

        # 프로젝트 메타데이터
        PROJECT_NAME: str = APP_NAME_KR
        PROJECT_DESCRIPTION: str = "차량 정비 관리를 위한 API 서비스"
        PROJECT_VERSION: str = API_VERSION

        # 서버 설정
        HOST: str = Field(default="0.0.0.0", env="HOST")
        PORT: int = Field(default=8001, env="PORT")

        # 데이터베이스 설정
        DATABASE_URL: str = Field(
            default="postgresql://postgres:${DB_PASSWORD}@localhost:5432/maintenance",
            env="DATABASE_URL"
        )
        DB_POOL_SIZE: int = Field(default=5, env="DB_POOL_SIZE")
        DB_MAX_OVERFLOW: int = Field(default=10, env="DB_MAX_OVERFLOW")

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

        @classmethod
        @validator("SECRET_KEY")
        def validate_secret_key(cls, v: str, values: Dict[str, Any]) -> str:
            """SECRET_KEY 검증"""
            env = values.get("ENVIRONMENT", "development")
            if env != "development" and (v == "development_secret_key_please_change_in_production" or len(v) < 32):
                msg = "프로덕션 환경에서는 안전한 SECRET_KEY를 설정해야 합니다"
                logger.warning(msg)
                if env == "production":
                    raise ValueError(msg)
            return v

        @classmethod
        @validator("CORS_ORIGINS", pre=True)
        def parse_cors_origins(cls, v: Any) -> List[str]:
            """CORS_ORIGINS 파싱"""
            if isinstance(v, str):
                return [origin.strip() for origin in v.split(",")]
            return v

        @classmethod
        @validator("ALLOWED_EXTENSIONS", pre=True)
        def parse_allowed_extensions(cls, v: Any) -> List[str]:
            """ALLOWED_EXTENSIONS 파싱"""
            if isinstance(v, str):
                return [ext.strip().lower() for ext in v.split(",")]
            return v

        @classmethod
        @validator("LOG_LEVEL")
        def validate_log_level(cls, v: str) -> str:
            """LOG_LEVEL 검증"""
            allowed_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
            if v.upper() not in allowed_levels:
                msg = f"유효하지 않은 로그 레벨: {v}. 허용된 값: {', '.join(allowed_levels)}"
                logger.warning(msg)
                return "INFO"  # 기본값 반환
            return v.upper()

        def get_database_settings(self) -> Dict[str, Any]:
            """데이터베이스 설정을 딕셔너리로 반환"""
            return {
                "url": self.DATABASE_URL,
                "pool_size": self.DB_POOL_SIZE,
                "max_overflow": self.DB_MAX_OVERFLOW
            }

        class Config:
            env_file = ".env"
            env_file_encoding = "utf-8"
            case_sensitive = True


# 설정 인스턴스 생성
try:
    settings = Settings()

    # 주요 설정 로깅
    if settings.DEBUG:
        logger.debug("환경: %s", settings.ENVIRONMENT)
        logger.debug("API 버전: %s", settings.VERSION)
        logger.debug("서버: %s:%s", settings.HOST, settings.PORT)
        logger.debug("로그 레벨: %s", settings.LOG_LEVEL)
except Exception as e:
    logger.error("설정 로드 중 오류 발생: %s", e)
    # 기본 설정으로 대체
    settings = Settings()
\n