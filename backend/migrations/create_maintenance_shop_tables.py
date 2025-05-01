"""
정비소, 정비사, 부품 테이블 생성 마이그레이션

이 마이그레이션은 차량 정비 관리 시스템의 정비소(shops), 정비사(technicians), 부품(parts) 테이블을 생성합니다.
"""

from sqlalchemy import Table, Column, Integer, String, Float, Text, ForeignKey, DateTime, Boolean, MetaData, JSON, inspect
from sqlalchemy.sql import text
from datetime import datetime
from backend.db.session import engine
import logging

logger = logging.getLogger(__name__)

# 메타데이터 객체 생성
metadata = MetaData()

# 정비소(shop) 테이블 정의
shops = Table(
    "shops",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("name", String(100), nullable=False),
    Column("address", String(200), nullable=False),
    Column("city", String(50), nullable=False),
    Column("state", String(50), nullable=False),
    Column("postal_code", String(20), nullable=False),
    Column("phone", String(20), nullable=False),
    Column("email", String(100)),
    Column("website", String(100)),
    Column("description", Text),
    Column("is_active", Boolean, default=True),
    Column("latitude", Float),
    Column("longitude", Float),
    Column("created_at", DateTime, default=datetime.utcnow),
    Column("updated_at", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
)

# 정비사(technician) 테이블 정의
technicians = Table(
    "technicians",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("name", String(100), nullable=False),
    Column("shop_id", Integer, ForeignKey("shops.id"), nullable=False),
    Column("phone", String(20)),
    Column("email", String(100)),
    Column("specialties", JSON, default=list),
    Column("years_experience", Integer, default=0),
    Column("certification", String(200)),
    Column("is_active", Boolean, default=True),
    Column("created_at", DateTime, default=datetime.utcnow),
    Column("updated_at", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
)

# 부품(part) 테이블 정의
parts = Table(
    "parts",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("name", String(100), nullable=False),
    Column("part_number", String(50), nullable=False, unique=True),
    Column("description", Text),
    Column("price", Float, nullable=False),
    Column("category", String(100)),
    Column("manufacturer", String(100)),
    Column("stock", Integer, default=0),
    Column("location", String(100)),
    Column("is_active", Boolean, default=True),
    Column("created_at", DateTime, default=datetime.utcnow),
    Column("updated_at", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
)

def upgrade():
    """
    마이그레이션 업그레이드: 테이블 생성
    """
    connection = engine.connect()
    logger.info("정비소, 정비사, 부품 테이블 생성 마이그레이션 시작...")
    
    try:
        # 테이블 존재 여부 확인
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        # 테이블 생성
        if "shops" not in existing_tables:
            logger.info("'shops' 테이블 생성 중...")
            shops.create(engine)
            logger.info("'shops' 테이블 생성 완료")
        else:
            logger.info("'shops' 테이블이 이미 존재합니다.")
        
        if "technicians" not in existing_tables:
            logger.info("'technicians' 테이블 생성 중...")
            technicians.create(engine)
            logger.info("'technicians' 테이블 생성 완료")
        else:
            logger.info("'technicians' 테이블이 이미 존재합니다.")
        
        if "parts" not in existing_tables:
            logger.info("'parts' 테이블 생성 중...")
            parts.create(engine)
            logger.info("'parts' 테이블 생성 완료")
        else:
            logger.info("'parts' 테이블이 이미 존재합니다.")
        
        logger.info("마이그레이션 성공적으로 완료")
    except Exception as e:
        logger.error(f"마이그레이션 중 오류 발생: {str(e)}")
        raise
    finally:
        connection.close()

def downgrade():
    """
    마이그레이션 다운그레이드: 테이블 삭제
    """
    connection = engine.connect()
    logger.info("정비소, 정비사, 부품 테이블 삭제 마이그레이션 시작...")
    
    try:
        # 삭제 순서 중요: 외래 키 제약 조건을 고려하여 역순으로 삭제
        logger.info("'parts' 테이블 삭제 중...")
        parts.drop(engine, checkfirst=True)
        
        logger.info("'technicians' 테이블 삭제 중...")
        technicians.drop(engine, checkfirst=True)
        
        logger.info("'shops' 테이블 삭제 중...")
        shops.drop(engine, checkfirst=True)
        
        logger.info("마이그레이션 롤백 성공적으로 완료")
    except Exception as e:
        logger.error(f"마이그레이션 롤백 중 오류 발생: {str(e)}")
        raise
    finally:
        connection.close()

if __name__ == "__main__":
    # 로깅 설정
    logging.basicConfig(level=logging.INFO, 
                      format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    
    # 테이블 생성 실행
    upgrade()