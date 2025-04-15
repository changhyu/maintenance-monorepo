from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TokenPayload(BaseModel):
    """토큰 페이로드 모델"""
    sub: Optional[int] = None
    exp: datetime
    type: str = "access" 