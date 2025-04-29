import apiClient from '../api-client';
import logger from '../utils/logger';
/**
 * Todo 우선순위 상수
 */
export const TodoPriority = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
};
/**
 * Todo 상태 상수
 */
export const TodoStatus = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};
/**
 * Todo 서비스 클래스
 * API와의 통신을 담당하는 서비스
 */
export class TodoService {
    constructor() {
        this.basePath = '/todos';
        // 생성자에서 axios 인스턴스 생성하는 코드 제거
    }
    /**
     * Todo 목록 조회
     */
    async getTodos(filter) {
        try {
            // 쿼리 파라미터 구성
            const params = {};
            if (filter) {
                if (filter.vehicleId) {
                    params.vehicleId = filter.vehicleId;
                }
                if (filter.assignedTo) {
                    params.assignedTo = filter.assignedTo;
                }
                if (filter.completed !== undefined) {
                    params.completed = String(filter.completed);
                }
                if (filter.status) {
                    if (Array.isArray(filter.status)) {
                        params.status = filter.status.join(',');
                    }
                    else {
                        params.status = filter.status;
                    }
                }
                if (filter.priority) {
                    if (Array.isArray(filter.priority)) {
                        params.priority = filter.priority.join(',');
                    }
                    else {
                        params.priority = filter.priority;
                    }
                }
                if (filter.category) {
                    params.category = filter.category;
                }
                if (filter.searchText) {
                    params.searchText = filter.searchText;
                }
                if (filter.dueFrom && typeof filter.dueFrom === 'string') {
                    params.dueFrom = filter.dueFrom;
                }
                if (filter.dueTo && typeof filter.dueTo === 'string') {
                    params.dueTo = filter.dueTo;
                }
            }
            // API 호출
            const response = await apiClient.get(this.basePath, { params });
            const todos = response.data;
            logger.info(`${todos.length}개의 할 일을 조회했습니다.`);
            return todos;
        }
        catch (error) {
            logger.error('할 일 목록 조회 실패:', error);
            throw new Error('할 일 목록을 불러오는데 실패했습니다.');
        }
    }
    /**
     * 특정 Todo 조회
     */
    async getTodoById(id) {
        try {
            const response = await apiClient.get(`${this.basePath}/${id}`);
            return response.data;
        }
        catch (error) {
            logger.error(`ID: ${id} 할 일 조회 실패:`, error);
            throw new Error('할 일을 불러오는데 실패했습니다.');
        }
    }
    /**
     * Todo 생성
     */
    async createTodo(todoData) {
        try {
            const response = await apiClient.post(this.basePath, todoData);
            return response.data;
        }
        catch (error) {
            logger.error('할 일 생성 실패:', error);
            throw new Error('할 일을 생성하는데 실패했습니다.');
        }
    }
    /**
     * Todo 업데이트
     */
    async updateTodo(id, todoData) {
        try {
            const response = await apiClient.put(`${this.basePath}/${id}`, todoData);
            return response.data;
        }
        catch (error) {
            logger.error(`ID: ${id} 할 일 업데이트 실패:`, error);
            throw new Error('할 일을 업데이트하는데 실패했습니다.');
        }
    }
    /**
     * Todo 삭제
     */
    async deleteTodo(id) {
        try {
            await apiClient.delete(`${this.basePath}/${id}`);
            return true;
        }
        catch (error) {
            logger.error(`ID: ${id} 할 일 삭제 실패:`, error);
            throw new Error('할 일을 삭제하는데 실패했습니다.');
        }
    }
    /**
     * Todo 완료 상태 토글
     */
    async toggleComplete(id, completed) {
        try {
            const response = await apiClient.patch(`${this.basePath}/${id}/complete`, { completed });
            return response.data;
        }
        catch (error) {
            logger.error(`ID: ${id} 할 일 완료 상태 토글 실패:`, error);
            throw new Error('할 일 완료 상태 변경에 실패했습니다.');
        }
    }
}
