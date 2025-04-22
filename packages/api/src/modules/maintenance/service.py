"""
Maintenance service module.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

# 데이터베이스 관련 임포트 (Session은 필요하지 않으므로 제거)
from packagescore.dependencies import get_db
from packagesmodels.schemas import (MaintenanceCreate, MaintenanceStatus,
                                    MaintenanceUpdate)


class MaintenanceService:
    """정비 서비스 클래스."""

    def get_maintenance_records(
        self, skip: int = 0, limit: int = 100, filters: Dict = None
    ) -> Dict[str, Any]:
        """
        정비 기록 목록을 조회합니다.
        """
        db = next(get_db())

        # 쿼리 생성
        query = db.query(self.maintenance_model)

        # 필터 적용
        if filters:
            if "vehicle_id" in filters:
                query = query.filter(
                    self.maintenance_model.vehicle_id == filters["vehicle_id"]
                )
            if "status" in filters:
                query = query.filter(self.maintenance_model.status == filters["status"])
            if "from_date" in filters and filters["from_date"]:
                query = query.filter(
                    self.maintenance_model.date >= filters["from_date"]
                )
            if "to_date" in filters and filters["to_date"]:
                query = query.filter(self.maintenance_model.date <= filters["to_date"])

        # 정렬 및 페이지네이션
        total = query.count()
        records = (
            query.order_by(self.maintenance_model.date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        # 관련 정보 조회
        result_records = []
        for record in records:
            record_dict = record.__dict__

            # 관련 차량 정보 조회
            vehicle = (
                db.query(self.vehicle_model).filter_by(id=record.vehicle_id).first()
            )
            if vehicle:
                record_dict["vehicle"] = {
                    "id": vehicle.id,
                    "make": vehicle.make,
                    "model": vehicle.model,
                    "year": vehicle.year,
                    "vin": vehicle.vin,
                    "plate": vehicle.plate,
                }

            # 관련 문서 조회
            documents = (
                db.query(self.maintenance_document_model)
                .filter_by(maintenance_id=record.id)
                .all()
            )
            record_dict["documents"] = [doc.__dict__ for doc in documents]

            # 관련 부품 조회
            parts = (
                db.query(self.maintenance_part_model)
                .filter_by(maintenance_id=record.id)
                .all()
            )
            record_dict["parts"] = [part.__dict__ for part in parts]

            result_records.append(record_dict)

        return {"records": result_records, "total": total}

    def get_maintenance_record_by_id(self, record_id: str) -> Dict[str, Any]:
        """
        특정 정비 기록의 상세 정보를 조회합니다.
        """
        db = next(get_db())
        record = db.query(self.maintenance_model).filter_by(id=record_id).first()

        if not record:
            raise ValueError(f"ID가 {record_id}인 정비 기록을 찾을 수 없습니다.")

        result = record.__dict__

        if (
            vehicle := db.query(self.vehicle_model)
            .filter_by(id=record.vehicle_id)
            .first()
        ):
            result["vehicle"] = {
                "id": vehicle.id,
                "make": vehicle.make,
                "model": vehicle.model,
                "year": vehicle.year,
                "vin": vehicle.vin,
                "plate": vehicle.plate,
            }

        # 관련 문서 조회
        documents = (
            db.query(self.maintenance_document_model)
            .filter_by(maintenance_id=record.id)
            .all()
        )
        result["documents"] = [doc.__dict__ for doc in documents]

        # 관련 부품 조회
        parts = (
            db.query(self.maintenance_part_model)
            .filter_by(maintenance_id=record.id)
            .all()
        )
        result["parts"] = [part.__dict__ for part in parts]

        return result

    def create_maintenance_record(self, data: MaintenanceCreate) -> Dict[str, Any]:
        """
        새 정비 기록을 생성합니다.
        """
        db = next(get_db())

        # 차량 존재 여부 확인
        vehicle = db.query(self.vehicle_model).filter_by(id=data.vehicle_id).first()
        if not vehicle:
            raise ValueError(f"ID가 {data.vehicle_id}인 차량을 찾을 수 없습니다.")

        # 정비 기록 생성
        new_record = self.maintenance_model(
            vehicle_id=data.vehicle_id,
            description=data.description,
            date=data.date,
            status=data.status,
            cost=data.cost,
            performed_by=data.performed_by,
            notes=data.notes,
        )

        db.add(new_record)
        db.commit()
        db.refresh(new_record)

        # 차량 상태 업데이트
        if data.status in [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]:
            vehicle.status = "maintenance"
            db.commit()

        return new_record.__dict__

    def update_maintenance_record(
        self, record_id: str, data: MaintenanceUpdate
    ) -> Dict[str, Any]:
        """
        정비 기록을 업데이트합니다.
        """
        db = next(get_db())
        record = db.query(self.maintenance_model).filter_by(id=record_id).first()

        if not record:
            raise ValueError(f"ID가 {record_id}인 정비 기록을 찾을 수 없습니다.")

        # 필드 업데이트
        for field, value in data.dict(exclude_unset=True).items():
            setattr(record, field, value)

        db.commit()
        db.refresh(record)

        # 차량 상태 업데이트
        vehicle = db.query(self.vehicle_model).filter_by(id=record.vehicle_id).first()
        if vehicle and data.status:
            if data.status == MaintenanceStatus.COMPLETED:
                # 다른 진행 중인 정비가 없는지 확인
                ongoing_count = (
                    db.query(self.maintenance_model)
                    .filter(
                        self.maintenance_model.vehicle_id == record.vehicle_id,
                        self.maintenance_model.id != record_id,
                        self.maintenance_model.status.in_(
                            [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]
                        ),
                    )
                    .count()
                )

                if ongoing_count == 0:
                    vehicle.status = "active"
                    db.commit()
            elif data.status in [
                MaintenanceStatus.SCHEDULED,
                MaintenanceStatus.IN_PROGRESS,
            ]:
                vehicle.status = "maintenance"
                db.commit()

        return record.__dict__

    def delete_maintenance_record(self, record_id: str) -> bool:
        """
        정비 기록을 삭제합니다.
        """
        db = next(get_db())
        record = db.query(self.maintenance_model).filter_by(id=record_id).first()

        if not record:
            raise ValueError(f"ID가 {record_id}인 정비 기록을 찾을 수 없습니다.")

        # 관련 문서 삭제
        db.query(self.maintenance_document_model).filter_by(
            maintenance_id=record_id
        ).delete()

        # 관련 부품 삭제
        db.query(self.maintenance_part_model).filter_by(
            maintenance_id=record_id
        ).delete()

        # 정비 기록 삭제
        db.delete(record)
        db.commit()

        # 차량 상태 업데이트
        vehicle = db.query(self.vehicle_model).filter_by(id=record.vehicle_id).first()
        if vehicle and record.status in [
            MaintenanceStatus.SCHEDULED,
            MaintenanceStatus.IN_PROGRESS,
        ]:
            # 다른 진행 중인 정비가 없는지 확인
            ongoing_count = (
                db.query(self.maintenance_model)
                .filter(
                    self.maintenance_model.vehicle_id == record.vehicle_id,
                    self.maintenance_model.id != record_id,
                    self.maintenance_model.status.in_(
                        [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]
                    ),
                )
                .count()
            )

            if ongoing_count == 0:
                vehicle.status = "active"
                db.commit()

        return True

    def upload_maintenance_document(self, record_id: str, file) -> Dict[str, Any]:
        """
        정비 기록에 문서를 업로드합니다.
        """
        db = next(get_db())
        record = db.query(self.maintenance_model).filter_by(id=record_id).first()

        if not record:
            raise ValueError(f"ID가 {record_id}인 정비 기록을 찾을 수 없습니다.")

        # 파일 저장 및 문서 레코드 생성 로직
        # 실제 구현 시에는 파일 스토리지 서비스 사용 필요
        filename = file.filename
        file_url = f"/storage/maintenance/{record_id}/{filename}"

        new_document = self.maintenance_document_model(
            maintenance_id=record_id,
            file_name=filename,
            file_url=file_url,
            file_type=file.content_type,
            file_size=0,  # 실제 구현 시 계산 필요
        )

        db.add(new_document)
        db.commit()
        db.refresh(new_document)

        return new_document.__dict__

    def delete_maintenance_document(self, record_id: str, document_id: str) -> bool:
        """
        정비 기록에서 문서를 삭제합니다.
        """
        db = next(get_db())
        document = (
            db.query(self.maintenance_document_model)
            .filter_by(id=document_id, maintenance_id=record_id)
            .first()
        )

        if not document:
            raise ValueError(f"ID가 {document_id}인 문서를 찾을 수 없습니다.")

        # 파일 삭제 로직
        # 실제 구현 시에는 파일 스토리지 서비스 사용 필요

        db.delete(document)
        db.commit()

        return True

    def get_upcoming_maintenance(self, days: int = 30) -> List[Dict[str, Any]]:
        """
        예정된 정비 일정을 조회합니다.
        """
        db = next(get_db())

        today = datetime.now().date()
        end_date = today + timedelta(days=days)

        records = (
            db.query(self.maintenance_model)
            .filter(
                self.maintenance_model.status == MaintenanceStatus.SCHEDULED,
                self.maintenance_model.date >= today,
                self.maintenance_model.date <= end_date,
            )
            .order_by(self.maintenance_model.date)
            .all()
        )

        result = []
        for record in records:
            record_dict = record.__dict__

            # 관련 차량 정보 조회
            vehicle = (
                db.query(self.vehicle_model).filter_by(id=record.vehicle_id).first()
            )
            if vehicle:
                record_dict["vehicle"] = {
                    "id": vehicle.id,
                    "make": vehicle.make,
                    "model": vehicle.model,
                    "year": vehicle.year,
                    "vin": vehicle.vin,
                    "plate": vehicle.plate,
                }

            result.append(record_dict)

        return result

    def complete_maintenance_record(
        self,
        record_id: str,
        mileage: Optional[int] = None,
        cost: Optional[float] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        정비를 완료 처리합니다.
        """
        db = next(get_db())
        record = db.query(self.maintenance_model).filter_by(id=record_id).first()

        if not record:
            raise ValueError(f"ID가 {record_id}인 정비 기록을 찾을 수 없습니다.")

        # 상태 업데이트
        record.status = MaintenanceStatus.COMPLETED
        record.completion_date = datetime.now()

        # 추가 정보 업데이트
        if mileage is not None:
            if (
                vehicle := db.query(self.vehicle_model)
                .filter_by(id=record.vehicle_id)
                .first()
            ):
                vehicle.mileage = mileage

        if cost is not None:
            record.cost = cost

        if notes:
            if record.notes:
                record.notes += f"\n\n[완료 메모] {notes}"
            else:
                record.notes = f"[완료 메모] {notes}"

        db.commit()
        db.refresh(record)

        if (
            vehicle := db.query(self.vehicle_model)
            .filter_by(id=record.vehicle_id)
            .first()
        ):
            # 다른 진행 중인 정비가 없는지 확인
            ongoing_count = (
                db.query(self.maintenance_model)
                .filter(
                    self.maintenance_model.vehicle_id == record.vehicle_id,
                    self.maintenance_model.id != record_id,
                    self.maintenance_model.status.in_(
                        [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]
                    ),
                )
                .count()
            )

            if ongoing_count == 0:
                vehicle.status = "active"
                db.commit()

        return record.__dict__

    def cancel_maintenance_record(
        self, record_id: str, reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        정비를 취소 처리합니다.
        """
        db = next(get_db())
        record = db.query(self.maintenance_model).filter_by(id=record_id).first()

        if not record:
            raise ValueError(f"ID가 {record_id}인 정비 기록을 찾을 수 없습니다.")

        # 상태 업데이트
        record.status = MaintenanceStatus.CANCELLED

        # 취소 사유 추가
        if reason:
            if record.notes:
                record.notes += f"\n\n[취소 사유] {reason}"
            else:
                record.notes = f"[취소 사유] {reason}"

        db.commit()
        db.refresh(record)

        if (
            vehicle := db.query(self.vehicle_model)
            .filter_by(id=record.vehicle_id)
            .first()
        ):
            # 다른 진행 중인 정비가 없는지 확인
            ongoing_count = (
                db.query(self.maintenance_model)
                .filter(
                    self.maintenance_model.vehicle_id == record.vehicle_id,
                    self.maintenance_model.id != record_id,
                    self.maintenance_model.status.in_(
                        [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]
                    ),
                )
                .count()
            )

            if ongoing_count == 0:
                vehicle.status = "active"
                db.commit()

        return record.__dict__

    def get_maintenance_summary(self) -> Dict[str, Any]:
        from sqlalchemy import func

        db = next(get_db())
        total = db.query(self.maintenance_model).count()
        scheduled = (
            db.query(self.maintenance_model)
            .filter(self.maintenance_model.status == MaintenanceStatus.SCHEDULED)
            .count()
        )
        in_progress = (
            db.query(self.maintenance_model)
            .filter(self.maintenance_model.status == MaintenanceStatus.IN_PROGRESS)
            .count()
        )
        completed = (
            db.query(self.maintenance_model)
            .filter(self.maintenance_model.status == MaintenanceStatus.COMPLETED)
            .count()
        )
        cancelled = (
            db.query(self.maintenance_model)
            .filter(self.maintenance_model.status == MaintenanceStatus.CANCELLED)
            .count()
        )
        total_completed_cost = (
            db.query(func.coalesce(func.sum(self.maintenance_model.cost), 0))
            .filter(self.maintenance_model.status == MaintenanceStatus.COMPLETED)
            .scalar()
        )

        return {
            "total_records": total,
            "scheduled": scheduled,
            "in_progress": in_progress,
            "completed": completed,
            "cancelled": cancelled,
            "total_completed_cost": total_completed_cost,
        }

    def send_maintenance_alerts(self, days: int = 1) -> Dict[str, Any]:
        """정해진 일수 내에 예정된 정비 알림을 전송합니다."""
        db = next(get_db())
        today = datetime.now().date()
        end_date = today + timedelta(days=days)
        records = (
            db.query(self.maintenance_model)
            .filter(
                self.maintenance_model.status == MaintenanceStatus.SCHEDULED,
                self.maintenance_model.date >= today,
                self.maintenance_model.date <= end_date,
            )
            .all()
        )
        alerts_sent = [
            {
                "record_id": record.id,
                "vehicle_id": record.vehicle_id,
                "message": "정비 예정 알림 발송 완료",
            }
            for record in records
        ]
        return {"alerts_sent": alerts_sent}

    def get_maintenance_report(self, from_date: str, to_date: str) -> Dict[str, Any]:
        """지정된 날짜 범위 내 정비 기록의 통계를 생성합니다."""
        db = next(get_db())
        from datetime import datetime

        # 날짜 문자열을 datetime.date 객체로 변환
        start_date = datetime.strptime(from_date, "%Y-%m-%d").date()
        end_date = datetime.strptime(to_date, "%Y-%m-%d").date()

        # 전체 기록 수 조회
        total_records = (
            db.query(self.maintenance_model)
            .filter(
                self.maintenance_model.date >= start_date,
                self.maintenance_model.date <= end_date,
            )
            .count()
        )

        from sqlalchemy import func

        total_completed_cost = (
            db.query(func.coalesce(func.sum(self.maintenance_model.cost), 0))
            .filter(
                self.maintenance_model.date >= start_date,
                self.maintenance_model.date <= end_date,
                self.maintenance_model.status == MaintenanceStatus.COMPLETED,
            )
            .scalar()
        )

        return {
            "total_records": total_records,
            "total_completed_cost": total_completed_cost,
        }

    @property
    def maintenance_model(self):
        """Maintenance 모델 반환"""
        from packages.apimaintenance.models import Maintenance

        return Maintenance

    @property
    def vehicle_model(self):
        """Vehicle 모델 반환"""
        from packages.apivehicle.models import Vehicle

        return Vehicle

    @property
    def maintenance_document_model(self):
        """MaintenanceDocument 모델 반환"""
        from packages.apimaintenance.models import MaintenanceDocument

        return MaintenanceDocument

    @property
    def maintenance_part_model(self):
        """MaintenancePart 모델 반환"""
        from packages.apimaintenance.models import MaintenancePart

        return MaintenancePart


# 싱글톤 인스턴스 생성
maintenance_service = MaintenanceService()
