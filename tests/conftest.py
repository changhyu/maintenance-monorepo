"""
테스트 설정 파일

이 파일은 pytest 테스트 실행 시 필요한 설정과 픽스처를 제공합니다.
"""

import os
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, Generator, Tuple, Union
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# 외부 GitPython 라이브러리를 명시적으로 임포트하기 위해 sys.path를 조정
venv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".venv", "lib", "python3.9", "site-packages")
if os.path.exists(venv_path):
    sys.path.insert(0, venv_path)

try:
    import gitpython
    sys.modules["git"] = gitpython
    from gitpython import GitCommandError, InvalidGitRepositoryError, Repo
except ImportError:
    try:
        # 기존 방식 시도 (GitPython으로 직접 임포트)
        from git import GitCommandError, InvalidGitRepositoryError, Repo
    except ImportError:
        # 모듈이 존재하지 않을 경우 Mock 객체 사용
        print("경고: GitPython을 찾지 못해 Mock 객체를 사용합니다. 실제 git 기능은 작동하지 않습니다.")
        GitCommandError = type('GitCommandError', (Exception,), {})
        InvalidGitRepositoryError = type('InvalidGitRepositoryError', (Exception,), {})
        Repo = MagicMock()

from sqlalchemy.ext.asyncio import (AsyncSession, async_sessionmaker,
                                    create_async_engine)
from sqlalchemy.orm import DeclarativeBase

from gitmanager.services.git_service import GitService
from packages.api.src.core.database import AsyncSession, get_db_session

# 테스트 환경 설정 (메트릭 등록 오류 방지)
os.environ["TESTING"] = "true"
os.environ["ENVIRONMENT"] = "test"
os.environ["DEBUG"] = "true"
os.environ["SECRET_KEY"] = "test_secret_key"

# 프로젝트 루트 디렉토리를 Python 경로에 추가
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
packages_dir = os.path.join(project_root, "packages", "api", "src")
sys.path.insert(0, packages_dir)

from packages.api.src.core.config import settings
from packages.api.src.core.database import AsyncSessionLocal, Base
from packages.api.src.core.logging import setup_logging
from packages.api.src.core.security import (create_access_token,
                                            create_refresh_token)
from packages.api.src.core.types import (FileHistory, GitBranch, GitChange,
                                         GitChanges, GitCommit, GitConfig,
                                         GitRemote, GitStatus, GitTag)
from packages.api.src.main import app

# 로깅 설정
setup_logging()

# 환경 변수에서 테스트 데이터베이스 설정 가져오기
TEST_DB_HOST = os.getenv("TEST_DB_HOST", "localhost")
TEST_DB_PORT = os.getenv("TEST_DB_PORT", "5432")
TEST_DB_NAME = os.getenv("TEST_DB_NAME", "maintenance_test")
TEST_DB_USER = os.getenv("TEST_DB_USER", "postgres")
TEST_DB_PASSWORD = os.getenv("TEST_DB_PASSWORD", "")

# 테스트 데이터베이스 URL 구성
TEST_DATABASE_URL = f"postgresql+asyncpg://{TEST_DB_USER}:{TEST_DB_PASSWORD}@{TEST_DB_HOST}:{TEST_DB_PORT}/{TEST_DB_NAME}"
settings.DATABASE_URL = TEST_DATABASE_URL


# 테스트용 세션 생성
async def get_test_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# 모의 데이터
MOCK_VEHICLE = {
    "id": "ABC123",
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "mileage": 15000,
    "status": "active",
}

MOCK_MAINTENANCE = {
    "id": "maint1",
    "vehicle_id": "ABC123",
    "type": "oil_change",
    "date": "2023-01-01",
    "status": "scheduled",
    "description": "정기 오일 교체",
}


