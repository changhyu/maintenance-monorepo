import unittest
from unittest import mock
from datetime import datetime, timedelta
import uuid

# 데이터베이스 세션 목 객체
class MockSession:
    def __init__(self):
        self.committed = False
        self.rolledback = False
        self.closed = False
        self.queries = []

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolledback = True

    def close(self):
        self.closed = True

    def query(self, *args, **kwargs):
        self.queries.append((args, kwargs))
        return self

    def filter(self, *args, **kwargs):
        return self

    def filter_by(self, *args, **kwargs):
        return self

    def all(self):
        return []

    def first(self):
        return None

    def one_or_none(self):
        return None

    def count(self):
        return 0

    def offset(self, offset):
        return self

    def limit(self, limit):
        return self

    def order_by(self, *args):
        return self


# Todo 모델 목 객체
class MockTodo:
    def __init__(self, id=None, title="Test Todo", description="Test Description", 
                due_date=None, status="pending", priority="medium", completed=False,
                vehicle_id=None, user_id=None, assignee_id=None, created_at=None, 
                updated_at=None, completed_at=None, related_entity_type=None, 
                related_entity_id=None, tags=None, metadata=None, category=None):
        self.id = id or str(uuid.uuid4())
        self.title = title
        self.description = description
        self.due_date = due_date
        self.status = status
        self.priority = priority
        self.completed = completed
        self.vehicle_id = vehicle_id
        self.user_id = user_id
        self.assignee_id = assignee_id
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()
        self.completed_at = completed_at
        self.related_entity_type = related_entity_type
        self.related_entity_id = related_entity_id
        self.tags = tags or []
        self.metadata = metadata or {}
        self.category = category


