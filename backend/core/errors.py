"""
표준화된 API 에러 및 예외 모듈

이 모듈은 애플리케이션 전체에서 사용하는 표준화된 에러 코드와 예외 클래스를 정의합니다.
모든 API 엔드포인트는 이 모듈의 예외 클래스를 사용하여 일관된 에러 응답을 제공해야 합니다.
"""

from typing import Dict, Any, Optional, List, Type
from fastapi import HTTPException, status
from pydantic import BaseModel, Field
from enum import Enum
from backend.core.config import settings


class ErrorCode(str, Enum):
    """API 에러 코드 열거형"""
    # 인증 관련 에러
    AUTH_INVALID_CREDENTIALS = "AUTH-001"
    AUTH_EXPIRED_TOKEN = "AUTH-002"
    AUTH_REQUIRED = "AUTH-003"
    AUTH_INSUFFICIENT_PERMISSIONS = "AUTH-004"
    
    # 사용자 관련 에러
    USER_NOT_FOUND = "USER-001"
    USER_ALREADY_EXISTS = "USER-002"
    USER_INACTIVE = "USER-003"
    USER_INVALID_INPUT = "USER-004"
    
    # Git 관련 에러
    GIT_SERVICE_UNAVAILABLE = "GIT-001"
    GIT_REPO_NOT_FOUND = "GIT-002"
    GIT_OPERATION_FAILED = "GIT-003"
    GIT_BRANCH_NOT_FOUND = "GIT-004"
    GIT_FILE_NOT_FOUND = "GIT-005"
    GIT_CONFLICT = "GIT-006"
    GIT_AUTHENTICATION_ERROR = "GIT-007"
    GIT_NETWORK_ERROR = "GIT-008"
    GIT_INVALID_REPOSITORY = "GIT-009"
    
    # 데이터베이스 관련 에러
    DB_CONNECTION_ERROR = "DB-001"
    DB_QUERY_ERROR = "DB-002"
    DB_INTEGRITY_ERROR = "DB-003"
    DB_TRANSACTION_ERROR = "DB-004"
    
    # 시스템 관련 에러
    SYS_INTERNAL_ERROR = "SYS-001"
    SYS_CONFIGURATION_ERROR = "SYS-002"
    SYS_UNAVAILABLE = "SYS-003"
    SYS_TIMEOUT = "SYS-004"
    
    # 일반 에러
    GENERAL_ERROR = "ERR-001"
    INVALID_INPUT = "ERR-002"
    NOT_FOUND = "ERR-003"
    OPERATION_FAILED = "ERR-004"


class APIError(HTTPException):
    """
    표준화된 API 에러 예외 클래스
    
    FastAPI의 HTTPException을 확장하여 에러 코드와 세부 정보를 포함합니다.
    """
    
    def __init__(
        self,
        status_code: int,
        error_code: ErrorCode,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, Any]] = None
    ):
        """
        API 에러 생성자
        
        Args:
            status_code: HTTP 상태 코드
            error_code: 에러 코드 (ErrorCode 열거형)
            message: 에러 메시지
            details: 추가 에러 세부 정보 (선택 사항)
            headers: 응답 헤더 (선택 사항)
        """
        self.error_code = error_code
        self.details = details
        
        # 표준화된 에러 응답 형식
        error_detail = {
            "code": error_code,
            "message": message
        }
        
        if details:
            error_detail["details"] = details
            
        super().__init__(
            status_code=status_code,
            detail=error_detail,
            headers=headers
        )


# 편의성을 위한 일반적인 에러 예외 클래스
class NotFoundError(APIError):
    """리소스를 찾을 수 없는 경우의 에러"""
    
    def __init__(
        self,
        message: str = "요청한 리소스를 찾을 수 없습니다",
        error_code: ErrorCode = ErrorCode.NOT_FOUND,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code=error_code,
            message=message,
            details=details
        )


