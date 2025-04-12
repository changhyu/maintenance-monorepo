"""
정비 관련 데이터베이스 액세스 로직을 제공하는 리포지토리 모듈.
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import and_, or_

from ..core.dependencies import get_db
from ..models.maintenance import MaintenanceModel
from ..models.schemas import MaintenanceStatus

logger = logging.getLogger(__name__)

class MaintenanceRepository:
    """정비 정보를 다루는 리포지토리 클래스"""
    
    def get_maintenance_by_id(self, maintenance_id: str) -> Optional[Dict[str, Any]]:
        """ID로 정비 기록 조회"""
        try:
            db = next(get_db())
            maintenance = db.query(MaintenanceModel).filter(MaintenanceModel.id == maintenance_id).first()
            
            if not maintenance:
                return None
                
            return self._model_to_dict(maintenance)
        except SQLAlchemyError as e:
            logger.error(f"정비 ID {maintenance_id} 조회 중 데이터베이스 오류: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"정비 ID {maintenance_id} 조회 중 오류: {str(e)}")
            return None
            
    def get_maintenance_by_vehicle_id(self, vehicle_id: str) -> List[Dict[str, Any]]:
        """차량 ID로 정비 기록 목록 조회"""
        try:
            db = next(get_db())
            records = (
                db.query(MaintenanceModel)
                .filter(MaintenanceModel.vehicle_id == vehicle_id)
                .order_by(MaintenanceModel.date.desc())
                .all()
            )
            
            return [self._model_to_dict(record) for record in records]
        except SQLAlchemyError as e:
            logger.error(f"차량 ID {vehicle_id}의 정비 기록 조회 중 데이터베이스 오류: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"차량 ID {vehicle_id}의 정비 기록 조회 중 오류: {str(e)}")
            return []
            
    def get_maintenance_by_vehicle_id_and_status(
        self, 
        vehicle_id: str, 
        status_list: List[str]
    ) -> List[Dict[str, Any]]:
        """차량 ID와 상태로 정비 기록 목록 조회"""
        try:
            db = next(get_db())
            records = (
                db.query(MaintenanceModel)
                .filter(
                    and_(
                        MaintenanceModel.vehicle_id == vehicle_id,
                        MaintenanceModel.status.in_(status_list)
                    )
                )
                .order_by(MaintenanceModel.date.desc())
                .all()
            )
            
            return [self._model_to_dict(record) for record in records]
        except SQLAlchemyError as e:
            logger.error(f"차량 ID {vehicle_id}, 상태 {status_list}의 정비 기록 조회 중 데이터베이스 오류: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"차량 ID {vehicle_id}, 상태 {status_list}의 정비 기록 조회 중 오류: {str(e)}")
            return []
            
    def count_maintenance_records(self) -> int:
        """전체 정비 기록 수 조회"""
        try:
            db = next(get_db())
            return db.query(MaintenanceModel).count()
        except SQLAlchemyError as e:
            logger.error(f"정비 기록 수 조회 중 데이터베이스 오류: {str(e)}")
            return 0
        except Exception as e:
            logger.error(f"정비 기록 수 조회 중 오류: {str(e)}")
            return 0
            
    def create_maintenance(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """새 정비 기록 생성"""
        try:
            db = next(get_db())
            
            # ID 생성 또는 검증
            if "id" not in data:
                data["id"] = str(uuid.uuid4())
                
            # 생성 시간 기록
            data["created_at"] = datetime.now().isoformat()
            data["updated_at"] = data["created_at"]
            
            # 모델 생성
            new_maintenance = MaintenanceModel(**data)
            
            db.add(new_maintenance)
            db.commit()
            db.refresh(new_maintenance)
            
            return self._model_to_dict(new_maintenance)
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"정비 기록 생성 중 데이터베이스 오류: {str(e)}")
            raise
        except Exception as e:
            if 'db' in locals():
                db.rollback()
            logger.error(f"정비 기록 생성 중 오류: {str(e)}")
            raise
            
    def update_maintenance(self, maintenance_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """정비 기록 업데이트"""
        try:
            db = next(get_db())
            maintenance = db.query(MaintenanceModel).filter(MaintenanceModel.id == maintenance_id).first()
            
            if not maintenance:
                raise ValueError(f"ID {maintenance_id}인 정비 기록을 찾을 수 없습니다.")
                
            # 업데이트 시간 기록
            data["updated_at"] = datetime.now().isoformat()
            
            # 필드 업데이트
            for key, value in data.items():
                if hasattr(maintenance, key):
                    setattr(maintenance, key, value)
                    
            db.commit()
            db.refresh(maintenance)
            
            return self._model_to_dict(maintenance)
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"정비 기록 업데이트 중 데이터베이스 오류: {str(e)}")
            raise
        except Exception as e:
            if 'db' in locals():
                db.rollback()
            logger.error(f"정비 기록 업데이트 중 오류: {str(e)}")
            raise
            
    def delete_maintenance(self, maintenance_id: str) -> bool:
        """정비 기록 삭제"""
        try:
            db = next(get_db())
            maintenance = db.query(MaintenanceModel).filter(MaintenanceModel.id == maintenance_id).first()
            
            if not maintenance:
                return False
                
            db.delete(maintenance)
            db.commit()
            
            return True
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"정비 기록 삭제 중 데이터베이스 오류: {str(e)}")
            return False
        except Exception as e:
            if 'db' in locals():
                db.rollback()
            logger.error(f"정비 기록 삭제 중 오류: {str(e)}")
            return False
            
    def get_maintenance_by_status(self, status: str, limit: int = 100) -> List[Dict[str, Any]]:
        """상태별 정비 기록 조회"""
        try:
            db = next(get_db())
            records = (
                db.query(MaintenanceModel)
                .filter(MaintenanceModel.status == status)
                .order_by(MaintenanceModel.date.desc())
                .limit(limit)
                .all()
            )
            
            return [self._model_to_dict(record) for record in records]
        except SQLAlchemyError as e:
            logger.error(f"상태 {status}인 정비 기록 조회 중 데이터베이스 오류: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"상태 {status}인 정비 기록 조회 중 오류: {str(e)}")
            return []
            
    def get_recent_maintenance(self, days: int = 30) -> List[Dict[str, Any]]:
        """최근 N일간의 정비 기록 조회"""
        try:
            from_date = datetime.now() - datetime.timedelta(days=days)
            
            db = next(get_db())
            records = (
                db.query(MaintenanceModel)
                .filter(MaintenanceModel.date >= from_date.isoformat())
                .order_by(MaintenanceModel.date.desc())
                .all()
            )
            
            return [self._model_to_dict(record) for record in records]
        except SQLAlchemyError as e:
            logger.error(f"최근 {days}일간 정비 기록 조회 중 데이터베이스 오류: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"최근 {days}일간 정비 기록 조회 중 오류: {str(e)}")
            return []
            
    def _model_to_dict(self, model: MaintenanceModel) -> Dict[str, Any]:
        """모델 객체를 딕셔너리로 변환"""
        result = {
            column.name: getattr(model, column.name)
            for column in model.__table__.columns
        }
        
        # 날짜/시간 값을 문자열로 변환
        for key, value in result.items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
                
        return result 