# 테스트 클래스
class TestTodoService(unittest.TestCase):
    
    @mock.patch('packages.api.src.modules.todo.service.get_db')
    @mock.patch('packages.api.src.modules.todo.service.TodoRepository')
    def setUp(self, mock_repo, mock_get_db):
        from packages.api.src.modules.todo.service import TodoService
        from packages.api.src.modules.todo.service import offline_manager
        
        # 목 DB 세션 및 Repository 설정
        self.mock_session = MockSession()
        mock_get_db.return_value = iter([self.mock_session])
        self.mock_repo = mock.MagicMock()
        mock_repo.return_value = self.mock_repo
        
        # 오프라인 매니저 목 설정
        offline_manager.is_offline = False
        offline_manager.get_offline_data = mock.MagicMock(return_value=[])
        offline_manager.sync_to_offline = mock.MagicMock()
        
        # TodoService 인스턴스 생성
        self.todo_service = TodoService()

    def test_get_todos(self):
        """Todo 목록 조회 테스트"""
        # 목 데이터 설정
        mock_todos = [
            MockTodo(id="1", title="Todo 1"),
            MockTodo(id="2", title="Todo 2")
        ]
        
        # 리포지토리 응답 설정
        self.mock_repo.get_todo_list.return_value = (mock_todos, len(mock_todos))
        
        # 함수 호출
        result = self.todo_service.get_todos()
        
        # 검증
        self.mock_repo.get_todo_list.assert_called_once()
        self.assertEqual(result.success, True)
        self.assertEqual(len(result.data), 2)
        self.assertEqual(result.metadata["total"], 2)
    
    def test_get_todo_by_id(self):
        """Todo 상세 조회 테스트"""
        # 목 데이터 설정
        todo_id = "1"
        mock_todo = MockTodo(id=todo_id, title="Test Todo")
        
        # 리포지토리 응답 설정
        self.mock_repo.get_todo_by_id.return_value = mock_todo
        
        # 함수 호출
        result = self.todo_service.get_todo_by_id(todo_id)
        
        # 검증
        self.mock_repo.get_todo_by_id.assert_called_once_with(todo_id)
        self.assertEqual(result.success, True)
        self.assertEqual(result.data.id, todo_id)
    
    @mock.patch('packages.api.src.modules.todo.service.TodoCreate')
    def test_create_todo(self, mock_todo_create):
        """Todo 생성 테스트"""
        # 목 데이터 설정
        mock_data = mock.MagicMock()
        mock_data.title = "New Todo"
        mock_data.description = "New Description"
        mock_data.priority = "high"
        mock_data.status = "pending"
        
        mock_todo = MockTodo(
            title=mock_data.title,
            description=mock_data.description,
            priority=mock_data.priority,
            status=mock_data.status
        )
        
        # 리포지토리 응답 설정
        self.mock_repo.create_todo.return_value = mock_todo
        
        # 함수 호출
        result = self.todo_service.create_todo(mock_data)
        
        # 검증
        self.mock_repo.create_todo.assert_called_once()
        self.mock_session.commit.assert_called_once()
        self.assertEqual(result.success, True)
        self.assertEqual(result.data.title, mock_data.title)
    
    @mock.patch('packages.api.src.modules.todo.service.TodoUpdate')
    def test_update_todo(self, mock_todo_update):
        """Todo 업데이트 테스트"""
        # 목 데이터 설정
        todo_id = "1"
        mock_todo = MockTodo(id=todo_id, title="Original Todo")
        
        mock_update_data = mock.MagicMock()
        mock_update_data.title = "Updated Todo"
        mock_update_data.model_dump.return_value = {"title": "Updated Todo"}
        
        # 리포지토리 응답 설정
        self.mock_repo.get_todo_by_id.return_value = mock_todo
        self.mock_repo.update_todo.return_value = MockTodo(
            id=todo_id, 
            title=mock_update_data.title
        )
        
        # 함수 호출
        result = self.todo_service.update_todo(todo_id, mock_update_data)
        
        # 검증
        self.mock_repo.get_todo_by_id.assert_called_once_with(todo_id)
        self.mock_repo.update_todo.assert_called_once()
        self.mock_session.commit.assert_called_once()
        self.assertEqual(result.success, True)
        self.assertEqual(result.data.title, mock_update_data.title)
    
    def test_delete_todo(self):
        """Todo 삭제 테스트"""
        # 목 데이터 설정
        todo_id = "1"
        mock_todo = MockTodo(id=todo_id)
        
        # 리포지토리 응답 설정
        self.mock_repo.get_todo_by_id.return_value = mock_todo
        self.mock_repo.delete_todo.return_value = True
        
        # 함수 호출
        result = self.todo_service.delete_todo(todo_id)
        
        # 검증
        self.mock_repo.get_todo_by_id.assert_called_once_with(todo_id)
        self.mock_repo.delete_todo.assert_called_once_with(todo_id)
        self.mock_session.commit.assert_called_once()
        self.assertEqual(result.success, True)
        self.assertEqual(result.data, True)
    
    def test_update_todo_status(self):
        """Todo 상태 업데이트 테스트"""
        # 목 데이터 설정
        todo_id = "1"
        new_status = "in_progress"
        mock_todo = MockTodo(id=todo_id, status="pending")
        
        # 리포지토리 응답 설정
        self.mock_repo.get_todo_by_id.return_value = mock_todo
        self.mock_repo.update_todo.return_value = MockTodo(
            id=todo_id,
            status=new_status
        )
        
        # 함수 호출
        result = self.todo_service.update_todo_status(todo_id, new_status)
        
        # 검증
        self.mock_repo.get_todo_by_id.assert_called_once_with(todo_id)
        self.mock_repo.update_todo.assert_called_once()
        self.mock_session.commit.assert_called_once()
        self.assertEqual(result.success, True)
        self.assertEqual(result.data.status, new_status)
    
    def test_complete_todo(self):
        """Todo 완료 테스트"""
        # 목 데이터 설정
        todo_id = "1"
        mock_todo = MockTodo(id=todo_id, status="pending", completed=False)
        
        # 리포지토리 응답 설정
        self.mock_repo.get_todo_by_id.return_value = mock_todo
        self.mock_repo.update_todo.return_value = MockTodo(
            id=todo_id,
            status="completed",
            completed=True,
            completed_at=datetime.now()
        )
        
        # 함수 호출
        result = self.todo_service.complete_todo(todo_id)
        
        # 검증
        self.mock_repo.get_todo_by_id.assert_called_once_with(todo_id)
        self.mock_repo.update_todo.assert_called_once()
        self.mock_session.commit.assert_called_once()
        self.assertEqual(result.success, True)
        self.assertEqual(result.data.status, "completed")
        self.assertEqual(result.data.completed, True)
        self.assertIsNotNone(result.data.completed_at)


if __name__ == '__main__':
    unittest.main() 