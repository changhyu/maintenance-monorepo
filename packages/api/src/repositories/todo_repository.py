"""
Todo 리포지토리 모듈.
"""
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Union, Tuple, TypeVar, Callable, Set
from enum import Enum
import uuid

from sqlalchemy import and_, or_, desc, text, func
from sqlalchemy.orm import Session, Query

from ..core.logging import get_logger
from ..database.models import Todo
from ..models.schemas import TodoCreate, TodoUpdate, TodoStatus, TodoResponse, TodoPriority
from ..core.base_repository import BaseRepository
from ..core.metrics import track_db_query_time


logger = get_logger("todo.repository")

T = TypeVar('T')  # 제네릭 타입 정의

class RecurrenceType(str, Enum):
    """반복 유형 정의"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    CUSTOM = "custom"  # 사용자 정의 반복 주기


class TodoRepository(BaseRepository[Todo, TodoCreate]):
    """Todo 데이터 액세스를 담당하는 리포지토리 클래스"""

    def __init__(self, db_session: Session):
        """초기화"""
        super().__init__(db_session, Todo)

    @track_db_query_time
    def find_all(self, skip: int = 0, limit: int = 100, filters: Dict = None) -> Tuple[List[Todo], int]:
        """
        모든 Todo 항목 조회
        
        Args:
            skip: 건너뛸 항목 수
            limit: 최대 항목 수
            filters: 필터 조건
            
        Returns:
            Tuple[List[Todo], int]: Todo 목록과 총 개수
        """
        query = self.db.query(Todo)
        
        # 필터 적용
        if filters:
            query = self._apply_filters(query, filters)
        
        # 총 개수 계산
        total = query.count()
        
        # 정렬 및 페이지네이션 적용
        todos = query.order_by(Todo.created_at.desc()).offset(skip).limit(limit).all()
        
        logger.debug(f"Todo 목록 조회: {len(todos)}개 항목 (총 {total}개 중)")
        return todos, total

    def find_by_id(self, todo_id: str) -> Optional[Todo]:
        """
        ID로 Todo 항목 조회
        
        Args:
            todo_id: Todo ID
            
        Returns:
            Optional[Todo]: 조회된 Todo 또는 None
        """
        try:
            result = self.db.query(Todo).filter(Todo.id == todo_id).first()
            if result:
                logger.debug(f"Todo {todo_id} 조회 성공")
            else:
                logger.debug(f"Todo {todo_id} 조회 실패: 항목 없음")
            return result
        except Exception as e:
            logger.error(f"Todo {todo_id} 조회 중 오류 발생: {str(e)}")
            return None

    def create(self, data: TodoCreate) -> Todo:
        """
        새 Todo 항목 생성
        
        Args:
            data: Todo 생성 데이터
            
        Returns:
            Todo: 생성된 Todo
        """
        todo_id = str(uuid.uuid4())
        logger.debug(f"Todo 생성 시작: {todo_id}")

        todo = Todo(
            id=todo_id,
            title=data.title,
            description=data.description,
            due_date=data.due_date,
            status=data.status or TodoStatus.PENDING,
            priority=data.priority or TodoPriority.MEDIUM,
            vehicle_id=data.vehicle_id,
            user_id=data.user_id,
            assignee_id=data.assignee_id,
            related_entity_type=data.related_entity_type,
            related_entity_id=data.related_entity_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        try:
            return super().create(todo)
        except Exception as e:
            self._handle_db_error('Todo 생성 중 오류 발생: ', e)

    def update(self, todo: Todo, data: TodoUpdate) -> Todo:
        """
        Todo 항목 업데이트
        
        Args:
            todo: 업데이트할 Todo 객체
            data: 업데이트 데이터
            
        Returns:
            Todo: 업데이트된 Todo
        """
        # 데이터 업데이트
        update_data = data.model_dump(exclude_unset=True)

        logger.debug(f"Todo {todo.id} 업데이트 시작: {update_data}")

        # 각 필드 업데이트
        for key, value in update_data.items():
            setattr(todo, key, value)

        # 업데이트 시간 갱신
        todo.updated_at = datetime.now(timezone.utc)

        try:
            return super().update(todo)
        except Exception as e:
            self._handle_db_error('Todo 업데이트 중 오류 발생: ', e)

    def delete(self, todo: Todo) -> bool:
        """
        Todo 항목 삭제
        
        Args:
            todo: 삭제할 Todo 객체
            
        Returns:
            bool: 삭제 성공 여부
        """
        try:
            logger.debug(f"Todo 삭제 시작: ID={todo.id}")
            self.db.delete(todo)
            self.db.commit()
            logger.debug(f"Todo 삭제 완료: ID={todo.id}")
            return True
        except Exception as e:
            self._handle_db_error('Todo 삭제 중 오류 발생: ', e)

    def update_status(self, todo: Todo, status: str) -> Todo:
        """
        Todo 상태 업데이트
        
        Args:
            todo: 업데이트할 Todo 객체
            status: 새 상태
            
        Returns:
            Todo: 업데이트된 Todo
        """
        try:
            logger.debug(f"Todo 상태 업데이트 시작: ID={todo.id}, 상태={status}")
            todo.status = status
            todo.updated_at = datetime.now(timezone.utc)

            return super().update(todo)
        except Exception as e:
            self._handle_db_error('Todo 상태 업데이트 중 오류 발생: ', e)

    def complete(self, todo: Todo) -> Todo:
        """
        Todo 완료 처리
        
        Args:
            todo: 완료할 Todo 객체
            
        Returns:
            Todo: 업데이트된 Todo
        """
        try:
            logger.debug(f"Todo 완료 처리 시작: ID={todo.id}")
            # 상태 및 시간 업데이트
            self._update_todo_complete_status(todo)

            return super().update(todo)
        except Exception as e:
            self._handle_db_error('Todo 완료 처리 중 오류 발생: ', e)
            
    def _update_todo_complete_status(self, todo: Todo) -> None:
        """Todo 완료 상태로 업데이트"""
        todo.status = TodoStatus.COMPLETED
        todo.updated_at = datetime.now(timezone.utc)
        todo.completed_at = datetime.now(timezone.utc)

    @track_db_query_time
    def find_overdue_todos(self, user_id: Optional[str] = None) -> List[Todo]:
        """
        기한이 지난 Todo 조회
        
        Args:
            user_id: 사용자 ID
            
        Returns:
            List[Todo]: 기한이 지난 Todo 목록
        """
        try:
            logger.debug(f"기한 지난 Todo 조회 시작: user_id={user_id or '모든 사용자'}")
            
            # 기본 쿼리 생성 - 기한이 지난 항목
            query = self._get_active_todos_query()
            query = query.filter(Todo.due_date < datetime.now(timezone.utc))
            
            # 사용자 필터 적용
            query = self._filter_by_user(query, user_id)
            
            result = query.all()
            logger.debug(f"기한 지난 Todo 조회 완료: {len(result)}건")
            return result
        except Exception as e:
            logger.error(f"기한 지난 Todo 조회 중 오류 발생: {str(e)}")
            raise

    @track_db_query_time
    def find_upcoming_todos(self, days: int = 7, user_id: Optional[str] = None) -> List[Todo]:
        """
        다가오는 Todo 조회
        
        Args:
            days: 기한까지 남은 일수
            user_id: 사용자 ID
            
        Returns:
            List[Todo]: 다가오는 Todo 목록
        """
        try:
            logger.debug(f"다가오는 Todo 조회 시작: days={days}, user_id={user_id or '모든 사용자'}")
            
            # 현재 시간 및 종료 시간 계산
            now = datetime.now(timezone.utc)
            end_date = now + timedelta(days=days)
            
            # 쿼리 생성 
            query = self._get_active_todos_query()
            query = query.filter(
                and_(
                    Todo.due_date >= now,
                    Todo.due_date <= end_date
                )
            )
            
            # 사용자 필터 적용
            query = self._filter_by_user(query, user_id)
            
            # 결과 조회
            result = query.all()
            logger.debug(f"다가오는 Todo 조회 완료: {len(result)}건")
            return result
        except Exception as e:
            logger.error(f"다가오는 Todo 조회 중 오류 발생: {str(e)}")
            raise

    def _get_active_todos_query(self) -> Query:
        """활성 상태의 Todo 쿼리를 반환합니다."""
        return self.db.query(Todo).filter(
            Todo.status.in_([TodoStatus.PENDING, TodoStatus.IN_PROGRESS])
        )

    def _filter_by_user(self, query: Query, user_id: Optional[str]) -> Query:
        """사용자 ID로 필터링합니다."""
        if user_id:
            query = query.filter(
                or_(
                    Todo.user_id == user_id,
                    Todo.assignee_id == user_id
                )
            )
        return query

    def _apply_filters(self, query, filters):
        """필터 적용"""
        if not filters:
            return query
            
        # 상태 및 우선순위 필터 적용
        query = self._apply_status_priority_filters(query, filters)
        
        # 날짜 필터 적용
        query = self._apply_date_filters(query, filters)
        
        # 엔티티 관련 필터 적용
        query = self._apply_entity_filters(query, filters)
        
        return query

    def _apply_status_priority_filters(self, query, filters):
        """상태 및 우선순위 필터를 적용합니다."""
        if 'status' in filters and filters['status']:
            if isinstance(filters['status'], list):
                query = query.filter(Todo.status.in_(filters['status']))
            else:
                query = query.filter(Todo.status == filters['status'])
                
        if 'priority' in filters and filters['priority']:
            if isinstance(filters['priority'], list):
                query = query.filter(Todo.priority.in_(filters['priority']))
            else:
                query = query.filter(Todo.priority == filters['priority'])
                
        return query

    def _apply_date_filters(self, query, filters):
        """날짜 필터를 적용합니다."""
        if 'due_date_from' in filters and filters['due_date_from']:
            query = query.filter(Todo.due_date >= filters['due_date_from'])
            
        if 'due_date_to' in filters and filters['due_date_to']:
            query = query.filter(Todo.due_date <= filters['due_date_to'])
            
        return query

    def _apply_entity_filters(self, query, filters):
        """엔티티 관련 필터를 적용합니다."""
        entity_fields = ['user_id', 'assignee_id', 'vehicle_id', 'related_entity_type', 'related_entity_id']
        
        for field in entity_fields:
            if field in filters and filters[field]:
                query = query.filter(getattr(Todo, field) == filters[field])
                
        return query

    @track_db_query_time
    def batch_update_status(self, todo_ids: List[str], status: str) -> int:
        # sourcery skip: extract-method
        """
        여러 Todo 항목의 상태를 일괄 업데이트합니다.
        
        Args:
            todo_ids: 업데이트할 Todo ID 목록
            status: 변경할 상태
            
        Returns:
            int: 업데이트된 항목 수
        """
        try:
            logger.debug(f"Todo 일괄 상태 업데이트 시작: {len(todo_ids)}개 항목, 상태={status}")

            # 일괄 업데이트 수행
            result = self.db.query(Todo).filter(
                Todo.id.in_(todo_ids)
            ).update({
                'status': status,
                'updated_at': datetime.now(timezone.utc)
            }, synchronize_session=False)

            # 완료 상태로 변경하는 경우 완료 시간도 업데이트
            if status == TodoStatus.COMPLETED:
                self.db.query(Todo).filter(
                    Todo.id.in_(todo_ids),
                    Todo.completed_at.is_(None)  # 이미 완료 시간이 설정되지 않은 항목만
                ).update({
                    'completed_at': datetime.now(timezone.utc)
                }, synchronize_session=False)

            self.db.commit()
            logger.debug(f"Todo 일괄 상태 업데이트 완료: {result}개 항목 업데이트됨")
            return result
        except Exception as e:
            self._handle_db_error('Todo 일괄 상태 업데이트 중 오류 발생: ', e)
            
    @track_db_query_time
    def get_scheduled_todos(self, days: int = 30) -> List[Todo]:
        """
        특정 기간 이내에 예정된 Todo 항목을 조회합니다.
        
        Args:
            days: 현재부터 조회할 기간(일)
            
        Returns:
            List[Todo]: 예정된 Todo 목록
        """
        try:
            now = datetime.now(timezone.utc)
            future = now + timedelta(days=days)
            
            query = self._get_active_todos_query()
            query = query.filter(
                Todo.due_date.isnot(None),
                Todo.due_date >= now,
                Todo.due_date <= future
            ).order_by(Todo.due_date.asc())
            
            result = query.all()
            logger.debug(f"예정된 Todo 조회 완료: {len(result)}건")
            return result
        except Exception as e:
            logger.error(f"예정된 Todo 조회 중 오류 발생: {str(e)}")
            raise
            
    def batch_create_todos(self, todo_data_list: List[Dict[str, Any]]) -> List[Todo]:
        # sourcery skip: extract-method
        """
        여러 Todo 항목을 일괄 생성합니다.
        
        Args:
            todo_data_list: 생성할 Todo 데이터 목록
            
        Returns:
            List[Todo]: 생성된 Todo 목록
        """
        try:
            logger.debug(f"Todo 일괄 생성 시작: {len(todo_data_list)}개 항목")

            todos = []
            for data in todo_data_list:
                todo_id = str(uuid.uuid4())

                # 기본값 설정
                now = datetime.now(timezone.utc)
                status = data.get('status', TodoStatus.PENDING)
                priority = data.get('priority', TodoPriority.MEDIUM)

                todo = Todo(
                    id=todo_id,
                    title=data['title'],
                    description=data.get('description'),
                    due_date=data.get('due_date'),
                    status=status,
                    priority=priority,
                    vehicle_id=data.get('vehicle_id'),
                    user_id=data['user_id'],  # 필수 필드
                    assignee_id=data.get('assignee_id'),
                    related_entity_type=data.get('related_entity_type'),
                    related_entity_id=data.get('related_entity_id'),
                    created_at=now,
                    updated_at=now
                )

                todos.append(todo)

            # 일괄 추가
            self.db.add_all(todos)
            self.db.commit()

            for todo in todos:
                self._refresh_object(todo)

            logger.debug(f"Todo 일괄 생성 완료: {len(todos)}개 항목")
            return todos
        except Exception as e:
            self._handle_db_error('Todo 일괄 생성 중 오류 발생: ', e)
            
    @track_db_query_time
    def get_todo_statistics(self) -> Dict[str, Any]:
        """
        Todo 항목의 통계 정보를 조회합니다.
        
        Returns:
            Dict[str, Any]: 통계 정보
        """
        try:
            # 상태별 개수
            status_counts = {}
            for status in TodoStatus:
                count = self.db.query(Todo).filter(Todo.status == status).count()
                status_counts[status.value] = count
                
            # 우선순위별 개수
            priority_counts = {}
            for priority in TodoPriority:
                count = self.db.query(Todo).filter(Todo.priority == priority).count()
                priority_counts[priority.value] = count
                
            # 기한 관련 통계
            now = datetime.now(timezone.utc)
            overdue_count = self.db.query(Todo).filter(
                Todo.due_date < now,
                Todo.status != TodoStatus.COMPLETED,
                Todo.status != TodoStatus.CANCELLED
            ).count()
            
            # 오늘 완료된 항목 수
            today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            completed_today = self.db.query(Todo).filter(
                Todo.completed_at >= today_start,
                Todo.status == TodoStatus.COMPLETED
            ).count()
            
            # 최근 생성된 항목 수 (지난 7일)
            week_ago = now - timedelta(days=7)
            created_last_week = self.db.query(Todo).filter(
                Todo.created_at >= week_ago
            ).count()
            
            return {
                "total_count": self.db.query(Todo).count(),
                "status_counts": status_counts,
                "priority_counts": priority_counts,
                "overdue_count": overdue_count,
                "completed_today": completed_today,
                "created_last_week": created_last_week,
                "updated_at": now.isoformat()
            }
        except Exception as e:
            logger.error(f"Todo 통계 정보 조회 중 오류 발생: {str(e)}")
            raise

    def add_tag_to_todo(self, todo_id: str, tag: str) -> Todo:
        # sourcery skip: extract-method
        """
        Todo 항목에 태그를 추가합니다.
        
        Args:
            todo_id: Todo ID
            tag: 추가할 태그
            
        Returns:
            Todo: 업데이트된 Todo
        """
        try:
            logger.debug(f"Todo {todo_id}에 태그 추가 시작: {tag}")

            todo = self.db.query(Todo).filter(Todo.id == todo_id).first()
            if not todo:
                raise ValueError(f"ID가 {todo_id}인 Todo를 찾을 수 없습니다.")

            # 현재 태그 배열이 없으면 초기화
            if not todo.tags:
                todo.tags = []

            # 이미 존재하지 않는 경우에만 태그 추가
            if tag not in todo.tags:
                todo.tags.append(tag)
                todo.updated_at = datetime.now(timezone.utc)

            return super().update(todo)
        except Exception as e:
            self._handle_db_error('Todo에 태그 추가 중 오류 발생: ', e)
            
    def remove_tag_from_todo(self, todo_id: str, tag: str) -> Todo:
        """
        Todo 항목에서 태그를 제거합니다.
        
        Args:
            todo_id: Todo ID
            tag: 제거할 태그
            
        Returns:
            Todo: 업데이트된 Todo
        """
        try:
            logger.debug(f"Todo {todo_id}에서 태그 제거 시작: {tag}")

            todo = self.db.query(Todo).filter(Todo.id == todo_id).first()
            if not todo:
                raise ValueError(f"ID가 {todo_id}인 Todo를 찾을 수 없습니다.")

            # 태그가 있는 경우에만 제거
            if todo.tags and tag in todo.tags:
                todo.tags.remove(tag)
                todo.updated_at = datetime.now(timezone.utc)

            return super().update(todo)
        except Exception as e:
            self._handle_db_error('Todo에서 태그 제거 중 오류 발생: ', e)
            
    @track_db_query_time
    def find_todos_by_tags(self, tags: List[str], match_all: bool = False) -> List[Todo]:
        # sourcery skip: for-append-to-extend, list-comprehension
        """
        태그로 Todo 항목을 검색합니다.
        
        Args:
            tags: 검색할 태그 목록
            match_all: True면 모든 태그가 일치하는 항목만 반환, False면 하나라도 일치하는 항목 반환
            
        Returns:
            List[Todo]: 검색된 Todo 목록
        """
        try:
            logger.debug(f"태그로 Todo 검색 시작: {tags}, match_all={match_all}")
            
            query = self.db.query(Todo)
            
            if not tags:
                return []
                
            if match_all:
                # 모든 태그가 일치하는 항목 검색
                for tag in tags:
                    query = query.filter(Todo.tags.contains([tag]))
            else:
                # 하나라도 일치하는 항목 검색 (PostgreSQL 사용 시 @> 연산자 사용 가능)
                # SQLite 또는 다른 DB에서는 다른 접근 방식 필요
                filters = []
                for tag in tags:
                    filters.append(Todo.tags.contains([tag]))
                query = query.filter(or_(*filters))
                
            result = query.all()
            logger.debug(f"태그로 Todo 검색 완료: {len(result)}건")
            return result
        except Exception as e:
            logger.error(f"태그로 Todo 검색 중 오류 발생: {str(e)}")
            raise
            
    def get_popular_tags(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        가장 많이 사용된 태그를 조회합니다.
        
        Args:
            limit: 반환할 최대 태그 수
            
        Returns:
            List[Dict[str, Any]]: 태그 이름과 사용 횟수를 포함하는 딕셔너리 목록
        """
        try:
            logger.debug(f"인기 태그 조회 시작: limit={limit}")
            
            # 모든 Todo 항목의 태그 수집
            todos = self.db.query(Todo).filter(Todo.tags.isnot(None)).all()
            
            # 태그 카운팅
            tag_counts = {}
            for todo in todos:
                if not todo.tags:
                    continue
                    
                for tag in todo.tags:
                    if tag in tag_counts:
                        tag_counts[tag] += 1
                    else:
                        tag_counts[tag] = 1
            
            # 사용 횟수 기준 정렬
            sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
            
            # 결과 형식화 및 제한
            result = [{"name": tag, "count": count} for tag, count in sorted_tags[:limit]]
            
            logger.debug(f"인기 태그 조회 완료: {len(result)}개 태그")
            return result
        except Exception as e:
            logger.error(f"인기 태그 조회 중 오류 발생: {str(e)}")
            raise
            
    def schedule_task(self, todo_id: str, scheduled_time: datetime) -> Todo:
        # sourcery skip: extract-method
        """
        Todo 항목에 예약 실행 시간을 설정합니다.
        
        Args:
            todo_id: Todo ID
            scheduled_time: 예약 실행 시간
            
        Returns:
            Todo: 업데이트된 Todo
        """
        try:
            logger.debug(f"Todo {todo_id} 예약 설정 시작: {scheduled_time}")

            todo = self.db.query(Todo).filter(Todo.id == todo_id).first()
            if not todo:
                raise ValueError(f"ID가 {todo_id}인 Todo를 찾을 수 없습니다.")

            # 메타데이터가 없으면 초기화
            if not todo.metadata:
                todo.metadata = {}

            # 예약 정보 설정
            todo.metadata['scheduled_time'] = scheduled_time.isoformat()
            todo.metadata['is_scheduled'] = True
            todo.updated_at = datetime.now(timezone.utc)

            return super().update(todo)
        except Exception as e:
            self._handle_db_error('Todo 예약 설정 중 오류 발생: ', e)
            
    def cancel_scheduled_task(self, todo_id: str) -> Todo:
        """
        Todo 항목의 예약을 취소합니다.
        
        Args:
            todo_id: Todo ID
            
        Returns:
            Todo: 업데이트된 Todo
        """
        try:
            logger.debug(f"Todo {todo_id} 예약 취소 시작")

            todo = self.db.query(Todo).filter(Todo.id == todo_id).first()
            if not todo:
                raise ValueError(f"ID가 {todo_id}인 Todo를 찾을 수 없습니다.")

            # 메타데이터가 있는 경우에만 예약 정보 제거
            if todo.metadata and 'is_scheduled' in todo.metadata:
                todo.metadata['is_scheduled'] = False
                if 'scheduled_time' in todo.metadata:
                    todo.metadata['cancelled_time'] = datetime.now(timezone.utc).isoformat()
                todo.updated_at = datetime.now(timezone.utc)

            return super().update(todo)
        except Exception as e:
            self._handle_db_error('Todo 예약 취소 중 오류 발생: ', e)
            
    def get_scheduled_tasks(self, from_time: datetime, to_time: datetime) -> List[Todo]:
        """
        특정 시간 범위 내에 예약된 작업을 조회합니다.
        
        Args:
            from_time: 시작 시간
            to_time: 종료 시간
            
        Returns:
            List[Todo]: 예약된 Todo 목록
        """
        try:
            logger.debug(f"예약된 작업 조회 시작: {from_time} ~ {to_time}")
            
            # 메타데이터에서 예약 정보 확인 (PostgreSQL의 JSONB 사용 시 다른 쿼리 가능)
            todos = self.db.query(Todo).filter(
                Todo.metadata.isnot(None)
            ).all()
            
            # 필터링: 예약된 작업이고 시간 범위 내에 있는 항목
            result = []
            from_iso = from_time.isoformat()
            to_iso = to_time.isoformat()
            
            for todo in todos:
                if not todo.metadata or not todo.metadata.get('is_scheduled', False):
                    continue
                    
                scheduled_time = todo.metadata.get('scheduled_time')
                if scheduled_time and from_iso <= scheduled_time <= to_iso:
                    result.append(todo)
            
            logger.debug(f"예약된 작업 조회 완료: {len(result)}건")
            return result
        except Exception as e:
            logger.error(f"예약된 작업 조회 중 오류 발생: {str(e)}")
            raise

    def set_recurrence(self, todo_id: str, recurrence_type: RecurrenceType, 
                       interval: int = 1, end_date: Optional[datetime] = None,
                       weekdays: Optional[List[int]] = None) -> Todo:
        """
        Todo 항목에 반복 일정을 설정합니다.
        
        Args:
            todo_id: Todo ID
            recurrence_type: 반복 유형 (daily, weekly, monthly, yearly, custom)
            interval: 반복 간격 (매 n일, 매 n주 등)
            end_date: 반복 종료일 (None이면 무기한)
            weekdays: 주간 반복 시 요일 지정 (0=월요일, 6=일요일)
            
        Returns:
            Todo: 업데이트된 Todo
        """
        try:
            logger.debug(f"Todo {todo_id} 반복 일정 설정 시작: {recurrence_type}, interval={interval}")

            todo = self.db.query(Todo).filter(Todo.id == todo_id).first()
            if not todo:
                raise ValueError(f"ID가 {todo_id}인 Todo를 찾을 수 없습니다.")

            # 메타데이터가 없으면 초기화
            if not todo.metadata:
                todo.metadata = {}

            # 반복 정보 설정
            recurrence_info = {
                'type': recurrence_type,
                'interval': interval,
                'start_date': datetime.now(timezone.utc).isoformat(),
            }

            if end_date:
                recurrence_info['end_date'] = end_date.isoformat()

            if weekdays and recurrence_type == RecurrenceType.WEEKLY:
                recurrence_info['weekdays'] = weekdays

            todo.metadata['recurrence'] = recurrence_info
            todo.updated_at = datetime.now(timezone.utc)

            return super().update(todo)
        except Exception as e:
            self._handle_db_error('Todo 반복 일정 설정 중 오류 발생: ', e)
            
    def cancel_recurrence(self, todo_id: str) -> Todo:
        """
        Todo 항목의 반복 일정을 취소합니다.
        
        Args:
            todo_id: Todo ID
            
        Returns:
            Todo: 업데이트된 Todo
        """
        try:
            logger.debug(f"Todo {todo_id} 반복 일정 취소 시작")

            todo = self.db.query(Todo).filter(Todo.id == todo_id).first()
            if not todo:
                raise ValueError(f"ID가 {todo_id}인 Todo를 찾을 수 없습니다.")

            # 메타데이터가 있고 반복 정보가 있는 경우에만 제거
            if todo.metadata and 'recurrence' in todo.metadata:
                # 취소 정보 추가
                todo.metadata['recurrence']['cancelled'] = True
                todo.metadata['recurrence']['cancelled_at'] = datetime.now(timezone.utc).isoformat()
                todo.updated_at = datetime.now(timezone.utc)

            return super().update(todo)
        except Exception as e:
            self._handle_db_error('Todo 반복 일정 취소 중 오류 발생: ', e)
            
    def generate_next_recurring_todo(self, todo_id: str) -> Optional[Todo]:
        """
        반복 일정이 설정된 Todo 항목의 다음 반복 항목을 생성합니다.
        
        Args:
            todo_id: 원본 Todo ID
            
        Returns:
            Optional[Todo]: 생성된 다음 Todo 항목, 더 이상 생성할 수 없으면 None
        """
        try:
            logger.debug(f"Todo {todo_id} 다음 반복 항목 생성 시작")

            source_todo = self.db.query(Todo).filter(Todo.id == todo_id).first()
            if not source_todo:
                raise ValueError(f"ID가 {todo_id}인 Todo를 찾을 수 없습니다.")

            # 반복 정보가 없거나 취소된 경우 생성하지 않음
            if (not source_todo.metadata or 
                'recurrence' not in source_todo.metadata or 
                source_todo.metadata['recurrence'].get('cancelled', False)):
                return None

            recurrence = source_todo.metadata['recurrence']
            rec_type = recurrence['type']
            interval = recurrence['interval']

            # 종료일이 있고 이미 지난 경우 생성하지 않음
            if 'end_date' in recurrence:
                end_date = datetime.fromisoformat(recurrence['end_date'])
                if datetime.now(timezone.utc) > end_date:
                    return None

            # 새 마감일 계산
            new_due_date = None
            if source_todo.due_date:
                if rec_type == RecurrenceType.DAILY:
                    new_due_date = source_todo.due_date + timedelta(days=interval)
                elif rec_type == RecurrenceType.WEEKLY:
                    new_due_date = source_todo.due_date + timedelta(weeks=interval)
                elif rec_type == RecurrenceType.MONTHLY:
                    # 간단한 월 계산 (정확한 월 계산은 더 복잡함)
                    new_month = source_todo.due_date.month + interval
                    new_year = source_todo.due_date.year + (new_month - 1) // 12
                    new_month = ((new_month - 1) % 12) + 1
                    new_due_date = source_todo.due_date.replace(year=new_year, month=new_month)
                elif rec_type == RecurrenceType.YEARLY:
                    new_due_date = source_todo.due_date.replace(year=source_todo.due_date.year + interval)

            # 새 Todo 생성
            new_todo_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)

            # 기본 필드 복사
            new_todo = Todo(
                id=new_todo_id,
                title=source_todo.title,
                description=source_todo.description,
                due_date=new_due_date,
                status=TodoStatus.PENDING,  # 항상 대기 상태로 시작
                priority=source_todo.priority,
                vehicle_id=source_todo.vehicle_id,
                user_id=source_todo.user_id,
                assignee_id=source_todo.assignee_id,
                related_entity_type=source_todo.related_entity_type,
                related_entity_id=source_todo.related_entity_id,
                tags=source_todo.tags,
                created_at=now,
                updated_at=now
            )

            # 메타데이터 설정 (원본 ID 및 반복 정보 포함)
            new_todo.metadata = {
                'source_todo_id': todo_id,
                'recurrence': recurrence,
                'recurrence_sequence': source_todo.metadata.get('recurrence_sequence', 0) + 1
            }

            # 데이터베이스에 저장
            self.db.add(new_todo)
            self.db.commit()
            self._refresh_object(new_todo)

            logger.debug(f"Todo {todo_id}의 다음 반복 항목 생성 완료: {new_todo_id}")
            return new_todo
        except Exception as e:
            self._handle_db_error('Todo 다음 반복 항목 생성 중 오류 발생: ', e)
            
    def set_reminder(self, todo_id: str, reminder_time: datetime,
                     reminder_type: str = "notification", 
                     reminder_message: Optional[str] = None) -> Todo:
        # sourcery skip: extract-method
        """
        Todo 항목에 리마인더를 설정합니다.
        
        Args:
            todo_id: Todo ID
            reminder_time: 리마인더 시간
            reminder_type: 알림 유형 (notification, email, sms 등)
            reminder_message: 사용자 정의 알림 메시지
            
        Returns:
            Todo: 업데이트된 Todo
        """
        try:
            logger.debug(f"Todo {todo_id} 리마인더 설정 시작: {reminder_time}")

            todo = self.db.query(Todo).filter(Todo.id == todo_id).first()
            if not todo:
                raise ValueError(f"ID가 {todo_id}인 Todo를 찾을 수 없습니다.")

            # 메타데이터가 없으면 초기화
            if not todo.metadata:
                todo.metadata = {}

            # 리마인더 정보 없으면 초기화
            if 'reminders' not in todo.metadata:
                todo.metadata['reminders'] = []

            # 리마인더 정보 설정
            reminder_id = str(uuid.uuid4())
            reminder_info = {
                'id': reminder_id,
                'time': reminder_time.isoformat(),
                'type': reminder_type,
                'status': 'pending',
                'created_at': datetime.now(timezone.utc).isoformat()
            }

            if reminder_message:
                reminder_info['message'] = reminder_message

            todo.metadata['reminders'].append(reminder_info)
            todo.updated_at = datetime.now(timezone.utc)

            return super().update(todo)
        except Exception as e:
            self._handle_db_error('Todo 리마인더 설정 중 오류 발생: ', e)
            
    def cancel_reminder(self, todo_id: str, reminder_id: str) -> Todo:
        """
        Todo 항목의 리마인더를 취소합니다.
        
        Args:
            todo_id: Todo ID
            reminder_id: 취소할 리마인더 ID
            
        Returns:
            Todo: 업데이트된 Todo
        """
        try:
            logger.debug(f"Todo {todo_id} 리마인더 취소 시작: {reminder_id}")

            todo = self.db.query(Todo).filter(Todo.id == todo_id).first()
            if not todo:
                raise ValueError(f"ID가 {todo_id}인 Todo를 찾을 수 없습니다.")

            # 메타데이터 및 리마인더 정보가 있는 경우에만 처리
            if todo.metadata and 'reminders' in todo.metadata:
                for reminder in todo.metadata['reminders']:
                    if reminder.get('id') == reminder_id:
                        reminder['status'] = 'cancelled'
                        reminder['cancelled_at'] = datetime.now(timezone.utc).isoformat()
                        break

                todo.updated_at = datetime.now(timezone.utc)

            return super().update(todo)
        except Exception as e:
            self._handle_db_error('Todo 리마인더 취소 중 오류 발생: ', e)
            
    def get_pending_reminders(self, before_time: datetime) -> List[Dict[str, Any]]:
        """
        특정 시간 이전에 예정된 미처리 리마인더 목록을 조회합니다.
        
        Args:
            before_time: 이 시간 이전 리마인더 조회
            
        Returns:
            List[Dict[str, Any]]: 리마인더 정보 목록
        """
        try:
            logger.debug(f"미처리 리마인더 조회 시작: {before_time}")

            before_iso = before_time.isoformat()

            # 메타데이터에 리마인더 정보가 있는 Todo 조회
            todos = self.db.query(Todo).filter(
                Todo.metadata.isnot(None)
            ).all()

            # 결과 저장
            result = []

            # 필터링: 대기 중인 리마인더이고 지정 시간 이전인 것
            for todo in todos:
                if not todo.metadata or 'reminders' not in todo.metadata:
                    continue

                result.extend(
                    {
                        'todo_id': todo.id,
                        'todo_title': todo.title,
                        'reminder': reminder,
                        'user_id': todo.user_id,
                        'assignee_id': todo.assignee_id,
                    }
                    for reminder in todo.metadata['reminders']
                    if (
                        reminder.get('status') == 'pending'
                        and reminder.get('time')
                        and reminder.get('time') <= before_iso
                    )
                )
            logger.debug(f"미처리 리마인더 조회 완료: {len(result)}건")
            return result
        except Exception as e:
            logger.error(f"미처리 리마인더 조회 중 오류 발생: {str(e)}")
            raise
            
    def set_category(self, todo_id: str, category: str) -> Todo:
        """
        Todo 항목에 카테고리를 설정합니다.
        
        Args:
            todo_id: Todo ID
            category: 카테고리 이름
            
        Returns:
            Todo: 업데이트된 Todo
        """
        try:
            logger.debug(f"Todo {todo_id} 카테고리 설정 시작: {category}")
            
            todo = self.db.query(Todo).filter(Todo.id == todo_id).first()
            if not todo:
                raise ValueError(f"ID가 {todo_id}인 Todo를 찾을 수 없습니다.")
            
            # 카테고리 설정
            todo.category = category
            todo.updated_at = datetime.now(timezone.utc)
                
            return super().update(todo)
        except Exception as e:
            self._handle_db_error('Todo 카테고리 설정 중 오류 발생: ', e)

    def find_todos_by_category(self, category: str) -> List[Todo]:
        """
        특정 카테고리의 Todo 항목을 검색합니다.
        
        Args:
            category: 검색할 카테고리
            
        Returns:
            List[Todo]: 검색된 Todo 목록
        """
        try:
            logger.debug(f"카테고리로 Todo 검색 시작: {category}")
            
            todos = self.db.query(Todo).filter(Todo.category == category).all()
            
            logger.debug(f"카테고리로 Todo 검색 완료: {len(todos)}건")
            return todos
        except Exception as e:
            logger.error(f"카테고리로 Todo 검색 중 오류 발생: {str(e)}")
            raise
            
    def get_category_statistics(self) -> List[Dict[str, Any]]:
        """
        카테고리별 Todo 통계를 조회합니다.
        
        Returns:
            List[Dict[str, Any]]: 카테고리별 통계 정보
        """
        try:
            logger.debug("카테고리 통계 조회 시작")
            
            # 카테고리별 Todo 수 집계
            result = []
            categories = self.db.query(Todo.category, func.count(Todo.id)).filter(
                Todo.category.isnot(None)
            ).group_by(Todo.category).all()
            
            for category, count in categories:
                # 카테고리별 상태 분포
                status_counts = {}
                for status in TodoStatus:
                    status_count = self.db.query(func.count(Todo.id)).filter(
                        Todo.category == category,
                        Todo.status == status
                    ).scalar()
                    status_counts[status.value] = status_count
                
                # 카테고리별 완료율
                completion_rate = 0
                if count > 0:
                    completed = status_counts.get(TodoStatus.COMPLETED, 0)
                    completion_rate = round((completed / count) * 100, 2)
                
                result.append({
                    'category': category,
                    'total': count,
                    'status_distribution': status_counts,
                    'completion_rate': completion_rate
                })
            
            # 카테고리별 총 Todo 수 기준 내림차순 정렬
            result.sort(key=lambda x: x['total'], reverse=True)
            
            logger.debug(f"카테고리 통계 조회 완료: {len(result)}개 카테고리")
            return result
        except Exception as e:
            self._handle_db_error("카테고리 통계 조회 중 오류 발생: ", e)

    def _handle_db_error(self, error_message_prefix: str, e: Exception):
        """
        데이터베이스 오류 처리를 위한 헬퍼 메서드
        
        Args:
            error_message_prefix: 오류 메시지 접두사
            e: 발생한 예외 객체
        """
        self.db.rollback()
        logger.error(f"{error_message_prefix}{str(e)}")
        raise


