"""
Database package initialization.
"""

import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

from ..core.config import settings

# 로거 설정
logger = logging.getLogger(__name__)

# SQLAlchemy 설정
try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
    logger.info("데이터베이스 연결 설정이 완료되었습니다.")
except Exception as e:
    logger.error(f"데이터베이스 연결 설정 중 오류가 발생했습니다: {e}")
    # 더미 세션을 사용
    from ..core.dummy_modules import DummySession
    SessionLocal = lambda: DummySession()
    Base = None


def get_session() -> Session:
    """
    데이터베이스 세션을 반환합니다.
    
    세션은 사용 후 반드시 닫아야 합니다.
    """
    session = SessionLocal()
    try:
        return session
    except Exception as e:
        logger.error(f"데이터베이스 세션 생성 중 오류가 발생했습니다: {e}")
        session.close()
        raise 