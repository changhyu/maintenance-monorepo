"""
차량 관련 데이터베이스 액세스 로직을 제공하는 리포지토리 모듈.
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import and_, or_

from ..core.dependencies import get_db
from ..models.vehicle import VehicleModel

logger = logging.getLogger(__name__)

class VehicleRepository:
    """차량 정보를 다루는 리포지토리 클래스"""
    
    def get_vehicle_by_id(self, vehicle_id: str) -> Optional[Dict[str, Any]]:
        """ID로 차량 정보 조회"""
        try:
            db = next(get_db())
            vehicle = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
            
            if not vehicle:
                return None
                
            return self._model_to_dict(vehicle)
        except SQLAlchemyError as e:
            logger.error(f"차량 ID {vehicle_id} 조회 중 데이터베이스 오류: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"차량 ID {vehicle_id} 조회 중 오류: {str(e)}")
            return None
            
    def get_vehicles(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """차량 목록 조회"""
        try:
            db = next(get_db())
            vehicles = db.query(VehicleModel).offset(skip).limit(limit).all()
            
            return [self._model_to_dict(vehicle) for vehicle in vehicles]
        except SQLAlchemyError as e:
            logger.error(f"차량 목록 조회 중 데이터베이스 오류: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"차량 목록 조회 중 오류: {str(e)}")
            return []
            
    def count_vehicles(self) -> int:
        """전체 차량 수 조회"""
        try:
            db = next(get_db())
            return db.query(VehicleModel).count()
        except SQLAlchemyError as e:
            logger.error(f"차량 수 조회 중 데이터베이스 오류: {str(e)}")
            return 0
        except Exception as e:
            logger.error(f"차량 수 조회 중 오류: {str(e)}")
            return 0
            
    def search_vehicles(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """차량 검색"""
        try:
            db = next(get_db())
            
            # 여러 필드에서 검색
            search_pattern = f"%{query}%"
            vehicles = (
                db.query(VehicleModel)
                .filter(
                    or_(
                        VehicleModel.make.ilike(search_pattern),
                        VehicleModel.model.ilike(search_pattern),
                        VehicleModel.plate.ilike(search_pattern),
                        VehicleModel.vin.ilike(search_pattern)
                    )
                )
                .limit(limit)
                .all()
            )
            
            return [self._model_to_dict(vehicle) for vehicle in vehicles]
        except SQLAlchemyError as e:
            logger.error(f"차량 검색 중 데이터베이스 오류: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"차량 검색 중 오류: {str(e)}")
            return []
            
    def create_vehicle(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """새 차량 정보 생성"""
        try:
            db = next(get_db())
            
            # ID 생성 또는 검증
            if "id" not in data:
                data["id"] = str(uuid.uuid4())
                
            # 생성 시간 기록
            data["created_at"] = datetime.now().isoformat()
            data["updated_at"] = data["created_at"]
            
            # 모델 생성
            new_vehicle = VehicleModel(**data)
            
            db.add(new_vehicle)
            db.commit()
            db.refresh(new_vehicle)
            
            return self._model_to_dict(new_vehicle)
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"차량 정보 생성 중 데이터베이스 오류: {str(e)}")
            raise
        except Exception as e:
            if 'db' in locals():
                db.rollback()
            logger.error(f"차량 정보 생성 중 오류: {str(e)}")
            raise
            
    def update_vehicle(self, vehicle_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """차량 정보 업데이트"""
        try:
            db = next(get_db())
            vehicle = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
            
            if not vehicle:
                raise ValueError(f"ID {vehicle_id}인 차량을 찾을 수 없습니다.")
                
            # 업데이트 시간 기록
            data["updated_at"] = datetime.now().isoformat()
            
            # 필드 업데이트
            for key, value in data.items():
                if hasattr(vehicle, key):
                    setattr(vehicle, key, value)
                    
            db.commit()
            db.refresh(vehicle)
            
            return self._model_to_dict(vehicle)
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"차량 정보 업데이트 중 데이터베이스 오류: {str(e)}")
            raise
        except Exception as e:
            if 'db' in locals():
                db.rollback()
            logger.error(f"차량 정보 업데이트 중 오류: {str(e)}")
            raise
            
    def update_vehicle_status(self, vehicle_id: str, status: str) -> bool:
        """차량 상태 업데이트"""
        try:
            db = next(get_db())
            vehicle = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
            
            if not vehicle:
                return False
                
            vehicle.status = status
            vehicle.updated_at = datetime.now().isoformat()
            
            db.commit()
            return True
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"차량 상태 업데이트 중 데이터베이스 오류: {str(e)}")
            return False
        except Exception as e:
            if 'db' in locals():
                db.rollback()
            logger.error(f"차량 상태 업데이트 중 오류: {str(e)}")
            return False
            
    def update_vehicle_mileage(self, vehicle_id: str, mileage: int) -> bool:
        """차량 주행거리 업데이트"""
        try:
            db = next(get_db())
            vehicle = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
            
            if not vehicle:
                return False
                
            # 현재 주행거리보다 작은 값은 업데이트하지 않음
            if vehicle.mileage and vehicle.mileage > mileage:
                logger.warning(f"차량 ID {vehicle_id}의 새 주행거리({mileage})가 기존 주행거리({vehicle.mileage})보다 작습니다.")
                return False
                
            vehicle.mileage = mileage
            vehicle.updated_at = datetime.now().isoformat()
            
            db.commit()
            return True
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"차량 주행거리 업데이트 중 데이터베이스 오류: {str(e)}")
            return False
        except Exception as e:
            if 'db' in locals():
                db.rollback()
            logger.error(f"차량 주행거리 업데이트 중 오류: {str(e)}")
            return False
            
    def delete_vehicle(self, vehicle_id: str) -> bool:
        """차량 정보 삭제"""
        try:
            db = next(get_db())
            vehicle = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
            
            if not vehicle:
                return False
                
            db.delete(vehicle)
            db.commit()
            
            return True
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"차량 정보 삭제 중 데이터베이스 오류: {str(e)}")
            return False
        except Exception as e:
            if 'db' in locals():
                db.rollback()
            logger.error(f"차량 정보 삭제 중 오류: {str(e)}")
            return False
    
    def get_vehicles_by_status(self, status: str, limit: int = 100) -> List[Dict[str, Any]]:
        """상태별 차량 목록 조회"""
        try:
            db = next(get_db())
            vehicles = (
                db.query(VehicleModel)
                .filter(VehicleModel.status == status)
                .limit(limit)
                .all()
            )
            
            return [self._model_to_dict(vehicle) for vehicle in vehicles]
        except SQLAlchemyError as e:
            logger.error(f"상태 {status}인 차량 조회 중 데이터베이스 오류: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"상태 {status}인 차량 조회 중 오류: {str(e)}")
            return []
            
    def _model_to_dict(self, model: VehicleModel) -> Dict[str, Any]:
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