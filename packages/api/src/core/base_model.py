from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class BaseDBModel(BaseModel):
    """데이터베이스 모델의 기본 클래스"""

    id: Optional[str] = Field(None, description="엔티티 ID")
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="생성 시간"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, description="수정 시간"
    )

    class Config:
        from_attributes = True  # orm_mode 대신 from_attributes 사용
        json_encoders = {datetime: lambda dt: dt.isoformat()}