def _apply_todo_filters(query, filters: Dict[str, Any]) -> Query:
    """할 일 쿼리에 필터를 적용합니다."""
    # 상태 필터
    if status := filters.get('status'):
        query = query.filter(Todo.status == status)
    
    # 우선순위 필터
    if priority := filters.get('priority'):
        query = query.filter(Todo.priority == priority)
    
    # 담당자 및 관련 ID 필터
    query = _apply_entity_id_filters(query, filters)
    
    return query

def _apply_entity_id_filters(query, filters: Dict[str, Any]) -> Query:
    """ID 관련 필터를 적용합니다."""
    # 담당자 필터
    if assignee_id := filters.get('assignee_id'):
        query = query.filter(Todo.assignee_id == assignee_id)
    
    # 차량 필터
    if vehicle_id := filters.get('vehicle_id'):
        query = query.filter(Todo.vehicle_id == vehicle_id)
    
    # 사용자 필터
    if user_id := filters.get('user_id'):
        query = query.filter(Todo.user_id == user_id)
    
    return query

def _apply_todo_sorting(query, sort_by: str, sort_order: str) -> Query:
    """할 일 쿼리에 정렬을 적용합니다."""
    # 기본 정렬 필드는 생성일
    default_sort = Todo.created_at.desc()
    
    # 정렬 필드가 없으면 기본값 사용
    if not sort_by:
        return query.order_by(default_sort)
    
    # 정렬 필드 유효성 검사 및 적용
    if sort_field := getattr(Todo, sort_by, None):
        sort_method = sort_field.desc() if sort_order == 'desc' else sort_field.asc()
        return query.order_by(sort_method)
    
    # 유효하지 않은 필드면 기본값 사용
    return query.order_by(default_sort)

def find_todos(
    db: Session,
    filters: Dict[str, Any],
    skip: int = 0,
    limit: int = 100,
    sort_by: str = None,
    sort_order: str = 'desc'
) -> Tuple[List[Todo], int]:
    """할 일 목록을 검색합니다."""
    query = db.query(Todo)
    
    # 필터 적용
    query = _apply_todo_filters(query, filters)
    
    # 전체 개수 계산
    total = query.count()
    
    # 정렬 적용
    query = _apply_todo_sorting(query, sort_by, sort_order)
    
    # 페이지네이션 적용
    todos = query.offset(skip).limit(limit).all()
    
    return todos, total 