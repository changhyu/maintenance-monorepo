import unittest
import requests
from datetime import datetime, timedelta
import uuid
import os
from typing import Dict, List
from itertools import chain

# API 기본 URL
BASE_URL = os.environ.get('API_TEST_URL', 'http://localhost:8080')  # 포트 8000에서 8080으로 변경
TODO_ENDPOINT = f"{BASE_URL}/todos"

class TestTodoAPI(unittest.TestCase):
    def setUp(self):
        """테스트 설정"""
        self.todo_data = {
            "title": f"Test Todo {uuid.uuid4()}",
            "description": "API 통합 테스트를 위한 Todo",
            "priority": "medium",
            "status": "pending",
            "dueDate": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
            "vehicleId": "test-vehicle-123"
        }
        self.created_todo_ids = set()
    
    def tearDown(self):
        """테스트 정리"""
        self._cleanup_todos(self.created_todo_ids)
        
    def _cleanup_todos(self, todo_ids: set) -> None:
        """테스트에서 생성된 Todo 정리"""
        for todo_id in todo_ids:
            try:
                requests.delete(f"{TODO_ENDPOINT}/{todo_id}")
            except Exception as e:
                print(f"Todo ID {todo_id} 삭제 중 오류 발생: {str(e)}")
                
    def _create_todo(self, todo_data: Dict) -> Dict:
        """단일 Todo 생성 헬퍼 함수"""
        response = requests.post(TODO_ENDPOINT, json=todo_data)
        self.assertEqual(response.status_code, 200)
        if todo := response.json().get('data', {}):
            if todo_id := todo.get('id'):
                self.created_todo_ids.add(todo_id)
            return todo
        return {}
        
    def _create_test_todos(self, count: int, priority: str = "high") -> List[Dict]:
        """여러 개의 테스트용 Todo 생성"""
        base_date = datetime.now()
        
        test_data = [
            {
                "title": f"Test Todo {i}",
                "description": f"Description {i}",
                "priority": priority,
                "due_date": (base_date + timedelta(days=i)).isoformat()
            }
            for i in range(count)
        ]
        
        return [self._create_todo(data) for data in test_data]

    def _verify_todo_status(self, todo_ids: List[str], expected_status: str) -> None:
        """Todo 상태 검증 헬퍼 함수"""
        response = requests.get(f"{TODO_ENDPOINT}/batch", json={"ids": todo_ids})
        self.assertEqual(response.status_code, 200)
        todos = response.json()['data']
        self.assertTrue(all(todo['status'] == expected_status for todo in todos))

    def test_todo_crud_operations(self):
        """Todo CRUD 작업 통합 테스트"""
        # Todo 생성
# sourcery skip: no-conditionals-in-tests
        if not (created_todo := self._create_todo(self.todo_data)):
            self.fail("Todo 생성 실패")
        todo_id = created_todo['id']
        
        # Todo 조회
        response = requests.get(f"{TODO_ENDPOINT}/{todo_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['data']['title'], self.todo_data['title'])
        
        # Todo 업데이트
        update_data = {
            "title": f"Updated Todo {uuid.uuid4()}",
            "description": "업데이트된 설명"
        }
        response = requests.put(f"{TODO_ENDPOINT}/{todo_id}", json=update_data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['data']['title'], update_data['title'])
        
        # Todo 상태 변경
        response = requests.patch(f"{TODO_ENDPOINT}/{todo_id}/complete")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['data']['status'], "completed")
        
        # Todo 삭제
        response = requests.delete(f"{TODO_ENDPOINT}/{todo_id}")
        self.assertEqual(response.status_code, 200)
        self.created_todo_ids.remove(todo_id)
        
        # 삭제 확인
        response = requests.get(f"{TODO_ENDPOINT}/{todo_id}")
        self.assertEqual(response.status_code, 404)

    def test_batch_operations(self):
        """일괄 작업 테스트"""
        # 테스트 데이터 생성
# sourcery skip: no-conditionals-in-tests
        if not (todos := self._create_test_todos(5)):
            self.fail("테스트 Todo 생성 실패")
        todo_ids = [todo['id'] for todo in todos]
        
        # 일괄 상태 변경
        response = requests.patch(
            f"{TODO_ENDPOINT}/batch/status",
            json={"ids": todo_ids, "status": "completed"}
        )
        self.assertEqual(response.status_code, 200)
        
        # 상태 변경 확인
        self._verify_todo_status(todo_ids, "completed")

    def test_todo_date_range(self):
        """Todo 날짜 범위 필터링 테스트"""
        # 오늘과 내일 날짜의 Todo 생성
        today = datetime.now()
        tomorrow = today + timedelta(days=1)
        
        self._create_todo({
            **self.todo_data,
            "dueDate": today.strftime("%Y-%m-%d")
        })
        self._create_todo({
            **self.todo_data,
            "dueDate": tomorrow.strftime("%Y-%m-%d")
        })
        
        # 날짜 범위 필터링 테스트
        response = requests.get(
            f"{TODO_ENDPOINT}?fromDate={today.strftime('%Y-%m-%d')}&toDate={tomorrow.strftime('%Y-%m-%d')}"
        )
        self.assertEqual(response.status_code, 200)
        filtered_todos = response.json()['data']
        self.assertEqual(len(filtered_todos), 2)

if __name__ == '__main__':
    unittest.main()