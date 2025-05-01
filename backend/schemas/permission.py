from pydantic import BaseModel, Field, ConfigDict

class PermissionResponse(BaseModel):
    id: int = Field(..., description="권한 ID")
    name: str = Field(..., description="권한 이름")
    description: str = Field(..., description="권한 설명")
    model_config = ConfigDict(from_attributes=True) 