from pydantic import BaseModel, Field, ConfigDict

class RoleResponse(BaseModel):
    id: int = Field(..., description="역할 ID")
    name: str = Field(..., description="역할 이름")
    description: str = Field(..., description="역할 설명")
    model_config = ConfigDict(from_attributes=True) 