@pytest.fixture(scope="session")
def test_app():
    """테스트용 FastAPI 앱 인스턴스 반환"""
    # 필요한 환경 변수 설정
    os.environ["ENVIRONMENT"] = "test"
    os.environ["DEBUG"] = "true"
    os.environ["SECRET_KEY"] = "test_secret_key"

    # 테스트 DB URL 사용
    os.environ["DATABASE_URL"] = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/maintenance_test"
    )

    # Redis 대신 메모리 캐시 사용 (테스트용)
    os.environ["REDIS_URL"] = "memory://"

    return app


@pytest.fixture(scope="function")
def client(test_app):
    """테스트 클라이언트 반환"""
    with TestClient(test_app) as test_client:
        yield test_client


@pytest.fixture
def test_user():
    """테스트용 사용자 정보"""
    return {
        "id": "test_user_id",
        "email": "user@example.com",
        "name": "테스트 사용자",
        "role": "user",
        "is_active": True,
        "is_admin": False,
        "password": "user1234",
    }


@pytest.fixture
def test_admin():
    """관리자 권한 테스트용 사용자 정보"""
    return {
        "id": "test_admin_id",
        "email": "admin@example.com",
        "name": "관리자",
        "role": "admin",
        "is_active": True,
        "is_admin": True,
        "password": "admin1234",
    }


@pytest.fixture
def token_headers(test_user):
    """인증 토큰이 포함된 HTTP 헤더"""
    access_token = create_access_token(
        subject=test_user["email"],
        extra_data={
            "user_id": test_user["id"],
            "name": test_user["name"],
            "role": test_user["role"],
            "is_admin": test_user["is_admin"],
        },
    )
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def admin_token_headers(test_admin):
    """관리자 권한 토큰이 포함된 HTTP 헤더"""
    access_token = create_access_token(
        subject=test_admin["email"],
        extra_data={
            "user_id": test_admin["id"],
            "name": test_admin["name"],
            "role": test_admin["role"],
            "is_admin": test_admin["is_admin"],
        },
    )
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def test_vehicle():
    """테스트용 차량 데이터"""
    return {
        "id": "test_vehicle_id",
        "plate_number": "123가4567",
        "make": "현대자동차",
        "model": "아반떼",
        "year": 2021,
        "owner_id": "test_user_id",
    }


@pytest.fixture
def test_maintenance():
    """테스트용 정비 데이터"""
    return {
        "id": "test_maintenance_id",
        "vehicle_id": "test_vehicle_id",
        "maintenance_type": "정기점검",
        "description": "엔진오일 교체",
        "status": "pending",
        "created_at": "2023-01-01T10:00:00",
        "scheduled_at": "2023-01-10T14:00:00",
        "completed_at": None,
    }


@pytest.fixture
def mock_maintenance_controller():
    """MaintenanceController 모킹"""
    with patch(
        "packages.api.src.controllers.maintenance_controller.MaintenanceController"
    ) as MockController:
        controller = MockController.return_value

        # get_status 메서드 모킹
        controller.get_status.return_value = {
            "status": "active",
            "path": "/test/path",
            "git_status": {"branch": "main", "changes": 0},
            "maintenance_records_count": 10,
            "last_updated": datetime.now().isoformat(),
        }

        # create_maintenance_commit 메서드 모킹
        controller.create_maintenance_commit.return_value = {
            "result": {
                "commit": "abcdef123456",
                "message": "Test commit",
                "success": True,
            }
        }

        # get_vehicle_maintenance 메서드 모킹
        controller.get_vehicle_maintenance.return_value = {
            "vehicle_id": "ABC123",
            "vehicle_info": MOCK_VEHICLE,
            "maintenance_records": [MOCK_MAINTENANCE],
            "count": 1,
        }

        # schedule_maintenance 메서드 모킹
        controller.schedule_maintenance.return_value = {
            "scheduled": True,
            "maintenance_id": "new_maint_id",
            "schedule_date": "2025-01-01",
            "maintenance_type": "oil_change",
        }

        # complete_maintenance 메서드 모킹
        controller.complete_maintenance.return_value = {
            "id": "maint1",
            "vehicle_id": "ABC123",
            "status": "completed",
            "completion_date": datetime.now().isoformat(),
        }

        # get_maintenance_recommendations 메서드 모킹
        controller.get_maintenance_recommendations.return_value = {
            "vehicle_id": "ABC123",
            "recommendations": [
                {
                    "type": "oil_change",
                    "urgency": "high",
                    "description": "엔진 오일 교체가 필요합니다.",
                }
            ],
            "last_maintenance_date": "2023-01-01",
        }

        # get_maintenance_statistics 메서드 모킹
        controller.get_maintenance_statistics.return_value = {
            "vehicle_id": "ABC123",
            "total_maintenance_count": 5,
            "recent_maintenance": [MOCK_MAINTENANCE],
            "cost_summary": {"total": 1500, "average": 300},
        }

        yield controller


