"""
데이터베이스 모듈

이 모듈은 데이터베이스 연결과 세션 관리를 담당합니다.
주요 기능:
- 데이터베이스 엔진 설정
- 세션 팩토리 생성
- 세션 관리 함수 제공
"""

import logging
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from packages.api.srcconfig import settings

# 로거 설정
logger = logging.getLogger(__name__)

# 데이터베이스 URL 설정
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL.replace(
    "postgresql://", "postgresql+asyncpg://"
)

# 비동기 엔진 생성
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL, echo=settings.DEBUG, pool_pre_ping=True, pool_recycle=3600
)

# 비동기 세션 팩토리 생성
SessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# 베이스 클래스 생성
class Base(DeclarativeBase):
    """기본 모델 클래스"""

    pass


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    데이터베이스 세션을 생성하고 반환합니다.

    Returns:
        AsyncGenerator[AsyncSession, None]: 비동기 데이터베이스 세션
    """
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            logger.error(f"데이터베이스 세션 오류: {str(e)}")
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_session() -> AsyncSession:
    """
    새로운 데이터베이스 세션을 반환합니다.

    Returns:
        AsyncSession: 비동기 데이터베이스 세션
    """
    return SessionLocal()


async def init_db() -> None:
    """
    데이터베이스 테이블을 초기화합니다.
    """
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("데이터베이스 테이블 초기화 완료")
    except Exception as e:
        logger.error(f"데이터베이스 초기화 오류: {str(e)}")
        raise
