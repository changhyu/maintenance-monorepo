import os
from typing import Union
import logging

from .development import DevelopmentConfig
from .test import TestConfig
from .production import ProductionConfig

logger = logging.getLogger(__name__)

def get_config() -> Union[DevelopmentConfig, TestConfig, ProductionConfig]:
    """
    환경 변수에 따라 적절한 설정을 반환합니다.
    기본값은 development입니다.
    """
    try:
        env = os.getenv("APP_ENV", "development").lower()
        
        if env == "production":
            config = ProductionConfig()
        elif env == "test":
            config = TestConfig()
        else:
            if env != "development":
                logger.warning(f"Unknown environment '{env}', falling back to development")
            config = DevelopmentConfig()
            
        # 설정 유효성 검증
        assert config.DATABASE_URL, "DATABASE_URL is not set"
        assert config.SECRET_KEY, "SECRET_KEY is not set"
        
        return config
    except Exception as e:
        logger.error(f"Failed to load config: {str(e)}")
        raise

# 전역 설정 객체
config = get_config() 