from fastapi import HTTPException, status
from typing import Any, Dict, Optional

class BaseAPIException(HTTPException):
    def __init__(
        self,
        status_code: int,
        detail: Any = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        super().__init__(status_code=status_code, detail=detail, headers=headers)

class NotFoundException(BaseAPIException):
    def __init__(self, detail: str = "리소스를 찾을 수 없습니다"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

class UnauthorizedException(BaseAPIException):
    def __init__(self, detail: str = "인증이 필요합니다"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)

class ForbiddenException(BaseAPIException):
    def __init__(self, detail: str = "접근 권한이 없습니다"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

class BadRequestException(BaseAPIException):
    def __init__(self, detail: str = "잘못된 요청입니다"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

class ConflictException(BaseAPIException):
    def __init__(self, detail: str = "리소스 충돌이 발생했습니다"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)

class DatabaseException(BaseAPIException):
    def __init__(self, detail: str = "데이터베이스 오류가 발생했습니다"):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)

class ConfigurationException(BaseAPIException):
    def __init__(self, detail: str = "서버 구성 오류가 발생했습니다"):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)