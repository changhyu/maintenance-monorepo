"""
렌터카 업체 테이블 생성 마이그레이션

이 마이그레이션은 렌터카 업체(rental_companies), 업체 지점(rental_company_locations) 테이블을 생성하고,
차량(vehicles) 테이블에 렌터카 업체 관련 필드를 추가합니다.

SQLite 호환성을 고려하여 작성되었습니다.
"""

from sqlalchemy import Table, Column, Integer, String, Float, Text, ForeignKey, DateTime, Boolean, MetaData, inspect
from sqlalchemy.sql import text
from datetime import datetime
from backend.db.session import engine
import logging
import sqlite3

logger = logging.getLogger(__name__)

# 메타데이터 객체 생성
metadata = MetaData()

# 렌터카 업체(rental_companies) 테이블 정의
rental_companies = Table(
    "rental_companies",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("name", String(100), nullable=False, index=True),
    Column("business_number", String(20), nullable=False, unique=True, index=True),
    Column("address", String(255), nullable=False),
    Column("phone", String(20), nullable=False),
    Column("email", String(100)),
    Column("website", String(255)),
    Column("description", Text),
    Column("logo_url", String(255)),
    Column("is_active", Boolean, default=True),
    Column("rating", Float, default=0.0),
    Column("rating_count", Integer, default=0),
    Column("contract_start_date", DateTime),
    Column("contract_end_date", DateTime),
    Column("commission_rate", Float, default=0.0),
    Column("created_at", DateTime, default=datetime.utcnow),
    Column("updated_at", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow),
    Column("created_by", Integer),  # 외래키 제약조건 제거
    Column("updated_by", Integer)   # 외래키 제약조건 제거
)

# 렌터카 업체 지점(rental_company_locations) 테이블 정의
rental_company_locations = Table(
    "rental_company_locations",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("company_id", Integer, ForeignKey("rental_companies.id"), nullable=False),  # 외래키 직접 정의
    Column("name", String(100), nullable=False),
    Column("address", String(255), nullable=False),
    Column("phone", String(20), nullable=False),
    Column("email", String(100)),
    Column("is_airport", Boolean, default=False),
    Column("is_active", Boolean, default=True),
    Column("opening_hours", String(255)),
    Column("latitude", Float),
    Column("longitude", Float),
    Column("created_at", DateTime, default=datetime.utcnow),
    Column("updated_at", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
)

def upgrade():
    """
    마이그레이션 업그레이드: 테이블 생성 및 컬럼 추가
    """
    connection = engine.connect()
    logger.info("렌터카 업체 관련 테이블 생성 및 컬럼 추가 마이그레이션 시작...")
    
    try:
        # 테이블 존재 여부 확인
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        # 외래키 설정 활성화 (SQLite의 경우)
        connection.execute(text("PRAGMA foreign_keys = ON"))
        
        # 렌터카 업체 테이블 생성
        if "rental_companies" not in existing_tables:
            logger.info("'rental_companies' 테이블 생성 중...")
            rental_companies.create(engine)
            logger.info("'rental_companies' 테이블 생성 완료")
        else:
            logger.info("'rental_companies' 테이블이 이미 존재합니다.")
        
        # 렌터카 업체 지점 테이블 생성
        if "rental_company_locations" not in existing_tables:
            logger.info("'rental_company_locations' 테이블 생성 중...")
            rental_company_locations.create(engine)
            logger.info("'rental_company_locations' 테이블 생성 완료")
        else:
            logger.info("'rental_company_locations' 테이블이 이미 존재합니다.")
        
        # 차량 테이블에 렌터카 업체 관련 컬럼 추가
        if "vehicles" in existing_tables:
            # 컬럼 존재 여부 확인
            vehicle_columns = [c["name"] for c in inspector.get_columns("vehicles")]
            
            # SQLite에서는 ALTER TABLE으로 외래키 제약조건을 추가할 수 없으므로
            # 단순히 컬럼만 추가합니다.
            
            # rental_company_id 컬럼 추가
            if "rental_company_id" not in vehicle_columns:
                logger.info("'vehicles' 테이블에 'rental_company_id' 컬럼 추가 중...")
                connection.execute(text(
                    "ALTER TABLE vehicles ADD COLUMN rental_company_id INTEGER"
                ))
                logger.info("'rental_company_id' 컬럼 추가 완료")
            
            # company_vehicle_id 컬럼 추가
            if "company_vehicle_id" not in vehicle_columns:
                logger.info("'vehicles' 테이블에 'company_vehicle_id' 컬럼 추가 중...")
                connection.execute(text(
                    "ALTER TABLE vehicles ADD COLUMN company_vehicle_id VARCHAR(50)"
                ))
                logger.info("'company_vehicle_id' 컬럼 추가 완료")
        
        logger.info("렌터카 업체 관련 마이그레이션 성공적으로 완료")
    except Exception as e:
        logger.error(f"마이그레이션 중 오류 발생: {str(e)}")
        raise
    finally:
        connection.close()

def downgrade():
    """
    마이그레이션 다운그레이드: 컬럼 삭제 및 테이블 삭제
    """
    connection = engine.connect()
    logger.info("렌터카 업체 관련 테이블 삭제 및 컬럼 제거 마이그레이션 시작...")
    
    try:
        # 테이블 존재 여부 확인
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        # SQLite에서는 ALTER TABLE DROP COLUMN을 지원하지 않으므로,
        # 테이블 재생성 방식을 써야 합니다만, 복잡성 때문에 여기서는 생략합니다.
        # 실제로는 다음 단계를 거쳐야 합니다:
        # 1. 임시 테이블 생성 (필요한 컬럼만 포함)
        # 2. 데이터 복사
        # 3. 기존 테이블 삭제
        # 4. 임시 테이블 이름 변경
        
        logger.warning("SQLite는 ALTER TABLE DROP COLUMN을 지원하지 않습니다.")
        logger.warning("vehicles 테이블에서 컬럼만 제거하는 작업은 수행되지 않습니다.")
        
        # 테이블 삭제 (외래 키 제약 조건을 고려하여 역순으로 삭제)
        if "rental_company_locations" in existing_tables:
            logger.info("'rental_company_locations' 테이블 삭제 중...")
            rental_company_locations.drop(engine, checkfirst=True)
            logger.info("'rental_company_locations' 테이블 삭제 완료")
        
        if "rental_companies" in existing_tables:
            logger.info("'rental_companies' 테이블 삭제 중...")
            rental_companies.drop(engine, checkfirst=True)
            logger.info("'rental_companies' 테이블 삭제 완료")
        
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