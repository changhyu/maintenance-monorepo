import time
import pytest
from typing import Dict, List, Any
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from fastapi import Request

from src.controllers.maintenance_controller import MaintenanceController
from src.core.cache_decorators import (
    cache_response, 
    cache_function,
    CacheLevel
)

# 테스트 데이터
TEST_VEHICLE_IDS = ["VH001", "VH002", "VH003", "VH004", "VH005"]
TEST_MAINTENANCE_DATA = {
    "VH001": {
        "maintenance_records": [{"id": "M1", "status": "completed", "date": "2023-01-01"}],
        "vehicle_info": {"model": "Model A", "year": 2020}
    },
    "VH002": {
        "maintenance_records": [{"id": "M2", "status": "scheduled", "date": "2023-02-01"}],
        "vehicle_info": {"model": "Model B", "year": 2021}
    },
    "VH003": {
        "maintenance_records": [{"id": "M3", "status": "in_progress", "date": "2023-03-01"}],
        "vehicle_info": {"model": "Model C", "year": 2019}
    },
    "VH004": {
        "maintenance_records": [{"id": "M4", "status": "completed", "date": "2023-04-01"}],
        "vehicle_info": {"model": "Model D", "year": 2022}
    },
    "VH005": {
        "maintenance_records": [{"id": "M5", "status": "scheduled", "date": "2023-05-01"}],
        "vehicle_info": {"model": "Model E", "year": 2018}
    }
}

# 모의 응답 클래스
class MockMaintenanceController:
    """정비 컨트롤러의 모의 구현"""
    
    def get_vehicle_maintenance(self, vehicle_id: str) -> Dict[str, Any]:
        """차량 정비 데이터 조회"""
        if vehicle_id in TEST_VEHICLE_IDS:
            return TEST_MAINTENANCE_DATA[vehicle_id]
        return {"error": "차량을 찾을 수 없습니다."}
    
    def get_maintenance_recommendations(self, vehicle_id: str) -> Dict[str, Any]:
        """차량 정비 권장사항 조회"""
        if vehicle_id in TEST_VEHICLE_IDS:
            return {
                "recommendations": [
                    {"type": "oil_change", "priority": "high", "due_date": "2023-06-01"},
                    {"type": "tire_rotation", "priority": "medium", "due_date": "2023-07-01"}
                ]
            }
        return {"error": "차량을 찾을 수 없습니다."}
    
    def get_maintenance_statistics(self, vehicle_id: str) -> Dict[str, Any]:
        """차량 정비 통계 조회"""
        if vehicle_id in TEST_VEHICLE_IDS:
            return {
                "total_maintenance": 5,
                "completed": 3,
                "scheduled": 2,
                "cost": {
                    "total": 1500,
                    "average": 300
                }
            }
        return {"error": "차량을 찾을 수 없습니다."}
    
    def get_status(self) -> Dict[str, Any]:
        """시스템 상태 조회"""
        return {
            "status": "ok",
            "version": "1.0.0",
            "uptime": 3600
        }
    
    def get_recent_maintenance_records(self, limit: int = 10) -> Dict[str, Any]:
        """최근 정비 기록 조회"""
        return {
            "records": [
                TEST_MAINTENANCE_DATA[vid]["maintenance_records"][0]
                for vid in TEST_VEHICLE_IDS[:limit]
            ]
        }
    
    def get_scheduled_maintenance(self, limit: int = 10) -> Dict[str, Any]:
        """예약된 정비 조회"""
        return {
            "scheduled": [
                {"vehicle_id": "VH002", "date": "2023-02-01", "type": "inspection"},
                {"vehicle_id": "VH005", "date": "2023-05-01", "type": "oil_change"}
            ][:limit]
        }
    
    def get_pending_approvals(self) -> Dict[str, Any]:
        """승인 대기 중인 정비 조회"""
        return {
            "pending": [
                {"id": "A1", "vehicle_id": "VH003", "type": "major_repair", "estimated_cost": 500}
            ]
        }
    
    def get_maintenance_summary(self) -> Dict[str, Any]:
        """정비 요약 정보 조회"""
        return {
            "total_vehicles": len(TEST_VEHICLE_IDS),
            "maintenance_needed": 2,
            "currently_servicing": 1,
            "completed_this_month": 2
        }

