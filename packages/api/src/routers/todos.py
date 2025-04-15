"""
Todo API 라우터.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
import logging  # 로깅 임포트를 try-except 밖으로 이동

from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body
from fastapi.responses import JSONResponse

from ..models.schemas import Todo, TodoCreate, TodoUpdate, TodoStatus, TodoPriority, ApiResponse
from ..core.logging import get_logger
from ..core.cache_decorators import cache_response

logger = get_logger("todos")

# 문자열 상수 정의
SKIP_DESC = "건너뛸 레코드 수"
LIMIT_DESC = "최대 반환 레코드 수"
STATUS_DESC = "상태로 필터링"
PRIORITY_DESC = "우선순위로 필터링"
DUE_DATE_FROM_DESC = "시작 기한"
DUE_DATE_TO_DESC = "종료 기한"
USER_ID_DESC = "사용자 ID"

# 서비스 객체 임포트 시 오류 방지
try:
    from ..modules.todo import TodoService
    todo_service = TodoService()
    logger.info("TodoService가 성공적으로 로드되었습니다.")
except ImportError as e:
    from datetime import timezone
    
    logger.error(f"TodoService 임포트 오류: {str(e)}")
    logger.warning("TodoService를 임포트할 수 없습니다. 더미 서비스를 생성합니다.")
    
    # 더미 TodoService 클래스 생성
    class DummyTodoService:
        def __init__(self):
            self.todos = []
            logger.warning("더미 TodoService가 초기화되었습니다. 실제 데이터베이스 연동이 필요합니다.")
        
        def get_todos(self, skip=0, limit=100, filters=None):
            logger.warning(f"더미 get_todos 호출됨: skip={skip}, limit={limit}, filters={filters}")
            return ApiResponse.success_response(
                data={"items": self.todos, "total": len(self.todos)},
                message="더미 Todo 목록 조회 (실제 DB 연동 필요)"
            )
            
        def get_todo_by_id(self, todo_id):
            logger.warning(f"더미 get_todo_by_id 호출됨: todo_id={todo_id}")
            todo = next((t for t in self.todos if t.get("id") == todo_id), None)
            if not todo:
                return ApiResponse.error_response(f"Todo ID {todo_id}를 찾을 수 없습니다.")
            return ApiResponse.success_response(data=todo, message="더미 Todo 조회 (실제 DB 연동 필요)")
            
        def create_todo(self, todo_data):
            logger.warning(f"더미 create_todo 호출됨: {todo_data}")
            todo_id = f"dummy-{len(self.todos) + 1}"
            now = datetime.now(timezone.utc).isoformat()
            
            todo = {
                "id": todo_id,
                "title": todo_data.title,
                "description": todo_data.description,
                "status": todo_data.status or TodoStatus.PENDING.value,
                "priority": todo_data.priority or TodoPriority.MEDIUM.value,
                "due_date": todo_data.due_date,
                "created_at": now,
                "updated_at": now
            }
            
            self.todos.append(todo)
            return ApiResponse.success_response(data=todo, message="더미 Todo 생성 (실제 DB 연동 필요)")
            
        def update_todo(self, todo_id, todo_update):
            logger.warning(f"더미 update_todo 호출됨: todo_id={todo_id}, updates={todo_update}")
            for i, todo in enumerate(self.todos):
                if todo.get("id") == todo_id:
                    update_data = {k: v for k, v in todo_update.model_dump(exclude_unset=True).items()}
                    self.todos[i] = {**todo, **update_data, "updated_at": datetime.now(timezone.utc).isoformat()}
                    return ApiResponse.success_response(data=self.todos[i], message="더미 Todo 업데이트 (실제 DB 연동 필요)")
            
            return ApiResponse.error_response(f"Todo ID {todo_id}를 찾을 수 없습니다.")
            
        def delete_todo(self, todo_id):
            logger.warning(f"더미 delete_todo 호출됨: todo_id={todo_id}")
            for i, todo in enumerate(self.todos):
                if todo.get("id") == todo_id:
                    self.todos.pop(i)
                    return ApiResponse.success_response(data={"success": True}, message="더미 Todo 삭제 (실제 DB 연동 필요)")
            
            return ApiResponse.error_response(f"Todo ID {todo_id}를 찾을 수 없습니다.")
            
        def update_todo_status(self, todo_id, status):
            logger.warning(f"더미 update_todo_status 호출됨: todo_id={todo_id}, status={status}")
            return self.update_todo(todo_id, TodoUpdate(status=status))
            
        def complete_todo(self, todo_id):
            logger.warning(f"더미 complete_todo 호출됨: todo_id={todo_id}")
            return self.update_todo(todo_id, TodoUpdate(status=TodoStatus.COMPLETED, completed=True))
            
        def get_overdue_todos(self, user_id=None):
            logger.warning(f"더미 get_overdue_todos 호출됨: user_id={user_id}")
            now = datetime.now(timezone.utc)
            overdue = [t for t in self.todos if t.get("due_date") and t.get("due_date") < now.isoformat()]
            
            if user_id:
                overdue = [t for t in overdue if t.get("user_id") == user_id]
                
            return ApiResponse.success_response(data=overdue, message="더미 기한 초과 Todo 조회 (실제 DB 연동 필요)")
            
        def get_upcoming_todos(self, days=7, user_id=None):
            logger.warning(f"더미 get_upcoming_todos 호출됨: days={days}, user_id={user_id}")
            now = datetime.now(timezone.utc)
            upcoming = []
            
            return ApiResponse.success_response(data=upcoming, message="더미 예정 Todo 조회 (실제 DB 연동 필요)")
    
    todo_service = DummyTodoService()

# 라우터 설정
router = APIRouter(
    prefix="/todos",
    tags=["todos"],
    responses={404: {"description": "리소스를 찾을 수 없습니다"}},
)


@router.get("/", response_model=Dict[str, Any])
@cache_response(
    expire=60,  # 60초 캐시
    prefix="todos_list",
    include_query_params=True,
    user_specific=True
)
async def get_todos(
    skip: int = Query(0, description=SKIP_DESC),
    limit: int = Query(100, description=LIMIT_DESC),
    vehicle_id: Optional[str] = Query(None, description="차량 ID로 필터링"),
    user_id: Optional[str] = Query(None, description="담당자 ID로 필터링"),
    assignee_id: Optional[str] = Query(None, description="할당자 ID로 필터링"),
    status: Optional[List[str]] = Query(None, description=STATUS_DESC),
    priority: Optional[List[str]] = Query(None, description=PRIORITY_DESC),
    due_date_from: Optional[datetime] = Query(None, description=DUE_DATE_FROM_DESC),
    due_date_to: Optional[datetime] = Query(None, description=DUE_DATE_TO_DESC),
    related_entity_type: Optional[str] = Query(None, description="관련 엔티티 타입"),
    related_entity_id: Optional[str] = Query(None, description="관련 엔티티 ID"),
):
    """
    Todo 목록을 조회합니다.
    """
    try:
        filters = {
            "vehicle_id": vehicle_id,
            "user_id": user_id,
            "assignee_id": assignee_id,
            "status": status,
            "priority": priority,
            "due_date_from": due_date_from,
            "due_date_to": due_date_to,
            "related_entity_type": related_entity_type,
            "related_entity_id": related_entity_id,
        }
        # None 값 제거
        filters = {k: v for k, v in filters.items() if v is not None}
        
        return todo_service.get_todos(skip=skip, limit=limit, filters=filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/{todo_id}", response_model=Dict[str, Any])
@cache_response(
    expire=120,  # 2분 캐시
    prefix="todo_detail",
    include_path_params=True,
    user_specific=True
)
async def get_todo_by_id(
    todo_id: str = Path(..., description="조회할 Todo ID"),
):
    """
    특정 Todo의 상세 정보를 조회합니다.
    """
    try:
        return todo_service.get_todo_by_id(todo_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/", response_model=Dict[str, Any])
async def create_todo(
    todo_data: TodoCreate,
):
    """
    새 Todo를 생성합니다.
    """
    try:
        return todo_service.create_todo(todo_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.put("/{todo_id}", response_model=Dict[str, Any])
async def update_todo(
    todo_id: str = Path(..., description="업데이트할 Todo ID"),
    todo_data: TodoUpdate = Body(..., description="업데이트할 Todo 데이터"),
):
    """
    Todo를 업데이트합니다.
    """
    try:
        return todo_service.update_todo(todo_id, todo_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.delete("/{todo_id}", response_model=Dict[str, Any])
async def delete_todo(
    todo_id: str = Path(..., description="삭제할 Todo ID"),
):
    """
    Todo를 삭제합니다.
    """
    try:
        return todo_service.delete_todo(todo_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.patch("/{todo_id}/status", response_model=Dict[str, Any])
async def update_todo_status(
    todo_id: str = Path(..., description="상태를 변경할 Todo ID"),
    status: TodoStatus = Body(..., description="변경할 상태"),
):
    """
    Todo의 상태를 업데이트합니다.
    """
    try:
        return todo_service.update_todo_status(todo_id, status)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.patch("/{todo_id}/complete", response_model=Dict[str, Any])
async def complete_todo(
    todo_id: str = Path(..., description="완료할 Todo ID"),
):
    """
    Todo를 완료 상태로 변경합니다.
    """
    try:
        return todo_service.complete_todo(todo_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/overdue", response_model=Dict[str, Any])
@cache_response(
    expire=300,  # 5분 캐시
    prefix="todos_overdue",
    include_query_params=True,
    user_specific=True
)
async def get_overdue_todos(
    user_id: Optional[str] = Query(None, description=USER_ID_DESC),
):
    """
    기한이 지난 Todo 목록을 조회합니다.
    """
    try:
        return todo_service.get_overdue_todos(user_id=user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/upcoming", response_model=Dict[str, Any])
@cache_response(
    expire=300,  # 5분 캐시
    prefix="todos_upcoming",
    include_query_params=True,
    user_specific=True
)
async def get_upcoming_todos(
    days: int = Query(7, description="몇 일 이내의 Todo를 조회할지 지정"),
    user_id: Optional[str] = Query(None, description=USER_ID_DESC),
):
    """
    다가오는 Todo 목록을 조회합니다.
    """
    try:
        return todo_service.get_upcoming_todos(days=days, user_id=user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/user/{user_id}", response_model=Dict[str, Any])
@cache_response(
    expire=60,  # 60초 캐시
    prefix="todos_by_user",
    include_path_params=True,
    include_query_params=True,
    user_specific=True
)
async def get_user_todos(
    user_id: str = Path(..., description=USER_ID_DESC),
    skip: int = Query(0, description=SKIP_DESC),
    limit: int = Query(100, description=LIMIT_DESC),
    status: Optional[List[str]] = Query(None, description=STATUS_DESC),
    priority: Optional[List[str]] = Query(None, description=PRIORITY_DESC),
    due_date_from: Optional[datetime] = Query(None, description=DUE_DATE_FROM_DESC),
    due_date_to: Optional[datetime] = Query(None, description=DUE_DATE_TO_DESC),
):
    """
    특정 사용자의 Todo 목록을 조회합니다.
    """
    try:
        filters = {
            "user_id": user_id,
            "status": status,
            "priority": priority,
            "due_date_from": due_date_from,
            "due_date_to": due_date_to,
        }
        # None 값 제거
        filters = {k: v for k, v in filters.items() if v is not None}
        
        return todo_service.get_todos(skip=skip, limit=limit, filters=filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/assignee/{assignee_id}", response_model=Dict[str, Any])
@cache_response(
    expire=60,  # 60초 캐시
    prefix="todos_by_assignee",
    include_path_params=True,
    include_query_params=True,
    user_specific=True
)
async def get_assignee_todos(
    assignee_id: str = Path(..., description="할당자 ID"),
    skip: int = Query(0, description=SKIP_DESC),
    limit: int = Query(100, description=LIMIT_DESC),
    status: Optional[List[str]] = Query(None, description=STATUS_DESC),
    priority: Optional[List[str]] = Query(None, description=PRIORITY_DESC),
    due_date_from: Optional[datetime] = Query(None, description=DUE_DATE_FROM_DESC),
    due_date_to: Optional[datetime] = Query(None, description=DUE_DATE_TO_DESC),
):
    """
    특정 할당자의 Todo 목록을 조회합니다.
    """
    try:
        filters = {
            "assignee_id": assignee_id,
            "status": status,
            "priority": priority,
            "due_date_from": due_date_from,
            "due_date_to": due_date_to,
        }
        # None 값 제거
        filters = {k: v for k, v in filters.items() if v is not None}
        
        return todo_service.get_todos(skip=skip, limit=limit, filters=filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/vehicle/{vehicle_id}", response_model=Dict[str, Any])
@cache_response(
    expire=60,  # 60초 캐시
    prefix="todos_by_vehicle",
    include_path_params=True,
    include_query_params=True,
    user_specific=True
)
async def get_vehicle_todos(
    vehicle_id: str = Path(..., description="차량 ID"),
    skip: int = Query(0, description=SKIP_DESC),
    limit: int = Query(100, description=LIMIT_DESC),
    status: Optional[List[str]] = Query(None, description=STATUS_DESC),
    priority: Optional[List[str]] = Query(None, description=PRIORITY_DESC),
    due_date_from: Optional[datetime] = Query(None, description=DUE_DATE_FROM_DESC),
    due_date_to: Optional[datetime] = Query(None, description=DUE_DATE_TO_DESC),
):
    """
    특정 차량에 대한 Todo 목록을 조회합니다.
    """
    try:
        filters = {
            "vehicle_id": vehicle_id,
            "status": status,
            "priority": priority,
            "due_date_from": due_date_from,
            "due_date_to": due_date_to,
        }
        # None 값 제거
        filters = {k: v for k, v in filters.items() if v is not None}
        
        return todo_service.get_todos(skip=skip, limit=limit, filters=filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e