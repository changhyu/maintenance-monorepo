"""
Base models for the API service.
"""

from datetime import datetime
import uuid
from sqlalchemy import Column, DateTime, String

# 대신 데이터베이스 패키지에서 Base 임포트
from ..database import Base


class BaseModel(Base):
    """
    모든 모델에 공통적으로 적용되는 기본 모델 클래스.
    """

    __abstract__ = True

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True
    )
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    
    def to_dict(self):
        """모델을 딕셔너리로 변환"""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns} 