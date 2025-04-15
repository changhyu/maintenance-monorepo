"""
데이터베이스 설정 및 유틸리티
"""
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, declared_attr
from sqlalchemy.pool import QueuePool

from core.config import Settings

class Base(DeclarativeBase):
    """기본 모델 클래스"""
    
    @declared_attr
    def __tablename__(cls) -> str:
        """테이블 이름을 클래스 이름의 snake_case로 자동 설정"""
        return cls.__name__.lower()

def create_engine(settings: Settings):
    """데이터베이스 엔진 생성"""
    return create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DATABASE_ECHO,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        poolclass=QueuePool,
        pool_pre_ping=True
    )

async def get_session(settings: Settings) -> AsyncGenerator[AsyncSession, None]:
    """데이터베이스 세션 생성"""
    engine = create_engine(settings)
    async_session = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False
    )
    
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_database(settings: Settings):
    """데이터베이스 초기화"""
    engine = create_engine(settings)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all) 