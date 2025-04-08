"""
Configuration settings for the API service.
"""

import os
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    """API 서비스 설정."""
    
    # 기본 설정
    APP_NAME: str = "차량정비관리 API"
    VERSION: str = "0.1.0"
    DEBUG: bool = Field(default=False, env="DEBUG")
    
    # 프로젝트 메타데이터
    PROJECT_NAME: str = "차량정비관리 API"
    PROJECT_DESCRIPTION: str = "차량 정비 관리를 위한 API 서비스"
    PROJECT_VERSION: str = "0.1.0"
    
    # 서버 설정
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=8000, env="PORT")
    
    # 데이터베이스 설정
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/maintenance",
        env="DATABASE_URL"
    )
    
    # 보안 설정
    SECRET_KEY: str = Field(
        default="development_secret_key",
        env="SECRET_KEY"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        env="ACCESS_TOKEN_EXPIRE_MINUTES"
    )
    
    # CORS 설정
    CORS_ORIGINS: list[str] = ["*"]
    
    # 로깅 설정
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    
    class Config:
        """Pydantic 설정 클래스."""
        
        env_file = ".env"
        case_sensitive = True


# 설정 인스턴스 생성
settings = Settings() 