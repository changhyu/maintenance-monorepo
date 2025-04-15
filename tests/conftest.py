"""
pytest 공통 설정 및 공유 fixture 모듈
"""
import os
import sys
import pytest
from fastapi.testclient import TestClient
from datetime import datetime
from unittest.mock import MagicMock, patch

# 루트 디렉토리를 Python 경로에 추가하여 패키지 임포트 가능하게 함
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from packages.api.src.main import app
from packages.api.src.core.security import create_access_token, create_refresh_token

# 모의 데이터
MOCK_VEHICLE = {
    "id": "ABC123",
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "mileage": 15000,
    "status": "active"
}

MOCK_MAINTENANCE = {
    "id": "maint1",
    "vehicle_id": "ABC123",
    "type": "oil_change",
    "date": "2023-01-01",
    "status": "scheduled",
    "description": "정기 오일 교체"
}

@pytest.fixture(scope="session")
def test_app():
    """테스트용 FastAPI 앱 인스턴스 반환"""
    # 필요한 환경 변수 설정
    os.environ["ENVIRONMENT"] = "test"
    os.environ["DEBUG"] = "true"
    os.environ["SECRET_KEY"] = "test_secret_key"
    
    # 테스트 DB URL 사용
    os.environ["DATABASE_URL"] = "sqlite:///./test.db"
    
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
        "password": "user1234"
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
        "password": "admin1234"
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
            "is_admin": test_user["is_admin"]
        }
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
            "is_admin": test_admin["is_admin"]
        }
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
        "owner_id": "test_user_id"
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
        "completed_at": None
    }

@pytest.fixture
def mock_maintenance_controller():
    """MaintenanceController 모킹"""
    with patch('packages.api.src.controllers.maintenance_controller.MaintenanceController') as MockController:
        controller = MockController.return_value
        
        # get_status 메서드 모킹
        controller.get_status.return_value = {
            "status": "active",
            "path": "/test/path",
            "git_status": {"branch": "main", "changes": 0},
            "maintenance_records_count": 10,
            "last_updated": datetime.now().isoformat()
        }
        
        # create_maintenance_commit 메서드 모킹
        controller.create_maintenance_commit.return_value = {
            "result": {
                "commit": "abcdef123456",
                "message": "Test commit",
                "success": True
            }
        }
        
        # get_vehicle_maintenance 메서드 모킹
        controller.get_vehicle_maintenance.return_value = {
            "vehicle_id": "ABC123",
            "vehicle_info": MOCK_VEHICLE,
            "maintenance_records": [MOCK_MAINTENANCE],
            "count": 1
        }
        
        # schedule_maintenance 메서드 모킹
        controller.schedule_maintenance.return_value = {
            "scheduled": True,
            "maintenance_id": "new_maint_id",
            "schedule_date": "2025-01-01",
            "maintenance_type": "oil_change"
        }
        
        # complete_maintenance 메서드 모킹
        controller.complete_maintenance.return_value = {
            "id": "maint1",
            "vehicle_id": "ABC123",
            "status": "completed",
            "completion_date": datetime.now().isoformat()
        }
        
        # get_maintenance_recommendations 메서드 모킹
        controller.get_maintenance_recommendations.return_value = {
            "vehicle_id": "ABC123",
            "recommendations": [
                {
                    "type": "oil_change",
                    "urgency": "high",
                    "description": "엔진 오일 교체가 필요합니다."
                }
            ],
            "last_maintenance_date": "2023-01-01"
        }
        
        # get_maintenance_statistics 메서드 모킹
        controller.get_maintenance_statistics.return_value = {
            "vehicle_id": "ABC123",
            "total_maintenance_count": 5,
            "recent_maintenance": [MOCK_MAINTENANCE],
            "cost_summary": {"total": 1500, "average": 300}
        }
        
        yield controller

@pytest.fixture
def mock_maintenance_repository():
    """MaintenanceRepository 모킹"""
    with patch('packages.api.src.repositories.maintenance_repository.MaintenanceRepository') as MockRepo:
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
            "description": "테스트 정비"
        }
        
        # update_maintenance 메서드 모킹
        repo.update_maintenance.return_value = {
            "id": "maint1",
            "vehicle_id": "ABC123",
            "type": "oil_change",
            "date": "2023-01-01",
            "status": "completed",
            "completion_date": datetime.now().isoformat()
        }
        
        yield repo

@pytest.fixture
def mock_vehicle_repository():
    """VehicleRepository 모킹"""
    with patch('packages.api.src.repositories.vehicle_repository.VehicleRepository') as MockRepo:
        repo = MockRepo.return_value
        
        # get_vehicle_by_id 메서드 모킹
        repo.get_vehicle_by_id.return_value = MOCK_VEHICLE
        
        # update_vehicle_status 메서드 모킹
        repo.update_vehicle_status.return_value = {**MOCK_VEHICLE, "status": "scheduled_maintenance"}
        
        yield repo

@pytest.fixture
def mock_git_service():
    """GitService 모킹"""
    with patch('packages.api.src.services.git_service.GitService') as MockService:
        service = MockService.return_value
        
        # get_status 메서드 모킹
        service.get_status.return_value = {
            "branch": "main",
            "changes": 0,
            "ahead": 0,
            "behind": 0
        }
        
        # create_commit 메서드 모킹
        service.create_commit.return_value = {
            "commit": "abcdef123456",
            "message": "Test commit",
            "success": True
        }
        
        # pull 메서드 모킹
        service.pull.return_value = {
            "success": True,
            "message": "Successfully pulled changes"
        }
        
        # push 메서드 모킹
        service.push.return_value = {
            "success": True,
            "message": "Successfully pushed changes"
        }
        
        yield service

@pytest.fixture(autouse=True)
def patch_all_services(mock_maintenance_controller, mock_maintenance_repository, mock_vehicle_repository, mock_git_service):
    """모든 서비스를 모킹하는 자동 픽스처"""
    with patch('packages.api.src.routers.maintenance.maintenance_controller', mock_maintenance_controller):
        yield