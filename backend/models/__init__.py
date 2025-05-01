"""
Models package initialization

이 파일은 SQLAlchemy 모델 간의 관계를 올바르게 로드하기 위해 
명시적인 임포트 순서를 정의합니다.
"""

# 기본 모델 먼저 임포트
from backend.models.user import User
from backend.models.role import Role
from backend.models.permission import Permission
from backend.models.user_profile import UserProfile

# 업체 및 위치 관련 모델
from backend.models.rental_company import RentalCompany

# 차량 관련 모델
from backend.models.vehicle import Vehicle
from backend.models.vehicle import VehicleStatus, VehicleType

# 정비 관련 모델
from backend.models.maintenance import Maintenance

# 렌트 관련 모델
from backend.models.rental import Rental, Customer, Reservation, DamageReport, InsurancePolicy, RentalRate

# 알림 관련 모델
from backend.models.notification import Notification

# 메타데이터를 처리하여 모든 모델이 올바르게 로드되었는지 확인
from backend.db.base import Base
__all__ = [
    "User", "Role", "Permission", "UserProfile",
    "RentalCompany", 
    "Vehicle", "VehicleStatus", "VehicleType",
    "Maintenance",
    "Rental", "Customer", "Reservation", "DamageReport", "InsurancePolicy", "RentalRate",
    "Notification",
    "Base"
]