"""
전역 예외 처리 모듈.
애플리케이션에서 사용할 공통 예외 클래스와 처리기를 정의합니다.
"""
from typing import Any, Dict, Optional, Union, List
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from datetime import datetime
import logging
import traceback
import sys
import uuid

logger = logging.getLogger(__name__)

# 공통 오류 메시지 상수 정의
MSG_RESOURCE_NOT_FOUND = "요청한 리소스를 찾을 수 없습니다."
MSG_SERVER_ERROR = "서버 내부 오류가 발생했습니다."
MSG_UNAUTHORIZED = "인증이 필요합니다."
MSG_FORBIDDEN = "이 작업을 수행할 권한이 없습니다."
MSG_VALIDATION_ERROR = "요청 데이터가 유효하지 않습니다."
MSG_BAD_REQUEST = "잘못된 요청입니다."
MSG_CONFLICT = "리소스 충돌이 발생했습니다."
MSG_DATABASE_ERROR = "데이터베이스 작업 중 오류가 발생했습니다."
MSG_EXTERNAL_SERVICE_ERROR = "외부 서비스와 통신하는 중 오류가 발생했습니다."
MSG_API_ERROR = "API 오류가 발생했습니다."

# 에러 코드 체계 정의
class ErrorCodes:
    """API 에러 코드 정의"""
    # 일반 오류 (1000-1999)
    GENERAL_ERROR = "ERR1000"
    UNEXPECTED_ERROR = "ERR1001"
    
    # 인증 관련 오류 (2000-2999)
    AUTHENTICATION_FAILED = "ERR2000"
    INVALID_TOKEN = "ERR2001"
    TOKEN_EXPIRED = "ERR2002"
    PERMISSION_DENIED = "ERR2003"
    
    # 데이터 검증 오류 (3000-3999)
    VALIDATION_ERROR = "ERR3000"
    INVALID_FORMAT = "ERR3001"
    MISSING_REQUIRED_FIELD = "ERR3002"
    
    # 리소스 관련 오류 (4000-4999)
    RESOURCE_NOT_FOUND = "ERR4000"
    RESOURCE_ALREADY_EXISTS = "ERR4001"
    RESOURCE_ACCESS_DENIED = "ERR4002"
    
    # 데이터베이스 오류 (5000-5999)
    DATABASE_ERROR = "ERR5000"
    CONNECTION_ERROR = "ERR5001"
    QUERY_ERROR = "ERR5002"
    
    # 외부 서비스 오류 (6000-6999)
    EXTERNAL_SERVICE_ERROR = "ERR6000"
    TIMEOUT_ERROR = "ERR6001"

"""
응용 프로그램 전반에서 사용되는 사용자 정의 예외 클래스들
"""

class ApiBaseException(Exception):
    """API 기본 예외 클래스"""
    def __init__(self, message: str = MSG_API_ERROR):
        self.message = message
        super().__init__(self.message)
        
class ResourceNotFoundException(ApiBaseException):
    """리소스를 찾을 수 없을 때 발생하는 예외"""
    def __init__(self, message: str = MSG_RESOURCE_NOT_FOUND):
        super().__init__(message)
        
class DatabaseOperationException(ApiBaseException):
    """데이터베이스 작업 중 오류가 발생했을 때의 예외"""
    def __init__(self, message: str = MSG_DATABASE_ERROR):
        super().__init__(message)
        
class InvalidParameterException(ApiBaseException):
    """잘못된 매개변수가 제공되었을 때 발생하는 예외"""
    def __init__(self, message: str = MSG_BAD_REQUEST):
        super().__init__(message)
        
class AuthenticationException(ApiBaseException):
    """인증 관련 오류가 발생했을 때의 예외"""
    def __init__(self, message: str = MSG_UNAUTHORIZED):
        super().__init__(message)
        
class AuthorizationException(ApiBaseException):
    """권한 관련 오류가 발생했을 때의 예외"""
    def __init__(self, message: str = MSG_FORBIDDEN):
        super().__init__(message)
        
class ConfigurationException(ApiBaseException):
    """설정 관련 오류가 발생했을 때의 예외"""
    def __init__(self, message: str = "시스템 설정 오류가 발생했습니다."):
        super().__init__(message)
        
class ExternalServiceException(ApiBaseException):
    """외부 서비스와의 통신 중 오류가 발생했을 때의 예외"""
    def __init__(self, message: str = MSG_EXTERNAL_SERVICE_ERROR):
        super().__init__(message)
        
class GitOperationException(ApiBaseException):
    """Git 작업 중 오류가 발생했을 때의 예외"""
    def __init__(self, message: str = "Git 작업 중 오류가 발생했습니다."):
        super().__init__(message)

