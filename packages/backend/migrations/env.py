import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

from src.api.v1.database.base import Base

# Alembic Config 객체
config = context.config

# 로깅 설정 파일 해석
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 메타데이터 객체 추가
target_metadata = Base.metadata

# 데이터베이스 URL 환경 변수에서 가져오기
def get_url():
    return "postgresql://{user}:{password}@{host}:{port}/{name}".format(
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        name=os.getenv("DB_NAME", "maintenance_db"),
    )

def run_migrations_offline():
    """오프라인 마이그레이션 실행

    이 시나리오에서는 데이터베이스에 직접 연결하지 않고
    스크립트를 생성하여 나중에 실행할 수 있습니다.
    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """온라인 마이그레이션 실행

    이 시나리오에서는 엔진을 생성하고 연결하여
    마이그레이션을 직접 실행합니다.
    """
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online() 