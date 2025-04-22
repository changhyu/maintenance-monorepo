"""
정비 서비스 모듈

차량 정비 기록 관리를 위한 비즈니스 로직 서비스 모듈입니다.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from src.core.exceptions import ResourceNotFoundException, ValidationError
from src.models.maintenance import MaintenanceRecord, MaintenanceStatus


class MaintenanceService:
    """정비 작업 관리 서비스 클래스"""

    def __init__(self, db=None):
        """
        MaintenanceService 생성자

        Args:
            db: 데이터베이스 인터페이스
        """
        self.db = db

    async def create_maintenance_record(
        self, data: Dict[str, Any]
    ) -> MaintenanceRecord:
        """
        정비 기록 생성

        Args:
            data: 정비 기록 데이터

        Returns:
            생성된 정비 기록
        """
        if self.db:
            return await self.db.maintenance_records.create(data)
        return MaintenanceRecord(**data)

    async def get_maintenance_record(self, record_id: str) -> MaintenanceRecord:
        """
        정비 기록 조회

        Args:
            record_id: 정비 기록 ID

        Returns:
            조회된 정비 기록

        Raises:
            ResourceNotFoundException: 정비 기록을 찾을 수 없는 경우
        """
        if self.db:
            record = await self.db.maintenance_records.get(record_id)
            if not record:
                raise ResourceNotFoundException(
                    f"정비 기록을 찾을 수 없습니다: {record_id}"
                )
            return record
        raise ResourceNotFoundException(f"정비 기록을 찾을 수 없습니다: {record_id}")

    async def update_maintenance_record(
        self, record_id: str, data: Dict[str, Any]
    ) -> MaintenanceRecord:
        """
        정비 기록 업데이트

        Args:
            record_id: 정비 기록 ID
            data: 업데이트할 데이터

        Returns:
            업데이트된 정비 기록

        Raises:
            ResourceNotFoundException: 정비 기록을 찾을 수 없는 경우
        """
        if self.db:
            record = await self.db.maintenance_records.update(record_id, data)
            if not record:
                raise ResourceNotFoundException(
                    f"정비 기록을 찾을 수 없습니다: {record_id}"
                )
            return record
        raise ResourceNotFoundException(f"정비 기록을 찾을 수 없습니다: {record_id}")

    async def delete_maintenance_record(self, record_id: str) -> bool:
        """
        정비 기록 삭제

        Args:
            record_id: 정비 기록 ID

        Returns:
            삭제 성공 여부

        Raises:
            ResourceNotFoundException: 정비 기록을 찾을 수 없는 경우
        """
        if self.db:
            result = await self.db.maintenance_records.delete(record_id)
            if not result:
                raise ResourceNotFoundException(
                    f"정비 기록을 찾을 수 없습니다: {record_id}"
                )
            return result
        return True

    async def get_vehicle_maintenance_history(
        self, vehicle_id: str
    ) -> List[MaintenanceRecord]:
        """
        차량별 정비 이력 조회

        Args:
            vehicle_id: 차량 ID

        Returns:
            정비 이력 목록
        """
        if self.db:
            return await self.db.maintenance_records.get_by_vehicle(vehicle_id)
        return []

    async def schedule_maintenance(
        self,
        vehicle_id: str,
        date: datetime,
        description: str,
        mileage: Optional[int] = None,
        cost: Optional[float] = None,
        performed_by: Optional[str] = None,
    ) -> MaintenanceRecord:
        """
        정비 일정 예약

        Args:
            vehicle_id: 차량 ID
            date: 예약 날짜
            description: 정비 설명
            mileage: 주행 거리
            cost: 예상 비용
            performed_by: 정비 담당자

        Returns:
            예약된 정비 기록

        Raises:
            ValidationError: 유효하지 않은 입력 값
        """
        # 과거 날짜 검증
        if date < datetime.now():
            raise ValidationError("과거 날짜로 정비를 예약할 수 없습니다.")

        data = {
            "vehicle_id": vehicle_id,
            "date": date,
            "description": description,
            "status": MaintenanceStatus.SCHEDULED,
        }

        if mileage is not None:
            data["mileage"] = mileage

        if cost is not None:
            data["cost"] = cost

        if performed_by is not None:
            data["performed_by"] = performed_by

        return await self.create_maintenance_record(data)

    async def get_all_maintenance(self) -> List[Dict[str, Any]]:
        """
        모든 정비 작업 조회

        Returns:
            모든 정비 작업 목록
        """
        if self.db:
            return await self.db.maintenance_records.get_all()
        return []

    async def get_maintenance_by_id(
        self, maintenance_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        ID로 정비 작업 조회

        Args:
            maintenance_id: 정비 작업 ID

        Returns:
            정비 작업 데이터
        """
        if self.db:
            return await self.db.maintenance_records.get_by_id(maintenance_id)
        return None
