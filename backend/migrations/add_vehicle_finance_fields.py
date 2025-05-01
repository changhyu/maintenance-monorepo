"""
차량 재무 정보 필드 추가 마이그레이션

이 마이그레이션은 차량 테이블에 구매 비용, 매도 비용 등의 재무 정보 필드를 추가합니다.
"""

from sqlalchemy import Table, Column, Float, Date, Text, MetaData, inspect, text
from datetime import datetime
from backend.db.session import engine
import logging

logger = logging.getLogger(__name__)

def upgrade():
    """
    마이그레이션 업그레이드: 차량 테이블에 재무 관련 필드 추가
    """
    logger.info("차량 테이블 재무 필드 추가 마이그레이션 시작...")
    connection = engine.connect()
    transaction = connection.begin()
    
    try:
        # 현재 컬럼 확인
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('vehicles')]
        
        # 필요한 새 컬럼 추가
        if 'purchase_price' not in columns:
            logger.info("'purchase_price' 컬럼 추가 중...")
            connection.execute(text("ALTER TABLE vehicles ADD COLUMN purchase_price FLOAT"))
        
        if 'purchase_date' not in columns:
            logger.info("'purchase_date' 컬럼 추가 중...")
            connection.execute(text("ALTER TABLE vehicles ADD COLUMN purchase_date DATE"))
        
        if 'sale_price' not in columns:
            logger.info("'sale_price' 컬럼 추가 중...")
            connection.execute(text("ALTER TABLE vehicles ADD COLUMN sale_price FLOAT"))
        
        if 'sale_date' not in columns:
            logger.info("'sale_date' 컬럼 추가 중...")
            connection.execute(text("ALTER TABLE vehicles ADD COLUMN sale_date DATE"))
        
        if 'depreciation_rate' not in columns:
            logger.info("'depreciation_rate' 컬럼 추가 중...")
            connection.execute(text("ALTER TABLE vehicles ADD COLUMN depreciation_rate FLOAT DEFAULT 0.15"))
        
        if 'current_value' not in columns:
            logger.info("'current_value' 컬럼 추가 중...")
            connection.execute(text("ALTER TABLE vehicles ADD COLUMN current_value FLOAT"))
        
        if 'finance_notes' not in columns:
            logger.info("'finance_notes' 컬럼 추가 중...")
            connection.execute(text("ALTER TABLE vehicles ADD COLUMN finance_notes TEXT"))
        
        if 'insurance_cost' not in columns:
            logger.info("'insurance_cost' 컬럼 추가 중...")
            connection.execute(text("ALTER TABLE vehicles ADD COLUMN insurance_cost FLOAT"))

        if 'insurance_expiry' not in columns:
            logger.info("'insurance_expiry' 컬럼 추가 중...")
            connection.execute(text("ALTER TABLE vehicles ADD COLUMN insurance_expiry DATE"))
        
        transaction.commit()
        logger.info("차량 테이블 재무 필드 추가 완료")
    except Exception as e:
        transaction.rollback()
        logger.error(f"마이그레이션 중 오류 발생: {str(e)}")
        raise
    finally:
        connection.close()

def downgrade():
    """
    마이그레이션 다운그레이드: 추가된 재무 관련 필드 제거
    """
    logger.info("차량 테이블 재무 필드 제거 마이그레이션 시작...")
    connection = engine.connect()
    transaction = connection.begin()
    
    try:
        # 추가된 컬럼 제거
        columns_to_remove = [
            'purchase_price', 'purchase_date', 'sale_price', 'sale_date',
            'depreciation_rate', 'current_value', 'finance_notes',
            'insurance_cost', 'insurance_expiry'
        ]
        
        inspector = inspect(engine)
        existing_columns = [col['name'] for col in inspector.get_columns('vehicles')]
        
        for column in columns_to_remove:
            if column in existing_columns:
                logger.info(f"'{column}' 컬럼 제거 중...")
                connection.execute(text(f"ALTER TABLE vehicles DROP COLUMN {column}"))
        
        transaction.commit()
        logger.info("차량 테이블 재무 필드 제거 완료")
    except Exception as e:
        transaction.rollback()
        logger.error(f"마이그레이션 롤백 중 오류 발생: {str(e)}")
        raise
    finally:
        connection.close()

if __name__ == "__main__":
    # 로깅 설정
    logging.basicConfig(level=logging.INFO, 
                      format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    
    # 필드 추가 실행
    upgrade()