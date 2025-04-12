"""
Database package initialization.
"""

import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError

from ..core.config import settings

# 로거 설정
logger = logging.getLogger(__name__)

# SQLAlchemy 설정
try:
    # 데이터베이스 URL 검증
    if not settings.DATABASE_URL:
        raise ValueError("DATABASE_URL이 설정되지 않았습니다.")
    
    # 엔진 생성
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_pre_ping=True  # 연결 상태 확인
    )
    
    # 세션 팩토리 생성
    SessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine
    )
    
    # Base 클래스 생성
    Base = declarative_base()
    
    logger.info("데이터베이스 연결 설정이 완료되었습니다.")
    
except SQLAlchemyError as e:
    logger.error("데이터베이스 연결 오류: %s", str(e))
    raise
except Exception as e:
    logger.error("데이터베이스 설정 중 예상치 못한 오류 발생: %s", str(e))
    raise

def get_session() -> Session:
    """
    데이터베이스 세션을 반환합니다.
    세션은 사용 후 반드시 닫아야 합니다.
    """
    session = SessionLocal()
    try:
        return session
    except Exception as e:
        logger.error("데이터베이스 세션 생성 중 오류가 발생했습니다: %s", str(e))
        session.close()
        raise
\n