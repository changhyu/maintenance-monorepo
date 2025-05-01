from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from fastapi import UploadFile, HTTPException
import uuid
from datetime import datetime

from ..models.driver import Driver, DriverCreate, DriverUpdate, DriverStats, DriverFilters, Document, PaginatedDriverList
from ..database.models import DriverModel, DocumentModel, DriverStatus
from ..utils.storage import upload_file_to_storage

class DriverService:
    def __init__(self, db: Session):
        self.db = db

    def _convert_to_driver(self, driver_model: DriverModel) -> Driver:
        """
        데이터베이스 모델을 API 응답 모델로 변환합니다.
        """
        # 이름 분리
        name_parts = driver_model.name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        # Pydantic 모델로 변환
        return Driver(
            id=driver_model.id,
            name=driver_model.name,
            firstName=first_name,
            lastName=last_name,
            email=driver_model.email,
            phone=driver_model.phone,
            license_number=driver_model.license_number,
            status=driver_model.status.value,
            address=driver_model.address,
            emergency_contact=driver_model.emergency_contact,
            notes=driver_model.notes,
            vehicle_id=driver_model.vehicle_id,
            birth_date=driver_model.birth_date,
            hire_date=driver_model.hire_date,
            license_expiry=driver_model.license_expiry,
            safety_score=driver_model.safety_score,
            created_at=driver_model.created_at,
            updated_at=driver_model.updated_at
        )

    def get_drivers(self, filters: DriverFilters) -> PaginatedDriverList:
        """
        드라이버 목록을 조회합니다.
        페이지네이션과 검색 기능을 지원합니다.
        """
        query = self.db.query(DriverModel)

        # 필터 적용
        if filters.status:
            query = query.filter(DriverModel.status == filters.status)
        
        if filters.vehicle_id:
            query = query.filter(DriverModel.vehicle_id == filters.vehicle_id)
        
        if filters.search_query:
            search = f"%{filters.search_query}%"
            query = query.filter(
                (DriverModel.name.ilike(search)) |
                (DriverModel.email.ilike(search)) |
                (DriverModel.license_number.ilike(search))
            )
        
        # 정렬 적용
        if filters.sort_by:
            column = getattr(DriverModel, filters.sort_by, None)
            if column:
                if filters.sort_order == 'desc':
                    query = query.order_by(column.desc())
                else:
                    query = query.order_by(column)
        
        # 전체 개수 계산
        total_count = query.count()

        # 페이지네이션 적용
        page = filters.page or 1
        limit = filters.limit or 10
        query = query.offset((page - 1) * limit).limit(limit)
        
        # 결과 변환 (firstName, lastName 추가)
        drivers = query.all()
        driver_list = [self._convert_to_driver(driver) for driver in drivers]
        
        total_pages = (total_count + limit - 1) // limit

        return PaginatedDriverList(
            items=driver_list,
            totalCount=total_count,
            page=page,
            limit=limit,
            totalPages=total_pages
        )

    def get_driver_by_id(self, driver_id: str) -> Optional[Driver]:
        """
        특정 드라이버의 정보를 조회합니다.
        """
        driver_model = self.db.query(DriverModel).filter(DriverModel.id == driver_id).first()
        if not driver_model:
            return None
        
        return self._convert_to_driver(driver_model)

    def create_driver(self, driver: DriverCreate) -> Driver:
        """
        새로운 드라이버를 생성합니다.
        """
        # 모델 간 필드 이름 매핑 (firstName -> name 등)
        db_driver = DriverModel(
            id=str(uuid.uuid4()),
            name=driver.name,
            email=driver.email,
            phone=driver.phone,
            license_number=driver.license_number,
            status=driver.status,
            address=driver.address,
            emergency_contact=driver.emergency_contact,
            notes=driver.notes,
            vehicle_id=driver.vehicle_id,
            birth_date=driver.birth_date,
            hire_date=driver.hire_date,
            license_expiry=driver.license_expiry,
            safety_score=0,  # 초기값
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(db_driver)
        self.db.commit()
        self.db.refresh(db_driver)
        
        # 이름 필드 추가하여 반환
        return self._convert_to_driver(db_driver)

    def update_driver(self, driver_id: str, driver_update: DriverUpdate) -> Optional[Driver]:
        """
        드라이버 정보를 수정합니다.
        """
        db_driver = self.db.query(DriverModel).filter(DriverModel.id == driver_id).first()
        if not db_driver:
            return None

        # 업데이트 데이터 준비
        update_data = driver_update.model_dump(exclude_unset=True)
        
        # firstName과 lastName이 있으면 name 필드를 업데이트
        first_name = update_data.pop('firstName', None)
        last_name = update_data.pop('lastName', None)
        
        if first_name is not None or last_name is not None:
            # 기존 이름 분리
            current_name_parts = db_driver.name.split(' ', 1)
            current_first = current_name_parts[0]
            current_last = current_name_parts[1] if len(current_name_parts) > 1 else ""
            
            # 새 이름 구성
            new_first = first_name if first_name is not None else current_first
            new_last = last_name if last_name is not None else current_last
            
            # 최종 이름 설정
            if new_last:
                update_data['name'] = f"{new_first} {new_last}"
            else:
                update_data['name'] = new_first
        
        # 업데이트 시간 설정
        update_data["updated_at"] = datetime.utcnow()

        # 필드 업데이트
        for key, value in update_data.items():
            if hasattr(db_driver, key):  # 필드가 존재하는 경우에만 업데이트
                setattr(db_driver, key, value)

        self.db.commit()
        self.db.refresh(db_driver)
        
        # firstName, lastName 추가하여 반환
        return self._convert_to_driver(db_driver)

    def delete_driver(self, driver_id: str) -> bool:
        """
        드라이버를 삭제합니다.
        """
        db_driver = self.db.query(DriverModel).filter(DriverModel.id == driver_id).first()
        if not db_driver:
            return False

        self.db.delete(db_driver)
        self.db.commit()
        return True

    def get_driver_stats(self, driver_id: str) -> Optional[DriverStats]:
        """
        드라이버의 통계 정보를 조회합니다.
        """
        driver_model = self.db.query(DriverModel).filter(DriverModel.id == driver_id).first()
        if not driver_model:
            return None

        # TODO: 실제 통계 데이터 계산 로직 구현
        return DriverStats(
            total_trips=100,  # 예시 데이터
            total_distance=1500.5,
            average_rating=4.5,
            safety_score=driver_model.safety_score or 85,
            fuel_efficiency=8.5,
            incident_count=2,
            completed_maintenance_checks=5,
            last_active_date=datetime.utcnow()
        )

    async def upload_document(self, driver_id: str, file: UploadFile, document_type: str) -> Document:
        """
        드라이버 관련 문서를 업로드합니다.
        """
        driver_model = self.db.query(DriverModel).filter(DriverModel.id == driver_id).first()
        if not driver_model:
            raise HTTPException(status_code=404, detail="드라이버를 찾을 수 없습니다.")

        try:
            # 파일 업로드
            file_url = await upload_file_to_storage(file, f"drivers/{driver_id}/documents")

            # 문서 정보 저장
            document = DocumentModel(
                id=str(uuid.uuid4()),
                driver_id=driver_id,
                type=document_type,
                name=file.filename,
                url=file_url,
                uploaded_at=datetime.utcnow()
            )
            self.db.add(document)
            self.db.commit()
            self.db.refresh(document)

            # Document 모델로 변환하여 반환
            return Document(
                id=document.id,
                driver_id=document.driver_id,
                type=document.type,
                name=document.name,
                url=document.url,
                uploaded_at=document.uploaded_at,
                expiry_date=document.expiry_date,
                status=document.status
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    def get_driver_documents(self, driver_id: str) -> List[Document]:
        """
        드라이버의 모든 문서 목록을 조회합니다.
        """
        document_models = self.db.query(DocumentModel).filter(DocumentModel.driver_id == driver_id).all()
        
        # DocumentModel을 Document Pydantic 모델로 변환
        return [
            Document(
                id=doc.id,
                driver_id=doc.driver_id,
                type=doc.type,
                name=doc.name,
                url=doc.url,
                uploaded_at=doc.uploaded_at,
                expiry_date=doc.expiry_date,
                status=doc.status
            ) for doc in document_models
        ]

    def delete_document(self, driver_id: str, document_id: str) -> bool:
        """
        드라이버의 특정 문서를 삭제합니다.
        """
        document = self.db.query(DocumentModel).filter(
            DocumentModel.driver_id == driver_id,
            DocumentModel.id == document_id
        ).first()

        if not document:
            return False

        # TODO: 스토리지에서 실제 파일 삭제 로직 구현

        self.db.delete(document)
        self.db.commit()
        return True 