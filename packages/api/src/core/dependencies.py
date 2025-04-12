"""
FastAPI dependencies module.
"""

from typing import Generator, Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from .config import settings
from .security import get_current_user
from .logging import app_logger


# 데이터베이스 세션 의존성
def get_db() -> Generator[Session, None, None]:
    """
    데이터베이스 세션 제공 의존성.
    
    Returns:
        데이터베이스 세션
    
    Note:
        실제 구현 시 DB 연결 및 세션 관리 로직이 필요합니다.
    """
    # 실제 연결이 설정되면 아래 주석 해제하고 구현
    # from ..database.session import SessionLocal
    # db = SessionLocal()
    db = None  # 임시 구현: 실제 프로젝트에서는 연결 설정 필요
    try:
        app_logger.debug("DB 세션 생성")
        yield db
    finally:
        if db:
            app_logger.debug("DB 세션 종료")
            db.close()


# 현재 활성 사용자 의존성
async def get_current_active_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    활성 상태인 현재 사용자 확인.
    
    Args:
        current_user: 현재 인증된 사용자
    
    Returns:
        활성 상태인 사용자 정보
    
    Raises:
        HTTPException: 사용자가 비활성 상태인 경우
    """
    if not current_user.get("is_active", True):
        app_logger.warning(f"비활성화된 사용자 접근 시도: {current_user.get('id')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 사용자입니다",
        )
    return current_user


# 관리자 권한 의존성
async def get_current_admin_user(
    current_user: Dict[str, Any] = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """
    관리자 권한이 있는 현재 사용자 확인.
    
    Args:
        current_user: 현재 활성 사용자
    
    Returns:
        관리자 권한이 있는 사용자 정보
    
    Raises:
        HTTPException: 사용자가 관리자 권한이 없는 경우
    """
    if not current_user.get("is_admin", False):
        app_logger.warning(f"권한 없는 관리자 접근 시도: {current_user.get('id')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다",
        )
    return current_user
\n