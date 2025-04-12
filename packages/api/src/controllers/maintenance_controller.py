import logging
import os
import json
import subprocess
from datetime import datetime
from typing import Dict, Any, List, Optional

from ..models.schemas import MaintenanceStatus
from ..repositories.maintenance_repository import MaintenanceRepository
from ..repositories.vehicle_repository import VehicleRepository

logger = logging.getLogger(__name__)

class MaintenanceController:
    def __init__(self, path: str):
        self.path = path
        self.maintenance_repository = MaintenanceRepository()
        self.vehicle_repository = VehicleRepository()

    def get_status(self):
        """정비 시스템 상태 조회"""
        try:
            # Git 상태 확인
            git_status = self._get_git_status()
            maintenance_count = self.maintenance_repository.count_maintenance_records()
            
            return {
                "status": "active",
                "path": self.path,
                "git_status": git_status,
                "maintenance_records_count": maintenance_count,
                "last_updated": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"정비 상태 조회 중 오류 발생: {str(e)}")
            return {"status": "error", "message": str(e)}

    def create_maintenance_commit(self, message: str):
        """정비 관련 Git 커밋 생성"""
        try:
            # 변경사항 스테이징
            subprocess.run(["git", "-C", self.path, "add", "."], check=True)
            
            # 커밋 생성
            result = subprocess.run(
                ["git", "-C", self.path, "commit", "-m", f"정비: {message}"],
                capture_output=True,
                text=True,
                check=True
            )
            
            # 커밋 해시 가져오기
            commit_hash = subprocess.run(
                ["git", "-C", self.path, "rev-parse", "HEAD"],
                capture_output=True,
                text=True,
                check=True
            ).stdout.strip()
            
            return {
                "commit": commit_hash,
                "message": message,
                "details": result.stdout
            }
        except subprocess.CalledProcessError as e:
            logger.error(f"Git 커밋 생성 중 오류 발생: {e.stderr}")
            return {"error": e.stderr}
        except Exception as e:
            logger.error(f"정비 커밋 생성 중 오류 발생: {str(e)}")
            return {"error": str(e)}

    def pull_repository(self):
        """원격 저장소에서 변경사항 가져오기"""
        try:
            result = subprocess.run(
                ["git", "-C", self.path, "pull"],
                capture_output=True,
                text=True,
                check=True
            )
            
            return {
                "success": True,
                "details": result.stdout
            }
        except subprocess.CalledProcessError as e:
            logger.error(f"Git pull 중 오류 발생: {e.stderr}")
            return {"success": False, "error": e.stderr}
        except Exception as e:
            logger.error(f"저장소 pull 중 오류 발생: {str(e)}")
            return {"success": False, "error": str(e)}

    def push_repository(self):
        """변경사항을 원격 저장소로 푸시"""
        try:
            result = subprocess.run(
                ["git", "-C", self.path, "push"],
                capture_output=True,
                text=True,
                check=True
            )
            
            return {
                "success": True,
                "details": result.stdout
            }
        except subprocess.CalledProcessError as e:
            logger.error(f"Git push 중 오류 발생: {e.stderr}")
            return {"success": False, "error": e.stderr}
        except Exception as e:
            logger.error(f"저장소 push 중 오류 발생: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_vehicle_maintenance(self, vehicle_id: str):
        """차량별 정비 내역 조회"""
        try:
            vehicle = self.vehicle_repository.get_vehicle_by_id(vehicle_id)
            if not vehicle:
                return {"error": f"차량 ID {vehicle_id}를 찾을 수 없습니다."}
                
            maintenance_records = self.maintenance_repository.get_maintenance_by_vehicle_id(vehicle_id)
            
            return {
                "vehicle_id": vehicle_id,
                "vehicle_info": vehicle,
                "maintenance_records": maintenance_records,
                "count": len(maintenance_records)
            }
        except Exception as e:
            logger.error(f"차량 정비 내역 조회 중 오류 발생: {str(e)}")
            return {"error": str(e)}

    def schedule_maintenance(self, vehicle_id: str, schedule_date: str, maintenance_type: str, description: str = None):
        """정비 예약 생성"""
        try:
            vehicle = self.vehicle_repository.get_vehicle_by_id(vehicle_id)
            if not vehicle:
                return {"error": f"차량 ID {vehicle_id}를 찾을 수 없습니다."}
            
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
        except Exception as e:
            logger.error(f"정비 예약 생성 중 오류 발생: {str(e)}")
            return {"scheduled": False, "error": str(e)}

    def complete_maintenance(self, maintenance_id: str, completion_notes: str = None):
        """정비 완료 처리"""
        try:
            maintenance = self.maintenance_repository.get_maintenance_by_id(maintenance_id)
            if not maintenance:
                return {"error": f"정비 ID {maintenance_id}를 찾을 수 없습니다."}
            
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
            
            maintenance_records = self.maintenance_repository.get_maintenance_by_vehicle_id(vehicle_id)
            
            # 기본 통계 계산
            total_count = len(maintenance_records)
            completed_count = sum(1 for record in maintenance_records if record.get("status") == MaintenanceStatus.COMPLETED)
            scheduled_count = sum(1 for record in maintenance_records if record.get("status") == MaintenanceStatus.SCHEDULED)
            in_progress_count = sum(1 for record in maintenance_records if record.get("status") == MaintenanceStatus.IN_PROGRESS)
            
            # 총 비용 계산
            total_cost = sum(record.get("cost", 0) for record in maintenance_records if record.get("status") == MaintenanceStatus.COMPLETED)
            
            # 정비 유형별 분석
            maintenance_types = {}
            for record in maintenance_records:
                mtype = record.get("type", "기타")
                if mtype not in maintenance_types:
                    maintenance_types[mtype] = 0
                maintenance_types[mtype] += 1
            
            return {
                "vehicle_id": vehicle_id,
                "total": total_count,
                "completed": completed_count,
                "scheduled": scheduled_count,
                "in_progress": in_progress_count,
                "total_cost": total_cost,
                "maintenance_types": maintenance_types,
                "last_maintenance": maintenance_records[0] if maintenance_records else None
            }
        except Exception as e:
            logger.error(f"정비 통계 조회 중 오류 발생: {str(e)}")
            return {"error": str(e)}
            
    def _get_git_status(self):
        """Git 저장소 상태 조회 헬퍼 메서드"""
        try:
            # 변경된 파일 수 확인
            modified_files = subprocess.run(
                ["git", "-C", self.path, "status", "--porcelain"],
                capture_output=True,
                text=True,
                check=True
            ).stdout.strip().split("\n")
            
            modified_count = len([f for f in modified_files if f.strip()])
            
            # 현재 브랜치 확인
            current_branch = subprocess.run(
                ["git", "-C", self.path, "rev-parse", "--abbrev-ref", "HEAD"],
                capture_output=True,
                text=True,
                check=True
            ).stdout.strip()
            
            # 마지막 커밋 정보
            last_commit = subprocess.run(
                ["git", "-C", self.path, "log", "-1", "--pretty=format:%h|%an|%s|%ci"],
                capture_output=True,
                text=True,
                check=True
            ).stdout.strip()
            
            if last_commit:
                commit_parts = last_commit.split("|")
                last_commit_info = {
                    "hash": commit_parts[0],
                    "author": commit_parts[1],
                    "message": commit_parts[2],
                    "date": commit_parts[3]
                }
            else:
                last_commit_info = None
            
            return {
                "branch": current_branch,
                "modified_files": modified_count,
                "has_changes": modified_count > 0,
                "last_commit": last_commit_info
            }
        except subprocess.CalledProcessError as e:
            logger.error(f"Git 상태 확인 중 오류 발생: {e.stderr}")
            return {"error": e.stderr}
        except Exception as e:
            logger.error(f"Git 상태 확인 중 예외 발생: {str(e)}")
            return {"error": str(e)}

## 필요한 경우 로컬 유지보수 관련 기능 추가 구현 