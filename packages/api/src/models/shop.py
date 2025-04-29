"""
정비소 모델 정의
"""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .base import Base


class ShopModel(Base):
    """정비소 모델"""

    __tablename__ = "shops"

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    address = Column(Text, nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
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
    schedules = relationship("MaintenanceScheduleModel", back_populates="shop")

    def __repr__(self):
        return f"<ShopModel(id={self.id}, name={self.name})>"

    def validate(self) -> List[str]:
        """모델 유효성 검사"""
        errors = []

        if not self.name:
            errors.append("정비소 이름은 필수입니다.")

        if not self.address:
            errors.append("정비소 주소는 필수입니다.")

        if not self.phone:
            errors.append("정비소 전화번호는 필수입니다.")

        return errors