@pytest.fixture
def mock_maintenance_repository():
    """MaintenanceRepository 모킹"""
    with patch(
        "packages.api.src.repositories.maintenance_repository.MaintenanceRepository"
    ) as MockRepo:
        repo = MockRepo.return_value

        # count_maintenance_records 메서드 모킹
        repo.count_maintenance_records.return_value = 10

        # get_maintenance_by_id 메서드 모킹
        repo.get_maintenance_by_id.return_value = MOCK_MAINTENANCE

        # get_maintenance_by_vehicle_id 메서드 모킹
        repo.get_maintenance_by_vehicle_id.return_value = [MOCK_MAINTENANCE]

        # create_maintenance 메서드 모킹
        repo.create_maintenance.return_value = {
            "id": "new_maint_id",
            "vehicle_id": "ABC123",
            "type": "oil_change",
            "date": "2025-01-01",
            "status": "scheduled",
            "description": "테스트 정비",
        }

        # update_maintenance 메서드 모킹
        repo.update_maintenance.return_value = {
            "id": "maint1",
            "vehicle_id": "ABC123",
            "type": "oil_change",
            "date": "2023-01-01",
            "status": "completed",
            "completion_date": datetime.now().isoformat(),
        }

        yield repo


@pytest.fixture
def mock_vehicle_repository():
    """VehicleRepository 모킹"""
    with patch(
        "packages.api.src.repositories.vehicle_repository.VehicleRepository"
    ) as MockRepo:
        repo = MockRepo.return_value

        # get_vehicle_by_id 메서드 모킹
        repo.get_vehicle_by_id.return_value = MOCK_VEHICLE

        # update_vehicle_status 메서드 모킹
        repo.update_vehicle_status.return_value = {
            **MOCK_VEHICLE,
            "status": "scheduled_maintenance",
        }

        yield repo


@pytest.fixture
def mock_git_service():
    """GitService 모킹"""
    with patch(
        "packages.api.src.controllers.maintenance_controller.GitService"
    ) as MockService:
        service = MockService.return_value

        # get_status 메서드 모킹
        service.get_status.return_value = {
            "branch": "main",
            "modified_files": 0,
            "has_changes": False,
            "last_commit": {
                "hash": "abcdef123456",
                "author": "Test User",
                "message": "Test commit message",
                "date": "2023-01-01 10:00:00",
            },
        }

        # create_commit 메서드 모킹
        service.create_commit.return_value = {
            "success": True,
            "commit": "abcdef123456",
            "message": "Test commit",
            "details": "1 file changed, 10 insertions(+), 2 deletions(-)",
        }

        # pull 메서드 모킹
        service.pull.return_value = {"success": True, "details": "Already up to date."}

        # push 메서드 모킹
        service.push.return_value = {
            "success": True,
            "branch": "main",
            "details": "Everything up-to-date",
        }

        yield service


