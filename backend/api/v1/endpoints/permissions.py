from fastapi import APIRouter, Depends, Query
from typing import List
from sqlalchemy.orm import Session

from backend.core.auth import get_current_active_user, has_permission
from backend.core.auth import permission_required
from backend.db.session import get_db
from backend.models.permission import Permission
from backend.schemas.permission import PermissionResponse

router = APIRouter(tags=["권한"])

@router.get(
    "/permissions/", response_model=List[PermissionResponse], summary="권한 목록 조회"
)
async def get_all_permissions(
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return db.query(Permission).all()

@router.get(
    "/auth/permissions/check", summary="권한 체크"
)
async def check_permission(
    permission: str = Query(
        ..., 
        description="확인할 권한 이름", 
        examples={"user:read": {"summary": "사용자 읽기 권한", "value": "user:read"}}
    ),
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    result = {"has_permission": has_permission(current_user, permission, db)}
    return result