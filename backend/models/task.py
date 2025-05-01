from sqlalchemy import Column, String, Integer, Float, Boolean, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.mutable import MutableDict
import json
import time
from datetime import datetime

from backend.db.base import Base

class Task(Base):
    """백그라운드 작업 모델"""
    __tablename__ = "tasks"
    
    id = Column(String(255), primary_key=True, index=True)
    description = Column(String(500), nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    progress = Column(Integer, nullable=False, default=0)
    task_type = Column(String(100), nullable=False)
    parameters = Column(MutableDict.as_mutable(JSON), nullable=True, default=lambda: {})
    result = Column(MutableDict.as_mutable(JSON), nullable=True, default=lambda: {})
    error = Column(Text, nullable=True)
    created_at = Column(Float, nullable=False, default=time.time)
    updated_at = Column(Float, nullable=False, default=time.time, onupdate=time.time)
    
    def to_dict(self):
        """모델을 딕셔너리로 변환"""
        return {
            "id": self.id,
            "description": self.description,
            "status": self.status,
            "progress": self.progress,
            "task_type": self.task_type,
            "parameters": self.parameters,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "created_at_iso": datetime.fromtimestamp(self.created_at).isoformat(),
            "updated_at_iso": datetime.fromtimestamp(self.updated_at).isoformat(),
        } 