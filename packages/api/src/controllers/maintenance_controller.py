"""
정비 관리 컨트롤러

이 모듈은 차량 정비 관리를 위한 컨트롤러를 구현합니다.
주요 기능:
- 정비 기록 관리
- 정비 일정 관리
- Git 기반 버전 관리
- 정비 통계 및 분석
"""

import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path as PathLib
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Body, Depends, HTTPException, Path, Query, Security
from modules.maintenance.service import MaintenanceService
from packagescore.cache import ttl_cache
from packagescore.dependencies import get_current_user, get_db
from packagescore.exceptions import (
    DatabaseOperationException,
    GitAuthenticationException,
    GitBranchException,
    GitCommandException,
    GitConfigException,
    GitMergeException,
    GitOperationException,
    GitRemoteException,
    GitRepositoryException,
    GitTagException,
    NotFoundException,
    ResourceNotFoundException,
    ValidationException,
)
from packagesmodels.schedule import ScheduleModel, ScheduleStatus
from packagesmodels.schemas import (
    MaintenanceCreate,
    MaintenanceListResponse,
    MaintenanceResponse,
    MaintenanceStatus,
    MaintenanceUpdate,
)
from packagesmodels.vehicle import VehicleModel
from packagesrepositories.maintenance_repository import MaintenanceRepository
from packagesrepositories.vehicle_repository import VehicleRepository
from packagesservices.git_service import GitService
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class MaintenanceController:
    """정비 관리 컨트롤러"""

    def __init__(
        self,
        db: Session = Depends(get_db),
        current_user: Dict = Security(get_current_user),
    ):
        self.service = MaintenanceService()
        self.current_user = current_user
        self.db = db

        # Git 저장소 경로 설정
        self.path = self._initialize_git_repository_path()

        # 저장소 초기화
        self.maintenance_repository = MaintenanceRepository(db=db)
        self.vehicle_repository = VehicleRepository()
        self.git_service = self._initialize_git_service()

        logger.info(f"MaintenanceController 초기화 완료: 경로={self.path}")

    def _initialize_git_repository_path(self) -> str:
        """Git 저장소 경로를 초기화합니다."""
        try:
            current_file = PathLib(__file__).resolve()
            # 프로젝트 루트 디렉토리 계산
            project_root = str(current_file.parent.parent.parent.parent.parent)

            # Git 저장소 확인
            if os.path.exists(os.path.join(project_root, ".git")):
                return project_root

            # packages/api 디렉토리 확인
            api_root = str(current_file.parent.parent.parent)
            if os.path.exists(os.path.join(api_root, ".git")):
                return api_root

            # 현재 작업 디렉토리 사용
            return os.getcwd()

        except Exception as e:
            logger.warning(f"Git 저장소 경로 초기화 중 오류: {str(e)}")
            return os.getcwd()

    def _initialize_git_service(self) -> Optional[GitService]:
        """Git 서비스를 초기화합니다."""
        try:
            return GitService(repo_path=self.path)
        except Exception as e:
            logger.warning(f"GitService 초기화 중 오류: {str(e)}")
            return None

    def _handle_git_operation(
        self, operation: callable, *args, **kwargs
    ) -> Dict[str, Any]:
        """Git 작업을 안전하게 실행합니다."""
        if not self.git_service:
            raise HTTPException(
                status_code=503, detail="Git 서비스가 초기화되지 않았습니다."
            )

        try:
            return operation(*args, **kwargs)
        except GitAuthenticationException as e:
            raise HTTPException(status_code=401, detail=f"Git 인증 오류: {str(e)}")
        except GitRemoteException as e:
            raise HTTPException(
                status_code=503, detail=f"Git 원격 저장소 오류: {str(e)}"
            )
        except GitCommandException as e:
            raise HTTPException(
                status_code=500, detail=f"Git 명령어 실행 오류: {str(e)}"
            )
        except GitOperationException as e:
            raise HTTPException(status_code=500, detail=f"Git 작업 오류: {str(e)}")
        except Exception as e:
            logger.error(f"Git 작업 중 예상치 못한 오류: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Git 작업 중 오류가 발생했습니다: {str(e)}"
            )

    @ttl_cache(ttl=60)  # 1분 캐싱
    async def get_vehicle_maintenance(
        self,
        vehicle_id: str = Path(..., description="차량 ID"),
        skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
        limit: int = Query(100, ge=1, le=1000, description="최대 반환 레코드 수"),
        start_date: Optional[datetime] = Query(None, description="시작 날짜 필터"),
        end_date: Optional[datetime] = Query(None, description="종료 날짜 필터"),
        maintenance_type: Optional[str] = Query(None, description="정비 유형 필터"),
        sort_by: str = Query("maintenance_date", description="정렬 기준 필드"),
        sort_order: str = Query("desc", description="정렬 순서 (asc, desc)"),
    ) -> MaintenanceListResponse:
        """
        차량별 정비 기록 조회

        - **vehicle_id**: 차량 ID
        - **skip**: 건너뛸 레코드 수
        - **limit**: 최대 반환 레코드 수
        - **start_date**: 시작 날짜 필터
        - **end_date**: 종료 날짜 필터
        - **maintenance_type**: 정비 유형 필터
        - **sort_by**: 정렬 기준 필드
        - **sort_order**: 정렬 순서 (asc, desc)
        """
        try:
            # 사용자 권한 확인
            if not self.current_user.get("is_admin"):
                raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")

            # 정비 기록과 총 카운트 조회
            maintenance_records, total_count = (
                self.service.get_maintenance_records_with_count(
                    vehicle_id=vehicle_id,
                    skip=skip,
                    limit=limit,
                    start_date=start_date,
                    end_date=end_date,
                    maintenance_type=maintenance_type,
                    sort_by=sort_by,
                    sort_order=sort_order,
                )
            )

            # 페이지 계산
            page = (skip // limit) + 1 if limit > 0 else 1
            has_more = total_count > (skip + limit)

            # Git 히스토리 조회
            git_history = {}
            if self.git_service:
                try:
                    git_history = self._handle_git_operation(
                        self.git_service.get_file_history,
                        f"maintenance/{vehicle_id}/*.json",
                    )
                except Exception as e:
                    logger.warning(f"Git 히스토리 조회 중 오류: {str(e)}")

            # 응답 생성
            return MaintenanceListResponse(
                maintenance_records=[
                    MaintenanceResponse.model_validate(record)
                    for record in maintenance_records
                ],
                total=total_count,
                page=page,
                limit=limit,
                has_more=has_more,
                git_history=git_history,
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"정비 기록 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"정비 기록을 조회할 수 없습니다: {str(e)}"
            ) from e

    async def schedule_maintenance(
        self,
        vehicle_id: str = Path(..., description="차량 ID"),
        maintenance_data: MaintenanceCreate = Body(..., description="정비 예약 정보"),
    ) -> MaintenanceResponse:
        """
        정비 예약 생성

        - **vehicle_id**: 차량 ID
        - **maintenance_data**: 정비 예약 정보
        """
        try:
            # 사용자 권한 확인
            if not self.current_user.get("is_admin"):
                raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")

            # 정비 예약 생성
            maintenance = self.service.create_maintenance(
                vehicle_id=vehicle_id, maintenance_data=maintenance_data
            )

            # Git 커밋 생성
            if self.git_service:
                try:
                    commit_message = f"정비 예약 생성: {vehicle_id} - {maintenance_data.maintenance_type}"
                    self._handle_git_operation(
                        self.git_service.create_commit,
                        message=commit_message,
                        paths=[f"maintenance/{vehicle_id}/{maintenance.id}.json"],
                    )
                except Exception as e:
                    logger.warning(f"Git 커밋 생성 실패: {str(e)}")

            return MaintenanceResponse.model_validate(maintenance)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"정비 예약 생성 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"정비 예약을 생성할 수 없습니다: {str(e)}"
            ) from e

    @ttl_cache(ttl=30)  # 30초 캐싱
    def get_status(self) -> Dict[str, Any]:
        """
        정비 시스템 상태 조회

        Returns:
            Dict[str, Any]: 시스템 상태 정보
            - status: 시스템 상태 ("active", "error")
            - path: 현재 작업 경로
            - git_status: Git 저장소 상태 정보
            - maintenance_records_count: 전체 정비 기록 수
            - last_updated: 마지막 업데이트 시간
        """
        try:
            # Git 상태 확인
            git_status = {"status": "unknown", "error": "GitService not initialized"}
            maintenance_count = 0

            if self.git_service:
                try:
                    git_status = self._handle_git_operation(self.git_service.get_status)
                except Exception as e:
                    logger.warning(f"Git 상태 조회 중 오류: {str(e)}")
                    git_status = {"error": str(e)}

            # 정비 레코드 카운트 조회
            if hasattr(self, "maintenance_repository") and self.maintenance_repository:
                try:
                    maintenance_count = (
                        self.maintenance_repository.count_maintenance_records()
                    )
                except Exception as e:
                    logger.warning(f"정비 레코드 카운트 조회 중 오류: {str(e)}")
                    maintenance_count = -1

            return {
                "status": "active",
                "path": self.path,
                "git_status": git_status,
                "maintenance_records_count": maintenance_count,
                "last_updated": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            logger.error(f"정비 상태 조회 중 오류 발생: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "last_updated": datetime.now(timezone.utc).isoformat(),
            }

    async def create_maintenance_commit(
        self, message: str, paths: Optional[List[str]] = None, force: bool = False
    ) -> Dict[str, Any]:
        """
        정비 관련 Git 커밋 생성

        Args:
            message: 커밋 메시지
            paths: 커밋에 포함할 파일 경로 목록
            force: 강제 커밋 여부

        Returns:
            Dict[str, Any]: 커밋 결과
            - commit_id: 생성된 커밋 ID
            - message: 커밋 메시지
            - timestamp: 커밋 생성 시간
        """
        return self._handle_git_operation(
            self.git_service.create_commit, message=message, paths=paths, force=force
        )

    async def pull_repository(self) -> Dict[str, Any]:
        """
        Git 저장소 풀

        Returns:
            Dict[str, Any]: 풀 결과
            - success: 성공 여부
            - message: 결과 메시지
            - changes: 변경된 파일 목록
        """
        return self._handle_git_operation(self.git_service.pull)

    async def push_repository(self, force: bool = False) -> Dict[str, Any]:
        """
        Git 저장소 푸시

        Args:
            force: 강제 푸시 여부

        Returns:
            Dict[str, Any]: 푸시 결과
            - success: 성공 여부
            - message: 결과 메시지
            - changes: 푸시된 변경사항
        """
        return self._handle_git_operation(self.git_service.push, force=force)

    def get_vehicle_maintenance(self, vehicle_id: str):
        """차량별 정비 내역 조회"""
        try:
            vehicle = self.vehicle_repository.get_vehicle_by_id(vehicle_id)
            if not vehicle:
                raise ResourceNotFoundException(
                    f"차량 ID {vehicle_id}를 찾을 수 없습니다."
                )

            maintenance_records = (
                self.maintenance_repository.get_maintenance_by_vehicle_id(vehicle_id)
            )

            return {
                "vehicle_id": vehicle_id,
                "vehicle_info": vehicle,
                "maintenance_records": maintenance_records,
                "count": len(maintenance_records),
            }
        except ResourceNotFoundException as e:
            logger.warning(f"차량 정비 내역 조회 실패: {str(e)}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"차량 정비 내역 조회 중 오류 발생: {str(e)}")
            return {"error": str(e)}

    def schedule_maintenance(
        self,
        vehicle_id: str,
        schedule_date: str,
        maintenance_type: str,
        description: str = None,
    ):
        """정비 예약 생성"""
        try:
            vehicle = self.vehicle_repository.get_vehicle_by_id(vehicle_id)
            if not vehicle:
                raise ResourceNotFoundException(
                    f"차량 ID {vehicle_id}를 찾을 수 없습니다."
                )

            # 예약 정비 생성
            maintenance_data = {
                "vehicle_id": vehicle_id,
                "date": schedule_date,
                "type": maintenance_type,
                "description": description or f"{maintenance_type} 정비",
                "status": MaintenanceStatus.SCHEDULED,
            }

            new_maintenance = self.maintenance_repository.create_maintenance(
                maintenance_data
            )

            # 차량 상태 업데이트
            self.vehicle_repository.update_vehicle_status(
                vehicle_id, "scheduled_maintenance"
            )

            return {
                "scheduled": True,
                "maintenance_id": new_maintenance["id"],
                "schedule_date": schedule_date,
                "maintenance_type": maintenance_type,
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
            maintenance = self.maintenance_repository.get_maintenance_by_id(
                maintenance_id
            )
            if not maintenance:
                raise ResourceNotFoundException(
                    f"정비 ID {maintenance_id}를 찾을 수 없습니다."
                )

            # 정비 상태 업데이트
            update_data = {
                "status": MaintenanceStatus.COMPLETED,
                "completion_date": datetime.now().isoformat(),
            }

            if completion_notes:
                update_data["notes"] = completion_notes

            updated_maintenance = self.maintenance_repository.update_maintenance(
                maintenance_id, update_data
            )

            # 차량에 대한 다른 예약된 정비가 있는지 확인
            vehicle_id = maintenance["vehicle_id"]
            pending_maintenance = (
                self.maintenance_repository.get_maintenance_by_vehicle_id_and_status(
                    vehicle_id,
                    [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS],
                )
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

    @ttl_cache(ttl=300)  # 5분 캐싱
    async def get_maintenance_recommendations(
        self,
        vehicle_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        정비 추천 사항 조회
        """
        try:
            recommendations = self.service.get_maintenance_recommendations(
                vehicle_id=vehicle_id, start_date=start_date, end_date=end_date
            )

            # Git 히스토리 조회
            git_history = {}
            if self.git_service:
                try:
                    git_history = self._handle_git_operation(
                        self.git_service.get_file_history,
                        f"maintenance/analysis/{vehicle_id}/recommendations.json",
                    )
                except Exception as e:
                    logger.warning(f"Git 히스토리 조회 중 오류: {str(e)}")

            # Git 커밋 생성
            if self.git_service:
                try:
                    self._handle_git_operation(
                        self.git_service.create_commit,
                        message=f"정비 추천 분석 업데이트: {vehicle_id}",
                        paths=[
                            f"maintenance/analysis/{vehicle_id}/recommendations.json"
                        ],
                    )
                except Exception as e:
                    logger.warning(f"Git 커밋 생성 실패: {str(e)}")

            return recommendations
        except Exception as e:
            logger.error(f"정비 추천 사항 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"정비 추천 사항을 조회할 수 없습니다: {str(e)}"
            ) from e

    @ttl_cache(ttl=300)  # 5분 캐싱
    async def get_maintenance_statistics(
        self,
        vehicle_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        정비 통계 조회
        """
        try:
            statistics = self.service.get_maintenance_statistics(
                vehicle_id=vehicle_id, start_date=start_date, end_date=end_date
            )

            # Git 히스토리 조회
            git_history = {}
            if self.git_service:
                try:
                    git_history = self._handle_git_operation(
                        self.git_service.get_file_history,
                        f"maintenance/statistics/{vehicle_id}/summary.json",
                    )
                except Exception as e:
                    logger.warning(f"Git 히스토리 조회 중 오류: {str(e)}")

            # Git 커밋 생성
            if self.git_service:
                try:
                    self._handle_git_operation(
                        self.git_service.create_commit,
                        message=f"정비 통계 업데이트: {vehicle_id}",
                        paths=[f"maintenance/statistics/{vehicle_id}/summary.json"],
                    )
                except Exception as e:
                    logger.warning(f"Git 커밋 생성 실패: {str(e)}")

            return statistics
        except Exception as e:
            logger.error(f"정비 통계 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"정비 통계를 조회할 수 없습니다: {str(e)}"
            ) from e

    @ttl_cache(ttl=60)  # 1분 캐싱
    async def get_recent_maintenance_records(
        self, limit: int = 10, maintenance_type: Optional[str] = None
    ) -> List[MaintenanceResponse]:
        """
        최근 정비 기록 조회
        """
        try:
            records = self.service.get_recent_maintenance_records(
                limit=limit, maintenance_type=maintenance_type
            )

            # Git 히스토리 조회
            git_history = {}
            if self.git_service:
                try:
                    git_history = self._handle_git_operation(
                        self.git_service.get_file_history, "maintenance/recent/*.json"
                    )
                except Exception as e:
                    logger.warning(f"Git 히스토리 조회 중 오류: {str(e)}")

            return [MaintenanceResponse.model_validate(record) for record in records]
        except Exception as e:
            logger.error(f"최근 정비 기록 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"최근 정비 기록을 조회할 수 없습니다: {str(e)}"
            ) from e

    @ttl_cache(ttl=60)  # 1분 캐싱
    async def get_scheduled_maintenance(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 10,
    ) -> List[MaintenanceResponse]:
        """
        예정된 정비 조회
        """
        try:
            records = self.service.get_scheduled_maintenance(
                start_date=start_date, end_date=end_date, limit=limit
            )

            # Git 히스토리 조회
            git_history = {}
            if self.git_service:
                try:
                    git_history = self._handle_git_operation(
                        self.git_service.get_file_history,
                        "maintenance/scheduled/*.json",
                    )
                except Exception as e:
                    logger.warning(f"Git 히스토리 조회 중 오류: {str(e)}")

            return [MaintenanceResponse.model_validate(record) for record in records]
        except Exception as e:
            logger.error(f"예정된 정비 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"예정된 정비를 조회할 수 없습니다: {str(e)}"
            ) from e

    @ttl_cache(ttl=60)  # 1분 캐싱
    async def get_pending_approvals(self) -> List[MaintenanceResponse]:
        """
        승인 대기 중인 정비 조회
        """
        try:
            records = self.service.get_pending_approvals()

            # Git 히스토리 조회
            git_history = {}
            if self.git_service:
                try:
                    git_history = self._handle_git_operation(
                        self.git_service.get_file_history, "maintenance/pending/*.json"
                    )
                except Exception as e:
                    logger.warning(f"Git 히스토리 조회 중 오류: {str(e)}")

            return [MaintenanceResponse.model_validate(record) for record in records]
        except Exception as e:
            logger.error(f"승인 대기 중인 정비 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"승인 대기 중인 정비를 조회할 수 없습니다: {str(e)}",
            ) from e

    @ttl_cache(ttl=300)  # 5분 캐싱
    async def get_maintenance_summary(self) -> Dict[str, Any]:
        """
        정비 현황 요약 조회
        """
        try:
            summary = self.service.get_maintenance_summary()

            # Git 히스토리 조회
            git_history = {}
            if self.git_service:
                try:
                    git_history = self._handle_git_operation(
                        self.git_service.get_file_history,
                        "maintenance/summary/daily_report.json",
                    )
                except Exception as e:
                    logger.warning(f"Git 히스토리 조회 중 오류: {str(e)}")

            # Git 커밋 생성
            if self.git_service:
                try:
                    self._handle_git_operation(
                        self.git_service.create_commit,
                        message="일일 정비 현황 요약 업데이트",
                        paths=["maintenance/summary/daily_report.json"],
                    )
                except Exception as e:
                    logger.warning(f"Git 커밋 생성 실패: {str(e)}")

            return summary
        except Exception as e:
            logger.error(f"정비 현황 요약 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"정비 현황 요약을 조회할 수 없습니다: {str(e)}"
            ) from e
