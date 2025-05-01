"""
애플리케이션 설정 모듈
"""
import json
import os
from typing import Any, Dict, List, Optional
from functools import lru_cache
from datetime import datetime
from pydantic import BaseModel, ValidationError, validator, Field, field_validator, ConfigDict
# pydantic-settings 패키지에서 BaseSettings 임포트
from pydantic_settings import BaseSettings

# 기본 설정값
PROJECT_NAME = "통합 관리 시스템"
API_PREFIX = "/api"
API_V1_STR = "/api/v1"
API_VERSION = "1.0.0"
API_VERSION_DATE = "2023-07-01"

# 환경 변수에서 값을 가져오거나 기본값 사용
SECRET_KEY = os.getenv("SECRET_KEY", "development-secret-key-not-for-production")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
SERVER_HOST = os.getenv("SERVER_HOST", "localhost")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))  # 9999에서 8000으로 변경
BASE_URL = os.getenv("BASE_URL", f"http://{SERVER_HOST}:{SERVER_PORT}")
LOG_LEVEL = os.getenv("LOG_LEVEL", "info").lower()
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
DEBUG = ENVIRONMENT == "development"
TESTING = ENVIRONMENT == "testing"
SQL_QUERY_LOGGING = os.getenv("SQL_QUERY_LOGGING", "false").lower() == "true"
# JWT 토큰 암호화 알고리즘 추가
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# 데이터베이스 설정
POSTGRES_SERVER = os.getenv("POSTGRES_SERVER", "localhost")  # db에서 localhost로 변경
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_DB = os.getenv("POSTGRES_DB", "maintenance")  # maintenance_db에서 maintenance로 변경
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
DATABASE_URI = os.getenv(
    "DATABASE_URI",
    f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

# CORS 설정 (와일드카드 대신 명시적 URL 지정)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

# 환경 설정 검증 클래스
class EnvironmentValidator(BaseModel):
    """환경 변수 검증을 위한 모델"""
    SECRET_KEY: str = Field(...)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(..., gt=0)
    SERVER_PORT: int = Field(..., gt=0, lt=65536)
    POSTGRES_PORT: str = Field(...)
    DATABASE_URI: str = Field(...)
    LOG_LEVEL: str = Field(...)
    ENVIRONMENT: str = Field(...)
    
    model_config = ConfigDict(
        extra="allow",  # 추가 필드 허용
    )
    
    @field_validator("LOG_LEVEL")
    def validate_log_level(cls, v: str) -> str:
        valid_levels = ["debug", "info", "warning", "error", "critical"]
        if v.lower() not in valid_levels:
            raise ValueError(f"유효하지 않은 로그 레벨입니다. 가능한 값: {', '.join(valid_levels)}")
        return v
    
    @field_validator("ENVIRONMENT")
    def validate_environment(cls, v: str) -> str:
        valid_envs = ["development", "staging", "production", "testing"]
        if v.lower() not in valid_envs:
            raise ValueError(f"유효하지 않은 환경입니다. 가능한 값: {', '.join(valid_envs)}")
        return v
    
    @field_validator("SECRET_KEY")
    def validate_secret_key(cls, v: str) -> str:
        """SECRET_KEY가 안전한지 확인합니다."""
        # 개발 환경이 아닌 경우에는 더 강력한 검증이 필요
        if ENVIRONMENT != "development" and v == "development-secret-key-not-for-production":
            raise ValueError("프로덕션 환경에서는 안전한 SECRET_KEY를 사용해야 합니다.")
        if len(v) < 16:
            raise ValueError("SECRET_KEY는 최소 16자 이상이어야 합니다.")
        return v

def validate_environment_variables():
    """환경 변수를 검증합니다."""
    env_vars = {
        "SECRET_KEY": SECRET_KEY,
        "ACCESS_TOKEN_EXPIRE_MINUTES": ACCESS_TOKEN_EXPIRE_MINUTES,
        "SERVER_PORT": SERVER_PORT,
        "POSTGRES_PORT": POSTGRES_PORT,
        "DATABASE_URI": DATABASE_URI,
        "LOG_LEVEL": LOG_LEVEL,
        "ENVIRONMENT": ENVIRONMENT,
    }
    
    # 환경에 따라 다른 검증 규칙 적용
    if ENVIRONMENT == "production":
        # 프로덕션 환경에서는 더 엄격한 검증
        if "*" in ALLOWED_ORIGINS:
            raise ValidationError("프로덕션 환경에서는 '*'와 같은 와일드카드 CORS 설정을 사용할 수 없습니다.")
    
    # Pydantic 모델을 사용하여 환경 변수 검증
    return EnvironmentValidator(**env_vars)

# 설정 클래스
class Settings:
    PROJECT_NAME: str = PROJECT_NAME
    API_PREFIX: str = API_PREFIX
    API_V1_STR: str = API_V1_STR
    API_VERSION: str = API_VERSION
    API_VERSION_DATE: str = API_VERSION_DATE
    SECRET_KEY: str = SECRET_KEY
    ACCESS_TOKEN_EXPIRE_MINUTES: int = ACCESS_TOKEN_EXPIRE_MINUTES
    SERVER_HOST: str = SERVER_HOST
    SERVER_PORT: int = SERVER_PORT
    BASE_URL: str = BASE_URL
    LOG_LEVEL: str = LOG_LEVEL
    ENVIRONMENT: str = ENVIRONMENT
    DEBUG: bool = DEBUG
    TESTING: bool = TESTING
    SQL_QUERY_LOGGING: bool = SQL_QUERY_LOGGING
    POSTGRES_SERVER: str = POSTGRES_SERVER
    POSTGRES_USER: str = POSTGRES_USER
    POSTGRES_PASSWORD: str = POSTGRES_PASSWORD
    POSTGRES_DB: str = POSTGRES_DB
    POSTGRES_PORT: str = POSTGRES_PORT
    DATABASE_URI: str = DATABASE_URI
    ALLOWED_ORIGINS: List[str] = ALLOWED_ORIGINS
    ALGORITHM: str = ALGORITHM
    
    def get_environment(self) -> str:
        """현재 환경 이름을 반환합니다."""
        return self.ENVIRONMENT
    
    def is_production(self) -> bool:
        """현재 환경이 프로덕션인지 확인합니다."""
        return self.ENVIRONMENT == "production"
    
    def is_development(self) -> bool:
        """현재 환경이 개발인지 확인합니다."""
        return self.ENVIRONMENT == "development"
    
    def is_testing(self) -> bool:
        """현재 환경이 테스트인지 확인합니다."""
        return self.ENVIRONMENT == "testing"
    
    def get_database_url(self) -> str:
        """데이터베이스 URL을 반환합니다."""
        return self.DATABASE_URI

@lru_cache
def get_settings() -> Settings:
    """설정 인스턴스를 반환합니다. 성능을 위해 캐싱됩니다."""
    return Settings()

settings = get_settings()