"""
데이터베이스 연결 및 세션 관리
"""

import os
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import QueuePool

# 절대 경로로 수정
from core.config import settings

# PostgreSQL 연결 URL 설정 (asyncpg 드라이버 사용)
if settings.SQLALCHEMY_DATABASE_URI:
    SQLALCHEMY_DATABASE_URL = settings.SQLALCHEMY_DATABASE_URI.replace(
        "postgresql://", "postgresql+asyncpg://"
    )
else:
    SQLALCHEMY_DATABASE_URL = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/maintenance"
    )

# 비동기 엔진 생성 - 최적화된 연결 풀 설정
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=settings.DB_POOL_SIZE or 20,  # 기본 풀 크기 증가
    max_overflow=settings.DB_MAX_OVERFLOW or 30,  # 최대 오버플로우 증가
    pool_timeout=30,  # 풀에서 연결을 기다리는 최대 시간(초)
    pool_recycle=1800,  # 연결 재활용 시간(30분)
    pool_pre_ping=True,  # 연결 상태 확인
    future=True,  # 2.0 스타일 사용
)

# 비동기 세션 팩토리 생성 - 최적화된 설정
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # 커밋 후 객체 만료 방지
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """기본 모델 클래스"""

    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    데이터베이스 세션 생성기

    Yields:
        AsyncSession: 비동기 데이터베이스 세션
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    데이터베이스 초기화
    """
    async with engine.begin() as conn:
        # 모든 테이블 생성
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """
    데이터베이스 연결 종료
    """
    await engine.dispose()


# 통계 수집 함수
async def get_db_stats() -> dict:
    """
    데이터베이스 연결 풀 통계 정보를 반환
    """
    return {
        "pool_size": engine.pool.size(),
        "connections_in_use": engine.pool.checkedout(),
        "overflow_connections": engine.pool.overflow(),
    }


__all__ = [
    "AsyncSession",
    "AsyncSessionLocal",
    "Base",
    "get_db",
    "init_db",
    "close_db",
    "get_db_stats",
]

# 테스트를 위한 모의 함수/클래스 정의
from typing import Any, Generator

from sqlalchemy.ext.asyncio import AsyncSession


class SessionLocal:
    pass


def get_db_session() -> Generator[AsyncSession, Any, None]:
    """데이터베이스 세션을 제공하는 의존성 함수"""
    session = AsyncSession()
    try:
        yield session
    finally:
        pass


def get_session() -> Generator[AsyncSession, Any, None]:
    """데이터베이스 세션을 제공하는 의존성 함수"""
    return get_db_session()
