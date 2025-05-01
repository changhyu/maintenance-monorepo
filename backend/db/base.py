# SQLAlchemy Base 클래스를 base_class.py에서 가져옵니다.
# 이로써 프로젝트 전체에서 일관된 Base 클래스를 사용할 수 있습니다.
from .base_class import Base

# 이 파일은 모든 모델 클래스를 임포트하여 Alembic이 마이그레이션 과정에서
# 모든 모델을 인식할 수 있도록 합니다.

# 모든 모델 임포트
# 이를 통해 Alembic에서 모델 처리를 인식할 수 있음
from ..models.git_operation_log import GitOperationLog
from ..models.inquiry import Inquiry
from ..models.maintenance import Maintenance
from ..models.maintenance_record import MaintenanceRecord
from ..models.notification import Notification
from ..models.part import Part
from ..models.permission import Permission
from ..models.rental import Rental
from ..models.rental_company import RentalCompany
from ..models.role import Role
from ..models.shop import Shop
from ..models.task import Task
from ..models.technician import Technician
from ..models.user import User
from ..models.user_profile import UserProfile
from ..models.vehicle import Vehicle

# 모든 모델을 임포트한 후, Base.metadata에 등록됨
# Alembic이 자동으로 모든 모델을 감지하고 마이그레이션 작업을 수행