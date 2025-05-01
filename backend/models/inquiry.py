"""
문의 모델 정의
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime

from ..db.base import Base

class InquiryStatus(str, enum.Enum):
    """문의 상태 Enum"""
    PENDING = "PENDING"  # 대기 중
    IN_PROGRESS = "IN_PROGRESS"  # 처리 중
    RESOLVED = "RESOLVED"  # 해결됨
    CLOSED = "CLOSED"  # 종료됨

class InquiryType(str, enum.Enum):
    """문의 유형 Enum"""
    GENERAL = "GENERAL"  # 일반 문의
    TECHNICAL = "TECHNICAL"  # 기술 문의
    BILLING = "BILLING"  # 결제 문의
    FEATURE = "FEATURE"  # 기능 요청
    BUG = "BUG"  # 버그 보고
    OTHER = "OTHER"  # 기타

class Inquiry(Base):
    """문의 모델"""
    __tablename__ = "inquiries"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String, default=InquiryStatus.PENDING)
    type = Column(String, default=InquiryType.GENERAL)
    
    # 사용자 정보 - 실제 외래 키 사용
    user_id = Column(String(50), ForeignKey("users.id"))
    user = relationship("User", back_populates="inquiries", foreign_keys=[user_id])
    
    # 관리자 응답 정보 - foreign_keys 방식 사용
    response = Column(Text, nullable=True)
    responded_by_id = Column(String(50), ForeignKey("users.id"), nullable=True)
    # 여기서는 back_populates가 없음에 주의 - User와 1:N 관계
    responded_by = relationship("User", foreign_keys=[responded_by_id])
    
    # 날짜 정보
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    
    # 추가 메타 데이터
    is_urgent = Column(Boolean, default=False)
    category = Column(String(50), nullable=True)
    reference_id = Column(String(50), nullable=True)  # 관련 티켓 ID 등
    
    def __repr__(self):
        return f"<Inquiry(id={self.id}, title='{self.title}', status='{self.status}')>"