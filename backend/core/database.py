"""
데이터베이스 연결 및 세션 관리 모듈
"""
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# 상대 경로 임포트로 변경
from .config import get_settings
from .logger import get_logger

# 설정 및 로거 초기화
settings = get_settings()
logger = get_logger(__name__)

# SQLAlchemy 엔진 생성
engine = create_engine(
    settings.DATABASE_URL, 
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 클래스 생성 (모델 클래스가 상속할 기본 클래스)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    데이터베이스 세션을 제공하는 의존성 주입 함수
    
    Yields:
        Session: 데이터베이스 세션 객체
    """
    db = SessionLocal()
    try:
        logger.debug("데이터베이스 세션 생성")
        yield db
    finally:
        logger.debug("데이터베이스 세션 닫기")
        db.close()


def init_db() -> None:
    """
    데이터베이스 초기화 함수
    """
    # 데이터베이스 테이블 생성
    Base.metadata.create_all(bind=engine)
    logger.info("데이터베이스 테이블이 생성되었습니다.")