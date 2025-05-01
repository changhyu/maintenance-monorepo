"""
사용자 모델 정의
"""
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship

from models.base import Base
from models.mixins import TimeStampMixin


class User(Base, TimeStampMixin):
    """
    사용자 정보 모델
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, comment="사용자 이름")
    email = Column(String(100), unique=True, nullable=False, comment="이메일")
    hashed_password = Column(String(128), nullable=False, comment="암호화된 비밀번호")
    
    # 사용자 정보
    full_name = Column(String(100), nullable=True, comment="전체 이름")
    phone = Column(String(20), nullable=True, comment="전화번호")
    role = Column(String(20), default="user", comment="사용자 역할(user, admin)")
    
    # 상태 정보
    is_active = Column(Boolean, default=True, comment="활성 상태 여부")
    is_verified = Column(Boolean, default=False, comment="이메일 인증 여부")
    last_login = Column(DateTime, nullable=True, comment="마지막 로그인 시간")
    
    # 관계 정의
    vehicles = relationship("Vehicle", backref="owner", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, email={self.email})>"
