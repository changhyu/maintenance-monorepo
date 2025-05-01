"""
차량 정비 관리 시스템 공통 Python 패키지

이 패키지는 차량 정비 관리 시스템의 모든 Python 서비스에서 사용되는
공통 유틸리티, 설정, 모델, 로깅 등의 기능을 제공합니다.
"""

__version__ = "0.1.0"

# FastAPI 애플리케이션 팩토리
from .fastapi_app import create_fastapi_app

# API 응답 포맷 유틸리티
from .api_responses import (
    ResponseStatus,
    ErrorCode,
    ErrorDetail,
    PaginationMeta,
    ResponseMeta,
    ApiResponse,
    PaginatedResponse,
    SuccessResponse,
    ErrorResponse,
    create_success_response,
    create_error_response,
    create_paginated_response,
    create_validation_error_response,
    create_not_found_response,
    create_server_error_response,
    create_unauthorized_response,
    create_forbidden_response,
    create_conflict_response,
)

# 데이터베이스 유틸리티
from .database import (
    Base,
    ModelBase,
    Database,
    DatabaseConfig,
    CRUDBase,
    get_db,
    create_all_tables,
    drop_all_tables,
    initialize_database,
    handle_db_error,
    model_to_dict,
    dict_to_model,
)

# 로깅 유틸리티
from .logging import (
    setup_logging,
    get_logger,
    set_log_level,
)

# 미들웨어 유틸리티
from .middleware import (
    configure_cors,
    request_id_middleware,
    error_handler_middleware,
    logging_middleware,
    cache_control_middleware,
)

# 유틸리티 함수들
from .utils import (
    get_environment,
    load_env_file,
    parse_bool,
    parse_list,
    parse_int,
    generate_random_string,
    sha256_hash,
    validate_email,
    mask_sensitive_data,
    parse_date,
    format_date,
    sanitize_filename,
    get_file_extension,
    json_encoder,
    json_decoder,
)

# 모델
from .models import (
    PaginationParams,
    TimeRange,
    SortOrder,
    SortOptions,
    SearchQuery,
    FilterOptions,
)
