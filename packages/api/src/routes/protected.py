from fastapi import APIRouter, Depends, HTTPException, status

from packages.api.src.core.auth import UserInfo, get_current_user

router = APIRouter()


@router.get("/profile", summary="현재 사용자의 프로필 조회")
async def read_profile(current_user: UserInfo = Depends(get_current_user)):
    # JWT 토큰을 통해 검증된 사용자 정보를 반환
    return {"user": current_user}
