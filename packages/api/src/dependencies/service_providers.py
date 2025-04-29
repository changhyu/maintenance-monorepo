"""
서비스 의존성 제공자 모듈
FastAPI 엔드포인트에서 필요한 서비스 의존성을 제공합니다.
"""

from typing import Annotated, Optional

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.cache.redis_cache import RedisCache
from src.services.git_service import GitService
from src.services.user_service import UserService

from packages.api.srccore.auth import User, get_current_user
from packages.api.srccore.db import get_db_session

# 기본 데이터베이스 세션 및 사용자 의존성
DBSession = Annotated[AsyncSession, Depends(get_db_session)]
CurrentUser = Annotated[Optional[User], Depends(get_current_user)]


# 캐시 의존성
async def get_redis_cache() -> RedisCache:
    """Redis 캐시 인스턴스 제공"""
    return RedisCache()


RedisInstance = Annotated[RedisCache, Depends(get_redis_cache)]


# 서비스 의존성
async def get_git_service(session: DBSession, current_user: CurrentUser) -> GitService:
    """Git 서비스 제공"""
    return GitService(session=session, current_user=current_user)


async def get_user_service(
    session: DBSession, current_user: CurrentUser
) -> UserService:
    """사용자 서비스 제공"""
    return UserService(session=session, current_user=current_user)


# 타입 주석을 위한 의존성 별칭
GitServiceDep = Annotated[GitService, Depends(get_git_service)]
UserServiceDep = Annotated[UserService, Depends(get_user_service)]