class BaseAPIException(Exception):
    """API 기본 예외 클래스"""
    
    def __init__(
        self, 
        status_code: int = 500, 
        message: str = MSG_SERVER_ERROR,
        error_code: str = ErrorCodes.GENERAL_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        self.status_code = status_code
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.error_id = str(uuid.uuid4())
        super().__init__(self.message)

class NotFoundException(BaseAPIException):
    """리소스를 찾을 수 없을 때 발생하는 예외"""
    
    def __init__(
        self, 
        message: str = MSG_RESOURCE_NOT_FOUND, 
        error_code: str = ErrorCodes.RESOURCE_NOT_FOUND,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=404, message=message, error_code=error_code, details=details)

class ValidationException(BaseAPIException):
    """유효성 검사 실패 시 발생하는 예외"""
    
    def __init__(
        self, 
        message: str = MSG_VALIDATION_ERROR, 
        error_code: str = ErrorCodes.VALIDATION_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=422, message=message, error_code=error_code, details=details)

class AuthorizationException(BaseAPIException):
    """인증/권한 부여 실패 시 발생하는 예외"""
    
    def __init__(
        self, 
        message: str = MSG_FORBIDDEN, 
        error_code: str = ErrorCodes.PERMISSION_DENIED,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=403, message=message, error_code=error_code, details=details)

class AuthenticationException(BaseAPIException):
    """인증 실패 시 발생하는 예외"""
    
    def __init__(
        self, 
        message: str = MSG_UNAUTHORIZED, 
        error_code: str = ErrorCodes.AUTHENTICATION_FAILED,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=401, message=message, error_code=error_code, details=details)

class DatabaseException(BaseAPIException):
    """데이터베이스 관련 예외"""
    
    def __init__(
        self, 
        message: str = MSG_DATABASE_ERROR, 
        error_code: str = ErrorCodes.DATABASE_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=500, message=message, error_code=error_code, details=details)

class ExternalServiceException(BaseAPIException):
    """외부 서비스 호출 관련 예외"""
    
    def __init__(
        self, 
        message: str = MSG_EXTERNAL_SERVICE_ERROR, 
        error_code: str = ErrorCodes.EXTERNAL_SERVICE_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=502, message=message, error_code=error_code, details=details)

def log_exception(request: Request, exc: Exception, error_id: str = None) -> None:
    """예외 정보를 로깅"""
    error_id = error_id or str(uuid.uuid4())
    
    # 요청 정보 추출
    path = request.url.path
    method = request.method
    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    # 예외 정보 구성
    exc_type = type(exc).__name__
    exc_msg = str(exc)
    exc_traceback = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    
    # 로그 메시지 구성
    log_data = {
        "error_id": error_id,
        "path": path,
        "method": method,
        "client_host": client_host,
        "user_agent": user_agent,
        "exception_type": exc_type,
        "exception_message": exc_msg,
        "traceback": exc_traceback
    }
    
    # 예외 타입에 따라 로그 레벨 조정
    if isinstance(exc, (NotFoundException, ValidationException)):
        logger.warning(f"오류 발생 [ID: {error_id}]: {exc_msg}", extra=log_data)
    else:
        logger.error(f"오류 발생 [ID: {error_id}]: {exc_msg}", extra=log_data)
        
    # 중요 오류는 스택 트레이스 포함
    if not isinstance(exc, (NotFoundException, ValidationException, AuthorizationException, AuthenticationException)):
        logger.error(f"스택 트레이스 [ID: {error_id}]:\n{exc_traceback}")

async def api_exception_handler(request: Request, exc: BaseAPIException) -> JSONResponse:
    """API 예외 핸들러"""
    # 예외 로깅
    log_exception(request, exc, exc.error_id)
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": exc.status_code,
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "error_id": exc.error_id,
            "timestamp": datetime.now().isoformat()
        }
    )

async def validation_error_handler(request: Request, exc: Union[RequestValidationError, ValidationError]) -> JSONResponse:
    """요청 데이터 검증 오류 핸들러"""
    # 오류 ID 생성
    error_id = str(uuid.uuid4())
    
    # 예외 로깅
    log_exception(request, exc, error_id)
    
    # 오류 정보 추출
    errors = [{
        "loc": ".".join([str(loc) for loc in error.get("loc", [])]),
        "msg": error.get("msg", ""),
        "type": error.get("type", "")
    } for error in exc.errors()]
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "error",
            "code": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "error_code": ErrorCodes.VALIDATION_ERROR,
            "message": "요청 데이터 검증에 실패했습니다.",
            "details": {"errors": errors},
            "error_id": error_id,
            "timestamp": datetime.now().isoformat()
        }
    )

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """FastAPI HTTP 예외 핸들러"""
    # 오류 ID 생성
    error_id = str(uuid.uuid4())
    
    # 예외 로깅
    log_exception(request, exc, error_id)
    
    # 상태 코드에 따라 적절한 에러 코드 매핑
    error_code = ErrorCodes.GENERAL_ERROR
    if exc.status_code == 401:
        error_code = ErrorCodes.AUTHENTICATION_FAILED
    elif exc.status_code == 403:
        error_code = ErrorCodes.PERMISSION_DENIED
    elif exc.status_code == 404:
        error_code = ErrorCodes.RESOURCE_NOT_FOUND
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": exc.status_code,
            "error_code": error_code,
            "message": exc.detail,
            "error_id": error_id,
            "timestamp": datetime.now().isoformat()
        }
    )

