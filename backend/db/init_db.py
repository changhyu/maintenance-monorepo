"""
데이터베이스 초기화 스크립트
필요한 테이블을 생성하고 기본 데이터를 추가합니다.
"""
# 절대 경로에서 상대 경로로 변경하여 프로젝트 내 일관성 유지
from ..db.session import SessionLocal, engine, async_engine, AsyncSessionLocal
from ..db.base import Base  # 통합된 Base 참조
from ..models.user import User, UserRole
from ..models.role import Role
from ..models.permission import Permission, RolePermission
from ..models.git_operation_log import GitOperationLog  # Git 작업 로그 모델
# 아래와 같이 만일 추가로 필요한 모델이 있다면 추가
# from ..models.inquiry import Inquiry
# from ..models.maintenance import Maintenance
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
import asyncio

logger = logging.getLogger(__name__)

async def init_db():
    """
    데이터베이스 초기화 함수 (비동기)
    필요한 테이블을 생성하고 기본 데이터를 추가합니다.
    """
    # 데이터베이스 세션 생성 (동기식)
    db = SessionLocal()
    
    try:
        # 테이블 생성
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        
        # 권한 생성
        logger.info("Creating permissions...")
        permissions_data = {
            "user:create": {"name": "user:create", "description": "사용자 생성 권한"},
            "user:read": {"name": "user:read", "description": "사용자 조회 권한"},
            "user:update": {"name": "user:update", "description": "사용자 수정 권한"},
            "user:delete": {"name": "user:delete", "description": "사용자 삭제 권한"},
            "role:manage": {"name": "role:manage", "description": "역할 관리 권한"},
            "system:settings": {"name": "system:settings", "description": "시스템 설정 권한"},
            "maintenance:create": {"name": "maintenance:create", "description": "정비 기록 생성 권한"},
            "maintenance:read": {"name": "maintenance:read", "description": "정비 기록 조회 권한"},
            "maintenance:update": {"name": "maintenance:update", "description": "정비 기록 수정 권한"},
            "maintenance:delete": {"name": "maintenance:delete", "description": "정비 기록 삭제 권한"},
            # Git 관련 권한 추가
            "git:read": {"name": "git:read", "description": "Git 리소스 읽기 권한"},
            "git:write": {"name": "git:write", "description": "Git 리소스 쓰기 권한"},
            "admin:read": {"name": "admin:read", "description": "관리자 읽기 권한"},
            "admin:write": {"name": "admin:write", "description": "관리자 쓰기 권한"},
            
            # 렌트카 관련 권한 추가
            "rental:create": {"name": "rental:create", "description": "렌트 기록 생성 권한"},
            "rental:read": {"name": "rental:read", "description": "렌트 기록 조회 권한"},
            "rental:update": {"name": "rental:update", "description": "렌트 기록 수정 권한"},
            "rental:delete": {"name": "rental:delete", "description": "렌트 기록 삭제 권한"},
            "rental:checkout": {"name": "rental:checkout", "description": "차량 대여 처리 권한"},
            "rental:checkin": {"name": "rental:checkin", "description": "차량 반납 처리 권한"},
            "rental:payment": {"name": "rental:payment", "description": "렌트 결제 관리 권한"},
            "reservation:create": {"name": "reservation:create", "description": "예약 생성 권한"},
            "reservation:read": {"name": "reservation:read", "description": "예약 조회 권한"},
            "reservation:update": {"name": "reservation:update", "description": "예약 수정 권한"},
            "reservation:delete": {"name": "reservation:delete", "description": "예약 삭제 권한"},
            "fleet:manage": {"name": "fleet:manage", "description": "차량 플릿 관리 권한"},
        }
        
        # 권한 추가
        permissions = {}
        for perm_name, perm_data in permissions_data.items():
            # 권한이 이미 존재하는지 확인
            existing_perm = db.query(Permission).filter_by(name=perm_name).first()
            if existing_perm:
                logger.info(f"Permission already exists: {perm_name}")
                permissions[perm_name] = existing_perm
            else:
                new_perm = Permission(**perm_data)
                db.add(new_perm)
                db.flush()  # 생성된 권한의 ID를 얻기 위해 flush
                logger.info(f"Permission created: {perm_name}")
                permissions[perm_name] = new_perm
        
        # 역할 생성
        logger.info("Creating roles...")
        # 관리자 역할 생성
        admin_role = db.query(Role).filter_by(name="Admin").first()
        if not admin_role:
            admin_role = Role(name="Admin", description="관리자")
            db.add(admin_role)
            logger.info("Admin role created")
            
        # 일반 사용자 역할 생성
        user_role = db.query(Role).filter_by(name="User").first()
        if not user_role:
            user_role = Role(name="User", description="일반 사용자")
            db.add(user_role)
            logger.info("User role created")

        # Git 담당자 역할 생성
        git_manager_role = db.query(Role).filter_by(name="GitManager").first()
        if not git_manager_role:
            git_manager_role = Role(name="GitManager", description="Git 담당자")
            db.add(git_manager_role)
            logger.info("GitManager role created")
            
        # 렌트카 관리자 역할 생성
        rental_manager_role = db.query(Role).filter_by(name="RentalManager").first()
        if not rental_manager_role:
            rental_manager_role = Role(name="RentalManager", description="렌트카 관리자")
            db.add(rental_manager_role)
            logger.info("RentalManager role created")
        
        # 렌트카 직원 역할 생성
        rental_staff_role = db.query(Role).filter_by(name="RentalStaff").first()
        if not rental_staff_role:
            rental_staff_role = Role(name="RentalStaff", description="렌트카 직원")
            db.add(rental_staff_role)
            logger.info("RentalStaff role created")
        
        db.flush()
        
        # 역할-권한 관계 설정 (기존 관계는 삭제 후 다시 생성)
        logger.info("Setting role permissions...")
        db.query(RolePermission).filter_by(role_id=admin_role.id).delete()
        
        # 관리자 역할에 모든 권한 부여
        for perm in permissions.values():
            db.add(RolePermission(role_id=admin_role.id, permission_id=perm.id))
        logger.info("Admin role permissions set")
        
        # 일반 사용자 역할에 제한적인 권한 부여
        db.query(RolePermission).filter_by(role_id=user_role.id).delete()
        db.add(RolePermission(role_id=user_role.id, permission_id=permissions["user:read"].id))
        db.add(RolePermission(role_id=user_role.id, permission_id=permissions["maintenance:read"].id))
        db.add(RolePermission(role_id=user_role.id, permission_id=permissions["git:read"].id))
        logger.info("User role permissions set")

        # Git 담당자 역할에 Git 관련 권한 부여
        db.query(RolePermission).filter_by(role_id=git_manager_role.id).delete()
        db.add(RolePermission(role_id=git_manager_role.id, permission_id=permissions["git:read"].id))
        db.add(RolePermission(role_id=git_manager_role.id, permission_id=permissions["git:write"].id))
        db.add(RolePermission(role_id=git_manager_role.id, permission_id=permissions["user:read"].id))
        logger.info("GitManager role permissions set")
        
        # 렌트카 관리자 역할에 권한 부여
        db.query(RolePermission).filter_by(role_id=rental_manager_role.id).delete()
        # 렌트카 관리에 필요한 모든 권한 추가
        rental_manager_permissions = [
            "rental:create", "rental:read", "rental:update", "rental:delete", 
            "rental:checkout", "rental:checkin", "rental:payment",
            "reservation:create", "reservation:read", "reservation:update", "reservation:delete",
            "fleet:manage",
            "vehicle:read", "vehicle:create", "vehicle:update", "vehicle:delete",
            "maintenance:read", "maintenance:create"
        ]
        
        for perm_name in rental_manager_permissions:
            if perm_name in permissions:
                db.add(RolePermission(role_id=rental_manager_role.id, permission_id=permissions[perm_name].id))
        logger.info("RentalManager role permissions set")
        
        # 렌트카 직원 역할에 제한적인 권한 부여
        db.query(RolePermission).filter_by(role_id=rental_staff_role.id).delete()
        rental_staff_permissions = [
            "rental:read", "rental:checkout", "rental:checkin",
            "reservation:read", "reservation:create", "reservation:update",
            "vehicle:read", "maintenance:read"
        ]
        
        for perm_name in rental_staff_permissions:
            if perm_name in permissions:
                db.add(RolePermission(role_id=rental_staff_role.id, permission_id=permissions[perm_name].id))
        logger.info("RentalStaff role permissions set")
        
        # 테스트 사용자 생성
        logger.info("Creating test users...")
        # 관리자 사용자 생성
        admin_user = db.query(User).filter_by(email="admin@example.com").first()
        if not admin_user:
            admin_user = User(
                name="admin",
                email="admin@example.com",
                password_hash="$2b$12$hNf5HnU5zD1Z8YGliVVd8u/hFJ7MgR2SX4.Ti9JO.S9z6gGCgzhF2",  # 'password'
                is_active=True,
                role=UserRole.ADMIN
            )
            db.add(admin_user)
            logger.info("Admin user created")
        
        # 일반 사용자 생성
        normal_user = db.query(User).filter_by(email="user@example.com").first()
        if not normal_user:
            normal_user = User(
                name="user",
                email="user@example.com",
                password_hash="$2b$12$hNf5HnU5zD1Z8YGliVVd8u/hFJ7MgR2SX4.Ti9JO.S9z6gGCgzhF2",  # 'password'
                is_active=True,
                role=UserRole.USER
            )
            db.add(normal_user)
            logger.info("Normal user created")

        # Git 담당자 사용자 생성
        git_manager = db.query(User).filter_by(email="gitmanager@example.com").first()
        if not git_manager:
            git_manager = User(
                name="gitmanager",
                email="gitmanager@example.com",
                password_hash="$2b$12$hNf5HnU5zD1Z8YGliVVd8u/hFJ7MgR2SX4.Ti9JO.S9z6gGCgzhF2",  # 'password'
                is_active=True,
                role=UserRole.MANAGER
            )
            db.add(git_manager)
            logger.info("Git manager user created")
        
        # 렌트카 관리자 사용자 생성
        rental_manager = db.query(User).filter_by(email="rental_manager@example.com").first()
        if not rental_manager:
            rental_manager = User(
                name="rental_manager",
                email="rental_manager@example.com",
                password_hash="$2b$12$hNf5HnU5zD1Z8YGliVVd8u/hFJ7MgR2SX4.Ti9JO.S9z6gGCgzhF2",  # 'password'
                is_active=True,
                role=UserRole.MANAGER
            )
            db.add(rental_manager)
            logger.info("Rental manager user created")
        
        # 렌트카 직원 사용자 생성
        rental_staff = db.query(User).filter_by(email="rental_staff@example.com").first()
        if not rental_staff:
            rental_staff = User(
                name="rental_staff",
                email="rental_staff@example.com",
                password_hash="$2b$12$hNf5HnU5zD1Z8YGliVVd8u/hFJ7MgR2SX4.Ti9JO.S9z6gGCgzhF2",  # 'password'
                is_active=True,
                role=UserRole.USER
            )
            db.add(rental_staff)
            logger.info("Rental staff user created")
        
        # 변경사항 커밋
        db.commit()
        logger.info("Database initialization completed successfully")
    
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        db.rollback()
        raise
    
    finally:
        db.close()

# 동기적으로 init_db를 실행하기 위한 도우미 함수
def run_sync_init():
    """동기식으로 데이터베이스 초기화를 실행합니다."""
    asyncio.run(init_db())

if __name__ == "__main__":
    # 로깅 설정
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    # 데이터베이스 초기화
    run_sync_init()