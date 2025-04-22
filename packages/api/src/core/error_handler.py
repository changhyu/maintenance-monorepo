"""
오류 처리 유틸리티

표준화된 예외 처리와 오류 응답을 제공하는 유틸리티 모듈입니다.
"""

import asyncio
import functools
import gettext
import inspect
import logging
import os
import traceback
from enum import Enum
from threading import Lock
from typing import Any, Callable, Dict, List, Optional, Tuple, TypeVar, Union, cast
from uuid import uuid4

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from jose.exceptions import JWTError
from packagesmodels.schemas import ApiResponse
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from packages.api.src.coreconfig import settings
from packages.api.src.corelogging import logger

t = gettext.translation("messages", localedir="locales", fallback=True)
_ = t.gettext

ERROR_USER_NOT_FOUND = _("User not found.")
ERROR_INVALID_REQUEST = _("Invalid request data.")

T = TypeVar("T")

# 에러 메시지 상수화 (국제화 준비)
ERROR_MESSAGES = {
    "ko": {  # 한국어 메시지
        "general_error": "{operation} 중 오류가 발생했습니다",
        "validation_error": "{operation} 중 데이터 유효성 검증 오류가 발생했습니다",
        "permission_error": "{operation}에 대한 권한이 없습니다",
        "missing_data": "{operation} 중 필수 데이터가 누락되었습니다",
        "timeout_error": "{operation} 중 시간 초과가 발생했습니다",
        "not_found": "요청한 리소스를 찾을 수 없습니다",
        "UNKNOWN_ERROR": "알 수 없는 오류가 발생했습니다.",
        "INVALID_INPUT": "잘못된 입력이 제공되었습니다.",
    },
    "en": {  # 영어 메시지
        "general_error": "An error occurred during {operation}",
        "validation_error": "Data validation error during {operation}",
        "permission_error": "Permission denied for {operation}",
        "missing_data": "Required data missing during {operation}",
        "timeout_error": "Timeout occurred during {operation}",
        "not_found": "The requested resource was not found",
        "UNKNOWN_ERROR": "An unknown error occurred.",
        "INVALID_INPUT": "Invalid input provided.",
    },
}

# 스레드 안전한 에러 ID 생성을 위한 락
_error_id_lock = Lock()


class ErrorCode(str, Enum):
    """표준 오류 코드 정의"""

    # 일반 오류
    INTERNAL_ERROR = "INTERNAL_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_VALUE = "INVALID_VALUE"
    NOT_FOUND = "NOT_FOUND"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    UNAUTHORIZED = "UNAUTHORIZED"
    MISSING_KEY = "MISSING_KEY"
    TIMEOUT = "TIMEOUT"
    CONFLICT = "CONFLICT"

    # HTTP 관련 오류
    BAD_REQUEST = "BAD_REQUEST"
    FORBIDDEN = "FORBIDDEN"
    NOT_IMPLEMENTED = "NOT_IMPLEMENTED"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"

    # 비즈니스 로직 오류
    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION"
    DATA_INTEGRITY = "DATA_INTEGRITY"
    RESOURCE_LOCKED = "RESOURCE_LOCKED"


