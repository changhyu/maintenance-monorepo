import os
from pydantic import SecretStr, field_validator, ConfigDict
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    # API 설정
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    
    # 데이터베이스 설정
    DATABASE_URL: Optional[SecretStr] = None
    DB_HOST: Optional[str] = None
    DB_PORT: Optional[int] = None
    DB_USER: Optional[SecretStr] = None
    DB_PASSWORD: Optional[SecretStr] = None
    DB_NAME: Optional[str] = None
    
    # 보안 설정
    SECRET_KEY: Optional[SecretStr] = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # 패스워드 정책
    MIN_PASSWORD_LENGTH: int = 12
    MAX_PASSWORD_LENGTH: int = 128
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_NUMBERS: bool = True
    PASSWORD_REQUIRE_SPECIAL_CHARS: bool = True
    PASSWORD_MAX_CONSECUTIVE_CHARS: int = 2
    PASSWORD_PREVIOUS_PASSWORDS_COUNT: int = 5
    PASSWORD_PREVENT_COMMON_PASSWORDS: bool = True
    
    # Git 설정
    GIT_USER_NAME: str = "System User"
    GIT_USER_EMAIL: str = "system@example.com"
    
    # 추가 설정
    DB_POOL_SIZE: Optional[int] = None
    DB_MAX_OVERFLOW: Optional[int] = None
    DB_MAX_CONNECTIONS: Optional[int] = None
    PROJECT_NAME: Optional[str] = None
    REDIS_HOST: Optional[str] = None
    REDIS_PORT: Optional[int] = None
    CORS_ORIGINS: Optional[str] = None
    VITE_API_URL: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    
    # 환경별 설정 검증
    @field_validator('ENVIRONMENT')
    def validate_environment(cls, v):
        allowed = ['development', 'testing', 'staging', 'production']
        if v not in allowed:
            raise ValueError(f'환경 설정은 다음 중 하나여야 함: {", ".join(allowed)}')
        return v
    
    # Pydantic v2 설정
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"  # 알 수 없는 필드 무시
    )

# 설정 인스턴스 생성
settings = Settings() 