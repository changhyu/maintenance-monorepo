"""
차량 정비 관리 시스템의 표준 API 응답 형식

이 모듈은 모든 API 엔드포인트에서 사용할 표준화된 응답 형식을 정의합니다.
일관된 응답 구조를 유지하여 프론트엔드 통합과 에러 처리를 단순화합니다.
"""

from typing import Any, Dict, List, Optional, Tuple, TypeVar, Union, Generic
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field

# 타입 변수 정의 (제네릭 응답 모델용)
T = TypeVar('T')
U = TypeVar('U')

class ResponseStatus(str, Enum):
    """API 응답 상태 열거형"""
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"

class ErrorCode(str, Enum):
    """표준 에러 코드 열거형"""
    # 일반 에러
    UNKNOWN_ERROR = "unknown_error"
    INTERNAL_SERVER_ERROR = "internal_server_error"
    SERVICE_UNAVAILABLE = "service_unavailable"
    
    # 인증 관련 에러
    UNAUTHORIZED = "unauthorized"
    INVALID_CREDENTIALS = "invalid_credentials"
    TOKEN_EXPIRED = "token_expired"
    TOKEN_INVALID = "token_invalid"
    PERMISSION_DENIED = "permission_denied"
    
    # 입력값 관련 에러
    VALIDATION_ERROR = "validation_error"
    INVALID_INPUT = "invalid_input"
    REQUIRED_FIELD_MISSING = "required_field_missing"
    
    # 리소스 관련 에러
    RESOURCE_NOT_FOUND = "resource_not_found"
    RESOURCE_ALREADY_EXISTS = "resource_already_exists"
    RESOURCE_CONFLICT = "resource_conflict"
    
    # 데이터베이스 관련 에러
    DATABASE_ERROR = "database_error"
    QUERY_ERROR = "query_error"
    INTEGRITY_ERROR = "integrity_error"
    
    # 파일 관련 에러
    FILE_NOT_FOUND = "file_not_found"
    INVALID_FILE_FORMAT = "invalid_file_format"
    FILE_TOO_LARGE = "file_too_large"
    
    # 외부 서비스 관련 에러
    EXTERNAL_SERVICE_ERROR = "external_service_error"
    GATEWAY_TIMEOUT = "gateway_timeout"
    
    # 비즈니스 로직 관련 에러
    BUSINESS_LOGIC_ERROR = "business_logic_error"
    OPERATION_NOT_ALLOWED = "operation_not_allowed"
    PRECONDITION_FAILED = "precondition_failed"

class ErrorDetail(BaseModel):
    """에러 세부 정보 모델"""
    field: Optional[str] = None  # 에러가 발생한 필드 이름 (해당하는 경우)
    code: str  # 에러 코드
    message: str  # 사용자 친화적인 에러 메시지
    detail: Optional[str] = None  # 기술적인 세부 정보 (개발용)

class PaginationMeta(BaseModel):
    """페이지네이션 메타데이터 모델"""
    page: int = Field(..., description="현재 페이지 번호")
    per_page: int = Field(..., description="페이지당 항목 수")
    total_pages: int = Field(..., description="총 페이지 수")
    total_items: int = Field(..., description="총 항목 수")
    has_next: bool = Field(..., description="다음 페이지 존재 여부")
    has_prev: bool = Field(..., description="이전 페이지 존재 여부")

class ResponseMeta(BaseModel):
    """응답 메타데이터 모델"""
    timestamp: datetime = Field(default_factory=datetime.now, description="응답 생성 시간")
    code: Optional[str] = Field(None, description="응답 코드")
    pagination: Optional[PaginationMeta] = Field(None, description="페이지네이션 정보")
    debug_info: Optional[Dict[str, Any]] = Field(None, description="디버그 정보 (개발 환경에서만 포함)")

class ApiResponse(BaseModel, Generic[T]):
    """기본 API 응답 모델"""
    status: ResponseStatus = Field(..., description="응답 상태")
    message: str = Field(..., description="응답 메시지")
    data: Optional[T] = Field(None, description="응답 데이터")
    meta: ResponseMeta = Field(default_factory=ResponseMeta, description="메타데이터")
    errors: Optional[List[ErrorDetail]] = Field(None, description="에러 세부 정보 목록")

