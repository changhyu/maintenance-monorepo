from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from sqlalchemy import text
from alembic import context
import os
import sys
from dotenv import load_dotenv
import logging

# 프로젝트 루트 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# .env 파일 로드
load_dotenv()

# 로거 설정
logger = logging.getLogger("alembic")

# 데이터베이스 URL 설정
config = context.config
database_url = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/maintenance_db"
)
config.set_main_option("sqlalchemy.url", database_url)

# 로깅 설정
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 데이터베이스 연결 옵션
connect_args = {}
if "sqlite" in database_url:
    connect_args = {"check_same_thread": False}

# 메타데이터 설정
try:
    from backend.models.maintenance import Base
    target_metadata = Base.metadata
except ImportError as e:
    logger.error(f"모델 메타데이터 로드 실패: {e}")
    raise

def run_migrations_offline() -> None:
    """오프라인 마이그레이션 실행"""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        include_schemas=True,
    )

    with context.begin_transaction():
        logger.info("오프라인 모드에서 마이그레이션 실행")
        context.run_migrations()
        logger.info("마이그레이션 완료")

def run_migrations_online() -> None:
    """온라인 마이그레이션 실행"""
    configuration = config.get_section(config.config_ini_section, {})
    
    # 데이터베이스 연결 생성
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    with connectable.connect() as connection:
        # 데이터베이스 연결 확인
        try:
            connection.execute(text("SELECT 1"))
            logger.info("데이터베이스 연결 성공")
        except Exception as e:
            logger.error(f"데이터베이스 연결 실패: {e}")
            raise
        
        # 트랜잭션 내에서 마이그레이션 실행
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_schemas=True,
        )

        with context.begin_transaction():
            logger.info(f"마이그레이션 시작 - 대상: {database_url.split('@')[-1]}")
            context.run_migrations()
            logger.info("마이그레이션 완료")

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online() 