"""
정비 일정 관리를 위한 Repository 클래스
"""

from typing import List, Optional, Dict, Any, Tuple, Sequence, Generator
from datetime import datetime, timedelta, timezone
from sqlalchemy import and_, or_, asc, desc, func, text
from sqlalchemy.orm import Session, joinedload, selectinload, Query
from sqlalchemy.exc import SQLAlchemyError
from contextlib import contextmanager
import time
from functools import wraps
from typing import Callable

from ..core.base_repository import BaseRepository
from ..core.logging import get_logger
from ..models.schedule import (
    ScheduleModel, ScheduleReminderModel, ScheduleNoteModel, 
    ScheduleStatus, SchedulePriority
)
from ..models.vehicle import VehicleModel

logger = get_logger("schedule.repository")

class ScheduleRepositoryError(Exception):
    """스케줄 저장소 관련 예외"""
    pass

class ScheduleNotFoundError(ScheduleRepositoryError):
    """스케줄을 찾을 수 없을 때 발생하는 예외"""
    pass

def measure_execution_time(func: Callable) -> Callable:
    """
    메서드 실행 시간을 측정하는 데코레이터
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        execution_time = time.time() - start_time
        
        # self는 첫 번째 인자
        if args and isinstance(args[0], ScheduleRepository):
            repo = args[0]
            repo._record_metric(func.__name__, execution_time)
            
        return result
    return wrapper

class ScheduleRepository(BaseRepository[ScheduleModel, Dict[str, Any]]):
    """
    정비 일정 관리 Repository 클래스
    """
    
    # 기본 설정값
    DEFAULT_PAGE_SIZE = 100
    DEFAULT_REMINDER_LIMIT = 50
    DEFAULT_UPCOMING_DAYS = 7
    
    def __init__(self, db_session: Session):
        super().__init__(db_session, ScheduleModel)
        self._metrics: Dict[str, List[float]] = {}
        
    def _record_metric(self, method_name: str, execution_time: float) -> None:
        """
        메서드 실행 시간 기록
        """
        if method_name not in self._metrics:
            self._metrics[method_name] = []
        self._metrics[method_name].append(execution_time)
        
    def get_metrics(self) -> Dict[str, Dict[str, float]]:
        # sourcery skip: dict-comprehension, inline-immediately-returned-variable, reintroduce-else, remove-redundant-continue
        """
        수집된 메트릭 조회
        
        Returns:
            메서드별 실행 시간 통계
        """
        metrics = {}
        for method_name, times in self._metrics.items():
            if not times:
                continue
            metrics[method_name] = {
                "avg_time": sum(times) / len(times),
                "min_time": min(times),
                "max_time": max(times),
                "total_calls": len(times)
            }
        return metrics

    def _get_paginated_query_results(
        self,
        query: Query,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
        load_options: Optional[Sequence[Any]] = None
    ) -> Tuple[List[ScheduleModel], int]:
        """
        공통 페이지네이션 쿼리 실행 메서드
        
        Args:
            query: 기본 쿼리
            skip: 건너뛸 항목 수
            limit: 최대 항목 수
            load_options: 로드할 관계 옵션들
            
        Returns:
            결과 목록과 총 개수
        """
        try:
            total = query.count()
            
            if load_options:
                query = query.options(*load_options)
                
            results = query.offset(skip).limit(limit).all()
            return results, total
        except SQLAlchemyError as e:
            logger.error(f"쿼리 실행 중 오류: {str(e)}")
            return [], 0

    @measure_execution_time
    def get_by_id_with_relations(self, schedule_id: str) -> Optional[ScheduleModel]:
        """
        ID로 일정 조회 (관계 포함)
        
        Args:
            schedule_id: 일정 ID
            
        Returns:
            조회된 일정 또는 None
        """
        try:
            if schedule := (
                self.db.query(ScheduleModel)
                .options(
                    selectinload(ScheduleModel.reminders),
                    selectinload(ScheduleModel.notes),
                    joinedload(ScheduleModel.vehicle),
                )
                .filter(ScheduleModel.id == schedule_id)
                .first()
            ):
                return schedule
            else:
                raise ScheduleNotFoundError(f"일정 ID {schedule_id}를 찾을 수 없습니다.")
        except SQLAlchemyError as e:
            logger.error(f"일정 ID {schedule_id} 조회 중 오류: {str(e)}")
            raise ScheduleRepositoryError(f"일정 조회 중 오류 발생: {str(e)}") from e
            
    @measure_execution_time
    def get_upcoming_schedules(self, days: int = DEFAULT_UPCOMING_DAYS) -> List[ScheduleModel]:
        """
        다가오는 일정 조회
        
        Args:
            days: 앞으로 몇 일 동안의 일정을 조회할지
            
        Returns:
            다가오는 일정 목록
        """
        try:
            now = datetime.now(timezone.utc)
            end_date = now + timedelta(days=days)
            
            return (
                self.db.query(ScheduleModel)
                .options(
                    joinedload(ScheduleModel.vehicle),
                    selectinload(ScheduleModel.reminders)
                )
                .filter(
                    and_(
                        ScheduleModel.scheduled_date >= now,
                        ScheduleModel.scheduled_date <= end_date,
                        ScheduleModel.status == ScheduleStatus.PENDING.value
                    )
                )
                .order_by(asc(ScheduleModel.scheduled_date))
                .all()
            )
        except SQLAlchemyError as e:
            logger.error(f"다가오는 일정 조회 중 오류: {str(e)}")
            return []
    
    def get_schedules_by_vehicle(self, vehicle_id: str, skip: int = 0, limit: int = 100) -> Tuple[List[ScheduleModel], int]:
        """
        차량별 일정 조회
        
        Args:
            vehicle_id: 차량 ID
            skip: 건너뛸 항목 수
            limit: 최대 항목 수
            
        Returns:
            일정 목록과 총 개수
        """
        try:
            query = (
                self.db.query(ScheduleModel)
                .filter(ScheduleModel.vehicle_id == vehicle_id)
                .order_by(desc(ScheduleModel.scheduled_date))
            )
            
            return self._get_paginated_query_results(
                query,
                skip,
                limit,
                [selectinload(ScheduleModel.reminders), selectinload(ScheduleModel.notes)]
            )
        except SQLAlchemyError as e:
            logger.error(f"차량 ID {vehicle_id}의 일정 조회 중 오류: {str(e)}")
            return [], 0
            
    def get_schedules_by_status(self, status: ScheduleStatus, skip: int = 0, limit: int = 100) -> Tuple[List[ScheduleModel], int]:
        """
        상태별 일정 조회
        
        Args:
            status: 일정 상태
            skip: 건너뛸 항목 수
            limit: 최대 항목 수
            
        Returns:
            일정 목록과 총 개수
        """
        try:
            query = (
                self.db.query(ScheduleModel)
                .filter(ScheduleModel.status == status.value)
                .order_by(desc(ScheduleModel.scheduled_date))
            )
            
            return self._get_paginated_query_results(
                query,
                skip,
                limit,
                [joinedload(ScheduleModel.vehicle)]
            )
        except SQLAlchemyError as e:
            logger.error(f"상태 {status}의 일정 조회 중 오류: {str(e)}")
            return [], 0
            
    def get_schedules_by_shop(self, shop_id: str, skip: int = 0, limit: int = 100) -> Tuple[List[ScheduleModel], int]:
        """
        정비소별 일정 조회
        
        Args:
            shop_id: 정비소 ID
            skip: 건너뛸 항목 수
            limit: 최대 항목 수
            
        Returns:
            일정 목록과 총 개수
        """
        try:
            query = (
                self.db.query(ScheduleModel)
                .filter(ScheduleModel.shop_id == shop_id)
                .order_by(desc(ScheduleModel.scheduled_date))
            )
            
            return self._get_paginated_query_results(
                query,
                skip,
                limit,
                [joinedload(ScheduleModel.vehicle)]
            )
        except SQLAlchemyError as e:
            logger.error(f"정비소 ID {shop_id}의 일정 조회 중 오류: {str(e)}")
            return [], 0
            
    def get_overdue_schedules(self, skip: int = 0, limit: int = 100) -> Tuple[List[ScheduleModel], int]:
        """
        기한이 지난 일정 조회
        
        Args:
            skip: 건너뛸 항목 수
            limit: 최대 항목 수
            
        Returns:
            일정 목록과 총 개수
        """
        try:
            now = datetime.now(timezone.utc)
            
            query = (
                self.db.query(ScheduleModel)
                .filter(
                    and_(
                        ScheduleModel.scheduled_date < now,
                        ScheduleModel.status == ScheduleStatus.PENDING.value
                    )
                )
                .order_by(desc(ScheduleModel.scheduled_date))
            )
            
            return self._get_paginated_query_results(
                query,
                skip,
                limit,
                [joinedload(ScheduleModel.vehicle)]
            )
        except SQLAlchemyError as e:
            logger.error(f"기한이 지난 일정 조회 중 오류: {str(e)}")
            return [], 0
    
    def get_schedules_by_date_range(
        self, 
        start_date: datetime, 
        end_date: datetime, 
        skip: int = 0, 
        limit: int = 100,
        include_relations: bool = False
    ) -> Tuple[List[ScheduleModel], int]:
        """
        날짜 범위 기준 일정 조회
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            skip: 건너뛸 항목 수
            limit: 최대 항목 수
            include_relations: 관계를 포함할지 여부
            
        Returns:
            일정 목록과 총 개수
        """
        try:
            # 인덱스 힌트 추가
            query = (
                self.db.query(ScheduleModel)
                .with_hint(ScheduleModel, "USE INDEX (idx_scheduled_date)")
                .filter(
                    and_(
                        ScheduleModel.scheduled_date >= start_date,
                        ScheduleModel.scheduled_date <= end_date
                    )
                )
                .order_by(asc(ScheduleModel.scheduled_date))
            )

            load_options = None
            if include_relations:
                load_options = [
                    joinedload(ScheduleModel.vehicle),
                    selectinload(ScheduleModel.reminders)
                ]

            return self._get_paginated_query_results(
                query,
                skip,
                limit,
                load_options
            )
        except SQLAlchemyError as e:
            logger.error(f"날짜 범위({start_date} ~ {end_date}) 기준 일정 조회 중 오류: {str(e)}")
            raise ScheduleRepositoryError(f"날짜 범위 기준 일정 조회 중 오류 발생: {str(e)}") from e
            
    def _save_to_db(self, model: Any, operation: str, schedule_id: Optional[str] = None) -> Optional[Any]:
        """데이터베이스 저장 공통 로직"""
        try:
            self.db.add(model)
            self.db.commit()
            self.db.refresh(model)
            return model
        except SQLAlchemyError as e:
            self.db.rollback()
            error_msg = f"일정 ID {schedule_id}에 {operation} 중 오류" if schedule_id else f"{operation} 중 오류"
            logger.error(f"{error_msg}: {str(e)}")
            return None

    def _log_error(self, operation: str, error: Exception, schedule_id: Optional[str] = None) -> None:
        """
        에러 로깅을 위한 공통 메서드
        
        Args:
            operation: 수행 중이던 작업 설명
            error: 발생한 예외
            schedule_id: 관련된 일정 ID (선택적)
        """
        error_msg = f"{operation} 중 오류"
        if schedule_id:
            error_msg = f"일정 ID {schedule_id}에 {error_msg}"
        logger.error(f"{error_msg}: {str(error)}")

    def add_reminder(self, schedule_id: str, reminder_data: Dict[str, Any]) -> Optional[ScheduleReminderModel]:
        """일정에 알림 추가"""
        try:
            schedule = self.find_by_id(schedule_id)
            if not schedule:
                return None

            reminder = ScheduleReminderModel(
                schedule_id=schedule_id,
                **reminder_data
            )
            return self._save_to_db(reminder, "알림 추가", schedule_id)
        except SQLAlchemyError as e:
            return self._extracted_from_update_status_14("알림 추가", e, schedule_id, None)
            
    def add_note(self, schedule_id: str, note_data: Dict[str, Any]) -> Optional[ScheduleNoteModel]:
        """일정에 노트 추가"""
        try:
            schedule = self.find_by_id(schedule_id)
            if not schedule:
                return None

            note = ScheduleNoteModel(
                schedule_id=schedule_id,
                **note_data
            )
            return self._save_to_db(note, "노트 추가", schedule_id)
        except SQLAlchemyError as e:
            return self._extracted_from_update_status_14("노트 추가", e, schedule_id, None)
            
    def update_status(self, schedule_id: str, status: ScheduleStatus) -> bool:
        """일정 상태 업데이트"""
        try:
            schedule = self.find_by_id(schedule_id)
            if not schedule:
                return False

            schedule.status = status.value
            schedule.updated_at = datetime.now(timezone.utc)

            self.db.commit()
            return True
        except SQLAlchemyError as e:
            return self._extracted_from_update_status_14("상태 업데이트", e, schedule_id, False)

    # TODO Rename this here and in `add_reminder`, `add_note` and `update_status`
    def _extracted_from_update_status_14(self, arg0, e, schedule_id, arg3):
        self.db.rollback()
        self._log_error(arg0, e, schedule_id)
        return arg3
    
    def get_pending_reminders(self, limit: int = DEFAULT_REMINDER_LIMIT) -> List[ScheduleReminderModel]:
        """
        발송 대기 중인 알림 조회
        
        Args:
            limit: 최대 항목 수
            
        Returns:
            발송 대기 중인 알림 목록
        """
        try:
            now = datetime.now(timezone.utc)
            
            return (
                self.db.query(ScheduleReminderModel)
                .options(
                    joinedload(ScheduleReminderModel.schedule)
                )
                .filter(
                    and_(
                        ScheduleReminderModel.reminder_time <= now,
                        ScheduleReminderModel.status == "pending"
                    )
                )
                .order_by(asc(ScheduleReminderModel.reminder_time))
                .limit(limit)
                .all()
            )
        except SQLAlchemyError as e:
            logger.error(f"발송 대기 중인 알림 조회 중 오류: {str(e)}")
            return []
    
    def get_schedules_stats(self, vehicle_id: Optional[str] = None) -> Dict[str, Any]:
        """
        일정 통계 조회
        
        Args:
            vehicle_id: 차량 ID (선택 사항)
            
        Returns:
            일정 통계 정보
        """
        try:
            base_query = self.db.query(ScheduleModel)
            if vehicle_id:
                base_query = base_query.filter(ScheduleModel.vehicle_id == vehicle_id)

            now = datetime.now(timezone.utc)
            
            # 상태별 통계
            status_stats = {}
            for status in ScheduleStatus:
                count = base_query.filter(ScheduleModel.status == status.value).count()
                status_stats[status.value] = count
                
            # 우선순위별 통계
            priority_stats = {}
            for priority in SchedulePriority:
                count = base_query.filter(ScheduleModel.priority == priority.value).count()
                priority_stats[priority.value] = count
                
            # 기한 초과 건수
            overdue_count = base_query.filter(
                and_(
                    ScheduleModel.scheduled_date < now,
                    ScheduleModel.status == ScheduleStatus.PENDING.value
                )
            ).count()
            
            # 이번 주 예정 건수
            week_end = now + timedelta(days=7)
            upcoming_count = base_query.filter(
                and_(
                    ScheduleModel.scheduled_date >= now,
                    ScheduleModel.scheduled_date <= week_end,
                    ScheduleModel.status == ScheduleStatus.PENDING.value
                )
            ).count()
            
            return {
                "total": base_query.count(),
                "by_status": status_stats,
                "by_priority": priority_stats,
                "overdue": overdue_count,
                "upcoming_week": upcoming_count
            }
            
        except SQLAlchemyError as e:
            logger.error(f"일정 통계 조회 중 오류: {str(e)}")
            return {
                "total": 0,
                "by_status": {},
                "by_priority": {},
                "overdue": 0,
                "upcoming_week": 0
            }

    def bulk_update_status(self, schedule_ids: List[str], status: ScheduleStatus) -> Tuple[bool, int]:
        """
        여러 일정의 상태를 한 번에 업데이트
        
        Args:
            schedule_ids: 일정 ID 목록
            status: 새로운 상태
            
        Returns:
            (성공 여부, 업데이트된 레코드 수)
        """
        try:
            now = datetime.now(timezone.utc)
            result = (
                self.db.query(ScheduleModel)
                .filter(ScheduleModel.id.in_(schedule_ids))
                .update({
                    "status": status.value,
                    "updated_at": now
                }, synchronize_session=False)
            )
            self.db.commit()
            return True, result
        except SQLAlchemyError as e:
            return self._extracted_from_bulk_delete_expired_reminders_25(
                '일정 상태 일괄 업데이트 중 오류: ', e
            )
            
    def bulk_delete_expired_reminders(self, days: int = 30) -> Tuple[bool, int]:
        """
        만료된 알림을 일괄 삭제
        
        Args:
            days: 며칠 이전의 알림을 삭제할지
            
        Returns:
            (성공 여부, 삭제된 레코드 수)
        """
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            result = (
                self.db.query(ScheduleReminderModel)
                .filter(
                    and_(
                        ScheduleReminderModel.reminder_time < cutoff_date,
                        ScheduleReminderModel.status.in_(["sent", "failed", "cancelled"])
                    )
                )
                .delete(synchronize_session=False)
            )
            self.db.commit()
            return True, result
        except SQLAlchemyError as e:
            return self._extracted_from_bulk_delete_expired_reminders_25(
                '만료된 알림 일괄 삭제 중 오류: ', e
            )

    # TODO Rename this here and in `bulk_update_status` and `bulk_delete_expired_reminders`
    def _extracted_from_bulk_delete_expired_reminders_25(self, arg0, e):
        self.db.rollback()
        logger.error(f"{arg0}{str(e)}")
        return False, 0

    @contextmanager
    def transaction(self) -> Generator[Session, None, None]:
        """
        트랜잭션 컨텍스트 매니저
        
        사용 예:
            with repo.transaction() as session:
                # 트랜잭션 내에서 수행할 작업
                session.add(some_model)
        """
        try:
            yield self.db
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            logger.error(f"트랜잭션 실행 중 오류: {str(e)}")
            raise
            
    def create_schedule_with_reminders(
        self,
        schedule_data: Dict[str, Any],
        reminders_data: List[Dict[str, Any]]
    ) -> Optional[ScheduleModel]:
        """
        일정과 알림을 함께 생성
        
        Args:
            schedule_data: 일정 데이터
            reminders_data: 알림 데이터 목록
            
        Returns:
            생성된 일정 또는 None
        """
        try:
            with self.transaction() as session:
                schedule = ScheduleModel(**schedule_data)
                session.add(schedule)
                session.flush()
                
                for reminder_data in reminders_data:
                    reminder = ScheduleReminderModel(
                        schedule_id=schedule.id,
                        **reminder_data
                    )
                    session.add(reminder)
                
                session.refresh(schedule)
                return schedule
        except Exception as e:
            logger.error(f"일정과 알림 생성 중 오류: {str(e)}")
            return None