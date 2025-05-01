"""
사용자 관련 데이터베이스 모델 정의
"""
from datetime import datetime
import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table, Enum as SQLEnum
from sqlalchemy.orm import relationship
# 상대 경로 임포트로 수정
from ..db.base import Base
from .permission import Permission
import enum
from typing import TYPE_CHECKING

# 타입 검사 시에만 임포트하는 조건부 임포트 사용
if TYPE_CHECKING:
    from .inquiry import Inquiry

# 사용자 역할 enum 추가
class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    USER = "USER"

# 사용자-권한 다대다 관계를 위한 연결 테이블
user_permission = Table(
    "user_permissions",
    Base.metadata,
    Column("user_id", String(50), ForeignKey("users.id"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id"), primary_key=True)
)


class User(Base):
    """사용자 모델"""
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=True)
    password_hash = Column(String(200), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.USER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 정의 - 모드 문자열 참조 방식으로 통일
    permissions = relationship("Permission", secondary=user_permission, back_populates="users")
    
    # Git 작업 로그 관계
    git_operations = relationship("GitOperationLog", back_populates="user")
    
    # 추가 관계
    vehicles = relationship("Vehicle", back_populates="owner")
    profile = relationship("UserProfile", back_populates="user", uselist=False)
    
    # 문의 관련 관계 - 문자열 참조 사용
    # 순환 참조 문제를 해결하기 위해 작은따옴표 사용
    inquiries = relationship("Inquiry", back_populates="user", foreign_keys='[Inquiry.user_id]')
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"