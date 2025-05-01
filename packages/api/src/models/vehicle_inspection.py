"""
자동차 법정검사 모델 정의
"""

import uuid
import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, String, Integer, Boolean, Float, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship

try:
    from models.base import Base
    from models.mixins import TimeStampMixin
except ImportError as e:
    print(f"vehicle_inspection.py: 로컬 임포트 오류 - {e}")
    # 임포트 실패 시 기본 클래스 정의
    class Base:
        __tablename__ = ""
    
    class TimeStampMixin:
        created_at = None
        updated_at = None


class InspectionStatus(str, enum.Enum):
    """법정검사 상태 열거형"""
    PENDING = 'pending'         # 대기 중
    SCHEDULED = 'scheduled'     # 예정됨
    COMPLETED = 'completed'     # 완료됨
    EXPIRED = 'expired'         # 기한 만료
    FAILED = 'failed'           # 검사 불합격


class InspectionType(str, enum.Enum):
    """법정검사 유형 열거형"""
    REGULAR = 'regular'         # 정기검사
    EMISSION = 'emission'       # 배출가스 검사
    SAFETY = 'safety'           # 안전검사
    COMPREHENSIVE = 'comprehensive'  # 종합검사


class VehicleInspection(Base, TimeStampMixin):
    """
    차량 법정검사 모델
    
    법정검사 일정, 결과 및 관련 정보를 저장합니다.
    """
    __tablename__ = "vehicle_inspections"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vehicle_id = Column(String(36), ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False)
    
    # 검사 정보
    inspection_type = Column(Enum(InspectionType), nullable=False, default=InspectionType.REGULAR)
    due_date = Column(DateTime, nullable=False, comment="검사 예정일")
    inspection_date = Column(DateTime, nullable=True, comment="실제 검사일")
    status = Column(Enum(InspectionStatus), nullable=False, default=InspectionStatus.PENDING)
    location = Column(String(255), nullable=True, comment="검사 장소")
    inspector = Column(String(100), nullable=True, comment="검사관")
    
    # 검사 결과
    fee = Column(Integer, nullable=True, comment="검사 비용")
    passed = Column(Boolean, nullable=True, comment="합격 여부")
    certificate_number = Column(String(50), nullable=True, comment="검사 증명서 번호")
    next_due_date = Column(DateTime, nullable=True, comment="다음 검사 예정일")
    notes = Column(String(500), nullable=True, comment="비고")
    
    # 관계
    vehicle = relationship("Vehicle", back_populates="inspections")
    
    def __repr__(self) -> str:
        return f"<VehicleInspection(id={self.id}, vehicle_id={self.vehicle_id}, type={self.inspection_type}, status={self.status})>"