"""
Todo API 통합 테스트
"""

import os
import uuid
from datetime import datetime, timedelta
from typing import Dict, List

import pytest
import requests

# API 기본 URL
BASE_URL = os.environ.get("API_TEST_URL", "http://localhost:8080")
TODO_ENDPOINT = f"{BASE_URL}/todos"


@pytest.fixture
def sample_todo_data():
    """샘플 Todo 데이터"""
    return {
        "title": f"Test Todo {uuid.uuid4()}",
        "description": "API 통합 테스트를 위한 Todo",
        "priority": "medium",
        "status": "pending",
        "dueDate": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
        "vehicleId": "test-vehicle-123",
    }


@pytest.fixture
def created_todo_ids():
    """생성된 Todo ID 목록"""
    return set()


@pytest.fixture(autouse=True)
def cleanup_todos(created_todo_ids):
    """테스트 후 Todo 정리"""
    yield
    for todo_id in created_todo_ids:
        try:
            requests.delete(f"{TODO_ENDPOINT}/{todo_id}")
        except Exception as e:
            print(f"Todo ID {todo_id} 삭제 중 오류 발생: {str(e)}")


class TestTodoAPI:
    def _create_todo(self, todo_data: Dict, created_todo_ids: set) -> Dict:
        """Todo 생성 헬퍼 함수"""
        response = requests.post(TODO_ENDPOINT, json=todo_data)
        assert response.status_code == 200
        if todo := response.json().get("data", {}):
            if todo_id := todo.get("id"):
                created_todo_ids.add(todo_id)
            return todo
        return {}

    def _create_test_todos(
        self, count: int, created_todo_ids: set, priority: str = "high"
    ) -> List[Dict]:
        """여러 개의 테스트용 Todo 생성"""
        base_date = datetime.now()

        test_data = [
            {
                "title": f"Test Todo {i}",
                "description": f"Description {i}",
                "priority": priority,
                "due_date": (base_date + timedelta(days=i)).isoformat(),
            }
            for i in range(count)
        ]

        return [self._create_todo(data, created_todo_ids) for data in test_data]

    def _verify_todo_status(self, todo_ids: List[str], expected_status: str) -> None:
        """Todo 상태 검증 헬퍼 함수"""
        response = requests.get(f"{TODO_ENDPOINT}/batch", json={"ids": todo_ids})
        assert response.status_code == 200
        todos = response.json()["data"]
        assert all(todo["status"] == expected_status for todo in todos)

    def test_todo_crud_operations(self, sample_todo_data, created_todo_ids):
        """Todo CRUD 작업 통합 테스트"""
        # Todo 생성
        created_todo = self._create_todo(sample_todo_data, created_todo_ids)
        assert created_todo, "Todo 생성 실패"
        todo_id = created_todo["id"]

        # Todo 조회
        response = requests.get(f"{TODO_ENDPOINT}/{todo_id}")
        assert response.status_code == 200
        assert response.json()["data"]["title"] == sample_todo_data["title"]

        # Todo 업데이트
        update_data = {
            "title": f"Updated Todo {uuid.uuid4()}",
            "description": "업데이트된 설명",
        }
        response = requests.put(f"{TODO_ENDPOINT}/{todo_id}", json=update_data)
        assert response.status_code == 200
        assert response.json()["data"]["title"] == update_data["title"]

        # Todo 상태 변경
        response = requests.patch(f"{TODO_ENDPOINT}/{todo_id}/complete")
        assert response.status_code == 200
        assert response.json()["data"]["status"] == "completed"

        # Todo 삭제
        response = requests.delete(f"{TODO_ENDPOINT}/{todo_id}")
        assert response.status_code == 200
        created_todo_ids.remove(todo_id)

        # 삭제 확인
        response = requests.get(f"{TODO_ENDPOINT}/{todo_id}")
        assert response.status_code == 404

    def test_batch_operations(self, created_todo_ids):
        """일괄 작업 테스트"""
        # 테스트 데이터 생성
        todos = self._create_test_todos(5, created_todo_ids)
        assert todos, "테스트 Todo 생성 실패"
        todo_ids = [todo["id"] for todo in todos]

        # 일괄 상태 변경
        response = requests.patch(
            f"{TODO_ENDPOINT}/batch/status",
            json={"ids": todo_ids, "status": "completed"},
        )
        assert response.status_code == 200

        # 상태 변경 확인
        self._verify_todo_status(todo_ids, "completed")

    def test_todo_date_range(self, sample_todo_data, created_todo_ids):
        """Todo 날짜 범위 필터링 테스트"""
        # 오늘과 내일 날짜의 Todo 생성
        today = datetime.now()
        tomorrow = today + timedelta(days=1)

        self._create_todo(
            {**sample_todo_data, "dueDate": today.strftime("%Y-%m-%d")},
            created_todo_ids,
        )

        self._create_todo(
            {**sample_todo_data, "dueDate": tomorrow.strftime("%Y-%m-%d")},
            created_todo_ids,
        )

        # 날짜 범위 필터링 테스트
        response = requests.get(
            f"{TODO_ENDPOINT}?fromDate={today.strftime('%Y-%m-%d')}&toDate={tomorrow.strftime('%Y-%m-%d')}"
        )
        assert response.status_code == 200
        filtered_todos = response.json()["data"]
        assert len(filtered_todos) == 2
