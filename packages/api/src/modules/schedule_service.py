"""
정비 일정 관리 서비스
"""

import calendar
import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple, Union, cast

from packagescore.exceptions import NotFoundException, ValidationException
from packagesmodels.schedule import (RecurrencePattern, ReminderStatus,
                                     ReminderType, ScheduleModel,
                                     ScheduleNoteModel, SchedulePriority,
                                     ScheduleReminderModel, ScheduleStatus)
from packagesmodels.vehicle import VehicleModel
from packagesrepositories.schedule_repository import ScheduleRepository
from sqlalchemy import and_, asc, case, desc, func, literal, or_
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# 상수 정의
UTC_TIMEZONE = "+00:00"
UPDATABLE_FIELDS = [
    "title",
    "description",
    "scheduled_date",
    "end_date",
    "estimated_duration",
    "estimated_cost",
    "maintenance_type",
    "status",
    "is_recurring",
    "recurrence_pattern",
    "recurrence_interval",
    "priority",
    "assigned_to",
    "shop_id",
]


class ScheduleService:
    """정비 일정 관리 서비스"""

    def __init__(self, db: Session):
        self.db = db
        self.repository = ScheduleRepository(db)

    def _mask_id(self, id_value: str) -> str:
        """ID 값 마스킹 (처음 4자와 마지막 4자만 표시)"""
        if not id_value or len(id_value) < 8:
            return "****"
        return f"{id_value[:4]}...{id_value[-4:]}"

    def get_schedules_with_count(
        self,
        skip: int = 0,
        limit: int = 100,
        vehicle_id: Optional[str] = None,
        shop_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None,
        maintenance_type: Optional[str] = None,
        sort_by: str = "scheduled_date",
        sort_order: str = "asc",
    ) -> Tuple[List[ScheduleModel], int]:
        """일정 목록과 총 개수 조회"""
        try:
            # 필터 조건 구성
            filters = {}
            if vehicle_id:
                filters["vehicle_id"] = vehicle_id
            if shop_id:
                filters["shop_id"] = shop_id
            if status:
                filters["status"] = status
            if maintenance_type:
                filters["maintenance_type"] = maintenance_type

            # 특수 필터 (날짜 범위) 적용
            query = self.db.query(ScheduleModel)
            if start_date:
                query = query.filter(ScheduleModel.scheduled_date >= start_date)
            if end_date:
                query = query.filter(ScheduleModel.scheduled_date <= end_date)

            # 기본 필터 적용
            for key, value in filters.items():
                query = query.filter(getattr(ScheduleModel, key) == value)

            # 총 개수 조회 (필터링 적용 후, 페이징 적용 전)
            total_count = query.count()

            # 정렬 적용
            if sort_order.lower() == "asc":
                query = query.order_by(asc(getattr(ScheduleModel, sort_by)))
            else:
                query = query.order_by(desc(getattr(ScheduleModel, sort_by)))

            # 페이징 적용
            schedules = query.offset(skip).limit(limit).all()

            return schedules, total_count
        except Exception as e:
            logger.error(f"일정 목록 및 총 개수 조회 중 오류 발생: {str(e)}")
            # 오류 발생 시에도 기본 값 반환하여 서비스 연속성 유지
            return [], 0

    def get_schedules(
        self,
        skip: int = 0,
        limit: int = 100,
        vehicle_id: Optional[str] = None,
        shop_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None,
        maintenance_type: Optional[str] = None,
        sort_by: str = "scheduled_date",
        sort_order: str = "asc",
    ) -> List[ScheduleModel]:
        """모든 일정 조회 (이전 버전과의 호환성 유지)"""
        schedules, _ = self.get_schedules_with_count(
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
        return schedules

    def get_schedule_by_id(self, schedule_id: str) -> ScheduleModel:
        """ID로 일정 조회"""
        schedule = self.repository.get_by_id_with_relations(schedule_id)
        if not schedule:
            masked_id = self._mask_id(schedule_id)
            raise NotFoundException(f"일정을 찾을 수 없습니다: {masked_id}")
        return schedule

    def _parse_datetime(self, date_str: str, field_name: str) -> datetime:
        """날짜/시간 문자열을 datetime 객체로 변환"""
        try:
            return datetime.fromisoformat(date_str.replace("Z", UTC_TIMEZONE))
        except (ValueError, TypeError) as e:
            raise ValidationException(
                f"{field_name} 형식이 올바르지 않습니다: {str(e)}"
            ) from e

    def _validate_vehicle(self, vehicle_id: Optional[str]) -> Optional[VehicleModel]:
        """차량 존재 여부 확인"""
        if not vehicle_id:
            return None
        vehicle = (
            self.db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
        )
        if not vehicle:
            masked_id = self._mask_id(vehicle_id)
            raise NotFoundException(f"차량을 찾을 수 없습니다: {masked_id}")
        return vehicle

    def _process_datetime_fields(self, data: Dict[str, Any]) -> None:
        """날짜/시간 필드 처리"""
        if isinstance(data.get("scheduled_date"), str):
            data["scheduled_date"] = self._parse_datetime(
                data["scheduled_date"], "예약 일시"
            )

        if data.get("end_date") and isinstance(data["end_date"], str):
            data["end_date"] = self._parse_datetime(data["end_date"], "종료 일시")

    def _process_reminders(
        self, schedule_id: str, reminders_data: List[Dict[str, Any]]
    ) -> None:
        """알림 처리"""
        for reminder_data in reminders_data:
            if isinstance(reminder_data.get("reminder_time"), str):
                reminder_data["reminder_time"] = self._parse_datetime(
                    reminder_data["reminder_time"], "알림 시간"
                )

            reminder = ScheduleReminderModel(
                id=str(uuid.uuid4()), schedule_id=schedule_id, **reminder_data
            )

            if reminder_errors := reminder.validate():
                raise ValidationException("\n".join(reminder_errors))

            self.db.add(reminder)

    def _process_notes(
        self, schedule_id: str, notes_data: List[Dict[str, Any]]
    ) -> None:
        """노트 처리"""
        for note_data in notes_data:
            note = ScheduleNoteModel(
                id=str(uuid.uuid4()), schedule_id=schedule_id, **note_data
            )

            if note_errors := note.validate():
                raise ValidationException("\n".join(note_errors))

            self.db.add(note)

    def _save_schedule(self, schedule: ScheduleModel) -> ScheduleModel:
        """일정 저장 및 새로고침 공통 로직"""
        self.db.commit()
        self.db.refresh(schedule)
        return schedule

    def _handle_error(self, e: Exception, operation: str) -> None:
        """공통 에러 처리 로직"""
        self.db.rollback()
        logger.error(f"일정 {operation} 중 오류 발생: {str(e)}")
        if isinstance(e, (NotFoundException, ValidationException)):
            raise
        raise ValueError(f"일정을 {operation}할 수 없습니다: {str(e)}") from e

    def create_schedule(self, schedule_data: Dict[str, Any]) -> ScheduleModel:
        """일정 생성"""
        try:
            # 차량 확인
            self._validate_vehicle(schedule_data.get("vehicle_id"))

            # 날짜/시간 필드 처리
            self._process_datetime_fields(schedule_data)

            # 새 일정 생성
            schedule_id = str(uuid.uuid4())
            new_schedule = ScheduleModel(id=schedule_id, **schedule_data)

            # 유효성 검증
            if errors := new_schedule.validate():
                raise ValidationException("\n".join(errors))

            self.db.add(new_schedule)

            # 알림 처리
            if reminders := schedule_data.get("reminders"):
                self._process_reminders(schedule_id, reminders)

            # 노트 처리
            if notes := schedule_data.get("notes"):
                self._process_notes(schedule_id, notes)

            return self._save_schedule(new_schedule)

        except Exception as e:
            self._handle_error(e, "생성")

    def update_schedule(
        self, schedule_id: str, schedule_data: Dict[str, Any]
    ) -> ScheduleModel:
        """일정 수정"""
        try:
            schedule = self.get_schedule_by_id(schedule_id)

            # 날짜/시간 필드 처리
            self._process_datetime_fields(schedule_data)

            # 필드 업데이트
            for field in UPDATABLE_FIELDS:
                if field in schedule_data:
                    setattr(schedule, field, schedule_data[field])

            # 유효성 검증
            if errors := schedule.validate():
                raise ValidationException("\n".join(errors))

            # 알림 업데이트
            if "reminders" in schedule_data:
                self.db.query(ScheduleReminderModel).filter(
                    ScheduleReminderModel.schedule_id == schedule_id
                ).delete()
                self._process_reminders(schedule_id, schedule_data["reminders"])

            # 노트 추가
            if "notes" in schedule_data:
                self._process_notes(schedule_id, schedule_data["notes"])

            return self._save_schedule(schedule)

        except Exception as e:
            self._handle_error(e, "수정")

    def delete_schedule(self, schedule_id: str) -> bool:
        """일정 삭제"""
        schedule = self.get_schedule_by_id(schedule_id)
        return self.repository.delete(schedule)

    def add_schedule_note(
        self, schedule_id: str, content: str, created_by: Optional[str] = None
    ) -> ScheduleNoteModel:
        """일정에 노트 추가"""
        try:
            # 일정 존재 여부 확인
            self.get_schedule_by_id(schedule_id)

            # 노트 데이터 준비
            note_data = {"content": content, "created_by": created_by}

            # 리포지토리 호출하여 노트 추가
            if note := self.repository.add_note(schedule_id, note_data):
                return note
            raise ValueError(f"노트를 추가할 수 없습니다: {schedule_id}")
        except Exception as e:
            if isinstance(e, (NotFoundException, ValueError)):
                raise
            raise ValueError(f"노트를 추가할 수 없습니다: {str(e)}") from e

    def get_upcoming_schedules(self, days: int = 7) -> List[ScheduleModel]:
        """다가오는 일정 조회"""
        return self.repository.get_upcoming_schedules(days)

    def get_schedules_by_vehicle(self, vehicle_id: str) -> List[ScheduleModel]:
        """차량별 일정 조회"""
        schedules, _ = self.repository.get_schedules_by_vehicle(vehicle_id)
        return schedules

    def change_schedule_status(self, schedule_id: str, status: str) -> ScheduleModel:
        """일정 상태 변경"""
        schedule = self.get_schedule_by_id(schedule_id)

        # 유효한 상태인지 확인
        try:
            new_status = ScheduleStatus(status)
        except ValueError as e:
            valid_statuses = [s.value for s in ScheduleStatus]
            raise ValidationException(
                f"유효하지 않은 상태입니다. 가능한 상태: {', '.join(valid_statuses)}"
            ) from e

        # 상태가 실제로 변경되었는지 확인
        if schedule.status == new_status.value:
            return schedule

        # 이전 상태 저장
        previous_status = schedule.status

        # 상태 업데이트
        success = self.repository.update_status(schedule_id, new_status)
        if not success:
            raise ValueError(f"일정 상태를 변경할 수 없습니다: {schedule_id}")

        # 상태 변경 로그 추가 (노트로 기록)
        try:
            self.add_schedule_note(
                schedule_id=schedule_id,
                content=f"상태 변경: {previous_status} → {new_status.value}",
                created_by="system",
            )
        except Exception as e:
            logger.warning(f"상태 변경 로그 기록 중 오류 발생: {str(e)}")

        # 상태가 완료로 변경되었을 경우 차량 정보 업데이트
        if new_status == ScheduleStatus.COMPLETED:
            try:
                self._handle_completed_schedule(schedule)
            except Exception as e:
                logger.warning(f"완료된 일정 후처리 중 오류 발생: {str(e)}")

        # 최신 데이터 다시 조회
        return self.get_schedule_by_id(schedule_id)

    def _handle_completed_schedule(self, schedule: ScheduleModel) -> None:
        """완료된 일정 후처리 (차량 정보 업데이트, 반복 일정 생성 등)"""
        # 차량 정보 업데이트
        vehicle = (
            self.db.query(VehicleModel)
            .filter(VehicleModel.id == schedule.vehicle_id)
            .first()
        )
        if not vehicle:
            return

        # 정비 완료 시간 설정
        now = datetime.now(timezone.utc)
        vehicle.last_maintenance_date = now

        # 반복 일정인 경우 다음 일정 생성
        if schedule.is_recurring and schedule.recurrence_pattern:
            try:
                # 다음 일정 날짜 계산
                next_date = self._calculate_next_schedule_date(
                    current_date=now,
                    pattern=schedule.recurrence_pattern,
                    interval=schedule.recurrence_interval or 1,
                )

                # 차량의 다음 정비 날짜 업데이트
                vehicle.next_maintenance_date = next_date

                if new_schedule := self._create_recurring_schedule(schedule, next_date):
                    logger.info(
                        f"자동 생성된 일정: {new_schedule.id}, 차량: {vehicle.id}, 날짜: {next_date}"
                    )
            except Exception as e:
                logger.error(f"반복 일정 계산 중 오류 발생: {str(e)}")
                # 기본값으로 3개월 후로 설정
                vehicle.next_maintenance_date = now + timedelta(days=90)
        else:
            # 일회성 일정이지만 유형에 따라 다음 정비 일정 예측
            maintenance_intervals = {
                "oil_change": 90,  # 3개월
                "tire_change": 180,  # 6개월
                "brake_service": 180,  # 6개월
                "inspection": 365,  # 1년
                "regular": 90,  # 3개월
            }

            days_to_add = maintenance_intervals.get(schedule.maintenance_type, 90)
            vehicle.next_maintenance_date = now + timedelta(days=days_to_add)

        # 변경사항 저장
        self.db.commit()

    def _create_recurring_schedule(
        self, original_schedule: ScheduleModel, next_date: datetime
    ) -> Optional[ScheduleModel]:
        """반복 일정 생성"""
        new_schedule_id = str(uuid.uuid4())
        new_schedule = ScheduleModel(
            id=new_schedule_id,
            vehicle_id=original_schedule.vehicle_id,
            title=f"예정된 {original_schedule.title}",
            description=f"자동 생성된 일정: {original_schedule.description}",
            scheduled_date=next_date,
            maintenance_type=original_schedule.maintenance_type,
            status=ScheduleStatus.PENDING.value,
            is_recurring=original_schedule.is_recurring,
            recurrence_pattern=original_schedule.recurrence_pattern,
            recurrence_interval=original_schedule.recurrence_interval,
            priority=original_schedule.priority,
            shop_id=original_schedule.shop_id,
        )

        if errors := new_schedule.validate():
            error_msg = "\n".join(errors)
            logger.warning(f"자동 생성 일정 유효성 검증 실패: {error_msg}")
            return None

        self.db.add(new_schedule)

        # 정보성 노트 추가
        auto_note = ScheduleNoteModel(
            id=str(uuid.uuid4()),
            schedule_id=new_schedule_id,
            content=f"이 일정은 완료된 일정 #{original_schedule.id}에서 자동 생성되었습니다.",
            created_by="system",
        )
        self.db.add(auto_note)

        return new_schedule

    def _calculate_next_schedule_date(
        self, current_date: datetime, pattern: str, interval: int
    ) -> datetime:
        """반복 패턴에 따라 다음 일정 날짜 계산"""
        # 올바른 패턴 확인
        try:
            pattern_enum = RecurrencePattern(pattern)
        except ValueError:
            # 기본값으로 3개월 후
            return current_date + timedelta(days=90)

        if pattern_enum == RecurrencePattern.DAILY:
            # 일 단위 반복
            return current_date + timedelta(days=interval)

        elif pattern_enum == RecurrencePattern.WEEKLY:
            # 주 단위 반복
            return current_date + timedelta(weeks=interval)

        elif pattern_enum == RecurrencePattern.MONTHLY:
            # 월 단위 반복 (같은 날짜에, 해당 월에 존재하지 않으면 마지막 날)
            source_day = current_date.day
            source_month = current_date.month
            source_year = current_date.year

            # 목표 연/월 계산
            target_month = source_month + interval
            target_year = source_year + (target_month - 1) // 12
            target_month = ((target_month - 1) % 12) + 1

            # 해당 월의 마지막 날 확인
            last_day_of_month = calendar.monthrange(target_year, target_month)[1]

            # 원래 일자가 해당 월의 마지막 날보다 크면 마지막 날로 조정
            target_day = min(source_day, last_day_of_month)

            return datetime(
                target_year,
                target_month,
                target_day,
                current_date.hour,
                current_date.minute,
                current_date.second,
            )

        elif pattern_enum == RecurrencePattern.YEARLY:
            # 연 단위 반복 (윤년 고려)
            target_year = current_date.year + interval

            # 2월 29일이고 목표 연도가 윤년이 아닌 경우 2월 28일로 설정
            if (
                current_date.month == 2
                and current_date.day == 29
                and not calendar.isleap(target_year)
            ):
                return datetime(
                    target_year,
                    2,
                    28,
                    current_date.hour,
                    current_date.minute,
                    current_date.second,
                )

            # 연도만 변경
            return current_date.replace(year=target_year)

        # 기본값
        return current_date + timedelta(days=90)

    def get_schedule_reminders(self, schedule_id: str) -> List[ScheduleReminderModel]:
        """일정 알림 조회"""
        return (
            self.db.query(ScheduleReminderModel)
            .filter(ScheduleReminderModel.schedule_id == schedule_id)
            .order_by(asc(ScheduleReminderModel.reminder_time))
            .all()
        )

    def get_schedule_notes(self, schedule_id: str) -> List[ScheduleNoteModel]:
        """일정 노트 조회"""
        return (
            self.db.query(ScheduleNoteModel)
            .filter(ScheduleNoteModel.schedule_id == schedule_id)
            .order_by(asc(ScheduleNoteModel.created_at))
            .all()
        )

    def get_overdue_schedules(self) -> List[ScheduleModel]:
        """기한이 지난 일정 조회"""
        now = datetime.now(timezone.utc)
        return (
            self.db.query(ScheduleModel)
            .filter(
                ScheduleModel.scheduled_date < now,
                ScheduleModel.status.in_(["pending", "in_progress"]),
            )
            .all()
        )

    def get_maintenance_statistics(
        self, vehicle_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """정비 통계 정보 조회"""
        return self.repository.get_schedules_stats(vehicle_id)

    def get_schedules_by_date_range(
        self, start_date: datetime, end_date: datetime, skip: int = 0, limit: int = 100
    ) -> Tuple[List[ScheduleModel], int]:
        """날짜 범위 기준으로 일정 조회"""
        return self.repository.get_schedules_by_date_range(
            start_date=start_date,
            end_date=end_date,
            skip=skip,
            limit=limit,
            include_relations=True,
        )

    def process_pending_reminders(self, limit: int = 50) -> int:
        """대기 중인 알림 처리"""
        now = datetime.now(timezone.utc)
        pending_reminders = (
            self.db.query(ScheduleReminderModel)
            .filter(
                ScheduleReminderModel.reminder_time <= now,
                ScheduleReminderModel.status == "pending",
            )
            .limit(limit)
            .all()
        )

        processed_count = 0
        for reminder in pending_reminders:
            try:
                self._send_reminder(reminder)
                processed_count += 1
            except Exception as e:
                logger.error(f"알림 처리 중 오류 발생: {str(e)}")

        return processed_count

    def _send_reminder(self, reminder: ScheduleReminderModel) -> None:
        """알림 발송 처리"""
        # 실제 알림 발송 기능은 구현하지 않고 로그만 남김
        logger.info(
            f"알림 발송: {reminder.id}, 타입: {reminder.reminder_type}, 시간: {reminder.reminder_time}"
        )

        # 알림 발송 후 처리
        if schedule := reminder.schedule:
            # 알림 발송 정보 업데이트
            schedule.notification_sent = True
            schedule.notification_date = datetime.now(timezone.utc)

            # 노트로 알림 발송 기록 남기기
            try:
                note = ScheduleNoteModel(
                    id=str(uuid.uuid4()),
                    schedule_id=schedule.id,
                    content=f"{reminder.reminder_type} 알림이 발송되었습니다.",
                    created_by="system",
                )
                self.db.add(note)
            except Exception as e:
                logger.warning(f"알림 노트 생성 중 오류 발생: {str(e)}")
                # 알림 발송은 성공했으므로 노트 생성 실패해도 계속 진행
