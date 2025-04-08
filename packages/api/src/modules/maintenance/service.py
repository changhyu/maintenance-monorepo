"""
Maintenance service module.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from sqlalchemy.orm import Session

from ...database import get_session
from ...models.schemas import MaintenanceCreate, MaintenanceUpdate, MaintenanceStatus


class MaintenanceService:
    """정비 서비스 클래스."""
    
    def get_maintenance_records(self, skip: int = 0, limit: int = 100, filters: Dict = None) -> Dict[str, Any]:
        """
        정비 기록 목록을 조회합니다.
        """
        db = get_session()
        
        # 쿼리 생성
        query = db.query(self.MaintenanceModel)
        
        # 필터 적용
        if filters:
            if "vehicle_id" in filters:
                query = query.filter(self.MaintenanceModel.vehicle_id == filters["vehicle_id"])
            if "status" in filters:
                query = query.filter(self.MaintenanceModel.status == filters["status"])
            if "from_date" in filters and filters["from_date"]:
                query = query.filter(self.MaintenanceModel.date >= filters["from_date"])
            if "to_date" in filters and filters["to_date"]:
                query = query.filter(self.MaintenanceModel.date <= filters["to_date"])
        
        # 정렬 및 페이지네이션
        total = query.count()
        records = query.order_by(self.MaintenanceModel.date.desc()).offset(skip).limit(limit).all()
        
        # 관련 정보 조회
        result_records = []
        for record in records:
            record_dict = record.__dict__
            
            # 관련 차량 정보 조회
            vehicle = db.query(self.VehicleModel).filter_by(id=record.vehicle_id).first()
            if vehicle:
                record_dict["vehicle"] = {
                    "id": vehicle.id,
                    "make": vehicle.make,
                    "model": vehicle.model,
                    "year": vehicle.year,
                    "vin": vehicle.vin,
                    "plate": vehicle.plate
                }
            
            # 관련 문서 조회
            documents = db.query(self.MaintenanceDocumentModel).filter_by(maintenance_id=record.id).all()
            record_dict["documents"] = [doc.__dict__ for doc in documents]
            
            # 관련 부품 조회
            parts = db.query(self.MaintenancePartModel).filter_by(maintenance_id=record.id).all()
            record_dict["parts"] = [part.__dict__ for part in parts]
            
            result_records.append(record_dict)
        
        return {
            "records": result_records,
            "total": total
        }
    
    def get_maintenance_record_by_id(self, record_id: str) -> Dict[str, Any]:
        """
        특정 정비 기록의 상세 정보를 조회합니다.
        """
        db = get_session()
        record = db.query(self.MaintenanceModel).filter_by(id=record_id).first()
        
        if not record:
            raise ValueError(f"ID가 {record_id}인 정비 기록을 찾을 수 없습니다.")
        
        result = record.__dict__
        
        # 관련 차량 정보 조회
        vehicle = db.query(self.VehicleModel).filter_by(id=record.vehicle_id).first()
        if vehicle:
            result["vehicle"] = {
                "id": vehicle.id,
                "make": vehicle.make,
                "model": vehicle.model,
                "year": vehicle.year,
                "vin": vehicle.vin,
                "plate": vehicle.plate
            }
        
        # 관련 문서 조회
        documents = db.query(self.MaintenanceDocumentModel).filter_by(maintenance_id=record.id).all()
        result["documents"] = [doc.__dict__ for doc in documents]
        
        # 관련 부품 조회
        parts = db.query(self.MaintenancePartModel).filter_by(maintenance_id=record.id).all()
        result["parts"] = [part.__dict__ for part in parts]
        
        return result
    
    def create_maintenance_record(self, data: MaintenanceCreate) -> Dict[str, Any]:
        """
        새 정비 기록을 생성합니다.
        """
        db = get_session()
        
        # 차량 존재 여부 확인
        vehicle = db.query(self.VehicleModel).filter_by(id=data.vehicle_id).first()
        if not vehicle:
            raise ValueError(f"ID가 {data.vehicle_id}인 차량을 찾을 수 없습니다.")
        
        # 정비 기록 생성
        new_record = self.MaintenanceModel(
            vehicle_id=data.vehicle_id,
            description=data.description,
            date=data.date,
            status=data.status,
            cost=data.cost,
            performed_by=data.performed_by,
            notes=data.notes
        )
        
        db.add(new_record)
        db.commit()
        db.refresh(new_record)
        
        # 차량 상태 업데이트
        if data.status in [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]:
            vehicle.status = "maintenance"
            db.commit()
        
        return new_record.__dict__
    
    def update_maintenance_record(self, record_id: str, data: MaintenanceUpdate) -> Dict[str, Any]:
        """
        정비 기록을 업데이트합니다.
        """
        db = get_session()
        record = db.query(self.MaintenanceModel).filter_by(id=record_id).first()
        
        if not record:
            raise ValueError(f"ID가 {record_id}인 정비 기록을 찾을 수 없습니다.")
        
        # 필드 업데이트
        for field, value in data.dict(exclude_unset=True).items():
            setattr(record, field, value)
        
        db.commit()
        db.refresh(record)
        
        # 차량 상태 업데이트
        vehicle = db.query(self.VehicleModel).filter_by(id=record.vehicle_id).first()
        if vehicle and data.status:
            if data.status == MaintenanceStatus.COMPLETED:
                # 다른 진행 중인 정비가 없는지 확인
                ongoing_count = db.query(self.MaintenanceModel).filter(
                    self.MaintenanceModel.vehicle_id == record.vehicle_id,
                    self.MaintenanceModel.id != record_id,
                    self.MaintenanceModel.status.in_([
                        MaintenanceStatus.SCHEDULED, 
                        MaintenanceStatus.IN_PROGRESS
                    ])
                ).count()
                
                if ongoing_count == 0:
                    vehicle.status = "active"
                    db.commit()
            elif data.status in [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]:
                vehicle.status = "maintenance"
                db.commit()
        
        return record.__dict__
    
    def delete_maintenance_record(self, record_id: str) -> bool:
        """
        정비 기록을 삭제합니다.
        """
        db = get_session()
        record = db.query(self.MaintenanceModel).filter_by(id=record_id).first()
        
        if not record:
            raise ValueError(f"ID가 {record_id}인 정비 기록을 찾을 수 없습니다.")
        
        # 관련 문서 삭제
        db.query(self.MaintenanceDocumentModel).filter_by(maintenance_id=record_id).delete()
        
        # 관련 부품 삭제
        db.query(self.MaintenancePartModel).filter_by(maintenance_id=record_id).delete()
        
        # 정비 기록 삭제
        db.delete(record)
        db.commit()
        
        # 차량 상태 업데이트
        vehicle = db.query(self.VehicleModel).filter_by(id=record.vehicle_id).first()
        if vehicle and record.status in [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]:
            # 다른 진행 중인 정비가 없는지 확인
            ongoing_count = db.query(self.MaintenanceModel).filter(
                self.MaintenanceModel.vehicle_id == record.vehicle_id,
                self.MaintenanceModel.id != record_id,
                self.MaintenanceModel.status.in_([
                    MaintenanceStatus.SCHEDULED, 
                    MaintenanceStatus.IN_PROGRESS
                ])
            ).count()
            
            if ongoing_count == 0:
                vehicle.status = "active"
                db.commit()
        
        return True
    
    def upload_maintenance_document(self, record_id: str, file) -> Dict[str, Any]:
        """
        정비 기록에 문서를 업로드합니다.
        """
        db = get_session()
        record = db.query(self.MaintenanceModel).filter_by(id=record_id).first()
        
        if not record:
            raise ValueError(f"ID가 {record_id}인 정비 기록을 찾을 수 없습니다.")
        
        # 파일 저장 및 문서 레코드 생성 로직
        # 실제 구현 시에는 파일 스토리지 서비스 사용 필요
        filename = file.filename
        file_url = f"/storage/maintenance/{record_id}/{filename}"
        
        new_document = self.MaintenanceDocumentModel(
            maintenance_id=record_id,
            file_name=filename,
            file_url=file_url,
            file_type=file.content_type,
            file_size=0  # 실제 구현 시 계산 필요
        )
        
        db.add(new_document)
        db.commit()
        db.refresh(new_document)
        
        return new_document.__dict__
    
    def delete_maintenance_document(self, record_id: str, document_id: str) -> bool:
        """
        정비 기록에서 문서를 삭제합니다.
        """
        db = get_session()
        document = db.query(self.MaintenanceDocumentModel).filter_by(
            id=document_id, 
            maintenance_id=record_id
        ).first()
        
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
        db = get_session()
        
        today = datetime.now().date()
        end_date = today + timedelta(days=days)
        
        records = db.query(self.MaintenanceModel).filter(
            self.MaintenanceModel.status == MaintenanceStatus.SCHEDULED,
            self.MaintenanceModel.date >= today,
            self.MaintenanceModel.date <= end_date
        ).order_by(self.MaintenanceModel.date).all()
        
        result = []
        for record in records:
            record_dict = record.__dict__
            
            # 관련 차량 정보 조회
            vehicle = db.query(self.VehicleModel).filter_by(id=record.vehicle_id).first()
            if vehicle:
                record_dict["vehicle"] = {
                    "id": vehicle.id,
                    "make": vehicle.make,
                    "model": vehicle.model,
                    "year": vehicle.year,
                    "vin": vehicle.vin,
                    "plate": vehicle.plate
                }
            
            result.append(record_dict)
        
        return result
    
    def complete_maintenance_record(self, record_id: str, mileage: Optional[int] = None, 
                                   cost: Optional[float] = None, notes: Optional[str] = None) -> Dict[str, Any]:
        """
        정비를 완료 처리합니다.
        """
        db = get_session()
        record = db.query(self.MaintenanceModel).filter_by(id=record_id).first()
        
        if not record:
            raise ValueError(f"ID가 {record_id}인 정비 기록을 찾을 수 없습니다.")
        
        # 상태 업데이트
        record.status = MaintenanceStatus.COMPLETED
        record.completion_date = datetime.now()
        
        # 추가 정보 업데이트
        if mileage is not None:
            vehicle = db.query(self.VehicleModel).filter_by(id=record.vehicle_id).first()
            if vehicle:
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
        
        # 차량 상태 업데이트
        vehicle = db.query(self.VehicleModel).filter_by(id=record.vehicle_id).first()
        if vehicle:
            # 다른 진행 중인 정비가 없는지 확인
            ongoing_count = db.query(self.MaintenanceModel).filter(
                self.MaintenanceModel.vehicle_id == record.vehicle_id,
                self.MaintenanceModel.id != record_id,
                self.MaintenanceModel.status.in_([
                    MaintenanceStatus.SCHEDULED, 
                    MaintenanceStatus.IN_PROGRESS
                ])
            ).count()
            
            if ongoing_count == 0:
                vehicle.status = "active"
                db.commit()
        
        return record.__dict__
    
    def cancel_maintenance_record(self, record_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
        """
        정비를 취소 처리합니다.
        """
        db = get_session()
        record = db.query(self.MaintenanceModel).filter_by(id=record_id).first()
        
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
        
        # 차량 상태 업데이트
        vehicle = db.query(self.VehicleModel).filter_by(id=record.vehicle_id).first()
        if vehicle:
            # 다른 진행 중인 정비가 없는지 확인
            ongoing_count = db.query(self.MaintenanceModel).filter(
                self.MaintenanceModel.vehicle_id == record.vehicle_id,
                self.MaintenanceModel.id != record_id,
                self.MaintenanceModel.status.in_([
                    MaintenanceStatus.SCHEDULED, 
                    MaintenanceStatus.IN_PROGRESS
                ])
            ).count()
            
            if ongoing_count == 0:
                vehicle.status = "active"
                db.commit()
        
        return record.__dict__
    
    @property
    def MaintenanceModel(self):
        from ...database.models import Maintenance
        return Maintenance
    
    @property
    def VehicleModel(self):
        from ...database.models import Vehicle
        return Vehicle
    
    @property
    def MaintenanceDocumentModel(self):
        from ...database.models import MaintenanceDocument
        return MaintenanceDocument
    
    @property
    def MaintenancePartModel(self):
        from ...database.models import MaintenancePart
        return MaintenancePart


# 싱글톤 인스턴스 생성
maintenance_service = MaintenanceService() 