from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import List, Optional
from backend.db.base import Base

class Part(Base):
    __tablename__ = "parts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    part_number = Column(String(50), nullable=False, unique=True)
    description = Column(Text)
    price = Column(Float, nullable=False)
    category = Column(String(100))
    manufacturer = Column(String(100))
    stock = Column(Integer, default=0)
    location = Column(String(100))
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Part {self.name} ({self.part_number})>"