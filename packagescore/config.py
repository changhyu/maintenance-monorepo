"""
Core configuration settings with enhanced environment management
"""
import os
import json
import logging
from typing import Any, Dict, Optional, Set, List, Union
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, validator

class EnvironmentSettings(BaseSettings):
    """Base settings class for environment configuration"""
    
    # Environment settings
    ENV: str = "development"
    DEBUG: bool = True
    TESTING: bool = False
    
    # Database settings
    DATABASE_URL: str = "sqlite:///./test.db"
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    
    # JWT settings
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # App settings
    API_PREFIX: str = "/api"
    
    # Logging settings
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE: Optional[str] = None

    # Cache settings
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 300  # seconds
    REDIS_URL: Optional[str] = None
    
    # Override with environment files
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow"
    )
    
    def is_development(self) -> bool:
        """Check if environment is development"""
        return self.ENV.lower() == "development"
    
    def is_production(self) -> bool:
        """Check if environment is production"""
        return self.ENV.lower() == "production"
    
    def is_testing(self) -> bool:
        """Check if environment is testing"""
        return self.ENV.lower() == "testing"
    
    def is_staging(self) -> bool:
        """Check if environment is staging"""
        return self.ENV.lower() == "staging"
    
    @field_validator('LOG_LEVEL')
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate that log level is a valid logging level"""
        valid_levels = {'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'}
        if v.upper() not in valid_levels:
            raise ValueError(f"LOG_LEVEL must be one of {valid_levels}")
        return v.upper()
    
    def setup_logging(self) -> None:
        """Configure logging based on settings"""
        log_level = getattr(logging, self.LOG_LEVEL.upper())
        logging_config = {
            'level': log_level,
            'format': self.LOG_FORMAT,
            'handlers': []
        }
        
        # Add console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        console_handler.setFormatter(logging.Formatter(self.LOG_FORMAT))
        logging_config['handlers'].append(console_handler)
        
        # Add file handler if LOG_FILE is specified
        if self.LOG_FILE:
            file_handler = logging.FileHandler(self.LOG_FILE)
            file_handler.setLevel(log_level)
            file_handler.setFormatter(logging.Formatter(self.LOG_FORMAT))
            logging_config['handlers'].append(file_handler)
        
        # Apply configuration
        for handler in logging.root.handlers[:]:
            logging.root.removeHandler(handler)
        
        for handler in logging_config['handlers']:
            logging.root.addHandler(handler)
        
        logging.root.setLevel(log_level)
        logging.info(f"Logging configured with level: {self.LOG_LEVEL}")
    
    def get_db_uri(self) -> str:
        """Get database URI with resolved variables"""
        return self.DATABASE_URL
    
    def as_dict(self) -> Dict[str, Any]:
        """Convert settings to dictionary, masking sensitive values"""
        settings_dict = self.model_dump()
        sensitive_keys = {'SECRET_KEY', 'DATABASE_URL', 'REDIS_URL'}
        
        for key in sensitive_keys:
            if key in settings_dict and settings_dict[key]:
                settings_dict[key] = "******"
        
        return settings_dict
    
    def log_settings(self, log_level: str = "INFO") -> None:
        """Log current settings at specified level"""
        settings_str = json.dumps(self.as_dict(), indent=2)
        getattr(logging, log_level.upper())(f"Current settings: {settings_str}")


class DevelopmentSettings(EnvironmentSettings):
    """Development environment specific settings"""
    ENV: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"
    
    model_config = SettingsConfigDict(
        env_file=["development.env", ".env"],
        env_file_encoding="utf-8"
    )


class TestingSettings(EnvironmentSettings):
    """Testing environment specific settings"""
    ENV: str = "testing"
    TESTING: bool = True
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite:///./test.db"
    
    model_config = SettingsConfigDict(
        env_file=["testing.env", ".env"],
        env_file_encoding="utf-8"
    )


class StagingSettings(EnvironmentSettings):
    """Staging environment specific settings"""
    ENV: str = "staging"
    DEBUG: bool = False
    
    model_config = SettingsConfigDict(
        env_file=["staging.env", ".env"],
        env_file_encoding="utf-8"
    )


class ProductionSettings(EnvironmentSettings):
    """Production environment specific settings"""
    ENV: str = "production"
    DEBUG: bool = False
    
    model_config = SettingsConfigDict(
        env_file=["production.env", ".env"],
        env_file_encoding="utf-8"
    )


@lru_cache()
def get_settings() -> EnvironmentSettings:
    """
    Get settings based on current environment with caching
    
    Prioritizes ENV environment variable to determine which settings to use
    """
    env = os.getenv("ENV", "development").lower()
    settings_class = {
        "development": DevelopmentSettings,
        "testing": TestingSettings,
        "staging": StagingSettings,
        "production": ProductionSettings
    }.get(env, DevelopmentSettings)
    
    settings = settings_class()
    if not os.getenv("TESTING"):
        logging.info(f"Loaded settings for environment: {settings.ENV}")
    
    return settings


# Singleton instance for global access
settings = get_settings()