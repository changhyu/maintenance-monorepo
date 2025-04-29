"""
정비 관련 데이터베이스 모델 정의
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from sqlalchemy import (
    Column, DateTime, Enum as SQLEnum, Float, ForeignKey, Integer, String, Text
)
from sqlalchemy.orm import relationship

from .base import Base


class MaintenanceStatus(str, Enum):
    """정비 상태 열거형"""

    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DELAYED = "delayed"


class MaintenanceType(str, Enum):
    """정비 유형 열거형"""

    REGULAR = "regular"
    OIL_CHANGE = "oil_change"
    INSPECTION = "inspection"
    REPAIR = "repair"
    EMERGENCY = "emergency"
    RECALL = "recall"
    OTHER = "other"


class PartCondition(str, Enum):
    """부품 상태 열거형"""

    NEW = "new"
    USED = "used"
    REFURBISHED = "refurbished"


class Maintenance(Base):
    """정비 정보 모델"""

    __tablename__ = "maintenance"

    id = Column(String(36), primary_key=True, index=True)
    vehicle_id = Column(
        String(36), ForeignKey("vehicles.id"), nullable=False, index=True
    )
    type = Column(String(50), nullable=False, index=True)
    description = Column(String(255), nullable=False)
    date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    status = Column(
        String(50),
        default=MaintenanceStatus.SCHEDULED.value,
        nullable=False,
        index=True,
    )
    cost = Column(Float, default=0.0)
    mileage = Column(Integer)
    performed_by = Column(String(100))
    provider = Column(String(100))
    notes = Column(Text)
    completion_date = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # 관계 설정
    vehicle = relationship("Vehicle", back_populates="maintenance_records", lazy="selectin")
    documents = relationship(
        "MaintenanceDocumentModel",
        back_populates="maintenance",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    parts = relationship(
        "MaintenancePartModel",
        back_populates="maintenance",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    def __repr__(self):
        return f"<Maintenance {self.id[:8]} - {self.type} for vehicle {self.vehicle_id[:8]}>"

    @property
    def is_completed(self):
        """정비가 완료되었는지 여부"""
        return self.status == MaintenanceStatus.COMPLETED.value

    @property
    def total_parts_cost(self):
        """모든 부품 비용의 합계 반환"""
        return sum(part.total_cost for part in self.parts)

    def before_save(self):
        """저장 전 총 비용 자동 계산"""
        self.total_cost = self.calculate_total_cost


class MaintenanceDocumentModel(Base):
    """정비 문서 모델"""

    __tablename__ = "maintenance_documents"

    id = Column(String(36), primary_key=True, index=True)
    maintenance_id = Column(
        String(36), ForeignKey("maintenance.id"), nullable=False, index=True
    )
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(512), nullable=False)
    file_type = Column(String(100))
    file_size = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    description = Column(String(255))

    # 관계 설정
    maintenance = relationship("Maintenance", back_populates="documents")

    def __repr__(self):
        return f"<MaintenanceDocument {self.id[:8]} - {self.file_name}>"


class MaintenancePartModel(Base):
    """정비 부품 모델"""

    __tablename__ = "maintenance_parts"

    id = Column(String(36), primary_key=True, index=True)
    maintenance_id = Column(
        String(36), ForeignKey("maintenance.id"), nullable=False, index=True
    )
    name = Column(String(255), nullable=False)
    part_number = Column(String(100))
    quantity = Column(Integer, default=1)
    unit_cost = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    replaced = Column(String(1), default="Y")  # Y/N
    condition = Column(
        String(50), default=PartCondition.NEW.value
    )  # new, used, refurbished

    # 관계 설정
    maintenance = relationship("Maintenance", back_populates="parts")

    def __repr__(self):
        return f"<MaintenancePart {self.id[:8]} - {self.name}>"

    @property
    def calculate_total_cost(self):
        """단가와 수량을 기반으로 총 비용 계산"""
        return self.unit_cost * self.quantity


# 호환성을 위한 별칭 추가
MaintenanceModel = Maintenance
MaintenanceRecord = Maintenance


class MaintenanceArchiveModel(Base):
    """정비 기록 아카이브 모델"""

    __tablename__ = "maintenance_archives"

    id = Column(String(36), primary_key=True, index=True)
    maintenance_id = Column(String(36), nullable=False, index=True)
    vehicle_id = Column(String(36), nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)
    description = Column(String(255), nullable=False)
    date = Column(DateTime, nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True)
    cost = Column(Float, default=0.0)
    mileage = Column(Integer)
    performed_by = Column(String(100))
    provider = Column(String(100))
    notes = Column(Text)
    completion_date = Column(DateTime, nullable=True, index=True)
    archived_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<MaintenanceArchive {self.id[:8]} - {self.type} for vehicle {self.vehicle_id[:8]}>"
