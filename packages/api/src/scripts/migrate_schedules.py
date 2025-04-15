#!/usr/bin/env python3
"""
정비 일정 관리 테이블 마이그레이션 스크립트

이 스크립트는 정비 일정 관리에 필요한 테이블을 생성합니다.
"""

import os
import sys
import logging
from datetime import datetime

# 프로젝트 루트 경로 추가
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))

from sqlalchemy import create_engine, inspect, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 모델 임포트
from src.models.schedule import ScheduleModel, ScheduleReminderModel, ScheduleNoteModel
from src.core.config import settings

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

def create_tables():
    """필요한 테이블을 생성합니다."""
    from src.models.base import Base

    try:
        # 데이터베이스 연결
        engine = create_engine(settings.DATABASE_URL)
        
        # 인스펙터 생성
        inspector = inspect(engine)
        
        # 이미 테이블이 존재하는지 확인
        existing_tables = inspector.get_table_names()
        tables_to_create = []
        
        # 일정 테이블 확인
        if "maintenance_schedules" not in existing_tables:
            tables_to_create.append("maintenance_schedules")
            logger.info("maintenance_schedules 테이블이 존재하지 않습니다. 생성합니다.")
        else:
            logger.info("maintenance_schedules 테이블이 이미 존재합니다.")
        
        # 알림 테이블 확인
        if "schedule_reminders" not in existing_tables:
            tables_to_create.append("schedule_reminders")
            logger.info("schedule_reminders 테이블이 존재하지 않습니다. 생성합니다.")
        else:
            logger.info("schedule_reminders 테이블이 이미 존재합니다.")
        
        # 노트 테이블 확인
        if "schedule_notes" not in existing_tables:
            tables_to_create.append("schedule_notes")
            logger.info("schedule_notes 테이블이 존재하지 않습니다. 생성합니다.")
        else:
            logger.info("schedule_notes 테이블이 이미 존재합니다.")
        
        # 테이블 생성
        if tables_to_create:
            metadata = MetaData()
            metadata.reflect(bind=engine)
            
            # 생성할 테이블만 필터링하여 생성
            Base.metadata.create_all(engine, tables=[
                Base.metadata.tables[table_name] 
                for table_name in tables_to_create
            ])
            logger.info(f"테이블 생성 완료: {', '.join(tables_to_create)}")
        else:
            logger.info("모든 테이블이 이미 존재합니다.")
        
        return True
    except Exception as e:
        logger.error(f"테이블 생성 중 오류 발생: {str(e)}")
        return False

def check_foreign_keys():
    """외래 키 관계가 올바르게 설정되었는지 확인합니다."""
    try:
        # 데이터베이스 연결
        engine = create_engine(settings.DATABASE_URL)
        
        # 인스펙터 생성
        inspector = inspect(engine)
        
        # 외래 키 확인
        schedule_fks = inspector.get_foreign_keys("maintenance_schedules")
        reminder_fks = inspector.get_foreign_keys("schedule_reminders")
        note_fks = inspector.get_foreign_keys("schedule_notes")
        
        # 로그 출력
        logger.info(f"maintenance_schedules 외래 키: {schedule_fks}")
        logger.info(f"schedule_reminders 외래 키: {reminder_fks}")
        logger.info(f"schedule_notes 외래 키: {note_fks}")
        
        return True
    except Exception as e:
        logger.error(f"외래 키 확인 중 오류 발생: {str(e)}")
        return False

def main():
    """마이그레이션 실행"""
    logger.info("정비 일정 관리 테이블 마이그레이션을 시작합니다.")
    
    # 테이블 생성
    if create_tables():
        logger.info("테이블 생성 또는 확인이 완료되었습니다.")
    else:
        logger.error("테이블 생성에 실패했습니다.")
        sys.exit(1)
    
    # 외래 키 확인
    if check_foreign_keys():
        logger.info("외래 키 확인이 완료되었습니다.")
    else:
        logger.error("외래 키 확인에 실패했습니다.")
        sys.exit(1)
    
    logger.info("정비 일정 관리 테이블 마이그레이션이 성공적으로 완료되었습니다.")
    sys.exit(0)

if __name__ == "__main__":
    main() 