from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session

from backend.core.auth import permission_required
from backend.core.config import settings
from backend.db.session import get_db
from backend.models.user import User
from backend.models.role import Role
from backend.schemas.role import RoleResponse

router = APIRouter(tags=["역할"])

@router.get(
    f"{settings.API_V1_STR}/roles/", 
    response_model=List[RoleResponse],
    summary="역할 목록 조회"
)
async def get_roles(
    current_user: User = Depends(permission_required("role:manage")),
    db: Session = Depends(get_db)
):
    roles = db.query(Role).all()
    return roles 