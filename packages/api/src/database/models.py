"""
Database models for SQLAlchemy.
"""

import logging
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from typing import Optional

try:
    from . import Base
except ImportError:
    Base = declarative_base()
    
# 로거 설정
logger = logging.getLogger(__name__)

logger.info("데이터베이스 모델 로드 중...")

# Shop 관련 모델
class Shop(Base):
    """정비소 모델"""
    __tablename__ = "shops"
    
    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)
    status = Column(String(20), default="ACTIVE")
    description = Column(Text, nullable=True)
    address = Column(String(200), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    website = Column(String(200), nullable=True)
    
    # 위치 정보
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # 시간 정보
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    services = relationship("ShopService", back_populates="shop")
    reviews = relationship("ShopReview", back_populates="shop")
    images = relationship("ShopImage", back_populates="shop")
    technicians = relationship("Technician", back_populates="shop")
    
    @property
    def location(self):
        """위치 정보 반환"""
        class Location:
            def __init__(self, lat, lng):
                self.latitude = lat
                self.longitude = lng
        return Location(self.latitude, self.longitude)
    
    def __repr__(self):
        return f"<Shop {self.name}>"


class ShopService(Base):
    """정비소 서비스 모델"""
    __tablename__ = "shop_services"
    
    id = Column(String(36), primary_key=True)
    shop_id = Column(String(36), ForeignKey("shops.id"), nullable=False)
    service_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    
    # Relationships
    shop = relationship("Shop", back_populates="services")
    
    def __repr__(self):
        return f"<ShopService {self.service_type}>"


class ShopReview(Base):
    """정비소 리뷰 모델"""
    __tablename__ = "shop_reviews"
    
    id = Column(String(36), primary_key=True)
    shop_id = Column(String(36), ForeignKey("shops.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    title = Column(String(100), nullable=True)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    shop = relationship("Shop", back_populates="reviews")
    user = relationship("User")
    
    def __repr__(self):
        return f"<ShopReview {self.id}>"


class ShopImage(Base):
    """정비소 이미지 모델"""
    __tablename__ = "shop_images"
    
    id = Column(String(36), primary_key=True)
    shop_id = Column(String(36), ForeignKey("shops.id"), nullable=False)
    file_name = Column(String(100), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=True)
    file_size = Column(Integer, nullable=True)
    is_main = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relationships
    shop = relationship("Shop", back_populates="images")
    
    def __repr__(self):
        return f"<ShopImage {self.file_name}>"


class Technician(Base):
    """정비소 기술자 모델"""
    __tablename__ = "technicians"
    
    id = Column(String(36), primary_key=True)
    shop_id = Column(String(36), ForeignKey("shops.id"), nullable=False)
    name = Column(String(100), nullable=False)
    specialty = Column(String(100), nullable=True)
    experience_years = Column(Integer, nullable=True)
    certification = Column(String(200), nullable=True)
    bio = Column(Text, nullable=True)
    
    # Relationships
    shop = relationship("Shop", back_populates="technicians")
    
    def __repr__(self):
        return f"<Technician {self.name}>"


class User(Base):
    """사용자 모델"""
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True)
    email = Column(String(100), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), default="USER")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    def __repr__(self):
        return f"<User {self.email}>"


logger.info("데이터베이스 모델 로드 완료") 