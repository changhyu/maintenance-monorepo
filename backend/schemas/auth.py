from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class Token(BaseModel):
    access_token: str = Field(..., description="JWT 액세스 토큰")
    token_type: str = Field(..., description="토큰 타입")
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "token_type": "bearer"
        }
    })

class TokenData(BaseModel):
    username: Optional[str] = Field(None, description="사용자 이름") 