async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """일반 예외 핸들러"""
    # 오류 ID 생성
    error_id = str(uuid.uuid4())
    
    # 예외 로깅
    log_exception(request, exc, error_id)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "error_code": ErrorCodes.UNEXPECTED_ERROR,
            "message": MSG_SERVER_ERROR,
            "details": {"error_type": str(type(exc).__name__)},
            "error_id": error_id,
            "timestamp": datetime.now().isoformat()
        }
    )

def setup_exception_handlers(app: FastAPI) -> None:
    """애플리케이션에 예외 핸들러를 설정합니다."""
    # API 공통 오류 핸들러
    app.exception_handler(BaseAPIException)(api_exception_handler)
    
    # 검증 오류 핸들러
    app.exception_handler(RequestValidationError)(validation_error_handler)
    app.exception_handler(ValidationError)(validation_error_handler)
    
    # HTTP 예외 핸들러
    app.exception_handler(HTTPException)(http_exception_handler)
    
    # 처리되지 않은 예외 핸들러
    app.exception_handler(Exception)(general_exception_handler)
    
    # 설정 완료 로깅
    logger.info("예외 처리 핸들러 설정 완료")

class ApiException(HTTPException):
    """
    기본 API 예외 클래스. 모든 API 예외는 이 클래스를 상속받습니다.
    """
    def __init__(
        self, 
        status_code: int, 
        detail: Any = None, 
        headers: Optional[Dict[str, str]] = None,
        error_code: str = "API_ERROR"
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code

class ValidationException(ApiException):
    """
    유효성 검증 실패 예외
    """
    def __init__(
        self, 
        detail: Any = MSG_VALIDATION_ERROR, 
        headers: Optional[Dict[str, str]] = None,
        error_code: str = "VALIDATION_ERROR"
    ):
        super().__init__(status_code=422, detail=detail, headers=headers, error_code=error_code)

class NotFoundException(ApiException):
    """
    리소스를 찾을 수 없을 때 발생하는 예외
    """
    def __init__(
        self, 
        detail: Any = MSG_RESOURCE_NOT_FOUND, 
        headers: Optional[Dict[str, str]] = None,
        error_code: str = "NOT_FOUND"
    ):
        super().__init__(status_code=404, detail=detail, headers=headers, error_code=error_code)

class UnauthorizedException(ApiException):
    """
    인증 실패 예외
    """
    def __init__(
        self, 
        detail: Any = MSG_UNAUTHORIZED, 
        headers: Optional[Dict[str, str]] = None,
        error_code: str = "UNAUTHORIZED"
    ):
        super().__init__(status_code=401, detail=detail, headers=headers, error_code=error_code)

class ForbiddenException(ApiException):
    """
    권한 부족 예외
    """
    def __init__(
        self, 
        detail: Any = MSG_FORBIDDEN, 
        headers: Optional[Dict[str, str]] = None,
        error_code: str = "FORBIDDEN"
    ):
        super().__init__(status_code=403, detail=detail, headers=headers, error_code=error_code)

class ConflictException(ApiException):
    """
    리소스 충돌 예외
    """
    def __init__(
        self, 
        detail: Any = MSG_CONFLICT, 
        headers: Optional[Dict[str, str]] = None,
        error_code: str = "CONFLICT"
    ):
        super().__init__(status_code=409, detail=detail, headers=headers, error_code=error_code)

class BadRequestException(ApiException):
    """
    잘못된 요청 예외
    """
    def __init__(
        self, 
        detail: Any = MSG_BAD_REQUEST, 
        headers: Optional[Dict[str, str]] = None,
        error_code: str = "BAD_REQUEST"
    ):
        super().__init__(status_code=400, detail=detail, headers=headers, error_code=error_code)

class ServerException(ApiException):
    """
    서버 오류 예외
    """
    def __init__(
        self, 
        detail: Any = MSG_SERVER_ERROR, 
        headers: Optional[Dict[str, str]] = None,
        error_code: str = "SERVER_ERROR"
    ):
        super().__init__(status_code=500, detail=detail, headers=headers, error_code=error_code)

