"""
FastAPI dependencies module.
"""

from typing import Generator, Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from .security import get_current_user
from .config import settings


# 데이터베이스 세션 의존성
def get_db() -> Generator:
    """
    데이터베이스 세션 제공 의존성.
    """
    # TODO: 실제 DB 세션 구현
    db = None
    try:
        yield db
    finally:
        if db:
            db.close()


# 현재 활성 사용자 의존성
async def get_current_active_user(
    current_user = Depends(get_current_user)
):
    """
    활성 상태인 현재 사용자 확인.
    """
    # TODO: 사용자 활성 상태 검증 로직 추가
    if not current_user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 사용자입니다",
        )
    return current_user


# 관리자 권한 의존성
async def get_current_admin_user(
    current_user = Depends(get_current_active_user),
):
    """
    관리자 권한이 있는 현재 사용자 확인.
    """
    # TODO: 실제 권한 검증 로직 추가
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다",
        )
    return current_user 