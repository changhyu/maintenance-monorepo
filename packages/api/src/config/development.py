from .base import BaseConfig

class DevelopmentConfig(BaseConfig):
    class Config:
        env_file = '.env.development'

    APP_NAME: str = "Maintenance API (Development)"
    DEBUG: bool = True 