class PaginatedResponse(ApiResponse, Generic[T]):
    """페이지네이션된 응답 모델"""
    data: List[T] = Field(..., description="데이터 항목 목록")
    meta: ResponseMeta = Field(..., description="페이지네이션 정보를 포함한 메타데이터")

class SuccessResponse(ApiResponse, Generic[T]):
    """성공 응답 모델"""
    status: ResponseStatus = ResponseStatus.SUCCESS

class ErrorResponse(ApiResponse):
    """에러 응답 모델"""
    status: ResponseStatus = ResponseStatus.ERROR
    data: None = None
    errors: List[ErrorDetail]

def create_success_response(
    data: Optional[Any] = None,
    message: str = "요청이 성공적으로 처리되었습니다.",
    meta: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    성공 응답 생성 함수
    
    Args:
        data: 응답 데이터
        message: 응답 메시지
        meta: 메타데이터 사전
        
    Returns:
        성공 응답 사전
    """
    response = {
        "status": ResponseStatus.SUCCESS,
        "message": message,
        "data": data,
        "meta": {
            "timestamp": datetime.now().isoformat(),
            **(meta or {})
        },
        "errors": None
    }
    return response

def create_error_response(
    message: str = "요청 처리 중 오류가 발생했습니다.",
    errors: Optional[List[Dict[str, Any]]] = None,
    error_code: str = ErrorCode.UNKNOWN_ERROR,
    meta: Optional[Dict[str, Any]] = None,
    status_code: int = 400
) -> Tuple[Dict[str, Any], int]:
    """
    에러 응답 생성 함수
    
    Args:
        message: 응답 메시지
        errors: 에러 세부 정보 목록
        error_code: 에러 코드
        meta: 메타데이터 사전
        status_code: HTTP 상태 코드
        
    Returns:
        에러 응답 사전과 HTTP 상태 코드의 튜플
    """
    if not errors:
        errors = [{
            "code": error_code,
            "message": message,
            "detail": None
        }]
        
    response = {
        "status": ResponseStatus.ERROR,
        "message": message,
        "data": None,
        "meta": {
            "timestamp": datetime.now().isoformat(),
            "code": error_code,
            **(meta or {})
        },
        "errors": errors
    }
    return response, status_code

def create_paginated_response(
    items: List[Any],
    total_items: int,
    page: int,
    per_page: int,
    message: str = "페이지네이션된 데이터가 성공적으로 검색되었습니다.",
    meta: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    페이지네이션된 응답 생성 함수
    
    Args:
        items: 현재 페이지의 항목 목록
        total_items: 총 항목 수
        page: 현재 페이지 번호
        per_page: 페이지당 항목 수
        message: 응답 메시지
        meta: 추가 메타데이터 사전
        
    Returns:
        페이지네이션된 응답 사전
    """
    total_pages = (total_items + per_page - 1) // per_page if per_page > 0 else 0
    
    pagination_meta = {
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "total_items": total_items,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }
    
    response = {
        "status": ResponseStatus.SUCCESS,
        "message": message,
        "data": items,
        "meta": {
            "timestamp": datetime.now().isoformat(),
            "pagination": pagination_meta,
            **(meta or {})
        },
        "errors": None
    }
    return response

def create_validation_error_response(
    errors: Dict[str, List[str]],
    message: str = "입력값 검증에 실패했습니다.",
    meta: Optional[Dict[str, Any]] = None
) -> Tuple[Dict[str, Any], int]:
    """
    입력값 검증 에러 응답 생성 함수
    
    Args:
        errors: 필드명과 에러 메시지 목록의 사전
        message: 응답 메시지
        meta: 메타데이터 사전
        
    Returns:
        검증 에러 응답 사전과 HTTP 상태 코드의 튜플
    """
    error_details = []
    
    for field, messages in errors.items():
        for msg in messages:
            error_details.append({
                "field": field,
                "code": ErrorCode.VALIDATION_ERROR,
                "message": msg,
                "detail": None
            })
    
    response = {
        "status": ResponseStatus.ERROR,
        "message": message,
        "data": None,
        "meta": {
            "timestamp": datetime.now().isoformat(),
            "code": ErrorCode.VALIDATION_ERROR,
            **(meta or {})
        },
        "errors": error_details
    }
    return response, 422

def create_not_found_response(
    resource_type: str,
    resource_id: Union[str, int],
    message: Optional[str] = None
) -> Tuple[Dict[str, Any], int]:
    """
    리소스 없음 응답 생성 함수
    
    Args:
        resource_type: 리소스 유형 (예: "차량", "정비 기록")
        resource_id: 리소스 식별자
        message: 사용자 정의 메시지 (기본값: 자동 생성)
        
    Returns:
        리소스 없음 응답 사전과 HTTP 상태 코드의 튜플
    """
    if message is None:
        message = f"요청한 {resource_type}(ID: {resource_id})을(를) 찾을 수 없습니다."
    
    error_detail = {
        "code": ErrorCode.RESOURCE_NOT_FOUND,
        "message": message,
        "detail": f"Resource type: {resource_type}, ID: {resource_id}"
    }
    
    response = {
        "status": ResponseStatus.ERROR,
        "message": message,
        "data": None,
        "meta": {
            "timestamp": datetime.now().isoformat(),
            "code": ErrorCode.RESOURCE_NOT_FOUND
        },
        "errors": [error_detail]
    }
    return response, 404

def create_server_error_response(
    message: str = "서버 내부 오류가 발생했습니다.",
    detail: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None
) -> Tuple[Dict[str, Any], int]:
    """
    서버 오류 응답 생성 함수
    
    Args:
        message: 응답 메시지
        detail: 에러 세부 정보
        meta: 메타데이터 사전
        
    Returns:
        서버 오류 응답 사전과 HTTP 상태 코드의 튜플
    """
    error_detail = {
        "code": ErrorCode.INTERNAL_SERVER_ERROR,
        "message": message,
        "detail": detail
    }
    
    response = {
        "status": ResponseStatus.ERROR,
        "message": message,
        "data": None,
        "meta": {
            "timestamp": datetime.now().isoformat(),
            "code": ErrorCode.INTERNAL_SERVER_ERROR,
            **(meta or {})
        },
        "errors": [error_detail]
    }
    return response, 500

def create_unauthorized_response(
    message: str = "인증이 필요합니다.",
    detail: Optional[str] = None
) -> Tuple[Dict[str, Any], int]:
    """
    인증 필요 응답 생성 함수
    
    Args:
        message: 응답 메시지
        detail: 에러 세부 정보
        
    Returns:
        인증 필요 응답 사전과 HTTP 상태 코드의 튜플
    """
    error_detail = {
        "code": ErrorCode.UNAUTHORIZED,
        "message": message,
        "detail": detail
    }
    
    response = {
        "status": ResponseStatus.ERROR,
        "message": message,
        "data": None,
        "meta": {
            "timestamp": datetime.now().isoformat(),
            "code": ErrorCode.UNAUTHORIZED
        },
        "errors": [error_detail]
    }
    return response, 401

def create_forbidden_response(
    message: str = "요청한 작업을 수행할 권한이 없습니다.",
    detail: Optional[str] = None
) -> Tuple[Dict[str, Any], int]:
    """
    권한 없음 응답 생성 함수
    
    Args:
        message: 응답 메시지
        detail: 에러 세부 정보
        
    Returns:
        권한 없음 응답 사전과 HTTP 상태 코드의 튜플
    """
    error_detail = {
        "code": ErrorCode.PERMISSION_DENIED,
        "message": message,
        "detail": detail
    }
    
    response = {
        "status": ResponseStatus.ERROR,
        "message": message,
        "data": None,
        "meta": {
            "timestamp": datetime.now().isoformat(),
            "code": ErrorCode.PERMISSION_DENIED
        },
        "errors": [error_detail]
    }
    return response, 403

def create_conflict_response(
    message: str = "리소스 충돌이 발생했습니다.",
    detail: Optional[str] = None
) -> Tuple[Dict[str, Any], int]:
    """
    리소스 충돌 응답 생성 함수
    
    Args:
        message: 응답 메시지
        detail: 에러 세부 정보
        
    Returns:
        리소스 충돌 응답 사전과 HTTP 상태 코드의 튜플
    """
    error_detail = {
        "code": ErrorCode.RESOURCE_CONFLICT,
        "message": message,
        "detail": detail
    }
    
    response = {
        "status": ResponseStatus.ERROR,
        "message": message,
        "data": None,
        "meta": {
            "timestamp": datetime.now().isoformat(),
            "code": ErrorCode.RESOURCE_CONFLICT
        },
        "errors": [error_detail]
    }
    return response, 409
