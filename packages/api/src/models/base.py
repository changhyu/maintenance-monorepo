"""
Base models for the API service.
"""

from datetime import datetime
import uuid
import json
from sqlalchemy import Column, DateTime, String
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.inspection import inspect

# 대신 데이터베이스 패키지에서 Base 임포트
from ..database import Base


class BaseModel(Base):
    """
    모든 모델에 공통적으로 적용되는 기본 모델 클래스.
    """

    __abstract__ = True

    @declared_attr
    def __tablename__(cls):
        """기본 테이블 이름을 클래스 이름을 기반으로 생성"""
        return cls.__name__.lower().replace('model', '')

    id = Column(
        String(36),
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
    
    def to_json(self):
        """모델을 JSON 문자열로 변환"""
        return json.dumps(self.to_dict(), default=str)
    
    @classmethod
    def from_dict(cls, data):
        """딕셔너리에서 모델 인스턴스 생성"""
        return cls(**{
            c.name: data.get(c.name)
            for c in cls.__table__.columns
            if c.name in data
        })
    
    @property
    def primary_key(self):
        """모델의 기본 키 값 반환"""
        return getattr(self, inspect(self.__class__).primary_key[0].name) 