class APIError(Exception):
    def __init__(
        self,
        status_code: int,
        message: str,
        error_code: str = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.status_code = status_code
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(message)


class DatabaseError(APIError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=message,
            error_code="DATABASE_ERROR",
            details=details,
        )


class AuthenticationError(APIError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message=message,
            error_code="AUTHENTICATION_ERROR",
            details=details,
        )


class AuthorizationError(APIError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            message=message,
            error_code="AUTHORIZATION_ERROR",
            details=details,
        )


class ValidationErrorHandler:
    @staticmethod
    def handle_validation_error(error: RequestValidationError) -> Dict[str, Any]:
        errors = []
        for error in error.errors():
            error_info = {
                "field": " -> ".join([str(x) for x in error["loc"]]),
                "message": error["msg"],
                "type": error["type"],
            }
            errors.append(error_info)

        return {
            "message": "입력값 검증 실패",
            "error_code": "VALIDATION_ERROR",
            "details": {"errors": errors},
        }


class ErrorContext:
    """오류 컨텍스트 정보를 저장하는 클래스"""

    def __init__(
        self, exception: Exception, operation: str, error_code: Optional[str] = None
    ):
        self.exception = exception
        self.operation = operation
        self.error_code = error_code

        # 스레드 안전한 방식으로 오류 ID 생성
        with _error_id_lock:
            self.error_id = str(uuid4())

        self.stack_trace = traceback.format_exc()
        self.caller_info = self._get_caller_info()

    def _get_caller_info(self) -> Dict[str, Any]:
        """호출자 정보 수집"""
        frames = inspect.trace()
        caller_frames = [
            frame
            for frame in frames
            if frame.filename.endswith(".py")
            and not frame.filename.endswith(("error_handler.py", "exceptions.py"))
        ]

        if not caller_frames:
            return {}

        frame = caller_frames[0]
        return {
            "file": frame.filename,
            "function": frame.function,
            "line": frame.lineno,
            "code": frame.code_context[0].strip() if frame.code_context else None,
        }

    def to_log_context(self) -> Dict[str, Any]:
        """로깅용 컨텍스트 생성"""
        return {
            "error_id": self.error_id,
            "error_type": type(self.exception).__name__,
            "error_message": str(self.exception),
            "operation": self.operation,
            "error_code": self.error_code,
            "caller": self.caller_info,
        }

    def to_error_detail(self, include_trace: bool = False) -> Dict[str, Any]:
        """오류 응답용 상세 정보 생성"""
        detail = {"error_id": self.error_id, "message": str(self.exception)}

        # 프로덕션 환경이 아닐 때만 스택 트레이스 포함
        is_dev = settings.ENVIRONMENT.lower() in ["development", "dev", "local"]
        if include_trace and self.stack_trace and (is_dev or settings.DEBUG):
            detail["trace"] = self.stack_trace.split("\n")

        return detail


def get_error_message(error_code: str, lang: Optional[str] = None, **kwargs) -> str:
    """
    주어진 에러 코드를 기반으로 언어에 맞는 에러 메시지를 반환합니다.

    매개변수:
      error_code (str): 에러 코드
      lang (str, 선택): 언어 코드 ('ko' 또는 'en'). None이면 기본 언어 사용.
      kwargs: 문자열 포맷에 사용될 추가 인자 (예: operation='{operation}')

    반환:
      str: 포맷된 에러 메시지. 해당 에러 코드가 없거나 포맷 실패 시 기본 메시지 반환.
    """
    language = lang or settings.DEFAULT_LANGUAGE or "ko"
    if language not in ERROR_MESSAGES:
        language = "ko"
    template = ERROR_MESSAGES[language].get(
        error_code, ERROR_MESSAGES["ko"]["UNKNOWN_ERROR"]
    )
    try:
        return template.format(**kwargs)
    except KeyError:
        return template


def log_error(error_code: str, lang: Optional[str] = None, **kwargs):
    """
    주어진 에러 코드를 이용해 에러 메시지를 로깅합니다.

    매개변수:
      error_code (str): 에러 코드
      lang (str, 선택): 언어 코드 ('ko' 또는 'en'). None이면 기본 언어 사용.
      kwargs: 문자열 포맷에 사용될 추가 인자
    """
    message = get_error_message(error_code, lang, **kwargs)
    logger.error(f"Error {error_code}: {message}")


def _get_error_response_params(
    exception: Exception,
    operation: str,
    language: Optional[str],
    error_code_str: Optional[str],
):
    if isinstance(exception, HTTPException):
        return (
            get_error_message("general_error", language, operation=operation),
            exception.detail,
            exception.status_code,
            error_code_str or f"HTTP_{exception.status_code}",
        )
    elif isinstance(exception, ValidationError):
        return (
            get_error_message("validation_error", language, operation=operation),
            _format_validation_errors(exception),
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code_str or ErrorCode.VALIDATION_ERROR,
        )
    elif isinstance(exception, ValueError):
        return (
            get_error_message("validation_error", language, operation=operation),
            str(exception),
            status.HTTP_400_BAD_REQUEST,
            error_code_str or ErrorCode.INVALID_VALUE,
        )
    elif isinstance(exception, PermissionError):
        return (
            get_error_message("permission_error", language, operation=operation),
            str(exception),
            status.HTTP_403_FORBIDDEN,
            error_code_str or ErrorCode.PERMISSION_DENIED,
        )
    elif isinstance(exception, KeyError):
        return (
            get_error_message("missing_data", language, operation=operation),
            str(exception),
            status.HTTP_400_BAD_REQUEST,
            error_code_str or ErrorCode.MISSING_KEY,
        )
    elif isinstance(exception, TimeoutError):
        return (
            get_error_message("timeout_error", language, operation=operation),
            str(exception),
            status.HTTP_408_REQUEST_TIMEOUT,
            error_code_str or ErrorCode.TIMEOUT,
        )
    else:
        return (
            get_error_message("general_error", language, operation=operation),
            str(exception),
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code_str or ErrorCode.INTERNAL_ERROR,
        )


async def handle_exception(
    exception: Exception,
    operation: str = "API 작업",
    error_code: Optional[Union[str, ErrorCode]] = None,
    include_trace: bool = False,
    request: Optional[Request] = None,
    language: Optional[str] = None,
) -> ApiResponse[None]:
    """
    API 예외를 표준화된 방식으로 처리합니다.

    Args:
        exception: 발생한 예외
        operation: 예외가 발생한 작업 설명
        error_code: 사용자 정의 오류 코드
        include_trace: 응답에 스택 트레이스 포함 여부
        request: FastAPI 요청 객체 (있는 경우)
        language: 응답 메시지 언어 (None이면 기본 언어 사용)

    Returns:
        표준화된 오류 응답
    """
    if isinstance(error_code, ErrorCode):
        error_code_str = error_code.value
    else:
        error_code_str = error_code

    error_ctx = ErrorContext(exception, operation, error_code_str)

    request_info = {}
    if request:
        try:
            headers = dict(request.headers)
            if "authorization" in headers:
                headers["authorization"] = "[REDACTED]"
            if "cookie" in headers:
                headers["cookie"] = "[REDACTED]"
            request_info = {
                "url": str(request.url),
                "method": request.method,
                "client": request.client.host if request.client else None,
                "headers": headers,
            }
        except Exception as req_exc:
            logger.warning(f"요청 정보 수집 중 오류: {str(req_exc)}")

    message, detail, status_code, error_code_final = _get_error_response_params(
        exception, operation, language, error_code_str
    )

    logger.error(
        f"{operation} 중 오류 발생", exc_info=True, extra=error_ctx.to_log_context()
    )

    return await error_response(
        message=message,
        detail=detail,
        status_code=status_code,
        error_code=error_code_final,
        error_context=error_ctx,
        include_trace=include_trace,
        request_info=request_info,
    )


def _format_validation_errors(exc: ValidationError) -> List[Dict[str, Any]]:
    """ValidationError의 오류 정보를 사용자 친화적으로 포맷팅"""
    errors = []
    for error in exc.errors():
        field_path = ".".join(str(loc) for loc in error.get("loc", []))
        error_dict = {
            "field": field_path,
            "message": error.get("msg", ""),
            "type": error.get("type", ""),
            "line_errors": [],  # 빈 line_errors 리스트 추가
        }
        if "ctx" in error and "line_errors" in error["ctx"]:
            error_dict["line_errors"] = error["ctx"]["line_errors"]
        errors.append(error_dict)
    return errors


async def error_response(
    message: str,
    detail: Any = None,
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    error_code: Optional[Union[str, ErrorCode]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    error_context: Optional[ErrorContext] = None,
    include_trace: bool = False,
    request_info: Optional[Dict[str, Any]] = None,
) -> ApiResponse[None]:
    """
    표준화된 오류 응답을 생성합니다.

    Args:
        message: 사용자 친화적인 오류 메시지
        detail: 오류 세부 정보 (디버깅용)
        status_code: HTTP 상태 코드
        error_code: 오류 코드 (Enum 또는 문자열)
        metadata: 추가 메타데이터
        error_context: 오류 컨텍스트 객체
        include_trace: 스택 트레이스 포함 여부
        request_info: 요청 관련 정보

    Returns:
        표준화된 오류 응답
    """
    # 기본 오류 메타데이터 구성
    error_meta = metadata or {}

    # 오류 코드 처리 (Enum인 경우 값 추출)
    if isinstance(error_code, ErrorCode):
        error_code = error_code.value

    # 기본 오류 데이터
    error_data = {"message": message, "code": error_code or f"ERR_{status_code}"}

    # 상세 정보 추가
    if detail:
        error_data["detail"] = detail

    # 오류 ID 및 컨텍스트 추가 (있는 경우)
    if error_context:
        # 환경에 따라 스택 트레이스 포함 여부 결정
        is_dev = settings.ENVIRONMENT.lower() in ["development", "dev", "local"]
        should_include_trace = include_trace and (is_dev or settings.DEBUG)
        error_data.update(error_context.to_error_detail(should_include_trace))

    # 요청 정보 추가 (개발 환경에서만)
    if request_info and (
        settings.DEBUG or settings.ENVIRONMENT.lower() == "development"
    ):
        error_data["request"] = request_info

    # 최종 메타데이터에 오류 정보 추가
    error_meta["error"] = error_data

    # ApiResponse 클래스 활용
    return ApiResponse[None](
        success=False,
        data=None,
        error=message,
        metadata=error_meta,
    )


def validate_or_error(
    condition: bool,
    message: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    error_code: Optional[Union[str, ErrorCode]] = None,
) -> None:
    """
    조건을 검증하고 실패할 경우 HTTPException을 발생시킵니다.

    Args:
        condition: 검증할 조건
        message: 오류 메시지
        status_code: HTTP 상태 코드
        error_code: 오류 코드 (Enum 또는 문자열)

    Raises:
        HTTPException: 조건이 False일 경우
    """
    if not condition:
        # 오류 코드 처리 (Enum인 경우 값 추출)
        if isinstance(error_code, ErrorCode):
            error_code = error_code.value

        detail = {"message": message}
        if error_code:
            detail["code"] = error_code

        raise HTTPException(status_code=status_code, detail=detail)


def assert_found(
    item: Optional[T],
    message: Optional[str] = None,
    error_code: Union[str, ErrorCode] = ErrorCode.NOT_FOUND,
    language: Optional[str] = None,
) -> T:
    """
    객체가 None이 아닌지 확인하고, None인 경우 404 예외를 발생시킵니다.

    Args:
        item: 검증할 객체
        message: 오류 메시지
        error_code: 오류 코드 (Enum 또는 문자열)
        language: 메시지 언어

    Returns:
        검증된 객체 (None이 아닌 경우)

    Raises:
        HTTPException: 객체가 None인 경우
    """
    if item is None:
        # 기본 메시지 설정
        if message is None:
            message = get_error_message("not_found", language)

        # 오류 코드 처리 (Enum인 경우 값 추출)
        if isinstance(error_code, ErrorCode):
            error_code = error_code.value

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": message, "code": error_code},
        )

    return item


def _find_request_object(args: Tuple) -> Optional[Request]:
    """인자 목록에서 Request 객체 찾기"""
    for arg in args:
        if isinstance(arg, Request):
            return arg
    return None


def _create_error_handler(
    exc: Exception,
    operation: str,
    include_trace: bool,
    request: Optional[Request],
    language: Optional[str],
) -> Callable:
    """오류 처리 함수 생성"""

    async def handle():
        return await handle_exception(
            exc,
            operation=operation,
            include_trace=include_trace,
            request=request,
            language=language,
        )

    return handle


def with_error_handling(operation: str, include_trace: bool = False):
    """
    함수를 오류 처리 데코레이터로 감싸는 팩토리 함수

    Args:
        operation: 수행 중인 작업 설명
        include_trace: 스택 트레이스 포함 여부

    Returns:
        오류 처리가 적용된 데코레이터
    """

    def decorator(func: Callable):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as exc:
                request = _find_request_object(args)
                language = kwargs.get("language")
                handler = _create_error_handler(
                    exc, operation, include_trace, request, language
                )
                return await handler()

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as exc:
                request = _find_request_object(args)
                language = kwargs.get("language")
                handler = _create_error_handler(
                    exc, operation, include_trace, request, language
                )
                loop = asyncio.get_event_loop()
                return loop.run_until_complete(handler())

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    return decorator


def handle_error(exc: Exception) -> ApiResponse:
    """일관된 에러 응답 반환을 위한 핸들러 함수입니다.
    Exception 발생 시 로깅 후 API 응답 객체를 반환합니다."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return ApiResponse(success=False, error_message=str(exc))


def error_catcher(func):
    """함수 실행 시 발생하는 예외를 자동으로 처리하는 데코레이터입니다.
    Exception 발생 시 handle_error를 호출하여 일관된 API 응답을 반환합니다."""

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as exc:
            return handle_error(exc)

    return wrapper


async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    error_response = {
        "message": exc.message,
        "error_code": exc.error_code,
        "details": exc.details,
        "path": request.url.path,
    }

    logger.error(
        f"API 에러 발생: {exc.message}",
        extra={
            "error_code": exc.error_code,
            "status_code": exc.status_code,
            "path": request.url.path,
            "details": exc.details,
        },
    )

    return JSONResponse(status_code=exc.status_code, content=error_response)


async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    error_response = ValidationErrorHandler.handle_validation_error(exc)
    error_response["path"] = request.url.path

    logger.warning(
        "유효성 검증 실패",
        extra={
            "error_code": error_response["error_code"],
            "path": request.url.path,
            "details": error_response["details"],
        },
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=error_response
    )


async def database_error_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    error_response = {
        "message": "데이터베이스 오류가 발생했습니다",
        "error_code": "DATABASE_ERROR",
        "path": request.url.path,
    }

    logger.error(
        f"데이터베이스 에러: {str(exc)}",
        extra={
            "error_code": "DATABASE_ERROR",
            "path": request.url.path,
            "details": str(exc),
        },
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=error_response
    )


async def jwt_error_handler(request: Request, exc: JWTError) -> JSONResponse:
    error_response = {
        "message": "인증 토큰이 유효하지 않습니다",
        "error_code": "INVALID_TOKEN",
        "path": request.url.path,
    }

    logger.warning(
        f"JWT 토큰 에러: {str(exc)}",
        extra={"error_code": "INVALID_TOKEN", "path": request.url.path},
    )

    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED, content=error_response
    )


async def http_error_handler(request: Request, exc: HTTPException) -> JSONResponse:
    error_response = {
        "message": exc.detail,
        "error_code": "HTTP_ERROR",
        "path": request.url.path,
    }

    logger.warning(
        f"HTTP 에러: {exc.detail}",
        extra={"status_code": exc.status_code, "path": request.url.path},
    )

    return JSONResponse(status_code=exc.status_code, content=error_response)
