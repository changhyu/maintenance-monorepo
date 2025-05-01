from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.db.base import Base


class RentalCompany(Base):
    """렌터카 업체 모델"""
    __tablename__ = "rental_companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    business_number = Column(String(20), nullable=False, unique=True, index=True)  # 사업자 번호
    address = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(100))
    website = Column(String(255))
    description = Column(Text)
    logo_url = Column(String(255))
    is_active = Column(Boolean, default=True)
    
    # 평점 (1-5)
    rating = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    
    # 계약 정보
    contract_start_date = Column(DateTime)
    contract_end_date = Column(DateTime)
    commission_rate = Column(Float, default=0.0)  # 수수료율 (%)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(50), ForeignKey("users.id"))
    updated_by = Column(String(50), ForeignKey("users.id"))
    
    # 관계 설정
    vehicles = relationship("Vehicle", back_populates="rental_company")
    locations = relationship("RentalCompanyLocation", back_populates="rental_company")
    
    def __repr__(self):
        return f"<RentalCompany(id={self.id}, name='{self.name}', business_number='{self.business_number}')>"


class RentalCompanyLocation(Base):
    """렌터카 업체 지점 모델"""
    __tablename__ = "rental_company_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("rental_companies.id"), nullable=False)
    name = Column(String(100), nullable=False)
    address = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(100))
    is_airport = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    opening_hours = Column(String(255))  # JSON으로 저장하거나 별도 테이블로 분리할 수도 있음
    latitude = Column(Float)
    longitude = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    rental_company = relationship("RentalCompany", back_populates="locations")
    
    def __repr__(self):
        return f"<RentalCompanyLocation(id={self.id}, name='{self.name}', company_id={self.company_id})>"