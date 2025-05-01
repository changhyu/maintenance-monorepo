"""
Git 작업 로그 테이블 생성 마이그레이션

이 스크립트는 Git 작업 로그를 저장하기 위한 git_operation_logs 테이블을 생성합니다.
"""

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Boolean, 
    MetaData, Table, Enum, create_engine
)
from sqlalchemy.sql import func
from backend.core.config import settings
from backend.models.git_operation_log import GitOperationType, GitOperationStatus

# 데이터베이스 URL 가져오기
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# 엔진 생성
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 메타데이터 객체 생성
metadata = MetaData()

# Git 작업 로그 테이블 정의
git_operation_logs = Table(
    "git_operation_logs",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("operation_type", Enum(GitOperationType), nullable=False, index=True),
    Column("status", Enum(GitOperationStatus), nullable=False, server_default="success"),
    Column("user_id", Integer, ForeignKey("users.id"), nullable=True),
    Column("repository_path", String(255), nullable=False),
    Column("branch_name", String(100), nullable=True),
    Column("commit_hash", String(40), nullable=True),
    Column("message", String(255), nullable=True),
    Column("details", Text, nullable=True),
    Column("error_message", Text, nullable=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now(), nullable=False)
)

def upgrade():
    """
    마이그레이션 적용: Git 작업 로그 테이블 생성
    """
    # metadata에서 git_operation_logs 테이블 생성
    metadata.create_all(engine, tables=[git_operation_logs])
    
    print("Git 작업 로그 테이블이 성공적으로 생성되었습니다.")

def downgrade():
    """
    마이그레이션 롤백: Git 작업 로그 테이블 삭제
    """
    # git_operation_logs 테이블 삭제
    git_operation_logs.drop(engine)
    
    print("Git 작업 로그 테이블이 성공적으로 삭제되었습니다.")

if __name__ == "__main__":
    # 마이그레이션 적용
    upgrade()