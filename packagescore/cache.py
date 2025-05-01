"""
Cache utility functions
"""
import logging
from typing import Any, Dict, Optional, Union, Callable
from datetime import timedelta
from enum import Enum, auto

logger = logging.getLogger(__name__)

class CacheKey(str, Enum):
    """Cache key enumeration for common cache keys"""
    VEHICLE_LIST = "vehicle_list"
    USER_PROFILE = "user_profile"
    MAINTENANCE_RECORDS = "maintenance_records"
    SHOP_LIST = "shop_list"
    VEHICLE_DETAIL = "vehicle_detail"
    SYSTEM_SETTINGS = "system_settings"

class CacheManager:
    """Simple cache manager implementation."""
    
    def __init__(self):
        self._cache = {}
        logger.info("Cache manager initialized")
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get a value from the cache"""
        return self._cache.get(key, default)
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set a value in the cache"""
        self._cache[key] = value
        # TTL implementation would require a background task to clear expired entries
        # This is a simplified version
    
    def delete(self, key: str) -> None:
        """Delete a value from the cache"""
        if key in self._cache:
            del self._cache[key]
    
    def clear(self) -> None:
        """Clear the entire cache"""
        self._cache.clear()

# Global instance
cache_manager = CacheManager()

# 'cache'라는 이름으로 내보내기 추가 - 이는 routers에서 사용하는 이름과 일치시키기 위함
cache = cache_manager