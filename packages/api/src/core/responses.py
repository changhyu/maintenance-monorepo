"""
표준화된 API 응답 형식 모듈

모든 API 응답을 일관된 형식으로 반환하기 위한 유틸리티 클래스 및 함수를 제공합니다.
"""
from typing import Any, Dict, Generic, List, Optional, TypeVar, Union
from fastapi import status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import time

# 제네릭 타입 변수
T = TypeVar('T')
E = TypeVar('E')

class PaginationInfo(BaseModel):
    """페이지네이션 정보"""
    page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next: bool
    has_prev: bool

class ErrorDetail(BaseModel):
    """오류 상세 정보"""
    code: str
    message: str
    field: Optional[str] = None
    params: Optional[Dict[str, Any]] = None

class Meta(BaseModel):
    """응답 메타데이터"""
    timestamp: int = Field(default_factory=lambda: int(time.time()))
    version: str = "1.0"
    server_id: Optional[str] = None

class ApiResponse(BaseModel, Generic[T]):
    """표준 API 응답 모델"""
    success: bool
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None
    meta: Meta = Field(default_factory=Meta)
    pagination: Optional[PaginationInfo] = None

class ApiListResponse(ApiResponse[List[T]], Generic[T]):
    """목록 응답을 위한 특수 API 응답 모델"""
    data: List[T] = []

# 응답 생성 함수들
def success_response(
    data: Any,
    status_code: int = status.HTTP_200_OK,
    pagination: Optional[PaginationInfo] = None,
    headers: Optional[Dict[str, str]] = None
) -> JSONResponse:
    """성공 응답을 반환합니다."""
    response = ApiResponse(
        success=True,
        data=data,
        pagination=pagination
    )
    return JSONResponse(
        content=response.model_dump(),
        status_code=status_code,
        headers=headers
    )

def error_response(
    message: str,
    code: str = "INTERNAL_ERROR",
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    field: Optional[str] = None,
    params: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None
) -> JSONResponse:
    """오류 응답을 반환합니다."""
    error_detail = ErrorDetail(
        code=code,
        message=message,
        field=field,
        params=params
    )
    response = ApiResponse(
        success=False,
        error=error_detail
    )
    return JSONResponse(
        content=response.model_dump(),
        status_code=status_code,
        headers=headers
    )

def validation_error_response(
    errors: List[Dict[str, Any]],
    status_code: int = status.HTTP_422_UNPROCESSABLE_ENTITY,
    headers: Optional[Dict[str, str]] = None
) -> JSONResponse:
    """검증 오류 응답을 반환합니다."""
    validation_errors = []
    for error in errors:
        field = ".".join(str(loc) for loc in error["loc"][1:]) if len(error["loc"]) > 1 else None
        validation_errors.append(
            ErrorDetail(
                code="VALIDATION_ERROR",
                message=error["msg"],
                field=field,
                params={"type": error.get("type")}
            )
        )
    
    response = ApiResponse(
        success=False,
        error=ErrorDetail(
            code="VALIDATION_ERROR",
            message="입력 데이터가 유효하지 않습니다.",
            params={"errors": [e.model_dump() for e in validation_errors]}
        )
    )
    return JSONResponse(
        content=response.model_dump(),
        status_code=status_code,
        headers=headers
    )

def pagination_info(
    page: int,
    page_size: int,
    total_items: int
) -> PaginationInfo:
    """페이지네이션 정보를 생성합니다."""
    total_pages = (total_items + page_size - 1) // page_size if page_size > 0 else 0
    return PaginationInfo(
        page=page,
        page_size=page_size,
        total_items=total_items,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    ) 