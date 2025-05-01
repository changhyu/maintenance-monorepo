"""
Git 작업 로그 모델 정의

이 모듈은 사용자가 수행한 Git 작업을 기록하기 위한 데이터베이스 모델을 정의합니다.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime
from ..db.base import Base


class GitOperationType(str, enum.Enum):
    """Git 작업 유형"""
    COMMIT = "commit"
    ADD = "add"
    RESET = "reset"
    BRANCH_CREATE = "branch_create"
    CHECKOUT = "checkout"
    PULL = "pull"
    PUSH = "push"
    TAG = "tag"
    MERGE = "merge"
    CLONE = "clone"
    INIT = "init"


class GitOperationStatus(str, enum.Enum):
    """Git 작업 상태"""
    SUCCESS = "success"
    FAILURE = "failure"
    PENDING = "pending"


class GitOperationLog(Base):
    """
    Git 작업 로그 모델
    
    사용자가 수행한 Git 작업에 대한 로그를 저장합니다.
    """
    __tablename__ = "git_operation_logs"

    id = Column(Integer, primary_key=True, index=True)
    operation_type = Column(Enum(GitOperationType), nullable=False, index=True)
    status = Column(Enum(GitOperationStatus), nullable=False, default=GitOperationStatus.SUCCESS)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=True)  # Integer에서 String으로 변경
    repository_path = Column(String(255), nullable=False)
    branch_name = Column(String(100), nullable=True)
    commit_hash = Column(String(40), nullable=True)
    message = Column(String(255), nullable=True)
    details = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # 관계 정의
    user = relationship("User", back_populates="git_operations")

    def __repr__(self):
        """객체의 문자열 표현을 반환합니다."""
        return (
            f"<GitOperationLog(id={self.id}, "
            f"operation_type={self.operation_type}, "
            f"status={self.status}, "
            f"user_id={self.user_id}, "
            f"repository_path={self.repository_path}, "
            f"created_at={self.created_at})>"
        )

    @classmethod
    def create_log(cls, db, operation_type, user_id, repository_path, **kwargs):
        """
        새로운 Git 작업 로그를 생성합니다.
        
        Args:
            db: 데이터베이스 세션
            operation_type: 작업 유형(GitOperationType)
            user_id: 사용자 ID
            repository_path: 저장소 경로
            **kwargs: 추가 파라미터 (branch_name, commit_hash, message, details, status 등)
            
        Returns:
            생성된 GitOperationLog 객체
        """
        log = cls(
            operation_type=operation_type,
            user_id=user_id,
            repository_path=repository_path,
            **kwargs
        )
        db.add(log)
        db.flush()
        return log