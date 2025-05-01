from sqlalchemy import Column, Integer, String, Enum as SQLEnum, Date, Boolean, ForeignKey, DateTime, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime, date
from typing import List, Optional
from backend.db.base import Base
import enum
import uuid

# 여기서 VehicleStatus를 enum 클래스로 정의
class VehicleStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    MAINTENANCE = "MAINTENANCE"
    REPAIR = "REPAIR"
    OUT_OF_SERVICE = "OUT_OF_SERVICE"
    SOLD = "SOLD"  # 판매된 상태
    RENTED = "RENTED"  # 대여 중인 상태 추가

class VehicleType(str, enum.Enum):
    SEDAN = "SEDAN"
    SUV = "SUV"
    TRUCK = "TRUCK"
    BUS = "BUS"
    VAN = "VAN"
    COMPACT = "COMPACT"  # 소형차 추가
    LUXURY = "LUXURY"  # 고급차 추가
    CONVERTIBLE = "CONVERTIBLE"  # 컨버터블 추가
    OTHER = "OTHER"

class Vehicle(Base):
    __tablename__ = "vehicles"
    
    id = Column(String(50), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))  # UUID 기본값 추가
    make = Column(String(50), nullable=False, index=True)
    model = Column(String(50), nullable=False)
    year = Column(Integer, nullable=False)
    type = Column(String(20), nullable=False)
    color = Column(String(20))
    license_plate = Column(String(20), unique=True)
    vin = Column(String(50), unique=True)
    status = Column(String(20), default=VehicleStatus.AVAILABLE)
    
    # 소유자 관련 필드 추가
    owner_id = Column(String(50), ForeignKey("users.id"), nullable=True)
    
    # 렌터카 업체 관련 필드 추가
    rental_company_id = Column(Integer, ForeignKey("rental_companies.id"), nullable=True)
    company_vehicle_id = Column(String(50))  # 업체 내 차량 식별 번호
    
    # 재무 관련 필드
    purchase_price = Column(Float)
    purchase_date = Column(Date)
    sale_price = Column(Float)
    sale_date = Column(Date)
    depreciation_rate = Column(Float, default=0.15)  # 기본 감가상각률 15%
    current_value = Column(Float)
    finance_notes = Column(Text)
    insurance_cost = Column(Float)
    insurance_expiry = Column(Date)
    
    # 렌트카 관련 필드 추가
    daily_rental_rate = Column(Float)  # 일일 렌트 요금
    is_available_for_rent = Column(Boolean, default=True)  # 대여 가능 여부
    mileage = Column(Integer, default=0)  # 주행거리
    fuel_type = Column(String(20))  # 연료 타입 (휘발유, 경유, 전기 등)
    fuel_capacity = Column(Float)  # 연료 탱크 용량
    transmission = Column(String(20))  # 변속기 타입 (자동, 수동)
    passenger_capacity = Column(Integer)  # 승객 정원
    has_gps = Column(Boolean, default=False)  # GPS 유무
    has_bluetooth = Column(Boolean, default=False)  # 블루투스 유무
    has_sunroof = Column(Boolean, default=False)  # 선루프 유무
    has_heated_seats = Column(Boolean, default=False)  # 열선 시트 유무
    last_rented_date = Column(DateTime)  # 마지막 대여 일자
    times_rented = Column(Integer, default=0)  # 총 대여 횟수
    rental_revenue = Column(Float, default=0.0)  # 총 렌탈 수익
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    owner = relationship("User", back_populates="vehicles")
    
    def __repr__(self):
        return f"<Vehicle {self.make} {self.model} ({self.year})>"
        
    def calculate_current_value(self, as_of_date=None) -> float:
        """
        차량의 현재 가치를 계산합니다.
        감가상각 공식: 현재가치 = 구매가격 * (1 - 감가상각률)^경과년수
        
        Args:
            as_of_date: 가치 계산 기준일 (기본값: 현재 날짜)
        
        Returns:
            현재 가치 (Float)
        """
        if not self.purchase_price or not self.purchase_date:
            return None
            
        if not as_of_date:
            as_of_date = date.today()
            
        # 판매된 차량은 판매 날짜 기준으로 계산
        if self.status == VehicleStatus.SOLD and self.sale_date:
            as_of_date = self.sale_date
            
        # 경과 년수 계산 (실제 일수 기준으로 계산)
        days_owned = (as_of_date - self.purchase_date).days
        years_owned = days_owned / 365.0
        
        # 감가상각 적용
        depreciation_factor = (1 - self.depreciation_rate) ** years_owned
        current_value = self.purchase_price * depreciation_factor
        
        return current_value
        
    def calculate_roi(self) -> float:
        """
        투자수익률(ROI)을 계산합니다.
        ROI = (판매가격 - 구매가격 - 유지비용) / 구매가격
        
        Returns:
            투자수익률 (Float) 또는 판매되지 않은 경우 None
        """
        if not self.sale_price or not self.purchase_price:
            return None
            
        # 유지비용 계산 (정비 기록 비용의 총합)
        maintenance_cost = sum([record.cost or 0 for record in self.maintenance_records])
        
        # ROI 계산
        roi = (self.sale_price - self.purchase_price - maintenance_cost) / self.purchase_price
        
        return roi
        
    def get_maintenance_cost_summary(self) -> dict:
        """
        정비 비용 요약 정보를 반환합니다.
        
        Returns:
            정비 비용 요약 딕셔너리
        """
        if not self.maintenance_records:
            return {
                "total_cost": 0,
                "avg_cost_per_record": 0,
                "count": 0,
                "last_maintenance_date": None
            }
            
        # 전체 정비 비용
        valid_costs = [record.cost for record in self.maintenance_records if record.cost is not None]
        total_cost = sum(valid_costs)
        
        # 평균 정비 비용
        avg_cost = total_cost / len(valid_costs) if valid_costs else 0
        
        # 마지막 정비 날짜
        sorted_records = sorted(self.maintenance_records, key=lambda x: x.date, reverse=True)
        last_date = sorted_records[0].date if sorted_records else None
        
        return {
            "total_cost": total_cost,
            "avg_cost_per_record": avg_cost,
            "count": len(self.maintenance_records),
            "last_maintenance_date": last_date
        }
        
    def is_insurance_valid(self) -> bool:
        """
        보험 유효성 확인
        
        Returns:
            보험 유효 여부 (Boolean)
        """
        if not self.insurance_expiry:
            return False
            
        return self.insurance_expiry >= date.today()
    
    # 렌트카 관련 메서드 추가
    def is_currently_rented(self) -> bool:
        """
        현재 대여 중인지 확인
        
        Returns:
            대여 중 여부 (Boolean)
        """
        return self.status == VehicleStatus.RENTED
    
    def calculate_rental_availability(self, start_date: datetime, end_date: datetime) -> bool:
        """
        특정 기간에 대여 가능한지 확인
        
        Args:
            start_date: 대여 시작 날짜
            end_date: 대여 종료 날짜
            
        Returns:
            대여 가능 여부 (Boolean)
        """
        # 차량이 대여 불가능한 상태인 경우
        if not self.is_available_for_rent or self.status not in [VehicleStatus.AVAILABLE]:
            return False
        
        # 이미 해당 기간에 예약이 있는지 확인
        from sqlalchemy.orm import Session
        from backend.db.session import SessionLocal
        # 임포트를 함수 내부로 이동하여 순환 참조 방지
        from backend.models.rental import Rental, RentalStatus
        
        db = SessionLocal()
        try:
            # 해당 기간과 겹치는 대여 기록이 있는지 확인
            conflicting_rentals = db.query(Rental).filter(
                Rental.vehicle_id == self.id,
                Rental.status.in_([RentalStatus.RESERVED, RentalStatus.ACTIVE]),
                # 다음 조건 중 하나라도 만족하면 기간이 겹치는 것
                # 1. 새 예약의 시작일이 기존 예약 기간 내에 있음
                # 2. 새 예약의 종료일이 기존 예약 기간 내에 있음
                # 3. 새 예약 기간이 기존 예약을 완전히 포함함
                (
                    (Rental.start_date <= start_date) & (start_date <= Rental.end_date) |
                    (Rental.start_date <= end_date) & (end_date <= Rental.end_date) |
                    (start_date <= Rental.start_date) & (Rental.end_date <= end_date)
                )
            ).first()
            
            return conflicting_rentals is None
        finally:
            db.close()
    
    def update_rental_stats(self, rental_amount: float) -> None:
        """
        대여 통계 업데이트
        
        Args:
            rental_amount: 대여 금액
        """
        self.times_rented += 1
        self.last_rented_date = datetime.utcnow()
        self.rental_revenue += rental_amount or 0
        
    def calculate_rental_price(self, days: int, is_weekend: bool = False, is_holiday: bool = False) -> float:
        """
        대여 가격 계산
        
        Args:
            days: 대여 일수
            is_weekend: 주말 포함 여부
            is_holiday: 공휴일 포함 여부
            
        Returns:
            총 대여 가격 (Float)
        """
        if not self.daily_rental_rate:
            return 0.0
            
        # 기본 가격 계산
        base_price = self.daily_rental_rate * days
        
        # 주말 할증 (20%)
        if is_weekend:
            weekend_surcharge = base_price * 0.2
            base_price += weekend_surcharge
            
        # 공휴일 할증 (30%)
        if is_holiday:
            holiday_surcharge = base_price * 0.3
            base_price += holiday_surcharge
            
        return base_price

# 모든 클래스가 정의된 후에 관계를 설정
# SQLAlchemy의 지연 로딩 메커니즘을 이용
Vehicle.maintenance_records = relationship(
    "MaintenanceRecord", back_populates="vehicle", cascade="all, delete-orphan"
)
Vehicle.rentals = relationship(
    "Rental", back_populates="vehicle", cascade="all, delete-orphan"
)
Vehicle.reservations = relationship(
    "Reservation", back_populates="vehicle", cascade="all, delete-orphan"
)
Vehicle.rental_company = relationship(
    "RentalCompany", back_populates="vehicles"
)