class ValidationError(APIError):
    """입력 검증 실패 시 에러"""
    
    def __init__(
        self,
        message: str = "입력 값이 유효하지 않습니다",
        error_code: ErrorCode = ErrorCode.INVALID_INPUT,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code=error_code,
            message=message,
            details=details
        )


class UnauthorizedError(APIError):
    """인증 실패 시 에러"""
    
    def __init__(
        self,
        message: str = "인증이 필요합니다",
        error_code: ErrorCode = ErrorCode.AUTH_REQUIRED,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=error_code,
            message=message,
            details=details,
            headers={"WWW-Authenticate": "Bearer"}
        )


class ForbiddenError(APIError):
    """권한 부족 시 에러"""
    
    def __init__(
        self,
        message: str = "이 작업을 수행할 권한이 없습니다",
        error_code: ErrorCode = ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code=error_code,
            message=message,
            details=details
        )


class ServiceUnavailableError(APIError):
    """서비스 사용 불가 시 에러"""
    
    def __init__(
        self,
        message: str = "서비스를 현재 사용할 수 없습니다",
        error_code: ErrorCode = ErrorCode.SYS_UNAVAILABLE,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code=error_code,
            message=message,
            details=details
        )


class DatabaseError(APIError):
    """데이터베이스 작업 실패 시 에러"""
    
    def __init__(
        self,
        message: str = "데이터베이스 작업 중 오류가 발생했습니다",
        error_code: ErrorCode = ErrorCode.DB_QUERY_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code=error_code,
            message=message,
            details=details
        )


class InternalServerError(APIError):
    """내부 서버 오류"""
    
    def __init__(
        self,
        message: str = "내부 서버 오류가 발생했습니다",
        error_code: ErrorCode = ErrorCode.SYS_INTERNAL_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code=error_code,
            message=message,
            details=details
        )


# Git 관련 에러 클래스
class GitServiceError(APIError):
    """Git 서비스 관련 에러의 기본 클래스"""
    
    def __init__(
        self,
        message: str = "Git 서비스 작업 중 오류가 발생했습니다",
        error_code: ErrorCode = ErrorCode.GIT_OPERATION_FAILED,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status_code,
            error_code=error_code,
            message=message,
            details=details
        )


class GitServiceUnavailableError(GitServiceError):
    """Git 서비스 사용 불가 시 에러"""
    
    def __init__(
        self,
        message: str = "Git 서비스를 현재 사용할 수 없습니다",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.GIT_SERVICE_UNAVAILABLE,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details
        )


class GitRepositoryNotFoundError(GitServiceError):
    """Git 저장소를 찾을 수 없는 경우의 에러"""
    
    def __init__(
        self,
        message: str = "Git 저장소를 찾을 수 없습니다",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.GIT_REPO_NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details
        )


class GitBranchNotFoundError(GitServiceError):
    """Git 브랜치를 찾을 수 없는 경우의 에러"""
    
    def __init__(
        self,
        message: str = "Git 브랜치를 찾을 수 없습니다",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.GIT_BRANCH_NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details
        )


class GitFileNotFoundError(GitServiceError):
    """Git 파일을 찾을 수 없는 경우의 에러"""
    
    def __init__(
        self,
        message: str = "Git 파일을 찾을 수 없습니다",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.GIT_FILE_NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details
        )


class GitConflictError(GitServiceError):
    """Git 충돌 발생 시 에러"""
    
    def __init__(
        self,
        message: str = "Git 작업 중 충돌이 발생했습니다",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.GIT_CONFLICT,
            status_code=status.HTTP_409_CONFLICT,
            details=details
        )


class GitAuthenticationError(GitServiceError):
    """Git 인증 실패 시 에러"""
    
    def __init__(
        self,
        message: str = "Git 원격 저장소 인증에 실패했습니다",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.GIT_AUTHENTICATION_ERROR,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details
        ) 