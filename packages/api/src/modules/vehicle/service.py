"""
Vehicle service module for business logic related to vehicles.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from uuid import uuid4
from fastapi import HTTPException, status
from sqlalchemy.orm import Session



from ...models.schemas import (
    Vehicle, VehicleCreate, VehicleUpdate, VehicleStatus
)


# 임시 데이터 저장소
vehicles_db = {}

def _check_vehicle_exists(vehicle_id: str) -> bool:
    """차량 ID가 존재하는지 확인합니다."""
    return vehicle_id in vehicles_db

def _raise_not_found(vehicle_id: str) -> None:
    """차량을 찾을 수 없을 때 예외를 발생시킵니다."""
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"차량 ID {vehicle_id}를 찾을 수 없습니다."
    )

class VehicleService:
    """차량 관련 비즈니스 로직을 처리하는 서비스 클래스."""

    def __init__(self, db: Session = None):
        """
        서비스 초기화.

        Args:
            db: 데이터베이스 세션
        """
        self.db = db

    def get_vehicle_list(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Vehicle]:
        """
        필터링 조건에 맞는 차량 목록 조회.

        Args:
            skip: 건너뛸 레코드 수
            limit: 최대 반환 레코드 수
            filters: 필터링 조건

        Returns:
            차량 목록
        """
        # 임시 구현: 메모리 데이터 사용
        results = list(vehicles_db.values())

        # 필터링 적용
        if filters:
            filtered_results = [
                vehicle for vehicle in results
                if all(vehicle.get(key) == value for key, value in filters.items())
            ]
            results = filtered_results

        # 페이지네이션 적용
        return results[skip : skip + limit]

    def get_vehicle_by_id(self, vehicle_id: str) -> Vehicle:
        """
        ID로 차량 조회.

        Args:
            vehicle_id: 차량 ID

        Returns:
            차량 정보

        Raises:
            HTTPException: 차량을 찾을 수 없는 경우
        """
        # 임시 구현: 메모리 데이터 사용
        if vehicle_id not in vehicles_db:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"차량 ID {vehicle_id}를 찾을 수 없습니다."
            )
        return vehicles_db[vehicle_id]

    def _get_current_utc_time(self) -> datetime:
        """현재 UTC 시간을 timezone-aware로 반환합니다."""
        return datetime.now(timezone.utc)

    def create_vehicle(self, vehicle_data: VehicleCreate) -> Vehicle:
        """
        새 차량 등록.

        Args:
            vehicle_data: 차량 생성 데이터

        Returns:
            생성된 차량 정보
        """
        # 임시 구현: 메모리 데이터 사용
        vehicle_id = str(uuid4())
        now = self._get_current_utc_time()

        vehicle = {
            "id": vehicle_id,
            **vehicle_data.dict(),
            "created_at": now,
            "updated_at": now
        }

        vehicles_db[vehicle_id] = vehicle
        return vehicle

    def update_vehicle(
        self,
        vehicle_id: str,
        vehicle_data: VehicleUpdate
    ) -> Vehicle:
        """
        차량 정보 업데이트.

        Args:
            vehicle_id: 차량 ID
            vehicle_data: 업데이트할 차량 데이터

        Returns:
            업데이트된 차량 정보

        Raises:
            HTTPException: 차량을 찾을 수 없는 경우
        """
        # 임시 구현: 메모리 데이터 사용
        if vehicle_id not in vehicles_db:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"차량 ID {vehicle_id}를 찾을 수 없습니다."
            )

        vehicle = vehicles_db[vehicle_id]

        update_data = {
            k: v for k, v in vehicle_data.dict().items()
            if v is not None
        }

        for key, value in update_data.items():
            vehicle[key] = value

        vehicle["updated_at"] = self._get_current_utc_time()
        vehicles_db[vehicle_id] = vehicle

        return vehicle

    def delete_vehicle(self, vehicle_id: str) -> bool:
        """
        차량 삭제.

        Args:
            vehicle_id: 차량 ID

        Returns:
            삭제 성공 여부

        Raises:
            HTTPException: 차량을 찾을 수 없는 경우
        """
        # 임시 구현: 메모리 데이터 사용
        if vehicle_id not in vehicles_db:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"차량 ID {vehicle_id}를 찾을 수 없습니다."
            )

        del vehicles_db[vehicle_id]
        return True

    def get_vehicle_maintenance_history(
        self,
        vehicle_id: str
    ) -> List[Dict[str, Any]]:
        """
        차량의 정비 이력 조회.

        Args:
            vehicle_id: 차량 ID

        Returns:
            정비 이력 목록

        Raises:
            HTTPException: 차량을 찾을 수 없는 경우
        """
        # 임시 구현: 메모리 데이터 사용
        if vehicle_id not in vehicles_db:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"차량 ID {vehicle_id}를 찾을 수 없습니다."
            )

        # 임시 정비 이력 반환
        return [
            {
                "id": str(uuid4()),
                "vehicle_id": vehicle_id,
                "description": "정기 점검",
                "date": self._get_current_utc_time() - timedelta(days=30),
                "cost": 150000,
                "performed_by": "김기술",
                "status": "completed"
            }
        ]

    def perform_vehicle_diagnostics(
        self,
        vehicle_id: str
    ) -> Dict[str, Any]:
        """
        차량 진단 실행.

        Args:
            vehicle_id: 차량 ID

        Returns:
            진단 결과

        Raises:
            HTTPException: 차량을 찾을 수 없는 경우
        """
        # 임시 구현: 메모리 데이터 사용
        if vehicle_id not in vehicles_db:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"차량 ID {vehicle_id}를 찾을 수 없습니다."
            )

        # 임시 진단 결과 반환
        return {
            "timestamp": self._get_current_utc_time(),
            "vehicle_id": vehicle_id,
            "status": "정상",
            "engine": {
                "status": "정상",
                "temperature": 90,
                "oil_level": "정상"
            },
            "battery": {
                "status": "정상",
                "charge": 95
            },
            "tires": {
                "front_left": {"pressure": 32, "status": "정상"},
                "front_right": {"pressure": 33, "status": "정상"},
                "rear_left": {"pressure": 32, "status": "정상"},
                "rear_right": {"pressure": 32, "status": "정상"}
            },
            "brake_pads": {
                "front": {"wear": 25, "status": "정상"},
                "rear": {"wear": 30, "status": "정상"}
            },
            "diagnostic_codes": []
        }

    def get_telemetry_data(
        self,
        vehicle_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        차량 원격 측정 데이터 조회.

        Args:
            vehicle_id: 차량 ID
            start_date: 시작 날짜
            end_date: 종료 날짜

        Returns:
            원격 측정 데이터

        Raises:
            HTTPException: 차량을 찾을 수 없는 경우
        """
        # 임시 구현: 메모리 데이터 사용
        if vehicle_id not in vehicles_db:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"차량 ID {vehicle_id}를 찾을 수 없습니다."
            )

        # 날짜 기본값 설정
        if not end_date:
            end_date = self._get_current_utc_time()
        if not start_date:
            start_date = end_date - timedelta(days=7)

        # 임시 원격 측정 데이터 반환
        return {
            "vehicle_id": vehicle_id,
            "period": {
                "start": start_date,
                "end": end_date
            },
            "data_points": [
                {
                    "timestamp": self._get_current_utc_time() - timedelta(hours=i),
                    "location": {
                        "latitude": 37.5665 + (i * 0.001),
                        "longitude": 126.9780 + (i * 0.001)
                    },
                    "speed": 60 - (i % 20),
                    "fuel_level": 80 - (i % 5),
                    "engine_temp": 90 + (i % 10),
                    "battery": 95 - (i % 10)
                }
                for i in range(24)
            ]
        }

    def change_vehicle_status(
        self,
        vehicle_id: str,
        status: VehicleStatus
    ) -> Vehicle:
        """
        차량 상태 변경.

        Args:
            vehicle_id: 차량 ID
            status: 새 차량 상태

        Returns:
            업데이트된 차량 정보

        Raises:
            HTTPException: 차량을 찾을 수 없는 경우
        """
        # 임시 구현: 메모리 데이터 사용
        if vehicle_id not in vehicles_db:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"차량 ID {vehicle_id}를 찾을 수 없습니다."
            )

        vehicle = vehicles_db[vehicle_id]
        vehicle["status"] = status
        vehicle["updated_at"] = self._get_current_utc_time()

        vehicles_db[vehicle_id] = vehicle
        return vehicle


# 서비스 인스턴스 생성
vehicle_service = VehicleService()