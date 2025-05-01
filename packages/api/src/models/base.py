"""
베이스 모델 정의
"""
from sqlalchemy import Column, DateTime, func
from sqlalchemy.ext.declarative import declarative_base

# Base 클래스 선언
Base = declarative_base()

# 믹스인 클래스 정의
class TimeStampMixin:
    """
    생성 및 수정 시간 필드를 자동으로 관리하는 Mixin
    """
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