# 모의 캐시 관리자
class MockCacheManager:
    """캐시 관리자 모킹 클래스"""
    
    def __init__(self):
        self.cache = {}
    
    async def get(self, key: str) -> Any:
        """캐시에서 값 조회"""
        return self.cache.get(key)
    
    async def set(self, key: str, value: Any, expire: int = None) -> bool:
        """캐시에 값 저장"""
        self.cache[key] = value
        return True
    
    def clear(self, pattern: str = None) -> bool:
        """캐시 초기화"""
        if pattern and pattern.endswith("*"):
            prefix = pattern[:-1]
            keys_to_delete = [k for k in self.cache.keys() if k.startswith(prefix)]
            for key in keys_to_delete:
                del self.cache[key]
        else:
            self.cache = {}
        return True

# 모의 사용자 정보
mock_current_user = {"id": "user1", "username": "testuser", "is_active": True}

# 모의 데이터베이스 세션
class MockDB:
    pass

mock_db = MockDB()

@pytest.fixture
def app_client():
    """테스트용 FastAPI 클라이언트 픽스처"""
    from src.main import app
    
    # 모의 종속성 주입
    app.dependency_overrides = {}
    
    # 모의 컨트롤러 패치
    with patch("src.controllers.maintenance_controller.MaintenanceController", MockMaintenanceController):
        with patch("src.core.cache.cache", MockCacheManager()):
            with patch("src.core.cache_decorators.cache", MockCacheManager()):
                with patch("src.routers.maintenance.maintenance_controller", MockMaintenanceController()):
                    with patch("src.routers.maintenance.get_current_active_user", lambda: mock_current_user):
                        with patch("src.routers.maintenance.get_db", lambda: mock_db):
                            client = TestClient(app)
                            yield client

# 테스트 클래스
class TestMaintenanceEndpoints:
    """정비 API 엔드포인트 테스트"""
    
    def test_batch_vehicle_maintenance(self, app_client):
        """일괄 차량 정비 정보 조회 테스트"""
        # 요청 데이터
        request_data = {
            "vehicle_ids": TEST_VEHICLE_IDS[:3],
            "include_recommendations": True,
            "include_statistics": True
        }
        
        # 첫 번째 요청 (캐시 미스)
        start_time = time.time()
        response1 = app_client.post("/api/maintenance/batch", json=request_data)
        first_request_time = time.time() - start_time
        
        # 응답 검증
        assert response1.status_code == 200
        data1 = response1.json()
        assert "results" in data1
        assert len(data1["results"]) == 3
        
        # 각 차량의 결과 확인
        for result in data1["results"]:
            assert "vehicle_id" in result
            assert "maintenance_records" in result
            assert "recommendations" in result
            assert "statistics" in result
        
        # 두 번째 요청 (캐시 적중)
        start_time = time.time()
        response2 = app_client.post("/api/maintenance/batch", json=request_data)
        second_request_time = time.time() - start_time
        
        # 응답 검증
        assert response2.status_code == 200
        data2 = response2.json()
        
        # 두 응답이 동일한지 확인
        assert data1 == data2
        
        # 캐시 적중으로 두 번째 요청이 더 빨라야 함
        assert second_request_time < first_request_time
    
    def test_maintenance_dashboard(self, app_client):
        """정비 대시보드 정보 조회 테스트"""
        # 첫 번째 요청 (캐시 미스)
        start_time = time.time()
        response1 = app_client.get("/api/maintenance/dashboard")
        first_request_time = time.time() - start_time
        
        # 응답 검증
        assert response1.status_code == 200
        data1 = response1.json()
        assert "timestamp" in data1
        assert "data" in data1
        
        # 대시보드 데이터 확인
        dashboard_data = data1["data"]
        assert "system_status" in dashboard_data
        assert "recent_maintenance" in dashboard_data
        assert "scheduled_maintenance" in dashboard_data
        assert "pending_approvals" in dashboard_data
        assert "maintenance_summary" in dashboard_data
        
        # 두 번째 요청 (캐시 적중)
        start_time = time.time()
        response2 = app_client.get("/api/maintenance/dashboard")
        second_request_time = time.time() - start_time
        
        # 응답 검증
        assert response2.status_code == 200
        data2 = response2.json()
        
        # 타임스탬프를 제외하고 동일한지 확인
        assert data1["data"] == data2["data"]
        
        # 캐시 적중으로 두 번째 요청이 더 빨라야 함
        assert second_request_time < first_request_time

# 테스트 실행을 위한 메인 함수
if __name__ == "__main__":
    pytest.main(["-v", "test_maintenance_endpoints.py"]) 