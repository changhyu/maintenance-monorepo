from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TokenPayload(BaseModel):
    """토큰 페이로드 모델"""

    sub: Optional[int] = None
    exp: datetime
    type: str = "access"
