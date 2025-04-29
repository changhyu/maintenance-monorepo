export var TodoPriority;
(function (TodoPriority) {
    TodoPriority["LOW"] = "LOW";
    TodoPriority["MEDIUM"] = "MEDIUM";
    TodoPriority["HIGH"] = "HIGH";
    TodoPriority["URGENT"] = "URGENT";
})(TodoPriority || (TodoPriority = {}));
export var TodoStatus;
(function (TodoStatus) {
    TodoStatus["PENDING"] = "PENDING";
    TodoStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TodoStatus["COMPLETED"] = "COMPLETED";
    TodoStatus["CANCELLED"] = "CANCELLED";
})(TodoStatus || (TodoStatus = {}));
export class TodoService {
    constructor(apiClient) {
        this.basePath = '/todos';
        this.client = apiClient;
    }
    // 할일 목록 조회
    async getTodos(filter) {
        return this.client.get(this.basePath, { params: filter });
    }
    // 특정 할일 조회
    async getTodoById(id) {
        return this.client.get(`${this.basePath}/${id}`);
    }
    // 할일 생성
    async createTodo(todoData) {
        return this.client.post(this.basePath, todoData);
    }
    // 할일 업데이트
    async updateTodo(id, todoData) {
        return this.client.put(`${this.basePath}/${id}`, todoData);
    }
    // 할일 삭제
    async deleteTodo(id) {
        return this.client.delete(`${this.basePath}/${id}`);
    }
    // 할일 상태 변경
    async updateTodoStatus(id, status) {
        return this.client.patch(`${this.basePath}/${id}/status`, { status });
    }
    // 할일 완료 처리
    async completeTodo(id) {
        return this.client.patch(`${this.basePath}/${id}/complete`, {
            status: TodoStatus.COMPLETED,
            completedAt: new Date().toISOString()
        });
    }
    // 할일 완료 상태 토글
    async toggleComplete(id) {
        return this.client.patch(`${this.basePath}/${id}/toggle-complete`, {});
    }
    // 특정 사용자의 할일 조회
    async getUserTodos(userId, filter) {
        return this.client.get(`/users/${userId}/todos`, { params: filter });
    }
    // 특정 담당자의 할일 조회
    async getAssigneeTodos(assigneeId, filter) {
        return this.client.get(`${this.basePath}/assignee/${assigneeId}`, { params: filter });
    }
    // 특정 엔티티와 관련된 할일 조회
    async getRelatedTodos(entityType, entityId) {
        return this.client.get(`${this.basePath}/related/${entityType}/${entityId}`);
    }
    // 만기된 할일 조회
    async getOverdueTodos(filter) {
        return this.client.get(`${this.basePath}/overdue`, { params: filter });
    }
    // 곧 만기될 할일 조회 (오늘 기준 N일 이내)
    async getUpcomingTodos(daysThreshold, filter) {
        return this.client.get(`${this.basePath}/upcoming`, {
            params: { daysThreshold, ...filter }
        });
    }
}
