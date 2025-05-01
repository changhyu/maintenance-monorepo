import os
from typing import Dict, Any, Optional

# dotenv 패키지가 있으면 로드하고 없으면 무시
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv가 설치되지 않은 경우 무시

class Config:
    """Configuration management for the application."""
    
    # Dynamically create class variables to allow environment override during testing
    @classmethod
    def reload(cls):
        """Reload configuration from environment variables"""
        cls.DEBUG = os.getenv("DEBUG", "False").lower() == "true"
        cls.TESTING = os.getenv("TESTING", "False").lower() == "true"
        
        # Database settings
        cls.DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///prod.db")
        cls.TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite:///test.db")
        
        # Application settings
        cls.SECRET_KEY = os.getenv("SECRET_KEY", "default_insecure_key_change_in_production")
        cls.API_PREFIX = "/api/v1"
        cls.PROJECT_NAME = "Maintenance Service"
        
        # Cache settings
        cls.CACHE_TYPE = os.getenv("CACHE_TYPE", "simple")
        cls.CACHE_DEFAULT_TIMEOUT = int(os.getenv("CACHE_DEFAULT_TIMEOUT", "300"))
        
        # Git service settings
        cls.GIT_SERVICE_URL = os.getenv("GIT_SERVICE_URL", "")
        cls.GIT_SERVICE_TOKEN = os.getenv("GIT_SERVICE_TOKEN", "")
        
        # Logging settings
        cls.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
        cls.LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        cls.LOG_FILE = os.getenv("LOG_FILE")
        
    @classmethod
    def get_database_url(cls) -> str:
        """Return the appropriate database URL based on environment."""
        if cls.TESTING:
            return cls.TEST_DATABASE_URL
        return cls.DATABASE_URL
    
    @classmethod
    def as_dict(cls) -> Dict[str, Any]:
        """Return all configuration values as dictionary."""
        return {k: v for k, v in cls.__dict__.items() 
                if not k.startswith('__') and not isinstance(v, classmethod)}

# Initialize configuration
Config.reload()

# Default configuration instance
config = Config()