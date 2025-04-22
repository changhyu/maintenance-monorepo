from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import pytest
from src.core.exceptions import ResourceNotFoundException, ValidationError
from src.models.maintenance import MaintenanceRecord, MaintenanceStatus
from src.services.maintenance_service import MaintenanceService


@pytest.fixture
def maintenance_service():
    """MaintenanceService 인스턴스를 생성하는 fixture"""
    return MaintenanceService()


@pytest.fixture
def sample_maintenance_record():
    """테스트용 정비 기록 데이터"""
    return {
        "id": "test-id-1",
        "vehicle_id": "vehicle-1",
        "description": "정기 점검",
        "date": datetime.now(),
        "mileage": 50000,
        "cost": 150000.0,
        "performed_by": "홍길동",
        "status": MaintenanceStatus.SCHEDULED,
    }


class TestMaintenanceService:
    """MaintenanceService 테스트 클래스"""

    @pytest.mark.asyncio
    async def test_create_maintenance_record(
        self, maintenance_service, sample_maintenance_record
    ):
        """정비 기록 생성 테스트"""
        # Given
        mock_db = Mock()
        mock_db.maintenance_records.create.return_value = MaintenanceRecord(
            **sample_maintenance_record
        )
        maintenance_service.db = mock_db

        # When
        result = await maintenance_service.create_maintenance_record(
            sample_maintenance_record
        )

        # Then
        assert result.vehicle_id == sample_maintenance_record["vehicle_id"]
        assert result.description == sample_maintenance_record["description"]
        mock_db.maintenance_records.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_maintenance_record(
        self, maintenance_service, sample_maintenance_record
    ):
        """정비 기록 조회 테스트"""
        # Given
        mock_db = Mock()
        mock_db.maintenance_records.get.return_value = MaintenanceRecord(
            **sample_maintenance_record
        )
        maintenance_service.db = mock_db

        # When
        result = await maintenance_service.get_maintenance_record(
            sample_maintenance_record["id"]
        )

        # Then
        assert result.id == sample_maintenance_record["id"]
        mock_db.maintenance_records.get.assert_called_once_with(
            sample_maintenance_record["id"]
        )

    @pytest.mark.asyncio
    async def test_get_maintenance_record_not_found(self, maintenance_service):
        """존재하지 않는 정비 기록 조회 테스트"""
        # Given
        mock_db = Mock()
        mock_db.maintenance_records.get.return_value = None
        maintenance_service.db = mock_db

        # When/Then
        with pytest.raises(ResourceNotFoundException):
            await maintenance_service.get_maintenance_record("non-existent-id")

    @pytest.mark.asyncio
    async def test_update_maintenance_record(
        self, maintenance_service, sample_maintenance_record
    ):
        """정비 기록 업데이트 테스트"""
        # Given
        mock_db = Mock()
        updated_record = sample_maintenance_record.copy()
        updated_record["status"] = MaintenanceStatus.COMPLETED
        mock_db.maintenance_records.update.return_value = MaintenanceRecord(
            **updated_record
        )
        maintenance_service.db = mock_db

        # When
        result = await maintenance_service.update_maintenance_record(
            sample_maintenance_record["id"], {"status": MaintenanceStatus.COMPLETED}
        )

        # Then
        assert result.status == MaintenanceStatus.COMPLETED
        mock_db.maintenance_records.update.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_maintenance_record(
        self, maintenance_service, sample_maintenance_record
    ):
        """정비 기록 삭제 테스트"""
        # Given
        mock_db = Mock()
        mock_db.maintenance_records.delete.return_value = True
        maintenance_service.db = mock_db

        # When
        result = await maintenance_service.delete_maintenance_record(
            sample_maintenance_record["id"]
        )

        # Then
        assert result is True
        mock_db.maintenance_records.delete.assert_called_once_with(
            sample_maintenance_record["id"]
        )

    @pytest.mark.asyncio
    async def test_get_vehicle_maintenance_history(
        self, maintenance_service, sample_maintenance_record
    ):
        """차량별 정비 이력 조회 테스트"""
        # Given
        mock_db = Mock()
        mock_db.maintenance_records.get_by_vehicle.return_value = [
            MaintenanceRecord(**sample_maintenance_record)
        ]
        maintenance_service.db = mock_db

        # When
        result = await maintenance_service.get_vehicle_maintenance_history(
            sample_maintenance_record["vehicle_id"]
        )

        # Then
        assert len(result) == 1
        assert result[0].vehicle_id == sample_maintenance_record["vehicle_id"]
        mock_db.maintenance_records.get_by_vehicle.assert_called_once_with(
            sample_maintenance_record["vehicle_id"]
        )

    @pytest.mark.asyncio
    async def test_schedule_maintenance(
        self, maintenance_service, sample_maintenance_record
    ):
        """정비 일정 예약 테스트"""
        # Given
        mock_db = Mock()
        scheduled_record = sample_maintenance_record.copy()
        scheduled_record["date"] = datetime.now() + timedelta(days=7)
        mock_db.maintenance_records.create.return_value = MaintenanceRecord(
            **scheduled_record
        )
        maintenance_service.db = mock_db

        # When
        result = await maintenance_service.schedule_maintenance(
            vehicle_id=scheduled_record["vehicle_id"],
            date=scheduled_record["date"],
            description=scheduled_record["description"],
        )

        # Then
        assert result.status == MaintenanceStatus.SCHEDULED
        assert result.vehicle_id == scheduled_record["vehicle_id"]
        mock_db.maintenance_records.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_invalid_maintenance_date(
        self, maintenance_service, sample_maintenance_record
    ):
        """과거 날짜로 정비 예약 시도 테스트"""
        # Given
        past_date = datetime.now() - timedelta(days=1)

        # When/Then
        with pytest.raises(ValidationError):
            await maintenance_service.schedule_maintenance(
                vehicle_id=sample_maintenance_record["vehicle_id"],
                date=past_date,
                description=sample_maintenance_record["description"],
            )
