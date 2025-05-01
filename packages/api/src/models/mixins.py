"""
모델 믹스인 정의
"""
from sqlalchemy import Column, DateTime, func

class TimeStampMixin:
    """
    생성 및 수정 시간 필드를 자동으로 관리하는 Mixin
    """
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

class SoftDeleteMixin:
    """
    소프트 삭제 기능을 제공하는 Mixin
    """
    deleted_at = Column(DateTime, nullable=True)
    
    @property
    def is_deleted(self):
        return self.deleted_at is not None
    
    def delete(self):
        self.deleted_at = func.now()
    
    def restore(self):
        self.deleted_at = None
