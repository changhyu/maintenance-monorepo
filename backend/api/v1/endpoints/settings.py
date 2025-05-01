from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.core.auth import permission_required
from backend.core.config import settings
from backend.db.session import get_db
from backend.models.user import User

router = APIRouter(tags=["설정"])

@router.get(
    f"{settings.API_V1_STR}/settings/",
    summary="시스템 설정 조회",
    responses={200: {"description": "시스템 설정 조회 성공"}}
)
async def get_system_settings(
    current_user: User = Depends(permission_required("system:settings")),
    db: Session = Depends(get_db)
):
    # 실제 시스템 설정을 DB에서 조회해야 하나, 예시를 위해 하드코딩된 응답 반환
    return {
        "maintenance_mode": False,
        "allow_registration": True,
        "max_upload_size_mb": 10,
        "smtp_enabled": True
    } 