@pytest.fixture
def mock_cache():
    """캐시 서비스 모킹"""
    with patch("packages.api.src.routers.schedule.get_cache") as MockCache:
        cache = MagicMock()

        # get 메서드 모킹
        cache.get.return_value = None

        # set 메서드 모킹
        cache.set.return_value = True

        # delete 메서드 모킹
        cache.delete.return_value = True

        # delete_pattern 메서드 모킹
        cache.delete_pattern.return_value = 0

        # exists 메서드 모킹
        cache.exists.return_value = False

        # clear 메서드 모킹
        cache.clear.return_value = True

        MockCache.return_value = cache
        yield cache


@pytest.fixture(autouse=True)
def patch_all_services(
    mock_maintenance_controller,
    mock_maintenance_repository,
    mock_vehicle_repository,
    mock_git_service,
    mock_cache,
):
    """모든 서비스를 모킹하는 자동 픽스처"""
    with patch(
        "packages.api.src.modules.maintenance.service.maintenance_service",
        mock_maintenance_controller,
    ), patch(
        "git.services.git_service.GitService", return_value=mock_git_service
    ), patch(
        "packages.api.src.core.cache.get_cache", return_value=mock_cache
    ):
        yield


def create_test_repository(
    repo_path: Union[str, Path] = None,
) -> Tuple[Path, GitService]:
    """테스트용 Git 저장소를 생성합니다.

    Args:
        repo_path: 저장소 경로 (None이면 임시 디렉토리 사용)

    Returns:
        Tuple[Path, GitService]: (저장소 경로, GitService 인스턴스)
    """
    if repo_path is None:
        repo_path = Path(pytest.tmp_path_factory.mktemp("test_repo"))
    else:
        repo_path = Path(repo_path)
        repo_path.mkdir(parents=True, exist_ok=True)

    os.chdir(repo_path)
    os.system("git init")

    git_service = GitService(str(repo_path))
    return repo_path, git_service


def cleanup_test_repository(repo_path: Union[str, Path]) -> None:
    """테스트 저장소를 정리합니다.

    Args:
        repo_path: 저장소 경로
    """
    repo_path = Path(repo_path)
    if repo_path.exists():
        shutil.rmtree(repo_path)


@pytest.fixture(scope="session")
def test_git_repo():
    """테스트용 Git 저장소를 생성합니다."""
    repo_path, _ = create_test_repository()
    yield repo_path
    cleanup_test_repository(repo_path)


@pytest.fixture(scope="session")
def git_service(test_git_repo):
    """GitService 인스턴스를 생성합니다."""
    return GitService(str(test_git_repo))


