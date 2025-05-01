from fastapi import Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timezone

from .exceptions import (
    MaintenanceException,
    MaintenanceNotFound,
    MaintenanceAlreadyExists,
    MaintenanceValidationError,
    MaintenancePermissionError,
    MaintenanceStatusError,
    MaintenanceDateError
)

def create_error_response(request: Request, status_code: int, message: str) -> dict:
    """
    일관된 오류 응답 형식을 생성합니다.
    """
    return {
        "error": {
            "code": status_code,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": request.url.path
        }
    }

async def maintenance_exception_handler(
    request: Request,
    exc: MaintenanceException
) -> JSONResponse:
    """정비 관련 예외 핸들러"""
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(request, exc.status_code, exc.detail)
    )

async def sqlalchemy_error_handler(
    request: Request,
    exc: SQLAlchemyError
) -> JSONResponse:
    """데이터베이스 오류 핸들러"""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=create_error_response(
            request, 
            status.HTTP_500_INTERNAL_SERVER_ERROR, 
            "데이터베이스 오류가 발생했습니다"
        )
    )

async def validation_error_handler(
    request: Request,
    exc: MaintenanceValidationError
) -> JSONResponse:
    """검증 오류 핸들러"""
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(request, exc.status_code, exc.detail)
    )

async def permission_error_handler(
    request: Request,
    exc: MaintenancePermissionError
) -> JSONResponse:
    """권한 오류 핸들러"""
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(request, exc.status_code, exc.detail)
    )

async def status_error_handler(
    request: Request,
    exc: MaintenanceStatusError
) -> JSONResponse:
    """상태 변경 오류 핸들러"""
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(request, exc.status_code, exc.detail)
    )

async def date_error_handler(
    request: Request,
    exc: MaintenanceDateError
) -> JSONResponse:
    """일정 관련 오류 핸들러"""
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(request, exc.status_code, exc.detail)
    ) 