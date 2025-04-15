"""
Todo repository module for database operations related to todos.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, TypeVar, Type, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func

from ...core.logging import get_logger
from ...models.schemas import TodoCreate, TodoUpdate, TodoStatus, TodoPriority
from ...database.models import Todo
from ...core.base_repository import BaseRepository

logger = get_logger("modules.todo.repository")

class TodoRepository(BaseRepository[Todo, TodoCreate]):
    """Todo 관련 데이터베이스 작업을 처리하는 리포지토리 클래스."""

    def __init__(self, db: Session):
        """
        리포지토리 초기화.

        Args:
            db: 데이터베이스 세션
        """
        super().__init__(db, Todo)

    def get_todo_list(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
        include_related: bool = False,
        fields: Optional[List[str]] = None
    ) -> Tuple[List[Todo], int]:
        """
        필터링 조건에 맞는 할 일 목록 조회.

        Args:
            skip: 건너뛸 레코드 수
            limit: 최대 반환 레코드 수
            filters: 필터링 조건
            sort_by: 정렬 기준 필드
            sort_order: 정렬 순서 (asc 또는 desc)
            include_related: 관련 데이터 포함 여부 (JOIN 사용)
            fields: 조회할 필드 목록 (None인 경우 모든 필드 조회)

        Returns:
            할 일 목록과 총 개수 튜플
        """
        # 필요한 필드만 선택적으로 쿼리 (성능 향상)
        if fields:
            # 항상 필요한 기본 필드 추가
            required_fields = ["id", "created_at", "updated_at"]
            select_fields = list(set(fields + required_fields))
            
            # 모델의 컬럼으로 변환
            columns = [getattr(self.model, field) for field in select_fields if hasattr(self.model, field)]
            query = self.db.query(*columns)
        else:
            query = self.db.query(self.model)
        
        # 관련 데이터 조인 처리
        if include_related:
            # 관련 엔티티와 조인 (필요한 경우)
            if 'vehicle_id' in dir(self.model) and 'Vehicle' in globals():
                query = query.outerjoin(Vehicle, self.model.vehicle_id == Vehicle.id)
                
            if 'user_id' in dir(self.model) and 'User' in globals():
                query = query.outerjoin(User, self.model.user_id == User.id)
                
            if 'assignee_id' in dir(self.model) and 'User' in globals():
                query = query.outerjoin(User, self.model.assignee_id == User.id, aliased=True)
        
        # 필터 적용
        if filters:
            query = self._apply_filters(query, filters)
            
        # 정렬 적용
        if sort_by and hasattr(self.model, sort_by):
            sort_column = getattr(self.model, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))
        else:
            # 기본 정렬: 업데이트 시간 기준 내림차순
            query = query.order_by(desc(self.model.updated_at))
        
        # 성능 최적화: 카운트 쿼리와 데이터 쿼리 분리
        # 카운트 쿼리는 컬럼 제한 없이 간소화하여 실행
        count_query = self.db.query(func.count(self.model.id))
        if filters:
            count_query = self._apply_filters(count_query, filters)
        
        # 총 개수 계산 (서브쿼리 최적화)
        total = count_query.scalar()
        
        # 페이지네이션 적용
        query = query.offset(skip).limit(limit)
        
        # 결과 반환
        if fields:
            # 결과를 딕셔너리로 변환 (일관된 응답 형식 유지)
            results = [self._convert_to_model(row, select_fields) for row in query.all()]
            return results, total
        else:
            return query.all(), total
            
    def _convert_to_model(self, row, fields):
        """
        튜플 결과를 모델 객체로 변환
        
        Args:
            row: 쿼리 결과 튜플
            fields: 필드 목록
            
        Returns:
            Todo: 변환된 모델 객체
        """
        if isinstance(row, self.model):
            return row
            
        # 튜플을 사전으로 변환
        result = self.model()
        for i, field in enumerate(fields):
            if hasattr(result, field):
                setattr(result, field, row[i])
                
        return result

    def _apply_filters(self, query, filters: Dict[str, Any]):
        """필터 조건을 쿼리에 적용"""
        for key, value in filters.items():
            if value is None:
                continue
                
            if key == "status" and value:
                if isinstance(value, list):
                    query = query.filter(self.model.status.in_(value))
                else:
                    query = query.filter(self.model.status == value)
            
            elif key == "priority" and value:
                if isinstance(value, list):
                    query = query.filter(self.model.priority.in_(value))
                else:
                    query = query.filter(self.model.priority == value)
            
            elif key == "due_date_from" and value:
                query = query.filter(self.model.due_date >= value)
            
            elif key == "due_date_to" and value:
                query = query.filter(self.model.due_date <= value)
            
            elif key == "search_term" and value:
                search_term = f"%{value}%"
                query = query.filter(
                    or_(
                        self.model.title.ilike(search_term),
                        self.model.description.ilike(search_term)
                    )
                )
            
            elif key == "tags" and value:
                # JSON 필드에서 태그 검색
                if isinstance(value, list):
                    for tag in value:
                        query = query.filter(self.model.tags.contains([tag]))
                else:
                    query = query.filter(self.model.tags.contains([value]))
            
            elif key == "category" and value:
                query = query.filter(self.model.category == value)
            
            elif hasattr(self.model, key):
                query = query.filter(getattr(self.model, key) == value)
                
        return query

    def get_todo_by_id(self, todo_id: str) -> Optional[Todo]:
        """
        ID로 할 일 조회.

        Args:
            todo_id: 할 일 ID

        Returns:
            할 일 객체 또는 None
        """
        return self.find_by_id(todo_id)

    def create_todo(self, todo_create: TodoCreate) -> Todo:
        """
        새로운 할 일 생성.

        Args:
            todo_create: 생성할 할 일 데이터

        Returns:
            생성된 할 일
        """
        import uuid
        
        # Todo 객체 생성
        todo = Todo(
            id=str(uuid.uuid4()),
            title=todo_create.title,
            description=todo_create.description,
            due_date=todo_create.due_date,
            status=todo_create.status or TodoStatus.PENDING,
            priority=todo_create.priority,
            vehicle_id=todo_create.vehicle_id,
            user_id=todo_create.user_id,
            assignee_id=todo_create.assignee_id,
            related_entity_type=todo_create.related_entity_type,
            related_entity_id=todo_create.related_entity_id,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            tags=getattr(todo_create, 'tags', None),
            metadata=getattr(todo_create, 'metadata', None),
            category=getattr(todo_create, 'category', None)
        )
        
        # Todo 저장
        return self.create(todo)

    def update_todo(self, todo_id: str, todo_update: TodoUpdate) -> Optional[Todo]:
        """
        할 일 업데이트.

        Args:
            todo_id: 업데이트할 할 일 ID
            todo_update: 업데이트할 데이터

        Returns:
            업데이트된 할 일 또는 None
        """
        # 기존 Todo 조회
        todo = self.find_by_id(todo_id)
        if not todo:
            logger.warning(f"업데이트할 Todo를 찾을 수 없음: {todo_id}")
            return None
            
        # 데이터 업데이트
        update_data = todo_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(todo, key, value)

        # 업데이트 시간 설정
        todo.updated_at = datetime.now()
        
        # Todo 업데이트
        return self.update(todo)

    def delete_todo(self, todo_id: str) -> bool:
        """
        할 일 삭제.

        Args:
            todo_id: 삭제할 할 일 ID

        Returns:
            삭제 성공 여부
        """
        # 기존 Todo 조회
        todo = self.find_by_id(todo_id)
        if not todo:
            logger.warning(f"삭제할 Todo를 찾을 수 없음: {todo_id}")
            return False
            
        # Todo 삭제
        return self.delete(todo)
        
    def update_todo_status(self, todo_id: str, status: TodoStatus) -> Optional[Todo]:
        """
        할 일 상태 업데이트.

        Args:
            todo_id: 업데이트할 할 일 ID
            status: 새 상태

        Returns:
            업데이트된 할 일 또는 None
        """
        # 기존 Todo 조회
        todo = self.find_by_id(todo_id)
        if not todo:
            logger.warning(f"상태를 업데이트할 Todo를 찾을 수 없음: {todo_id}")
            return None
            
        # 상태 업데이트
        todo.status = status
        todo.updated_at = datetime.now()
        
        # 완료 상태인 경우 완료 시간 설정
        if status == TodoStatus.COMPLETED:
            todo.completed_at = datetime.now()
            
        # Todo 업데이트
        return self.update(todo)
        
    def bulk_update_status(self, todo_ids: List[str], status: TodoStatus) -> int:
        """
        여러 할 일의 상태를 일괄 업데이트.

        Args:
            todo_ids: 업데이트할 할 일 ID 목록
            status: 새 상태

        Returns:
            업데이트된 항목 수
        """
        now = datetime.now()
        update_values = {
            "status": status,
            "updated_at": now
        }
        
        # 완료 상태인 경우 완료 시간 설정
        if status == TodoStatus.COMPLETED:
            update_values["completed_at"] = now
            
        # 벌크 업데이트 수행
        result = self.db.query(self.model).filter(
            self.model.id.in_(todo_ids)
        ).update(
            update_values, 
            synchronize_session=False
        )
        
        self.db.commit()
        return result
        
    def bulk_update_priority(self, todo_ids: List[str], priority: TodoPriority) -> int:
        """
        여러 할 일의 우선순위를 일괄 업데이트.

        Args:
            todo_ids: 업데이트할 할 일 ID 목록
            priority: 새 우선순위 (TodoPriority)

        Returns:
            업데이트된 항목 수
        """
        # 벌크 업데이트 수행
        result = self.db.query(self.model).filter(
            self.model.id.in_(todo_ids)
        ).update(
            {
                "priority": priority,
                "updated_at": datetime.now()
            }, 
            synchronize_session=False
        )
        
        self.db.commit()
        return result
        
    def get_overdue_todos(self, user_id: Optional[str] = None) -> List[Todo]:
        """
        기한이 지난 할 일 목록 조회.

        Args:
            user_id: 사용자 ID (선택적)

        Returns:
            기한이 지난 할 일 목록
        """
        query = self.db.query(self.model).filter(
            and_(
                self.model.due_date < datetime.now(),
                self.model.status != TodoStatus.COMPLETED,
                self.model.status != TodoStatus.CANCELLED
            )
        )
        
        if user_id:
            query = query.filter(
                or_(
                    self.model.user_id == user_id,
                    self.model.assignee_id == user_id
                )
            )
            
        return query.all()
        
    def get_upcoming_todos(self, days: int = 7, user_id: Optional[str] = None) -> List[Todo]:
        """
        다가오는 할 일 목록 조회.

        Args:
            days: 향후 일수
            user_id: 사용자 ID (선택적)

        Returns:
            다가오는 할 일 목록
        """
        now = datetime.now()
        future = now + datetime.timedelta(days=days)
        
        query = self.db.query(self.model).filter(
            and_(
                self.model.due_date >= now,
                self.model.due_date <= future,
                self.model.status != TodoStatus.COMPLETED,
                self.model.status != TodoStatus.CANCELLED
            )
        )
        
        if user_id:
            query = query.filter(
                or_(
                    self.model.user_id == user_id,
                    self.model.assignee_id == user_id
                )
            )
            
        return query.all()
        
    def search_by_tags(self, tags: List[str]) -> List[Todo]:
        """
        태그로 할 일 검색.

        Args:
            tags: 검색할 태그 목록

        Returns:
            태그가 포함된 할 일 목록
        """
        query = self.db.query(self.model)
        
        for tag in tags:
            query = query.filter(self.model.tags.contains([tag]))
            
        return query.all()
        
    def get_todo_stats(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        할 일 통계 조회.

        Args:
            user_id: 사용자 ID (선택적)

        Returns:
            할 일 통계 정보
        """
        query = self.db.query(self.model)
        
        if user_id:
            query = query.filter(
                or_(
                    self.model.user_id == user_id,
                    self.model.assignee_id == user_id
                )
            )
            
        # 전체 개수
        total = query.count()
        
        # 상태별 개수
        pending = query.filter(self.model.status == TodoStatus.PENDING).count()
        in_progress = query.filter(self.model.status == TodoStatus.IN_PROGRESS).count()
        completed = query.filter(self.model.status == TodoStatus.COMPLETED).count()
        cancelled = query.filter(self.model.status == TodoStatus.CANCELLED).count()
        
        # 기한 초과 개수
        overdue = query.filter(
            and_(
                self.model.due_date < datetime.now(),
                self.model.status != TodoStatus.COMPLETED,
                self.model.status != TodoStatus.CANCELLED
            )
        ).count()
        
        # 다가오는 할 일 개수
        now = datetime.now()
        upcoming = query.filter(
            and_(
                self.model.due_date >= now,
                self.model.due_date <= now + datetime.timedelta(days=7),
                self.model.status != TodoStatus.COMPLETED,
                self.model.status != TodoStatus.CANCELLED
            )
        ).count()
        
        # 우선순위별 개수
        priority_stats = {}
        for priority in ["low", "medium", "high", "urgent"]:
            priority_stats[priority] = query.filter(self.model.priority == priority).count()
            
        return {
            "total": total,
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed,
            "cancelled": cancelled,
            "overdue": overdue,
            "upcoming": upcoming,
            "by_priority": priority_stats
        } 