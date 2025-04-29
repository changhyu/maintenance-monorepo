"""
사용자 관련 데이터베이스 모델 정의
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import relationship

from .base import Base, BaseModel


class UserRole(str, Enum):
    """사용자 역할 열거형"""

    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    USER = "USER"
    MECHANIC = "MECHANIC"


class UserModel(Base, BaseModel):
    """사용자 모델"""

    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(20), default=UserRole.USER.value, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # 관계 설정
    vehicles = relationship("Vehicle", back_populates="owner", lazy="selectin")

    def __repr__(self):
        return f"<UserModel(id={self.id}, email={self.email}, role={self.role})>"

    def validate(self) -> List[str]:
        """모델 유효성 검사"""
        errors = []

        if not self.email:
            errors.append("이메일은 필수입니다.")

        if not self.name:
            errors.append("이름은 필수입니다.")

        # 이메일 형식 검증 등 추가 가능

        return errors

    @property
    def is_admin(self):
        """관리자 여부 확인"""
        return self.role == UserRole.ADMIN.value

    @property
    def is_manager(self):
        """매니저 여부 확인"""
        return self.role == UserRole.MANAGER.value

    @property
    def is_mechanic(self):
        """정비사 여부 확인"""
        return self.role == UserRole.MECHANIC.value
