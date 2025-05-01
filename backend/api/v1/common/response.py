"""
표준화된 API 응답 모델 정의

이 모듈은 백엔드 API 응답을 표준화하기 위한 Pydantic 모델을 제공합니다.
모든 API 엔드포인트는 이 모델을 사용하여 일관된 응답 형식을 제공해야 합니다.
"""

from pydantic import BaseModel, Field
from typing import Optional, Any, List, Dict, Union, Generic, TypeVar
from datetime import datetime

T = TypeVar('T')  # 제네릭 타입 변수 정의

class ErrorDetail(BaseModel):
    """API 오류 세부 정보를 나타내는 모델"""
    code: str = Field(..., description="오류 코드")
    message: str = Field(..., description="오류 메시지")
    field: Optional[str] = Field(None, description="오류가 발생한 필드 (해당하는 경우)")
    details: Optional[Dict[str, Any]] = Field(None, description="추가 오류 세부 정보")


class StandardResponse(BaseModel, Generic[T]):
    """표준화된 API 응답 모델"""
    success: bool = Field(..., description="요청 성공 여부")
    message: str = Field(..., description="응답 메시지")
    data: Optional[T] = Field(None, description="응답 데이터")
    errors: Optional[List[ErrorDetail]] = Field(None, description="오류 목록 (실패 시)")
    timestamp: datetime = Field(default_factory=datetime.now, description="응답 생성 시간")
    version: str = Field("1.0.0", description="API 버전")
    
    class Config:
        """Pydantic 모델 설정"""
        schema_extra = {
            "example": {
                "success": True,
                "message": "요청이 성공적으로 처리되었습니다.",
                "data": {
                    "id": 123,
                    "name": "샘플 데이터"
                },
                "errors": None,
                "timestamp": "2023-01-01T12:00:00",
                "version": "1.0.0"
            }
        }


def success_response(
    message: str = "요청이 성공적으로 처리되었습니다.",
    data: Any = None,
    version: str = "1.0.0"
) -> StandardResponse:
    """
    성공 응답을 생성합니다.
    
    Args:
        message: 응답 메시지
        data: 응답 데이터
        version: API 버전
        
    Returns:
        StandardResponse: 성공 응답
    """
    return StandardResponse(
        success=True,
        message=message,
        data=data,
        version=version
    )


def error_response(
    message: str = "요청 처리 중 오류가 발생했습니다.",
    errors: Optional[List[Union[ErrorDetail, Dict[str, Any]]]] = None,
    version: str = "1.0.0"
) -> StandardResponse:
    """
    오류 응답을 생성합니다.
    
    Args:
        message: 오류 메시지
        errors: 오류 세부 정보 목록
        version: API 버전
        
    Returns:
        StandardResponse: 오류 응답
    """
    error_details = []
    
    if errors:
        for error in errors:
            if isinstance(error, dict):
                error_details.append(ErrorDetail(**error))
            else:
                error_details.append(error)
    
    return StandardResponse(
        success=False,
        message=message,
        errors=error_details,
        version=version
    ) 