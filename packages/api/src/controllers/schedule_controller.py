"""
정비 일정 관리 컨트롤러
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import Depends, HTTPException, Path, Query, Security
from packagescore.cache import ttl_cache
from packagescore.dependencies import get_current_user, get_db
from packagescore.exceptions import NotFoundException, ValidationException
from packagesmodels.schedule import ScheduleModel, SchedulePriority, ScheduleStatus
from packagesmodels.schemas import (
    ScheduleCreate,
    ScheduleListResponse,
    ScheduleNoteCreate,
    ScheduleNoteResponse,
    ScheduleReminderCreate,
    ScheduleReminderResponse,
    ScheduleResponse,
    ScheduleStatusUpdate,
    ScheduleUpdate,
)
from packagesmodels.vehicle import VehicleModel
from packagesmodules.schedule_service import ScheduleService
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# 정렬 가능한 필드 목록
SORTABLE_FIELDS = [
    "scheduled_date",
    "created_at",
    "updated_at",
    "status",
    "priority",
    "maintenance_type",
]


class ScheduleController:
    """정비 일정 관리 컨트롤러"""

    def __init__(
        self,
        db: Session = Depends(get_db),
        current_user: Dict = Security(get_current_user),
    ):
        self.service = ScheduleService(db)
        self.current_user = current_user

    def _check_admin_permission(self):
        """관리자 권한 확인"""
        if not self.current_user.get("is_admin"):
            raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")

    def _validate_sort_params(self, sort_by: str, sort_order: str):
        """정렬 파라미터 검증"""
        if sort_by not in SORTABLE_FIELDS:
            raise HTTPException(
                status_code=400,
                detail=f"유효하지 않은 정렬 필드입니다. 가능한 값: {', '.join(SORTABLE_FIELDS)}",
            )
        if sort_order not in ["asc", "desc"]:
            raise HTTPException(
                status_code=400, detail="정렬 순서는 'asc' 또는 'desc'여야 합니다."
            )

    @ttl_cache(ttl=60)  # 1분 캐싱
    async def get_schedules(
        self,
        skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
        limit: int = Query(100, ge=1, le=1000, description="최대 반환 레코드 수"),
        vehicle_id: Optional[str] = Query(None, description="차량 ID 필터"),
        shop_id: Optional[str] = Query(None, description="정비소 ID 필터"),
        start_date: Optional[datetime] = Query(None, description="시작 날짜 필터"),
        end_date: Optional[datetime] = Query(None, description="종료 날짜 필터"),
        status: Optional[str] = Query(None, description="상태 필터"),
        maintenance_type: Optional[str] = Query(None, description="정비 유형 필터"),
        sort_by: str = Query("scheduled_date", description="정렬 기준 필드"),
        sort_order: str = Query("asc", description="정렬 순서 (asc, desc)"),
    ) -> ScheduleListResponse:
        """모든 일정 조회"""
        try:
            # 권한 확인
            self._check_admin_permission()

            # 정렬 파라미터 검증
            self._validate_sort_params(sort_by, sort_order)

            # 일정과 총 카운트 조회
            schedules, total_count = self.service.get_schedules_with_count(
                skip=skip,
                limit=limit,
                vehicle_id=vehicle_id,
                shop_id=shop_id,
                start_date=start_date,
                end_date=end_date,
                status=status,
                maintenance_type=maintenance_type,
                sort_by=sort_by,
                sort_order=sort_order,
            )

            # 페이지 계산
            page = (skip // limit) + 1 if limit > 0 else 1
            has_more = total_count > (skip + limit)

            # 응답 생성
            return ScheduleListResponse(
                schedules=[
                    ScheduleResponse.model_validate(schedule) for schedule in schedules
                ],
                total=total_count,
                page=page,
                limit=limit,
                has_more=has_more,
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"일정 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"일정을 조회할 수 없습니다: {str(e)}"
            ) from e

    @ttl_cache(ttl=60)  # 1분 캐싱
    async def get_schedule_by_id(self, schedule_id: str) -> ScheduleResponse:
        """
        ID로 일정 조회

        - **schedule_id**: 일정 ID
        """
        try:
            schedule = self.service.get_schedule_by_id(schedule_id)
            return ScheduleResponse.model_validate(schedule)
        except NotFoundException as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        except Exception as e:
            logger.error(f"일정 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"일정을 조회할 수 없습니다: {str(e)}"
            ) from e

    async def create_schedule(self, schedule_data: ScheduleCreate) -> ScheduleResponse:
        """
        일정 생성

        - **schedule_data**: 일정 생성 데이터
        """
        try:
            schedule = self.service.create_schedule(schedule_data.model_dump())
            return ScheduleResponse.model_validate(schedule)
        except NotFoundException as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        except ValidationException as e:
            raise HTTPException(status_code=422, detail=str(e)) from e
        except Exception as e:
            logger.error(f"일정 생성 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"일정을 생성할 수 없습니다: {str(e)}"
            ) from e

    async def update_schedule(
        self, schedule_id: str, schedule_data: ScheduleUpdate
    ) -> ScheduleResponse:
        """
        일정 수정

        - **schedule_id**: 일정 ID
        - **schedule_data**: 수정 데이터
        """
        try:
            schedule = self.service.update_schedule(
                schedule_id, schedule_data.model_dump(exclude_unset=True)
            )
            return ScheduleResponse.model_validate(schedule)
        except NotFoundException as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        except ValidationException as e:
            raise HTTPException(status_code=422, detail=str(e)) from e
        except Exception as e:
            logger.error(f"일정 수정 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"일정을 수정할 수 없습니다: {str(e)}"
            ) from e

    async def delete_schedule(self, schedule_id: str) -> Dict[str, Any]:
        """
        일정 삭제

        - **schedule_id**: 일정 ID
        """
        try:
            if self.service.delete_schedule(schedule_id):
                return {"message": "일정이 삭제되었습니다", "schedule_id": schedule_id}
            else:
                raise HTTPException(status_code=500, detail="일정 삭제에 실패했습니다")
        except NotFoundException as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        except Exception as e:
            logger.error(f"일정 삭제 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"일정을 삭제할 수 없습니다: {str(e)}"
            ) from e

    async def add_schedule_note(
        self, schedule_id: str, note_data: ScheduleNoteCreate
    ) -> ScheduleNoteResponse:
        """
        일정에 노트 추가

        - **schedule_id**: 일정 ID
        - **note_data**: 노트 데이터
        """
        try:
            note = self.service.add_schedule_note(
                schedule_id=schedule_id,
                content=note_data.content,
                created_by=note_data.created_by,
            )
            return ScheduleNoteResponse.model_validate(note)
        except NotFoundException as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        except Exception as e:
            logger.error(f"노트 추가 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"노트를 추가할 수 없습니다: {str(e)}"
            ) from e

    @ttl_cache(ttl=180)  # 3분 캐싱
    async def get_upcoming_schedules(
        self, days: int = Query(7, ge=1, le=30)
    ) -> ScheduleListResponse:
        """
        다가오는 일정 조회

        - **days**: 조회할 기간(일)
        """
        try:
            schedules = self.service.get_upcoming_schedules(days=days)

            return ScheduleListResponse(
                schedules=[
                    ScheduleResponse.model_validate(schedule) for schedule in schedules
                ],
                total=len(schedules),
                page=1,
                limit=100,
                has_more=False,
            )
        except Exception as e:
            logger.error(f"다가오는 일정 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"다가오는 일정을 조회할 수 없습니다: {str(e)}"
            ) from e

    @ttl_cache(ttl=120)  # 2분 캐싱
    async def get_schedules_by_vehicle(self, vehicle_id: str) -> ScheduleListResponse:
        """
        차량별 일정 조회

        - **vehicle_id**: 차량 ID
        """
        try:
            schedules = self.service.get_schedules_by_vehicle(vehicle_id=vehicle_id)

            return ScheduleListResponse(
                schedules=[
                    ScheduleResponse.model_validate(schedule) for schedule in schedules
                ],
                total=len(schedules),
                page=1,
                limit=100,
                has_more=False,
            )
        except Exception as e:
            logger.error(f"차량별 일정 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"차량별 일정을 조회할 수 없습니다: {str(e)}"
            ) from e

    async def change_schedule_status(
        self, schedule_id: str, status_data: ScheduleStatusUpdate
    ) -> ScheduleResponse:
        """
        일정 상태 변경

        - **schedule_id**: 일정 ID
        - **status_data**: 상태 데이터
        """
        try:
            schedule = self.service.change_schedule_status(
                schedule_id=schedule_id, status=status_data.status
            )
            return ScheduleResponse.model_validate(schedule)
        except NotFoundException as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        except ValidationException as e:
            raise HTTPException(status_code=422, detail=str(e)) from e
        except Exception as e:
            logger.error(f"일정 상태 변경 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"일정 상태를 변경할 수 없습니다: {str(e)}"
            ) from e

    @ttl_cache(ttl=60)  # 1분 캐싱
    async def get_schedule_reminders(
        self, schedule_id: str
    ) -> List[ScheduleReminderResponse]:
        """
        일정 알림 조회

        - **schedule_id**: 일정 ID
        """
        try:
            reminders = self.service.get_schedule_reminders(schedule_id=schedule_id)
            return [
                ScheduleReminderResponse.model_validate(reminder)
                for reminder in reminders
            ]
        except NotFoundException as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        except Exception as e:
            logger.error(f"일정 알림 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"일정 알림을 조회할 수 없습니다: {str(e)}"
            ) from e

    @ttl_cache(ttl=60)  # 1분 캐싱
    async def get_schedule_notes(self, schedule_id: str) -> List[ScheduleNoteResponse]:
        """
        일정 노트 조회

        - **schedule_id**: 일정 ID
        """
        try:
            notes = self.service.get_schedule_notes(schedule_id=schedule_id)
            return [ScheduleNoteResponse.model_validate(note) for note in notes]
        except NotFoundException as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        except Exception as e:
            logger.error(f"일정 노트 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"일정 노트를 조회할 수 없습니다: {str(e)}"
            ) from e

    @ttl_cache(ttl=180)  # 3분 캐싱
    async def get_overdue_schedules(self) -> ScheduleListResponse:
        """기한이 지난 일정 조회"""
        try:
            schedules = self.service.get_overdue_schedules()

            return ScheduleListResponse(
                schedules=[
                    ScheduleResponse.model_validate(schedule) for schedule in schedules
                ],
                total=len(schedules),
                page=1,
                limit=100,
                has_more=False,
            )
        except Exception as e:
            logger.error(f"기한 초과 일정 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"기한 초과 일정을 조회할 수 없습니다: {str(e)}"
            ) from e

    @ttl_cache(ttl=300)  # 5분 캐싱
    async def get_maintenance_statistics(
        self, vehicle_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        정비 통계 정보 조회

        - **vehicle_id**: 특정 차량의 통계만 조회할 경우 차량 ID
        """
        try:
            return self.service.get_maintenance_statistics(vehicle_id=vehicle_id)
        except Exception as e:
            logger.error(f"통계 정보 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"통계 정보를 조회할 수 없습니다: {str(e)}"
            ) from e

    def _process_vehicle_forecast(
        self, vehicle: VehicleModel, today: datetime, db: Session
    ) -> Dict[str, Any]:
        """단일 차량의 정비 예측 정보를 처리"""
        try:
            last_maintenance = (
                db.query(ScheduleModel)
                .filter(
                    ScheduleModel.vehicle_id == vehicle.id,
                    ScheduleModel.status == "completed",
                )
                .order_by(ScheduleModel.scheduled_date.desc())
                .first()
            )

            days_remaining = None
            if vehicle.next_maintenance_date:
                try:
                    days_remaining = (vehicle.next_maintenance_date - today).days
                except Exception as e:
                    logger.warning(f"다음 정비일 계산 중 오류: {str(e)}")

            # 마지막 정비 정보 처리
            last_maintenance_info = None
            if last_maintenance:
                last_maintenance_info = {
                    "date": last_maintenance.scheduled_date,
                    "type": last_maintenance.maintenance_type,
                    "cost": last_maintenance.estimated_cost,
                }

            return {
                "vehicle_id": vehicle.id,
                "make": vehicle.make,
                "model": vehicle.model,
                "year": vehicle.year,
                "next_maintenance_date": vehicle.next_maintenance_date,
                "days_remaining": days_remaining,
                "last_maintenance": last_maintenance_info,
            }
        except Exception as e:
            logger.warning(f"차량 {vehicle.id}의 예측 정보 생성 중 오류: {str(e)}")
            return {
                "vehicle_id": vehicle.id,
                "make": vehicle.make,
                "model": vehicle.model,
                "year": vehicle.year,
                "next_maintenance_date": vehicle.next_maintenance_date,
                "error": str(e),
            }

    @ttl_cache(ttl=300)  # 5분 캐싱
    async def get_scheduled_maintenance_forecast(
        self, days: int = 90
    ) -> List[Dict[str, Any]]:
        """
        향후 정비 예측 조회

        - **days**: 몇 일 이내의 예상 정비를 조회할지 지정 (기본값: 90일)
        """
        try:
            today = datetime.now(timezone.utc)
            end_date = today + timedelta(days=days)
            db = self.service.db

            # 조건에 맞는 차량 조회
            vehicles = (
                db.query(VehicleModel)
                .filter(
                    VehicleModel.next_maintenance_date.isnot(None),
                    VehicleModel.next_maintenance_date >= today,
                    VehicleModel.next_maintenance_date <= end_date,
                )
                .all()
            )

            # 각 차량의 예측 정보 처리
            result = [
                self._process_vehicle_forecast(vehicle, today, db)
                for vehicle in vehicles
            ]

            # 정렬 함수 정의
            def get_next_date(item: Dict[str, Any]) -> datetime:
                return item.get("next_maintenance_date") or (
                    end_date + timedelta(days=100)
                )

            # 날짜순 정렬
            result.sort(key=get_next_date)

            return result
        except Exception as e:
            logger.error(f"정비 예측 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"정비 예측을 조회할 수 없습니다: {str(e)}"
            ) from e

    def update_schedule_status(self, schedule_id: str, status: ScheduleStatus) -> bool:
        """일정 상태 업데이트"""
        return self.service.update_status(schedule_id, status)

    def get_schedule_forecast(self) -> Dict[str, Any]:
        """일정 예측 데이터 조회"""
        return {
            "upcoming": self.get_upcoming_schedules(),
            "overdue": self.get_overdue_schedules(),
        }

    def process_schedule_action(
        self, schedule_id: str, action: str
    ) -> Optional[Dict[str, Any]]:
        """일정 액션 처리"""
        if not (schedule := self.get_schedule_by_id(schedule_id)):
            return None

        if action == "complete":
            return self._process_complete_action(schedule)
        elif action == "cancel":
            return self._process_cancel_action(schedule)
        else:
            logger.warning(f"알 수 없는 액션: {action}")
            return None
