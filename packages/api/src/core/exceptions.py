"""
전역 예외 처리 모듈.
애플리케이션에서 사용할 공통 예외 클래스와 처리기를 정의합니다.
"""

from typing import Any, Dict, Optional, Union
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from .logging import app_logger


class APIError(Exception):
    """API 오류 기본 클래스."""
    
    def __init__(
        self,
        status_code: int,
        message: str,
        detail: Optional[Union[str, Dict[str, Any]]] = None,
        error_code: Optional[str] = None
    ):
        self.status_code = status_code
        self.message = message
        self.detail = detail
        self.error_code = error_code
        super().__init__(message)


class NotFoundError(APIError):
    """리소스를 찾을 수 없는 경우의 오류."""
    
    def __init__(
        self,
        message: str = "리소스를 찾을 수 없습니다",
        detail: Optional[Union[str, Dict[str, Any]]] = None,
        error_code: Optional[str] = None
    ):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=message,
            detail=detail,
            error_code=error_code or "RESOURCE_NOT_FOUND"
        )


class ValidationFailedError(APIError):
    """데이터 검증 실패 오류."""
    
    def __init__(
        self,
        message: str = "데이터 유효성 검증에 실패했습니다",
        detail: Optional[Union[str, Dict[str, Any]]] = None,
        error_code: Optional[str] = None
    ):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message=message,
            detail=detail,
            error_code=error_code or "VALIDATION_FAILED"
        )


class UnauthorizedError(APIError):
    """인증 실패 오류."""
    
    def __init__(
        self,
        message: str = "인증에 실패했습니다",
        detail: Optional[Union[str, Dict[str, Any]]] = None,
        error_code: Optional[str] = None
    ):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message=message,
            detail=detail,
            error_code=error_code or "UNAUTHORIZED"
        )


class ForbiddenError(APIError):
    """권한 없음 오류."""
    
    def __init__(
        self,
        message: str = "요청한 작업에 대한 권한이 없습니다",
        detail: Optional[Union[str, Dict[str, Any]]] = None,
        error_code: Optional[str] = None
    ):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            message=message,
            detail=detail,
            error_code=error_code or "FORBIDDEN"
        )


class InternalServerError(APIError):
    """내부 서버 오류."""
    
    def __init__(
        self,
        message: str = "내부 서버 오류가 발생했습니다",
        detail: Optional[Union[str, Dict[str, Any]]] = None,
        error_code: Optional[str] = None
    ):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=message,
            detail=detail,
            error_code=error_code or "INTERNAL_SERVER_ERROR"
        )


class BadRequestError(APIError):
    """잘못된 요청 오류."""
    
    def __init__(
        self,
        message: str = "잘못된 요청입니다",
        detail: Optional[Union[str, Dict[str, Any]]] = None,
        error_code: Optional[str] = None
    ):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message,
            detail=detail,
            error_code=error_code or "BAD_REQUEST"
        )


# 예외 핸들러 함수들
async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """API 오류 핸들러."""
    app_logger.error(
        f"API 오류: {exc.message} (코드: {exc.error_code}, 상태: {exc.status_code})",
        extra={"detail": exc.detail, "path": request.url.path}
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "error_code": exc.error_code,
            "detail": exc.detail,
            "path": request.url.path
        }
    )


async def validation_error_handler(request: Request, exc: Union[RequestValidationError, ValidationError]) -> JSONResponse:
    """Pydantic 및 FastAPI 검증 오류 핸들러."""
    # 오류 형식 변환
    errors = []
    for error in exc.errors():
        errors.append({
            "loc": error.get("loc", []),
            "msg": error.get("msg", ""),
            "type": error.get("type", "")
        })
    
    app_logger.warning(
        "데이터 유효성 검증 오류",
        extra={"errors": errors, "path": request.url.path}
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "데이터 유효성 검증에 실패했습니다",
            "error_code": "VALIDATION_ERROR",
            "detail": errors,
            "path": request.url.path
        }
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """처리되지 않은 예외 핸들러."""
    app_logger.exception(
        f"처리되지 않은 예외: {str(exc)}",
        extra={"path": request.url.path}
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "내부 서버 오류가 발생했습니다",
            "error_code": "INTERNAL_SERVER_ERROR",
            "detail": str(exc) if app_logger.level == 10 else None,  # DEBUG 레벨에서만 상세 정보 제공
            "path": request.url.path
        }
    )


def setup_exception_handlers(app: FastAPI) -> None:
    """애플리케이션에 예외 핸들러를 설정합니다."""
    # API 공통 오류 핸들러
    app.exception_handler(APIError)(api_error_handler)
    
    # 검증 오류 핸들러
    app.exception_handler(RequestValidationError)(validation_error_handler)
    app.exception_handler(ValidationError)(validation_error_handler)
    
    # 처리되지 않은 예외 핸들러
    app.exception_handler(Exception)(unhandled_exception_handler) 

\n