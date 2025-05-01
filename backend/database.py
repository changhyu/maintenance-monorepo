from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from typing import Generator
import os
from dotenv import load_dotenv
import logging

# 로거 설정
logger = logging.getLogger(__name__)

# .env 파일 로드
load_dotenv()

# 데이터베이스 URL 설정
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/maintenance_db"
)

# 엔진 옵션
engine_kwargs = {
    "pool_pre_ping": True,  # 연결 문제 자동 감지
    "pool_recycle": 3600,   # 오래된 연결 재활용 (1시간)
    "pool_size": 10,        # 연결 풀 크기
    "echo": os.getenv("SQL_DEBUG", "False").lower() == "true",  # SQL 쿼리 로깅
    "connect_args": {
        "application_name": "maintenance_app"  # PostgreSQL 모니터링용 앱 이름
    }
}

# 엔진 생성
try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)
    logger.info(f"SQLAlchemy 엔진 생성 성공: {SQLALCHEMY_DATABASE_URL.split('@')[-1]}")
except Exception as e:
    logger.error(f"SQLAlchemy 엔진 생성 실패: {e}")
    raise

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 베이스 모델 생성
Base = declarative_base()

def get_db() -> Generator:
    """데이터베이스 세션을 생성하는 의존성 함수"""
    db = SessionLocal()
    try:
        logger.debug("새 데이터베이스 세션 생성")
        yield db
    except Exception as e:
        logger.error(f"데이터베이스 오류 발생: {e}")
        raise
    finally:
        logger.debug("데이터베이스 세션 종료")
        db.close() 