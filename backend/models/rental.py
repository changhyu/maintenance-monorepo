"""
렌트카 관련 모델 정의
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Boolean, Date, Text
from sqlalchemy.orm import relationship
from datetime import datetime, date
from typing import List, Optional
from backend.db.base import Base
import enum

class RentalStatus(str, enum.Enum):
    """렌트 상태 열거형"""
    RESERVED = "RESERVED"  # 예약됨
    ACTIVE = "ACTIVE"      # 대여 중
    COMPLETED = "COMPLETED"  # 반납 완료
    CANCELED = "CANCELED"  # 취소됨
    OVERDUE = "OVERDUE"    # 반납 지연

class PaymentStatus(str, enum.Enum):
    """결제 상태 열거형"""
    PENDING = "PENDING"    # 결제 대기
    PAID = "PAID"          # 결제 완료
    PARTIAL = "PARTIAL"    # 부분 결제
    REFUNDED = "REFUNDED"  # 환불됨
    FAILED = "FAILED"      # 결제 실패

class Customer(Base):
    """고객 정보 모델"""
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(100), unique=True, index=True)
    phone = Column(String(20))
    address = Column(String(200))
    city = Column(String(50))
    state = Column(String(50))
    zip_code = Column(String(20))
    license_number = Column(String(50))
    license_expiry = Column(Date)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    rentals = relationship("Rental", back_populates="customer", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Customer {self.first_name} {self.last_name} ({self.email})>"
    
    @property
    def full_name(self):
        """고객 전체 이름"""
        return f"{self.first_name} {self.last_name}"

class Rental(Base):
    """렌트 기록 모델"""
    __tablename__ = "rentals"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    vehicle_id = Column(String(50), ForeignKey("vehicles.id"), nullable=False)  # Integer에서 String으로 변경
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    pickup_location = Column(String(200))
    return_location = Column(String(200))
    status = Column(String(20), default=RentalStatus.RESERVED)
    payment_status = Column(String(20), default=PaymentStatus.PENDING)
    
    # 재무 관련 필드
    base_rate = Column(Float, nullable=False)  # 기본 요금
    additional_charges = Column(Float, default=0.0)  # 추가 요금
    discount = Column(Float, default=0.0)  # 할인
    deposit_amount = Column(Float, default=0.0)  # 보증금
    tax = Column(Float, default=0.0)  # 세금
    total_amount = Column(Float)  # 총 금액
    
    # 상태 추적
    actual_return_date = Column(DateTime)  # 실제 반납일
    odometer_start = Column(Integer)  # 출발 시 주행 거리
    odometer_end = Column(Integer)  # 반납 시 주행 거리
    fuel_level_start = Column(Float)  # 출발 시 연료 레벨 (%)
    fuel_level_end = Column(Float)  # 반납 시 연료 레벨 (%)
    notes = Column(Text)  # 특이사항
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(50), ForeignKey("users.id"))  # Integer에서 String으로 변경
    updated_by = Column(String(50), ForeignKey("users.id"))  # Integer에서 String으로 변경
    
    # 관계
    customer = relationship("Customer", back_populates="rentals")
    vehicle = relationship("Vehicle", back_populates="rentals")
    damage_reports = relationship("DamageReport", back_populates="rental", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])
    
    def __repr__(self):
        return f"<Rental {self.id} - {self.vehicle.make} {self.vehicle.model} ({self.status})>"
    
    @property
    def duration_days(self):
        """임대 기간 (일)"""
        delta = self.end_date - self.start_date
        return delta.days
    
    @property
    def is_active(self):
        """현재 활성 상태인지 여부"""
        return self.status == RentalStatus.ACTIVE
    
    @property
    def is_overdue(self):
        """반납 지연 여부"""
        if self.status != RentalStatus.ACTIVE:
            return False
        return datetime.utcnow() > self.end_date
    
    def calculate_total_amount(self):
        """총 요금 계산"""
        subtotal = self.base_rate - self.discount + self.additional_charges
        total = subtotal + self.tax
        self.total_amount = total
        return total
    
class Reservation(Base):
    """예약 정보 모델"""
    __tablename__ = "reservations"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    vehicle_id = Column(String(50), ForeignKey("vehicles.id"))  # Integer에서 String으로 변경
    vehicle_type = Column(String(20))  # 특정 차량이 아닌 차량 유형만 지정할 경우
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    pickup_location = Column(String(200))
    return_location = Column(String(200))
    status = Column(String(20), default="PENDING")  # PENDING, CONFIRMED, CANCELED
    
    # 예약 관련 정보
    reservation_code = Column(String(20), unique=True)
    estimated_price = Column(Float)
    special_requests = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    customer = relationship("Customer")
    vehicle = relationship("Vehicle", back_populates="reservations")
    
    def __repr__(self):
        return f"<Reservation {self.reservation_code} - {self.status}>"
    
class DamageReport(Base):
    """차량 손상 보고서 모델"""
    __tablename__ = "damage_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    rental_id = Column(Integer, ForeignKey("rentals.id"), nullable=False)
    report_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    damage_type = Column(String(50))  # 스크래치, 덴트, 파손 등
    description = Column(Text, nullable=False)
    location_on_vehicle = Column(String(100))  # 차량 내 손상 위치
    severity = Column(String(20))  # 경미, 중간, 심각 등
    repair_cost = Column(Float)  # 수리 예상 비용
    is_customer_responsible = Column(Boolean, default=True)  # 고객 책임 여부
    is_repaired = Column(Boolean, default=False)  # 수리 완료 여부
    repair_date = Column(DateTime)  # 수리 날짜
    photos_path = Column(String(200))  # 손상 사진 경로
    notes = Column(Text)  # 추가 메모
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(50), ForeignKey("users.id"))  # Integer에서 String으로 변경
    
    # 관계
    rental = relationship("Rental", back_populates="damage_reports")
    creator = relationship("User")
    
    def __repr__(self):
        return f"<DamageReport {self.id} - {self.damage_type} ({self.severity})>"

class InsurancePolicy(Base):
    """보험 정책 모델"""
    __tablename__ = "insurance_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    daily_rate = Column(Float, nullable=False)
    coverage_type = Column(String(50))  # 기본, 종합, 프리미엄 등
    coverage_details = Column(Text)
    deductible = Column(Float)  # 자기부담금
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<InsurancePolicy {self.name} ({self.coverage_type})>"

class RentalRate(Base):
    """렌탈 요금 정책 모델"""
    __tablename__ = "rental_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    vehicle_type = Column(String(20), nullable=False)  # 차량 유형 (SEDAN, SUV 등)
    daily_rate = Column(Float, nullable=False)  # 일일 요금
    weekly_rate = Column(Float)  # 주간 요금
    monthly_rate = Column(Float)  # 월간 요금
    weekend_rate = Column(Float)  # 주말 요금
    holiday_rate = Column(Float)  # 공휴일 요금
    mileage_allowance = Column(Integer)  # 허용 마일리지
    extra_mileage_fee = Column(Float)  # 초과 마일리지 요금
    late_return_fee_hourly = Column(Float)  # 시간당 연체 요금
    
    is_active = Column(Boolean, default=True)
    effective_from = Column(Date, nullable=False)  # 요금 적용 시작일
    effective_to = Column(Date)  # 요금 적용 종료일 (없으면 무기한)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<RentalRate {self.vehicle_type} - ${self.daily_rate}/day>"