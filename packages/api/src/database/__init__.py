"""
데이터베이스 초기화 모듈
"""

import logging
import sys
import os

from packagescore.config import settings
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

logger = logging.getLogger(__name__)

# Base 클래스 생성
Base = declarative_base()

try:
    # SQLite를 사용하는 경우와 그 외의 경우를 구분하여 엔진 생성
    if "sqlite" in settings.DATABASE_URL:
        engine = create_engine(
            settings.DATABASE_URL,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    else:
        engine = create_engine(
            settings.DATABASE_URL,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
        )

    # 세션 팩토리 생성
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    logger.info("데이터베이스 엔진이 성공적으로 생성되었습니다.")

except Exception as e:
    logger.error(f"데이터베이스 엔진 생성 중 오류가 발생했습니다: {str(e)}")
    raise


def get_db():
    """데이터베이스 세션 생성"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 상대 임포트 대신 직접 임포트 방식으로 변경
try:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)  # src 디렉토리
    
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)
        
    from databasemodels import *  # noqa: F403, F401
    logger.info("데이터베이스 모델을 성공적으로 가져왔습니다.")
except ImportError as e:
    logger.warning(f"데이터베이스 모델 가져오기 실패: {e}")
