"""
사용자 프로필 관련 데이터베이스 모델 정의
"""
from datetime import datetime
import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from backend.db.base import Base

class UserProfile(Base):
    """사용자 프로필 모델"""
    __tablename__ = "user_profiles"

    id = Column(String(50), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(50), ForeignKey("users.id"), unique=True, nullable=False)
    phone = Column(String(20), nullable=True)
    address = Column(String(200), nullable=True)
    company = Column(String(100), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 정의
    user = relationship("User", back_populates="profile")