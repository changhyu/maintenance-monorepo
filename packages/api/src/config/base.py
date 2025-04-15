from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import validator
import json

class BaseConfig(BaseSettings):
    APP_NAME: str = "Maintenance API"
    DEBUG: bool = False
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/maintenance"
    REDIS_URL: str = "redis://localhost:6379/0"
    LOG_LEVEL: str = "info"
    SECRET_KEY: str = "default_secret_key_please_change_in_production"
    CACHE_BACKEND: str = "redis://localhost:6379/1"
    API_VERSION: str = "v1"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    MAX_CONNECTIONS: int = 100
    POOL_SIZE: int = 20

    @validator('DATABASE_URL')
    def validate_database_url(cls, v: str) -> str:
        if not v.startswith('postgresql://'):
            raise ValueError('DATABASE_URL must be a PostgreSQL URL')
        return v

    @validator('REDIS_URL', 'CACHE_BACKEND')
    def validate_redis_url(cls, v: str) -> str:
        if not v.startswith('redis://'):
            raise ValueError('REDIS_URL must be a Redis URL')
        return v

    @validator('CORS_ORIGINS', pre=True)
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [origin.strip() for origin in v.split(',')]
        return v

    class Config:
        case_sensitive = True 