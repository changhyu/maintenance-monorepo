from sqlalchemy import create_engine, text  # text 추가
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import asyncio
from typing import Generator
import time
import logging

from backend.db.base import Base
from backend.core.config import settings

logger = logging.getLogger(__name__)

# 데이터베이스 연결 재시도 설정
MAX_RETRIES = 3
RETRY_DELAY = 5  # seconds

# 기본 데이터베이스 풀 설정
DEFAULT_POOL_SIZE = 5
DEFAULT_POOL_RECYCLE = 3600

# 환경변수에서 데이터베이스 URL 가져오기
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URI

# 비동기 데이터베이스 URL 변환 (필요한 경우)
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    ASYNC_SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")
    
    # SQLite 데이터베이스인 경우 check_same_thread 파라미터 추가
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
    
    # 비동기 엔진 생성 (SQLite 용)
    async_engine = create_async_engine(
        ASYNC_SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=NullPool
    )
else:
    # PostgreSQL 또는 다른 데이터베이스용 비동기 URL 변환
    dialect_driver = SQLALCHEMY_DATABASE_URL.split("://")[0]
    
    if "postgresql" in dialect_driver and "asyncpg" not in dialect_driver:
        ASYNC_SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    else:
        ASYNC_SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL
    
    # PostgreSQL 또는 다른 데이터베이스용 엔진 생성
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=DEFAULT_POOL_SIZE,
        pool_recycle=DEFAULT_POOL_RECYCLE
    )
    
    # 비동기 엔진 생성
    async_engine = create_async_engine(
        ASYNC_SQLALCHEMY_DATABASE_URL,
        pool_size=DEFAULT_POOL_SIZE,
        pool_recycle=DEFAULT_POOL_RECYCLE
    )

# 동기 세션 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 비동기 세션 생성
AsyncSessionLocal = sessionmaker(
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    bind=async_engine
)

# 데이터베이스 테이블 생성 (동기식)
Base.metadata.create_all(bind=engine)

def create_db_engine():
    retries = 0
    last_exception = None
    
    while retries < MAX_RETRIES:
        try:
            engine = create_engine(
                settings.SQLALCHEMY_DATABASE_URI,
                pool_pre_ping=True,
                pool_recycle=3600,
                pool_size=5,
                max_overflow=10
            )
            # 연결 테스트
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))  # text() 함수로 감싸기
            return engine
        except Exception as e:
            last_exception = e
            retries += 1
            logger.warning(f"데이터베이스 연결 시도 {retries}/{MAX_RETRIES} 실패: {str(e)}")
            if retries < MAX_RETRIES:
                time.sleep(RETRY_DELAY)
    
    logger.error(f"데이터베이스 연결 최대 재시도 횟수 초과: {str(last_exception)}")
    raise last_exception

def get_db() -> Generator:
    """
    의존성 주입을 위한 데이터베이스 세션 제공 함수 (동기식)
    
    Yields:
        Session: SQLAlchemy 세션 인스턴스
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_async_db() -> AsyncSession:
    """
    의존성 주입을 위한 비동기 데이터베이스 세션 제공 함수
    
    Yields:
        AsyncSession: SQLAlchemy 비동기 세션 인스턴스
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def close_db_connection():
    """
    애플리케이션 종료 시 데이터베이스 연결을 정리하는 함수
    """
    try:
        # 동기 엔진 처리
        if hasattr(engine, "dispose"):
            engine.dispose()
        
        # 비동기 엔진 처리
        if hasattr(async_engine, "dispose"):
            await async_engine.dispose()
        
        logger.info("데이터베이스 연결이 성공적으로 종료되었습니다.")
        return True
    except Exception as e:
        logger.error(f"데이터베이스 연결 종료 중 오류 발생: {str(e)}")
        return False