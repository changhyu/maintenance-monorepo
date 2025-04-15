"""
Core functionality for the API service.
"""

from .metrics import (
    init_metrics,
    track_db_query_time,
    record_cache_hit,
    record_cache_miss,
    record_token_created,
    record_token_refreshed,
    record_token_blacklisted,
    update_active_users,
    set_api_info
)
