"""
Todo 서비스 모듈.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any, Union, TypeVar
import uuid
import logging
import time

from sqlalchemy import and_, or_

from ...core.dependencies import get_db
from ...core.logging import get_logger
from ...database.models import Todo
from ...models.schemas import TodoCreate, TodoUpdate, TodoPriority, TodoStatus, TodoResponse, TodoListResponse, TodoDetailResponse, ApiResponse
from ...repositories.todo_repository import TodoRepository
from ...core.decorators import cache_response

# offline_manager 임포트 오류 방지
try:
    from ...core.offline_manager import offline_manager, PendingOperationType
    has_offline_manager = True
    logging.info("오프라인 매니저가 성공적으로 로드되었습니다.")
except ImportError as e:
    # 오프라인 매니저가 없는 경우 대체 구현
    has_offline_manager = False
    
    class DummyOfflineManager:
        """오프라인 매니저 없을 때 대체용 더미 클래스"""
        is_offline = False
        
        def set_offline_mode(self, mode: bool):
            self.is_offline = mode
            logging.info(f"더미 오프라인 모드 설정: {mode}")
            
        def get_offline_data(self, key: str) -> List[Dict]:
            logging.info(f"더미 오프라인 데이터 조회: {key}")
            return []
            
        def sync_to_offline(self, key: str, data: List[Dict]):
            logging.debug(f"더미 오프라인 데이터 동기화: {key}, {len(data)}개 항목")
            pass
    
    # 더미 인스턴스 생성
    offline_manager = DummyOfflineManager()
    
    class PendingOperationType:
        """오프라인 작업 유형 더미 구현"""
        CREATE = "create"
        UPDATE = "update"
        DELETE = "delete"
    
    logging.warning(f"오프라인 매니저를 임포트할 수 없습니다. 더미 구현을 사용합니다. 오류: {str(e)}")


logger = get_logger("todo.service")

T = TypeVar('T')  # 제네릭 타입 정의


class TodoService:
    """Todo 서비스 클래스."""

    @cache_response(
        expire=300,  # 5분 캐싱
        user_specific=True,
        exclude_query_params=["page", "per_page"],
        compress=True,
    )
    def get_todos(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Dict = None,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
        include_related: bool = False,  # 관련 데이터 포함 여부
        fields: Optional[List[str]] = None,  # 필요한 필드만 선택 (필드 필터링)
    ) -> ApiResponse[List[TodoResponse]]:
        """
        Todo 목록을 조회합니다.
        
        Args:
            skip: 건너뛸 레코드 수
            limit: 최대 반환 레코드 수
            filters: 필터 조건
            sort_by: 정렬 기준 필드
            sort_order: 정렬 순서 (asc 또는 desc)
            include_related: 관련 데이터 포함 여부 (True인 경우 JOIN 쿼리 실행)
            fields: 응답에 포함할 필드 목록 (None인 경우 모든 필드 포함)
        
        Returns:
            ApiResponse[List[TodoResponse]]: Todo 목록 및 메타데이터
        """
        # 메트릭 타이머 시작
        start_time = time.time()
        
        # 오프라인 모드 확인
        if offline_manager.is_offline:
            logger.info("오프라인 모드에서 Todo 목록 조회")
            return self._get_todos_offline(skip, limit, filters, sort_by, sort_order)
        
        try:
            db = next(get_db())
            repo = TodoRepository(db)
            
            # 리포지토리에서 데이터 조회 (정렬 기능 추가)
            todos, total = repo.get_todo_list(
                skip=skip, 
                limit=limit, 
                filters=filters, 
                sort_by=sort_by, 
                sort_order=sort_order,
                include_related=include_related,
                fields=fields
            )
            
            # 데이터 캐싱 (오프라인 모드를 위해)
            # 필요한 경우만 오프라인 동기화 (데이터가 일정 수준 이상 변경된 경우)
            if self._should_sync_to_offline(todos):
                self._sync_todos_to_offline(todos)
            
            # 응답 모델로 변환 (필드 필터링 지원)
            if fields:
                # 필요한 필드만 선택적으로 변환
                todo_responses = [self._filter_fields(TodoResponse.model_validate(todo), fields) for todo in todos]
            else:
                # 전체 필드 변환
                todo_responses = [TodoResponse.model_validate(todo) for todo in todos]
            
            # 메타데이터 구성
            metadata = {
                "total": total,
                "skip": skip,
                "limit": limit,
                "page": skip // limit + 1 if limit > 0 else 1,
                "pages": (total + limit - 1) // limit if limit > 0 else 1,
                "execution_time_ms": round((time.time() - start_time) * 1000, 2)
            }
            
            # 실행 시간 메트릭 기록
            metrics_collector.track_db_query(time.time() - start_time)
            
            # 표준 응답 반환
            return ApiResponse.success_response(
                data=todo_responses,
                metadata=metadata
            )
        except Exception as e:
            logger.error(f"Todo 목록 조회 중 오류 발생: {str(e)}")
            # 오류 발생 시 오프라인 데이터로 대체
            logger.info("오프라인 데이터로 대체")
            offline_manager.set_offline_mode(True)
            return self._get_todos_offline(skip, limit, filters, sort_by, sort_order)
            
    def _should_sync_to_offline(self, todos: List[Todo]) -> bool:
        """
        오프라인 데이터 동기화 필요 여부 확인
        
        최적화: 매번 전체 데이터를 동기화하지 않고 필요한 경우만 동기화
        
        Args:
            todos: 동기화할 Todo 목록
            
        Returns:
            bool: 동기화 필요 여부
        """
        # 1. 오프라인 데이터가 없는 경우
        offline_todos = offline_manager.get_offline_data("todos")
        if not offline_todos:
            return True
            
        # 2. 오프라인 데이터와 현재 데이터의 개수가 다른 경우
        if len(offline_todos) != len(todos):
            return True
            
        # 3. 마지막 동기화 시간이 너무 오래된 경우 (1시간 이상)
        last_sync_time = offline_manager.get_last_sync_time("todos")
        if not last_sync_time or (time.time() - last_sync_time) > 3600:
            return True
            
        # 4. 변경된 항목이 일정 비율 이상인 경우 (10% 이상)
        # (실제 구현은 변경 감지 로직에 따라 달라질 수 있음)
        changed_count = 0
        for i, todo in enumerate(todos):
            if i >= len(offline_todos):
                break
                
            offline_todo = offline_todos[i]
            # ID와 업데이트 시간 비교
            if str(todo.id) == str(offline_todo.get('id')) and \
               todo.updated_at and offline_todo.get('updated_at') and \
               todo.updated_at.isoformat() != offline_todo.get('updated_at'):
                changed_count += 1
                
        # 변경 비율 계산
        change_ratio = changed_count / len(todos) if todos else 0
        return change_ratio >= 0.1  # 10% 이상 변경된 경우
            
    def _filter_fields(self, response_model: TodoResponse, fields: List[str]) -> Dict:
        """
        응답 모델에서 필요한 필드만 추출
        
        Args:
            response_model: 전체 응답 모델
            fields: 추출할 필드 목록
            
        Returns:
            Dict: 필요한 필드만 포함된 사전
        """
        response_dict = response_model.model_dump()
        filtered_dict = {}
        
        for field in fields:
            if field in response_dict:
                filtered_dict[field] = response_dict[field]
                
        return filtered_dict

    def _get_todos_offline(self, skip: int = 0, limit: int = 100, filters: Dict = None, 
                           sort_by: Optional[str] = None, sort_order: str = "desc") -> ApiResponse[List[TodoResponse]]:
        """오프라인 모드에서 Todo 목록 조회"""
        todos = offline_manager.get_offline_data("todos")
        
        # 필터링 적용
        if filters:
            todos = self._filter_todos_offline(todos, filters)
            
        # 정렬 적용
        if sort_by:
            reverse = sort_order.lower() == "desc"
            todos = sorted(todos, key=lambda x: x.get(sort_by, ""), reverse=reverse)
        
        # 페이지네이션 적용
        total = len(todos)
        if skip < len(todos):
            end_idx = min(skip + limit, len(todos))
            todos = todos[skip:end_idx]
        else:
            todos = []
        
        # 메타데이터 구성
        metadata = {
            "total": total,
            "skip": skip,
            "limit": limit,
            "page": skip // limit + 1 if limit > 0 else 1,
            "pages": (total + limit - 1) // limit if limit > 0 else 1,
            "offline": True
        }
        
        # 표준 응답 반환
        return ApiResponse.success_response(
            data=todos,
            metadata=metadata
        )
        
    def _filter_todos_offline(self, todos: List[Dict], filters: Dict) -> List[Dict]:
        """오프라인 데이터 필터링"""
        result = todos
        
        # 상태 필터
        if 'status' in filters and filters['status']:
            status = filters['status']
            if isinstance(status, list):
                result = [todo for todo in result if todo.get('status') in status]
            else:
                result = [todo for todo in result if todo.get('status') == status]
        
        # 우선순위 필터
        if 'priority' in filters and filters['priority']:
            priority = filters['priority']
            if isinstance(priority, list):
                result = [todo for todo in result if todo.get('priority') in priority]
            else:
                result = [todo for todo in result if todo.get('priority') == priority]
        
        # 날짜 필터
        if 'due_date_from' in filters and filters['due_date_from']:
            due_date_from = filters['due_date_from']
            result = [todo for todo in result if todo.get('due_date') and todo.get('due_date') >= due_date_from]
        
        if 'due_date_to' in filters and filters['due_date_to']:
            due_date_to = filters['due_date_to']
            result = [todo for todo in result if todo.get('due_date') and todo.get('due_date') <= due_date_to]
        
        # 관련 엔티티 필터
        entity_fields = ['user_id', 'assignee_id', 'vehicle_id', 'related_entity_type', 'related_entity_id']
        for field in entity_fields:
            if field in filters and filters[field]:
                result = [todo for todo in result if todo.get(field) == filters[field]]
        
        return result
        
    def _sync_todos_to_offline(self, todos: List[Todo]):
        """Todo 데이터를 오프라인 저장소에 동기화"""
        try:
            # 모델을 딕셔너리로 변환
            todo_dicts = []
            for todo in todos:
                todo_dict = {
                    'id': todo.id,
                    'title': todo.title,
                    'description': todo.description,
                    'due_date': todo.due_date.isoformat() if todo.due_date else None,
                    'status': todo.status,
                    'priority': todo.priority,
                    'vehicle_id': todo.vehicle_id,
                    'user_id': todo.user_id,
                    'assignee_id': todo.assignee_id,
                    'related_entity_type': todo.related_entity_type,
                    'related_entity_id': todo.related_entity_id,
                    'created_at': todo.created_at.isoformat() if todo.created_at else None,
                    'updated_at': todo.updated_at.isoformat() if todo.updated_at else None,
                    'completed_at': todo.completed_at.isoformat() if todo.completed_at else None,
                    'tags': todo.tags,
                    'metadata': todo.metadata,
                    'category': todo.category
                }
                todo_dicts.append(todo_dict)
            
            # 오프라인 저장소에 저장
            offline_manager.sync_to_offline("todos", todo_dicts)
        except Exception as e:
            logger.error(f"Todo 오프라인 동기화 중 오류 발생: {str(e)}")

    def get_todo_by_id(self, todo_id: str) -> ApiResponse[TodoResponse]:
        """
        Todo 상세 정보를 조회합니다.
        
        Args:
            todo_id: 조회할 Todo ID
        
        Returns:
            ApiResponse[TodoResponse]: Todo 상세 정보
        """
        # 오프라인 모드 확인
        if offline_manager.is_offline:
            logger.info(f"오프라인 모드에서 Todo 조회: ID={todo_id}")
            return self._get_todo_by_id_offline(todo_id)
            
        try:
            db = next(get_db())
            repo = TodoRepository(db)
            
            # 리포지토리에서 데이터 조회
            todo = repo.find_by_id(todo_id)
            
            if not todo:
                logger.warning(f"Todo를 찾을 수 없음: ID={todo_id}")
                return ApiResponse.error_response(f"ID가 {todo_id}인 Todo를 찾을 수 없습니다.")
            
            # 응답 모델로 변환
            todo_response = TodoResponse.model_validate(todo)
            
            # 표준 응답 반환
            return ApiResponse.success_response(data=todo_response)
        except Exception as e:
            logger.error(f"Todo 조회 중 오류 발생: {str(e)}")
            # 오류 발생 시 오프라인 데이터로 대체
            logger.info("오프라인 데이터로 대체")
            offline_manager.set_offline_mode(True)
            return self._get_todo_by_id_offline(todo_id)
            
    def _get_todo_by_id_offline(self, todo_id: str) -> ApiResponse[TodoResponse]:
        """오프라인 모드에서 Todo 상세 정보 조회"""
        todos = offline_manager.get_offline_data("todos")
        
        # ID로 Todo 찾기
        todo = next((todo for todo in todos if todo.get('id') == todo_id), None)
        
        if not todo:
            logger.warning(f"오프라인 데이터에서 Todo를 찾을 수 없음: ID={todo_id}")
            return ApiResponse.error_response(f"ID가 {todo_id}인 Todo를 찾을 수 없습니다.")
        
        # 메타데이터 구성
        metadata = {
            "offline": True
        }
        
        # 표준 응답 반환
        return ApiResponse.success_response(
            data=todo,
            metadata=metadata
        )

    def create_todo(self, data: TodoCreate) -> ApiResponse[TodoResponse]:
        """
        새 Todo를 생성합니다.
        
        Args:
            data: Todo 생성 데이터
            
        Returns:
            ApiResponse[TodoResponse]: 생성된 Todo 정보
        """
        # 오프라인 모드 확인
        if offline_manager.is_offline:
            logger.info("오프라인 모드에서 Todo 생성")
            return self._create_todo_offline(data)
            
        try:
            db = next(get_db())
            repo = TodoRepository(db)
            
            logger.info(f"Todo 생성 시작: {data.title}")
            
            # 연관 데이터 유효성 검증 (선택적으로 사용할 수 있음)
            self._validate_related_entities(db, data)
            
            # 특별한 제약 조건 검증 (선택적으로 사용할 수 있음)
            self._validate_due_date(data.due_date)
            
            # 리포지토리를 통해 데이터 생성
            todo = repo.create(data)
            
            # 응답 처리
            return self._create_todo_response(todo, f"Todo 생성 완료: ID={todo.id}")
        except Exception as e:
            logger.error(f"Todo 생성 중 오류 발생: {str(e)}", exc_info=True)
            
            # 오류 발생 시 오프라인 모드로 전환하여 처리
            logger.info("오프라인 모드로 전환하여 처리")
            offline_manager.set_offline_mode(True)
            return self._create_todo_offline(data)
            
    def _create_todo_offline(self, data: TodoCreate) -> ApiResponse[TodoResponse]:
        """오프라인 모드에서 Todo 생성"""
        # 새 Todo 데이터 생성
        todo_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        todo_data = {
            'id': todo_id,
            'title': data.title,
            'description': data.description,
            'due_date': data.due_date.isoformat() if data.due_date else None,
            'status': data.status or TodoStatus.PENDING,
            'priority': data.priority or TodoPriority.MEDIUM,
            'vehicle_id': data.vehicle_id,
            'user_id': data.user_id,
            'assignee_id': data.assignee_id,
            'related_entity_type': data.related_entity_type,
            'related_entity_id': data.related_entity_id,
            'created_at': now,
            'updated_at': now,
            'completed_at': None,
            'tags': None,
            'metadata': None,
            'category': None
        }
        
        # 대기 중인 작업 큐에 추가
        operation_id = offline_manager.queue_operation(
            entity_type="todos",
            operation_type=PendingOperationType.CREATE,
            entity_id=todo_id,
            data=todo_data
        )
        
        # 오프라인 데이터 로드
        todos = offline_manager.get_offline_data("todos")
        
        # 새 Todo 추가
        todos.append(todo_data)
        
        # 오프라인 데이터 저장
        offline_manager.sync_to_offline("todos", todos)
        
        # 메타데이터 구성
        metadata = {
            "offline": True,
            "operation_id": operation_id,
            "pending_sync": True
        }
        
        # 표준 응답 반환
        return ApiResponse.success_response(
            data=todo_data,
            metadata=metadata
        )

    def update_todo(self, todo_id: str, data: TodoUpdate) -> ApiResponse[TodoResponse]:
        """
        Todo를 업데이트합니다.
        
        Args:
            todo_id: 업데이트할 Todo ID
            data: Todo 업데이트 데이터
            
        Returns:
            ApiResponse[TodoResponse]: 업데이트된 Todo 정보
        """
        db = next(get_db())
        repo = TodoRepository(db)
        
        logger.info(f"Todo 업데이트 시작: ID={todo_id}")
        
        # 기존 Todo 조회
        todo = self._find_todo_by_id_or_none(repo, todo_id)
        if not todo:
            return ApiResponse.error_response(f"ID가 {todo_id}인 Todo를 찾을 수 없습니다.")
        
        try:
            # due_date가 제공되면 유효성 검사
            self._validate_todo_update_data(data)
            
            # 리포지토리를 통해 데이터 업데이트
            updated_todo = repo.update(todo, data)
            
            # 응답 처리
            return self._create_todo_response(updated_todo, f"Todo 업데이트 완료: ID={todo_id}")
        except Exception as e:
            logger.error(f"Todo 업데이트 중 오류 발생: {str(e)}", exc_info=True)
            return ApiResponse.error_response(f"Todo 업데이트 중 오류 발생: {str(e)}")
    
    def _validate_todo_update_data(self, data: TodoUpdate) -> None:
        """Todo 업데이트 데이터의 유효성을 검사합니다."""
        update_data = data.model_dump(exclude_unset=True)
        if "due_date" in update_data:
            self._validate_due_date(update_data["due_date"])

    def delete_todo(self, todo_id: str) -> ApiResponse[bool]:
        """
        Todo를 삭제합니다.
        
        Args:
            todo_id: 삭제할 Todo ID
            
        Returns:
            ApiResponse[bool]: 삭제 성공 여부
        """
        db = next(get_db())
        repo = TodoRepository(db)
        
        logger.info(f"Todo 삭제 시작: ID={todo_id}")
        
        # 기존 Todo 조회
        todo = self._find_todo_by_id_or_none(repo, todo_id)
        if not todo:
            return ApiResponse.error_response(f"ID가 {todo_id}인 Todo를 찾을 수 없습니다.")
        
        try:
            # 리포지토리를 통해 데이터 삭제
            result = repo.delete(todo)
            
            logger.info(f"Todo 삭제 완료: ID={todo_id}")
            
            # 표준 응답 반환
            return ApiResponse.success_response(data=result)
        except Exception as e:
            logger.error(f"Todo 삭제 중 오류 발생: {str(e)}", exc_info=True)
            return ApiResponse.error_response(f"Todo 삭제 중 오류 발생: {str(e)}")

    def update_todo_status(self, todo_id: str, status: str) -> ApiResponse[TodoResponse]:
        """
        Todo 상태를 업데이트합니다.
        
        Args:
            todo_id: 업데이트할 Todo ID
            status: 변경할 상태
            
        Returns:
            ApiResponse[TodoResponse]: 업데이트된 Todo 정보
        """
        db = next(get_db())
        repo = TodoRepository(db)
        
        logger.info(f"Todo 상태 업데이트 시작: ID={todo_id}, 상태={status}")
        
        # 기존 Todo 조회
        todo = self._find_todo_by_id_or_none(repo, todo_id)
        if not todo:
            return ApiResponse.error_response(f"ID가 {todo_id}인 Todo를 찾을 수 없습니다.")
        
        try:
            # 리포지토리를 통해 상태 업데이트
            updated_todo = repo.update_status(todo, status)
            
            # 응답 처리
            return self._create_todo_response(updated_todo, f"Todo 상태 업데이트 완료: ID={todo_id}")
        except Exception as e:
            logger.error(f"Todo 상태 업데이트 중 오류 발생: {str(e)}", exc_info=True)
            return ApiResponse.error_response(f"Todo 상태 업데이트 중 오류 발생: {str(e)}")

    def complete_todo(self, todo_id: str) -> ApiResponse[TodoResponse]:
        """
        Todo를 완료 상태로 변경합니다.
        
        Args:
            todo_id: 완료 처리할 Todo ID
            
        Returns:
            ApiResponse[TodoResponse]: 업데이트된 Todo 정보
        """
        db = next(get_db())
        repo = TodoRepository(db)
        
        logger.info(f"Todo 완료 처리 시작: ID={todo_id}")
        
        # 기존 Todo 조회
        todo = self._find_todo_by_id_or_none(repo, todo_id)
        if not todo:
            return ApiResponse.error_response(f"ID가 {todo_id}인 Todo를 찾을 수 없습니다.")
        
        try:
            # 리포지토리를 통해 완료 처리
            completed_todo = repo.complete(todo)
            
            # 응답 처리
            return self._create_todo_response(completed_todo, f"Todo 완료 처리 완료: ID={todo_id}")
        except Exception as e:
            logger.error(f"Todo 완료 처리 중 오류 발생: {str(e)}", exc_info=True)
            return ApiResponse.error_response(f"Todo 완료 처리 중 오류 발생: {str(e)}")
            
    def _find_todo_by_id_or_none(self, repo: TodoRepository, todo_id: str) -> Optional[Todo]:
        """ID로 Todo를 찾고 없으면 None 반환"""
        todo = repo.find_by_id(todo_id)
        if not todo:
            logger.warning(f"Todo를 찾을 수 없음: ID={todo_id}")
        return todo
        
    def _create_todo_response(self, todo: Todo, log_message: str) -> ApiResponse[TodoResponse]:
        """Todo 응답 객체 생성"""
        # 응답 모델로 변환
        todo_response = TodoResponse.model_validate(todo)
        
        # 로그 기록
        logger.info(log_message)
        
        # 표준 응답 반환
        return ApiResponse.success_response(data=todo_response)

    def get_overdue_todos(self, user_id: Optional[str] = None) -> ApiResponse[List[TodoResponse]]:
        """
        기한이 지난 Todo 목록을 조회합니다.
        
        Args:
            user_id: 특정 사용자의 Todo만 조회할 경우 사용자 ID
            
        Returns:
            ApiResponse[List[TodoResponse]]: 기한이 지난 Todo 목록
        """
        db = next(get_db())
        repo = TodoRepository(db)
        
        logger.info(f"기한 지난 Todo 목록 조회 시작: user_id={user_id or '모든 사용자'}")
        
        # 리포지토리를 통해 기한이 지난 Todo 조회
        todos = repo.get_overdue_todos(user_id=user_id)
        
        # 응답 모델로 변환
        todo_responses = [TodoResponse.model_validate(todo) for todo in todos]
        
        # 메타데이터 구성
        metadata = {
            "total": len(todos),
            "overdue": True
        }
        
        logger.info(f"기한 지난 Todo 목록 조회 완료: {len(todos)}건")
        
        # 표준 응답 반환
        return ApiResponse.success_response(
            data=todo_responses,
            metadata=metadata
        )

    def get_upcoming_todos(
        self, 
        days: int = 7, 
        user_id: Optional[str] = None
    ) -> ApiResponse[List[TodoResponse]]:
        """
        다가오는 Todo 목록을 조회합니다.
        
        Args:
            days: 며칠 이내의 Todo를 조회할지 (기본 7일)
            user_id: 특정 사용자의 Todo만 조회할 경우 사용자 ID
            
        Returns:
            ApiResponse[List[TodoResponse]]: 다가오는 Todo 목록
        """
        db = next(get_db())
        repo = TodoRepository(db)
        
        logger.info(f"다가오는 Todo 목록 조회 시작: days={days}, user_id={user_id or '모든 사용자'}")
        
        # 리포지토리를 통해 다가오는 Todo 조회
        todos = repo.get_upcoming_todos(days=days, user_id=user_id)
        
        # 응답 모델로 변환
        todo_responses = [TodoResponse.model_validate(todo) for todo in todos]
        
        # 메타데이터 구성
        metadata = {
            "total": len(todos),
            "days": days,
            "upcoming": True
        }
        
        logger.info(f"다가오는 Todo 목록 조회 완료: {len(todos)}건")
        
        # 표준 응답 반환
        return ApiResponse.success_response(
            data=todo_responses,
            metadata=metadata
        )

    def _validate_due_date(self, due_date: Optional[datetime]) -> None:
        """
        마감일 유효성을 검증합니다.
        마감일이 과거인 경우 경고처리합니다.
        """
        if due_date is None:
            return
            
        # 현재 시간을 UTC로 변환
        now = datetime.now(timezone.utc)
        
        # due_date에 타임존 정보가 없는 경우 UTC로 간주
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)
            
        # 마감일이 과거인지 확인
        if due_date < now:
            logger.warning(f"마감일이 현재 시간보다 이전으로 설정되었습니다: {due_date.isoformat()}")

    def _validate_related_entities(self, db_session, data: TodoCreate):
        """관련 엔티티 존재 여부를 검증합니다."""
        # 사용자 ID 검증
        from ...database.models import User
        
        logger.debug(f"연관 엔티티 검증 시작: {data.user_id}, {data.assignee_id}, {data.vehicle_id}")
        
        if data.user_id:
            user = db_session.query(User).filter(User.id == data.user_id).first()
            if not user:
                logger.warning(f"존재하지 않는 사용자 ID: {data.user_id}")
                raise ValueError(f"ID가 {data.user_id}인 사용자를 찾을 수 없습니다.")
        
        # 할당자 ID 검증
        if data.assignee_id:
            assignee = db_session.query(User).filter(User.id == data.assignee_id).first()
            if not assignee:
                logger.warning(f"존재하지 않는 할당자 ID: {data.assignee_id}")
                raise ValueError(f"ID가 {data.assignee_id}인 할당자를 찾을 수 없습니다.")
        
        # 차량 ID 검증
        if data.vehicle_id:
            from ...database.models import Vehicle
            vehicle = db_session.query(Vehicle).filter(Vehicle.id == data.vehicle_id).first()
            if not vehicle:
                logger.warning(f"존재하지 않는 차량 ID: {data.vehicle_id}")
                raise ValueError(f"ID가 {data.vehicle_id}인 차량을 찾을 수 없습니다.")
        
        logger.debug("연관 엔티티 검증 완료")

    def bulk_update_status(self, todo_ids: List[str], status: TodoStatus) -> ApiResponse[int]:
        """
        여러 Todo의 상태를 일괄 업데이트합니다.
        
        Args:
            todo_ids: 업데이트할 Todo ID 목록
            status: 새 상태
            
        Returns:
            ApiResponse[int]: 업데이트된 항목 수
        """
        if offline_manager.is_offline:
            logger.info(f"오프라인 모드에서 Todo 일괄 상태 업데이트 불가")
            return ApiResponse.error_response("오프라인 모드에서는 일괄 업데이트를 수행할 수 없습니다")
            
        try:
            db = next(get_db())
            repo = TodoRepository(db)
            
            # 벌크 업데이트 수행
            updated_count = repo.bulk_update_status(todo_ids, status)
            
            # 메타데이터 구성
            metadata = {
                "total_ids": len(todo_ids),
                "updated_count": updated_count,
                "status": status
            }
            
            return ApiResponse.success_response(
                data=updated_count,
                metadata=metadata
            )
        except Exception as e:
            logger.error(f"Todo 일괄 상태 업데이트 중 오류 발생: {str(e)}")
            return ApiResponse.error_response(str(e))
            
    def bulk_update_priority(self, todo_ids: List[str], priority: TodoPriority) -> ApiResponse[int]:
        """
        여러 Todo의 우선순위를 일괄 업데이트합니다.
        
        Args:
            todo_ids: 업데이트할 Todo ID 목록
            priority: 새 우선순위
            
        Returns:
            ApiResponse[int]: 업데이트된 항목 수
        """
        if offline_manager.is_offline:
            logger.info(f"오프라인 모드에서 Todo 일괄 우선순위 업데이트 불가")
            return ApiResponse.error_response("오프라인 모드에서는 일괄 업데이트를 수행할 수 없습니다")
            
        try:
            db = next(get_db())
            repo = TodoRepository(db)
            
            # 벌크 업데이트 수행
            updated_count = repo.bulk_update_priority(todo_ids, priority)
            
            # 메타데이터 구성
            metadata = {
                "total_ids": len(todo_ids),
                "updated_count": updated_count,
                "priority": priority
            }
            
            return ApiResponse.success_response(
                data=updated_count,
                metadata=metadata
            )
        except Exception as e:
            logger.error(f"Todo 일괄 우선순위 업데이트 중 오류 발생: {str(e)}")
            return ApiResponse.error_response(str(e))
            
    def search_by_tags(self, tags: List[str]) -> ApiResponse[List[TodoResponse]]:
        """
        태그로 Todo 검색.
        
        Args:
            tags: 검색할 태그 목록
            
        Returns:
            ApiResponse[List[TodoResponse]]: 검색된 Todo 목록
        """
        if offline_manager.is_offline:
            logger.info(f"오프라인 모드에서 태그 검색 불가")
            return ApiResponse.error_response("오프라인 모드에서는 태그 검색을 수행할 수 없습니다")
            
        try:
            db = next(get_db())
            repo = TodoRepository(db)
            
            # 태그 검색 수행
            todos = repo.search_by_tags(tags)
            
            # 응답 모델로 변환
            todo_responses = [TodoResponse.model_validate(todo) for todo in todos]
            
            # 메타데이터 구성
            metadata = {
                "total": len(todos),
                "tags": tags
            }
            
            return ApiResponse.success_response(
                data=todo_responses,
                metadata=metadata
            )
        except Exception as e:
            logger.error(f"Todo 태그 검색 중 오류 발생: {str(e)}")
            return ApiResponse.error_response(str(e))
            
    def get_todo_stats(self, user_id: Optional[str] = None) -> ApiResponse[Dict[str, Any]]:
        """
        Todo 통계 조회.
        
        Args:
            user_id: 사용자 ID (선택적)
            
        Returns:
            ApiResponse[Dict[str, Any]]: Todo 통계 정보
        """
        if offline_manager.is_offline:
            logger.info(f"오프라인 모드에서 통계 조회 불가")
            return ApiResponse.error_response("오프라인 모드에서는 통계 조회를 수행할 수 없습니다")
            
        try:
            db = next(get_db())
            repo = TodoRepository(db)
            
            # 통계 조회 수행
            stats = repo.get_todo_stats(user_id)
            
            # 메타데이터 구성
            metadata = {
                "user_id": user_id
            }
            
            return ApiResponse.success_response(
                data=stats,
                metadata=metadata
            )
        except Exception as e:
            logger.error(f"Todo 통계 조회 중 오류 발생: {str(e)}")
            return ApiResponse.error_response(str(e)) 