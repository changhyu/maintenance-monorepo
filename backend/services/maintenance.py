from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..models.maintenance import Maintenance
from ..core.maintenance import (
    MaintenanceType,
    MaintenanceStatus,
    MaintenancePriority,
    Maintenance as MaintenanceModel
)

class MaintenanceService:
    """정비 관리 서비스"""
    
    def __init__(self, db: Session):
        self.db = db

    def create_maintenance(self, maintenance: MaintenanceModel) -> Maintenance:
        """새로운 정비 기록 생성"""
        db_maintenance = Maintenance(
            vehicle_id=maintenance.vehicle_id,
            maintenance_type=maintenance.maintenance_type,
            status=maintenance.status,
            priority=maintenance.priority,
            description=maintenance.description,
            cost=maintenance.cost,
            start_date=maintenance.start_date,
            end_date=maintenance.end_date,
            technician_id=maintenance.technician_id,
            parts=maintenance.parts,
            notes=maintenance.notes
        )
        self.db.add(db_maintenance)
        self.db.commit()
        self.db.refresh(db_maintenance)
        return db_maintenance

    def get_maintenance(self, maintenance_id: str) -> Optional[Maintenance]:
        """정비 기록 조회"""
        return self.db.query(Maintenance).filter(Maintenance.id == maintenance_id).first()

    def get_maintenances_by_vehicle(self, vehicle_id: str) -> List[Maintenance]:
        """차량별 정비 기록 조회"""
        return self.db.query(Maintenance).filter(Maintenance.vehicle_id == vehicle_id).all()

    def get_maintenances_by_technician(self, technician_id: str) -> List[Maintenance]:
        """기술자별 정비 기록 조회"""
        return self.db.query(Maintenance).filter(Maintenance.technician_id == technician_id).all()

    def get_maintenances_by_status(self, status: MaintenanceStatus) -> List[Maintenance]:
        """상태별 정비 기록 조회"""
        return self.db.query(Maintenance).filter(Maintenance.status == status).all()

    def get_maintenances_by_date_range(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Maintenance]:
        """기간별 정비 기록 조회"""
        return self.db.query(Maintenance).filter(
            and_(
                Maintenance.start_date >= start_date,
                Maintenance.start_date <= end_date
            )
        ).all()

    def update_maintenance(
        self,
        maintenance_id: str,
        maintenance: MaintenanceModel
    ) -> Optional[Maintenance]:
        """정비 기록 업데이트"""
        db_maintenance = self.get_maintenance(maintenance_id)
        if not db_maintenance:
            return None

        for key, value in maintenance.dict(exclude_unset=True).items():
            setattr(db_maintenance, key, value)

        self.db.commit()
        self.db.refresh(db_maintenance)
        return db_maintenance

    def delete_maintenance(self, maintenance_id: str) -> bool:
        """정비 기록 삭제"""
        db_maintenance = self.get_maintenance(maintenance_id)
        if not db_maintenance:
            return False

        self.db.delete(db_maintenance)
        self.db.commit()
        return True 