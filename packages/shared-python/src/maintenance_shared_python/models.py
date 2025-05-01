"""
공통 데이터 모델 모듈
여러 서비스에서 공통으로 사용하는 Pydantic 모델을 정의합니다.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, validator


class StatusEnum(str, Enum):
    """API 응답 상태 열거형"""

    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class ApiResponse(BaseModel):
    """표준 API 응답 모델"""

    status: StatusEnum = StatusEnum.SUCCESS
    message: str = "요청이 성공적으로 처리되었습니다."
    data: Optional[Any] = None
    meta: Optional[Dict[str, Any]] = None

    @classmethod
    def success(
        cls,
        data: Any = None,
        message: str = "요청이 성공적으로 처리되었습니다.",
        meta: Dict[str, Any] = None,
    ) -> "ApiResponse":
        """성공 응답 생성"""
        return cls(status=StatusEnum.SUCCESS, message=message, data=data, meta=meta)

    @classmethod
    def error(
        cls,
        message: str = "요청 처리 중 오류가 발생했습니다.",
        data: Any = None,
        meta: Dict[str, Any] = None,
    ) -> "ApiResponse":
        """오류 응답 생성"""
        return cls(status=StatusEnum.ERROR, message=message, data=data, meta=meta)


class PaginatedResponse(ApiResponse):
    """페이지네이션된 API 응답 모델"""

    data: List[Any] = []
    meta: Dict[str, Any] = Field(
        default_factory=lambda: {
            "page": 1,
            "per_page": 10,
            "total_items": 0,
            "total_pages": 0,
        }
    )

    @classmethod
    def create(
        cls,
        items: List[Any],
        total_items: int,
        page: int = 1,
        per_page: int = 10,
        message: str = "페이지네이션 된 결과를 반환합니다.",
    ) -> "PaginatedResponse":
        """페이지네이션된 응답 생성"""
        total_pages = (total_items + per_page - 1) // per_page if per_page > 0 else 0

        return cls(
            status=StatusEnum.SUCCESS,
            message=message,
            data=items,
            meta={
                "page": page,
                "per_page": per_page,
                "total_items": total_items,
                "total_pages": total_pages,
            },
        )


class HealthStatus(BaseModel):
    """서비스 헬스 체크 상태 모델"""

    service: str
    status: str = "ok"
    version: str
    environment: str
    timestamp: datetime = Field(default_factory=datetime.now)
    details: Optional[Dict[str, Any]] = None
