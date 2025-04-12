"""
마이그레이션 환경 설정 파일.
데이터베이스 스키마 마이그레이션 처리를 위한 환경 설정.
"""
# pylint: skip-file
# flake8: noqa
# mypy: ignore-errors
# ruff: noqa
# fmt: off

import os
import sys
from logging.config import fileConfig
import logging

from sqlalchemy import engine_from_config
from sqlalchemy import pool
# 알렘빅 문맥은 마이그레이션 프레임워크에서 제공함
from alembic import context  # noqa

# 프로젝트 루트 디렉토리를 시스템 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# 환경 변수 설정 (DB URL이 없는 경우)
if not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "postgresql://gongchanghyeon@localhost:5432/maintenance"

# Alembic 설정 및 로거 설정
if context.config.config_file_name is not None:  # noqa
    fileConfig(context.config.config_file_name)  # noqa

logger = logging.getLogger("alembic")

# 환경 변수에서 데이터베이스 URL 가져오기
db_url = os.environ.get("DATABASE_URL")
if db_url:
    context.config.set_main_option("sqlalchemy.url", db_url)  # noqa

# 메타데이터 객체 가져오기
target_metadata = None
try:
    # 먼저 데이터베이스 패키지에서 Base를 가져옵니다
    from src.database import Base
    
    # 모델 로드를 위한 임포트
    try:
        # 먼저 사용자 모델을 임포트합니다
        from src.database.models import User
        
        # 그 다음 다른 데이터베이스 모델들을 임포트합니다
        from src.database.models import Shop, ShopService, ShopReview, ShopImage, Technician
        
        # 그런 다음 모듈 모델들을 임포트합니다
        # 차량 모델 임포트
        from src.modules.vehicle.models import Vehicle
        
        # 정비 관련 모델 임포트 
        from src.modules.maintenance.models import Maintenance, MaintenanceDocument, MaintenancePart
        
        # Todo 모델 임포트
        try:
            from src.database.models import Todo
            logger.info("Todo 모델을 성공적으로 임포트했습니다.")
        except ImportError as e:
            logger.warning(f"Todo 모델 임포트에 실패했습니다: {e}")
        
        # 마지막으로 BaseModel 임포트
        from src.models.base import BaseModel
        
        logger.info("모든 모델을 성공적으로 임포트했습니다.")
    except ImportError as e:
        logger.warning(f"일부 모델 임포트에 실패했습니다: {e}")
    
    target_metadata = Base.metadata
except ImportError as e:
    logger.error(f"Base 메타데이터 임포트에 실패했습니다: {e}")
    logger.warning("메타데이터 없이 마이그레이션이 실행됩니다.")

def run_migrations_offline() -> None:
    """
    오프라인 마이그레이션 실행: 직접 컨텍스트에 DB URL 제공.
    """
    url = context.config.get_main_option("sqlalchemy.url")  # noqa
    if not url:
        raise ValueError("데이터베이스 URL이 설정되지 않았습니다.")
        
    context.configure(  # noqa
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():  # noqa
        context.run_migrations()  # noqa


def run_migrations_online() -> None:
    """
    온라인 마이그레이션 실행: Engine을 사용.
    """
    # 데이터베이스 URL 확인
    if not context.config.get_main_option("sqlalchemy.url"):  # noqa
        raise ValueError("데이터베이스 URL이 설정되지 않았습니다.")
    
    # 엔진 설정
    connectable = engine_from_config(
        context.config.get_section(context.config.config_ini_section),  # noqa
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(  # noqa
            connection=connection, 
            target_metadata=target_metadata,
            compare_type=True,  # 열 타입 변경 감지
            compare_server_default=True,  # 기본값 변경 감지
        )

        with context.begin_transaction():  # noqa
            context.run_migrations()  # noqa


if context.is_offline_mode():  # noqa
    run_migrations_offline()
else:
    run_migrations_online() 