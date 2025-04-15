import logging
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

from ..models.schemas import MaintenanceStatus
from ..repositories.maintenance_repository import MaintenanceRepository
from ..repositories.vehicle_repository import VehicleRepository
from ..services.git_service import GitService
from ..core.exceptions import ResourceNotFoundException, DatabaseOperationException, GitOperationException

logger = logging.getLogger(__name__)

class MaintenanceController:
    def __init__(self, path: str = None):
        """
        MaintenanceController 초기화
        
        Args:
            path (str, optional): 저장소 경로. 기본값은 프로젝트 루트 디렉토리
        """
        if path is None:
            # 현재 파일의 위치에서 프로젝트 루트 디렉토리 계산
            current_file = Path(__file__).resolve()
            # src/controllers에서 두 단계 위로 (src의 부모 디렉토리가 프로젝트 루트)
            self.path = str(current_file.parent.parent.parent)
        else:
            self.path = os.path.abspath(path)
            
        logger.info(f"MaintenanceController 초기화: 경로={self.path}")
        self.maintenance_repository = MaintenanceRepository()
        self.vehicle_repository = VehicleRepository()
        self.git_service = GitService(repo_path=self.path)

    def get_status(self):
        """정비 시스템 상태 조회"""
        try:
            # Git 상태 확인
            git_status = self.git_service.get_status()
            maintenance_count = self.maintenance_repository.count_maintenance_records()
            
            return {
                "status": "active",
                "path": self.path,
                "git_status": git_status,
                "maintenance_records_count": maintenance_count,
                "last_updated": datetime.now().isoformat()
            }
        except GitOperationException as e:
            logger.warning(f"Git 상태 조회 중 오류: {str(e)}")
            return {
                "status": "active",
                "path": self.path, 
                "git_status": {"error": str(e)},
                "maintenance_records_count": self.maintenance_repository.count_maintenance_records(),
                "last_updated": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"정비 상태 조회 중 오류 발생: {str(e)}")
            return {"status": "error", "message": str(e)}

    def create_maintenance_commit(self, message: str, paths: List[str] = None):
        """정비 관련 Git 커밋 생성"""
        try:
            return self.git_service.create_commit(f"정비: {message}", paths)
        except GitOperationException as e:
            logger.error(f"Git 커밋 생성 중 오류: {str(e)}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"정비 커밋 생성 중 오류 발생: {str(e)}")
            return {"error": str(e)}

    def pull_repository(self):
        """원격 저장소에서 변경사항 가져오기"""
        try:
            return self.git_service.pull()
        except GitOperationException as e:
            logger.error(f"Git pull 중 오류: {str(e)}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"저장소 pull 중 오류 발생: {str(e)}")
            return {"success": False, "error": str(e)}

    def push_repository(self, force: bool = False):
        """변경사항을 원격 저장소로 푸시"""
        try:
            return self.git_service.push(force=force)
        except GitOperationException as e:
            logger.error(f"Git push 중 오류: {str(e)}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"저장소 push 중 오류 발생: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_vehicle_maintenance(self, vehicle_id: str):
        """차량별 정비 내역 조회"""
        try:
            vehicle = self.vehicle_repository.get_vehicle_by_id(vehicle_id)
            if not vehicle:
                raise ResourceNotFoundException(f"차량 ID {vehicle_id}를 찾을 수 없습니다.")
                
            maintenance_records = self.maintenance_repository.get_maintenance_by_vehicle_id(vehicle_id)
            
            return {
                "vehicle_id": vehicle_id,
                "vehicle_info": vehicle,
                "maintenance_records": maintenance_records,
                "count": len(maintenance_records)
            }
        except ResourceNotFoundException as e:
            logger.warning(f"차량 정비 내역 조회 실패: {str(e)}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"차량 정비 내역 조회 중 오류 발생: {str(e)}")
            return {"error": str(e)}

    def schedule_maintenance(self, vehicle_id: str, schedule_date: str, maintenance_type: str, description: str = None):
        """정비 예약 생성"""
        try:
            vehicle = self.vehicle_repository.get_vehicle_by_id(vehicle_id)
            if not vehicle:
                raise ResourceNotFoundException(f"차량 ID {vehicle_id}를 찾을 수 없습니다.")
            
            # 예약 정비 생성
            maintenance_data = {
                "vehicle_id": vehicle_id,
                "date": schedule_date,
                "type": maintenance_type,
                "description": description or f"{maintenance_type} 정비",
                "status": MaintenanceStatus.SCHEDULED
            }
            
            new_maintenance = self.maintenance_repository.create_maintenance(maintenance_data)
            
            # 차량 상태 업데이트
            self.vehicle_repository.update_vehicle_status(vehicle_id, "scheduled_maintenance")
            
            return {
                "scheduled": True,
                "maintenance_id": new_maintenance["id"],
                "schedule_date": schedule_date,
                "maintenance_type": maintenance_type
            }
        except ResourceNotFoundException as e:
            logger.warning(f"정비 예약 생성 실패: {str(e)}")
            return {"scheduled": False, "error": str(e)}
        except DatabaseOperationException as e:
            logger.error(f"정비 예약 생성 중 데이터베이스 오류: {str(e)}")
            return {"scheduled": False, "error": f"데이터베이스 오류: {str(e)}"}
        except Exception as e:
            logger.error(f"정비 예약 생성 중 오류 발생: {str(e)}")
            return {"scheduled": False, "error": str(e)}

    def complete_maintenance(self, maintenance_id: str, completion_notes: str = None):
        """정비 완료 처리"""
        try:
            maintenance = self.maintenance_repository.get_maintenance_by_id(maintenance_id)
            if not maintenance:
                raise ResourceNotFoundException(f"정비 ID {maintenance_id}를 찾을 수 없습니다.")
            
            # 정비 상태 업데이트
            update_data = {
                "status": MaintenanceStatus.COMPLETED,
                "completion_date": datetime.now().isoformat()
            }
            
            if completion_notes:
                update_data["notes"] = completion_notes
                
            updated_maintenance = self.maintenance_repository.update_maintenance(maintenance_id, update_data)
            
            # 차량에 대한 다른 예약된 정비가 있는지 확인
            vehicle_id = maintenance["vehicle_id"]
            pending_maintenance = self.maintenance_repository.get_maintenance_by_vehicle_id_and_status(
                vehicle_id, [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]
            )
            
            # 다른 예약된 정비가 없으면 차량 상태 업데이트
            if not pending_maintenance:
                self.vehicle_repository.update_vehicle_status(vehicle_id, "active")
            
            return updated_maintenance
        except ResourceNotFoundException as e:
            logger.warning(f"정비 완료 처리 실패: {str(e)}")
            return {"error": str(e)}
        except DatabaseOperationException as e:
            logger.error(f"정비 완료 처리 중 데이터베이스 오류: {str(e)}")
            return {"error": f"데이터베이스 오류: {str(e)}"}
        except Exception as e:
            logger.error(f"정비 완료 처리 중 오류 발생: {str(e)}")
            return {"error": str(e)}

    def get_maintenance_recommendations(self, vehicle_id: str):
        """정비 권장사항 조회"""
        try:
            vehicle = self.vehicle_repository.get_vehicle_by_id(vehicle_id)
            if not vehicle:
                return {"error": f"차량 ID {vehicle_id}를 찾을 수 없습니다."}
            
            # 마지막 정비 내역 조회
            maintenance_history = self.maintenance_repository.get_maintenance_by_vehicle_id(vehicle_id)
            
            # 차량 정보와 정비 이력 기반으로 권장사항 생성
            mileage = vehicle.get("mileage", 0)
            last_maintenance_date = None
            last_oil_change = None
            
            if maintenance_history:
                for record in maintenance_history:
                    if record.get("type") == "oil_change":
                        last_oil_change = record.get("date")
                        break
                
                last_maintenance_date = maintenance_history[0].get("date") if maintenance_history else None
            
            recommendations = []
            
            # 주행거리 기반 권장사항
            if mileage > 10000 and not last_oil_change:
                recommendations.append({
                    "type": "oil_change",
                    "urgency": "high",
                    "description": "엔진 오일 교체가 필요합니다. 마지막 오일 교체 기록이 없습니다."
                })
            elif mileage > 5000:
                recommendations.append({
                    "type": "inspection",
                    "urgency": "medium",
                    "description": "일반 점검이 권장됩니다."
                })
                
            # 계절 점검 권장
            current_month = datetime.now().month
            if current_month in [5, 6]:  # 여름 준비
                recommendations.append({
                    "type": "seasonal",
                    "urgency": "medium",
                    "description": "여름철 냉각 시스템 및 에어컨 점검이 권장됩니다."
                })
            elif current_month in [11, 12]:  # 겨울 준비
                recommendations.append({
                    "type": "seasonal",
                    "urgency": "medium", 
                    "description": "겨울철 배터리 및 히터 시스템 점검이 권장됩니다."
                })
                
            return {
                "vehicle_id": vehicle_id,
                "recommendations": recommendations,
                "last_maintenance_date": last_maintenance_date,
                "current_mileage": mileage
            }
        except Exception as e:
            logger.error(f"정비 권장사항 조회 중 오류 발생: {str(e)}")
            return {"error": str(e)}

    def get_maintenance_statistics(self, vehicle_id: str):
        """정비 통계 조회"""
        try:
            vehicle = self.vehicle_repository.get_vehicle_by_id(vehicle_id)
            if not vehicle:
                return {"error": f"차량 ID {vehicle_id}를 찾을 수 없습니다."}
            
            # 정비 내역 조회
            maintenance_records = self.maintenance_repository.get_maintenance_by_vehicle_id(vehicle_id)
            
            # 비용 합계 계산
            total_cost = 0
            for record in maintenance_records:
                cost = record.get("cost", 0)
                if cost:
                    total_cost += cost
                    
            # 통계 생성
            avg_cost = total_cost / len(maintenance_records) if maintenance_records else 0
            
            return {
                "vehicle_id": vehicle_id,
                "total_maintenance_count": len(maintenance_records),
                "recent_maintenance": maintenance_records[:3] if maintenance_records else [],
                "cost_summary": {
                    "total": total_cost,
                    "average": avg_cost
                }
            }
        except Exception as e:
            logger.error(f"정비 통계 조회 중 오류 발생: {str(e)}")
            return {"error": str(e)}
            
    def get_recent_maintenance_records(self, limit: int = 10):
        """최근 정비 내역 조회"""
        try:
            records = self.maintenance_repository.get_recent_maintenance_records(limit)
            return records
        except Exception as e:
            logger.error(f"최근 정비 내역 조회 중 오류 발생: {str(e)}")
            return {"error": str(e)}
            
    def get_scheduled_maintenance(self, limit: int = 10):
        """예약된 정비 내역 조회"""
        try:
            records = self.maintenance_repository.get_maintenance_by_status(
                MaintenanceStatus.SCHEDULED, limit=limit
            )
            return records
        except Exception as e:
            logger.error(f"예약 정비 내역 조회 중 오류 발생: {str(e)}")
            return {"error": str(e)}
            
    def get_pending_approvals(self):
        """승인 대기 중인 정비 내역 조회"""
        try:
            records = self.maintenance_repository.get_pending_approval_maintenance()
            return records
        except Exception as e:
            logger.error(f"승인 대기 정비 내역 조회 중 오류 발생: {str(e)}")
            return {"error": str(e)}
            
    def get_maintenance_summary(self):
        """정비 요약 정보 조회"""
        try:
            total = self.maintenance_repository.count_maintenance_records()
            scheduled = self.maintenance_repository.count_maintenance_by_status(MaintenanceStatus.SCHEDULED)
            completed = self.maintenance_repository.count_maintenance_by_status(MaintenanceStatus.COMPLETED)
            in_progress = self.maintenance_repository.count_maintenance_by_status(MaintenanceStatus.IN_PROGRESS)
            
            return {
                "total": total,
                "scheduled": scheduled,
                "completed": completed,
                "in_progress": in_progress,
                "completion_rate": (completed / total * 100) if total > 0 else 0
            }
        except Exception as e:
            logger.error(f"정비 요약 정보 조회 중 오류 발생: {str(e)}")
            return {"error": str(e)}