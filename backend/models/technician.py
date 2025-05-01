from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, ARRAY, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import List, Optional
from backend.db.base import Base

class Technician(Base):
    __tablename__ = "technicians"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False)
    phone = Column(String(20))
    email = Column(String(100))
    specialties = Column(JSON, default=list)  # JSON 배열로 전문 분야 저장
    years_experience = Column(Integer, default=0)
    certification = Column(String(200))
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 정의
    shop = relationship("Shop", back_populates="technicians")
    
    def __repr__(self):
        return f"<Technician {self.name} (Shop: {self.shop_id})>"