@pytest.fixture(scope="session")
async def db() -> AsyncGenerator:
    """데이터베이스 세션을 제공하는 fixture"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@pytest.fixture(scope="session")
def create_controller():
    """컨트롤러 생성 팩토리 함수"""

    def _create_controller(controller_type: str = "default"):
        from packages.api.src.controllers.maintenance_controller import \
            MaintenanceController

        controller = MaintenanceController(db_session=db, git_service=git_service)

        if controller_type == "security":
            # 보안 관련 추가 설정
            controller.security_enabled = True
        elif controller_type == "performance":
            # 성능 관련 추가 설정
            controller.performance_monitoring = True

        return controller

    return _create_controller


@pytest.fixture(scope="session")
def controller(create_controller):
    """기본 컨트롤러"""
    return create_controller()


@pytest.fixture(scope="session")
def security_controller(create_controller):
    """보안 컨트롤러"""
    return create_controller("security")


@pytest.fixture(scope="session")
def performance_controller(create_controller):
    """성능 컨트롤러"""
    return create_controller("performance")


@pytest.fixture
def auth_header():
    """인증 헤더 생성"""
    return {"Authorization": "Bearer test_token"}


@pytest.fixture
def sample_inventory_data():
    """샘플 인벤토리 데이터"""
    return {
        "id": "test_id",
        "name": "Test Item",
        "part_number": "TEST001",
        "category": "Test Category",
        "quantity": 10,
        "min_quantity": 5,
        "unit_cost": 100.0,
        "status": InventoryStatus.ACTIVE,
    }


@pytest.fixture
def sample_inventory_items():
    """샘플 인벤토리 아이템 목록"""
    return [
        InventoryItemModel(
            id="1",
            name="Item 1",
            part_number="P001",
            category="Category 1",
            quantity=10,
            min_quantity=5,
            status=InventoryItemStatus.ACTIVE.value,
        ),
        InventoryItemModel(
            id="2",
            name="Item 2",
            part_number="P002",
            category="Category 2",
            quantity=15,
            min_quantity=5,
            status=InventoryItemStatus.ACTIVE.value,
        ),
    ]


@pytest.fixture
def sample_low_stock_item():
    """샘플 저재고 아이템"""
    return InventoryItemModel(
        id="test-id",
        name="Test Item",
        part_number="TEST001",
        category="Test",
        quantity=3,
        min_quantity=5,
        status=InventoryItemStatus.LOW_STOCK.value,
    )


@pytest.fixture
def sample_transaction_data():
    """샘플 트랜잭션 데이터"""
    return {
        "item_id": "test-id",
        "quantity_change": 5,
        "transaction_type": TransactionType.IN,
        "notes": "Test transaction",
        "created_at": datetime.now(),
    }


@pytest.fixture
def mock_data():
    """모킹 데이터 생성 팩토리"""

    def _create_mock_data(data_type: str) -> Dict[str, Any]:
        base_data = {
            "vehicle": {
                "id": "ABC123",
                "make": "Toyota",
                "model": "Camry",
                "year": 2020,
                "mileage": 15000,
                "status": "active",
            },
            "maintenance": {
                "id": "maint1",
                "vehicle_id": "ABC123",
                "type": "oil_change",
                "date": "2023-01-01",
                "status": "scheduled",
                "description": "정기 오일 교체",
            },
            "inventory": {
                "id": "test_id",
                "name": "Test Item",
                "part_number": "TEST001",
                "category": "Test Category",
                "quantity": 10,
                "min_quantity": 5,
                "unit_cost": 100.0,
                "status": InventoryStatus.ACTIVE,
            },
        }
        return base_data.get(data_type, {})

    return _create_mock_data


@pytest.fixture
def mock_vehicle_data(mock_data):
    """차량 모킹 데이터"""
    return mock_data("vehicle")


@pytest.fixture
def mock_maintenance_data(mock_data):
    """정비 모킹 데이터"""
    return mock_data("maintenance")


@pytest.fixture
def mock_inventory_data(mock_data):
    """인벤토리 모킹 데이터"""
    return mock_data("inventory")


# 픽스처 정의
__all__ = [
    "get_test_db",
    "InventoryItem",
    "InventoryTransaction",
    "InventoryAdjustment",
]


import os
import sys
from pathlib import Path

# 프로젝트 루트 디렉토리를 시스템 경로에 추가
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# gitmanager 패키지 경로를 시스템 경로에 추가
gitmanager_path = project_root / "gitmanager"
if gitmanager_path.exists():
    sys.path.insert(0, str(gitmanager_path))

# git 모듈을 직접 가져올 수 있도록 설정
git_module_path = gitmanager_path / "git"
if git_module_path.exists():
    sys.path.insert(0, str(git_module_path))

# API 패키지 경로를 시스템 경로에 추가
api_path = project_root / "packages" / "api"
if api_path.exists():
    sys.path.insert(0, str(api_path))
    # src 모듈을 직접 가져올 수 있도록 설정
    api_src = api_path / "src"
    if api_src.exists():
        sys.path.insert(0, str(api_src))

# 환경 변수 설정
os.environ["TESTING"] = "true"
os.environ["DATABASE_URL"] = (
    "postgresql+asyncpg://postgres:postgres@localhost:5432/maintenance_test"
)
