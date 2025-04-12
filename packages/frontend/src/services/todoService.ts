import apiClient from '../api-client';
import logger from '../utils/logger';

/**
 * Todo 우선순위 상수
 */
export const TodoPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
} as const;

export type TodoPriorityType = (typeof TodoPriority)[keyof typeof TodoPriority];

/**
 * Todo 상태 상수
 */
export const TodoStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export type TodoStatusType = (typeof TodoStatus)[keyof typeof TodoStatus];

/**
 * Todo 항목 인터페이스
 */
export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  status: TodoStatusType;
  priority: TodoPriorityType;
  dueDate?: string; // ISO 형식 날짜 문자열 (YYYY-MM-DD 또는 YYYY-MM-DDTHH:mm:ss.sssZ)
  createdAt: string;
  updatedAt: string;
  vehicleId?: string;
  assignedTo?: string;
  category?: string;
}

/**
 * Todo 생성 요청 인터페이스
 */
export interface TodoCreateRequest {
  title: string;
  description?: string;
  completed?: boolean;
  status?: TodoStatusType;
  priority?: TodoPriorityType;
  dueDate?: string; // ISO 형식 날짜 문자열 (YYYY-MM-DD)
  vehicleId?: string;
  assignedTo?: string;
  category?: string;
}

/**
 * Todo 업데이트 요청 인터페이스
 */
export interface TodoUpdateRequest {
  title?: string;
  description?: string;
  completed?: boolean;
  status?: TodoStatusType;
  priority?: TodoPriorityType;
  dueDate?: string; // ISO 형식 날짜 문자열 (YYYY-MM-DD)
  assignedTo?: string;
  category?: string;
  vehicleId?: string;
}

/**
 * Todo 필터 인터페이스
 */
export interface TodoFilter {
  vehicleId?: string;
  assignedTo?: string;
  completed?: boolean;
  status?: TodoStatusType | TodoStatusType[];
  priority?: TodoPriorityType | TodoPriorityType[];
  category?: string;
  dueFrom?: string; // ISO 형식 날짜 문자열 (YYYY-MM-DD)
  dueTo?: string; // ISO 형식 날짜 문자열 (YYYY-MM-DD)
  searchText?: string;
}

/**
 * Todo 서비스 클래스
 * API와의 통신을 담당하는 서비스
 */
export class TodoService {
  private basePath = '/todos';

  constructor() {
    // 생성자에서 axios 인스턴스 생성하는 코드 제거
  }

  /**
   * Todo 목록 조회
   */
  async getTodos(filter?: TodoFilter): Promise<Todo[]> {
    try {
      // 쿼리 파라미터 구성
      const params: Record<string, string> = {};

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
          } else {
            params.status = filter.status;
          }
        }

        if (filter.priority) {
          if (Array.isArray(filter.priority)) {
            params.priority = filter.priority.join(',');
          } else {
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

      // API 호출 시도 (실제 운영 코드로 변경)
      try {
        const response = await apiClient.get<Todo[]>(this.basePath, { params });
        const todos = response.data;
        logger.info(`${todos.length}개의 할 일을 조회했습니다.`);
        return todos;
      } catch (error) {
        // API 실패 시 임시 데이터 반환 (실제 운영 시 삭제)
        logger.warn('API 호출 실패, 임시 데이터를 사용합니다:', error);

        // 임시 데이터 (실제 운영 시 삭제)
        const mockTodos: Todo[] = [
          {
            id: '1',
            title: '엔진 오일 교체',
            description: '차량 정기 점검 - 엔진 오일 교체 작업',
            completed: false,
            status: TodoStatus.PENDING,
            priority: TodoPriority.HIGH,
            dueDate: '2023-12-30',
            createdAt: '2023-12-01T00:00:00.000Z',
            updatedAt: '2023-12-01T00:00:00.000Z',
            vehicleId: 'v1',
            category: '정기 점검'
          },
          {
            id: '2',
            title: '타이어 공기압 점검',
            completed: true,
            status: TodoStatus.COMPLETED,
            priority: TodoPriority.MEDIUM,
            createdAt: '2023-11-15T00:00:00.000Z',
            updatedAt: '2023-11-20T00:00:00.000Z',
            vehicleId: 'v1',
            category: '일상 점검'
          },
          {
            id: '3',
            title: '브레이크 패드 교체',
            description: '앞바퀴 브레이크 패드 마모로 인한 교체 필요',
            completed: false,
            status: TodoStatus.IN_PROGRESS,
            priority: TodoPriority.HIGH,
            dueDate: '2023-12-15',
            createdAt: '2023-12-05T00:00:00.000Z',
            updatedAt: '2023-12-05T00:00:00.000Z',
            vehicleId: 'v2',
            assignedTo: 'user1',
            category: '부품 교체'
          },
          {
            id: '4',
            title: '오래된 작업 - 기한 초과',
            description: '기한이 지난 작업 테스트용',
            completed: false,
            status: TodoStatus.PENDING,
            priority: TodoPriority.MEDIUM,
            dueDate: '2023-06-15',
            createdAt: '2023-06-01T00:00:00.000Z',
            updatedAt: '2023-06-01T00:00:00.000Z',
            vehicleId: 'v1',
            category: '테스트'
          }
        ];

        // 클라이언트 측 필터 적용 (실제 운영 시 삭제)
        let filteredTodos = [...mockTodos];

        if (filter) {
          if (filter.vehicleId) {
            filteredTodos = filteredTodos.filter(todo => todo.vehicleId === filter.vehicleId);
          }

          if (filter.completed !== undefined) {
            filteredTodos = filteredTodos.filter(todo => todo.completed === filter.completed);
          }

          if (filter.status !== undefined) {
            const status = filter.status;
            if (Array.isArray(status)) {
              filteredTodos = filteredTodos.filter(todo => status.includes(todo.status));
            } else {
              filteredTodos = filteredTodos.filter(todo => todo.status === status);
            }
          }

          if (filter.priority !== undefined) {
            const priority = filter.priority;
            if (Array.isArray(priority)) {
              filteredTodos = filteredTodos.filter(todo => priority.includes(todo.priority));
            } else {
              filteredTodos = filteredTodos.filter(todo => todo.priority === priority);
            }
          }

          if (filter.category) {
            filteredTodos = filteredTodos.filter(todo => todo.category === filter.category);
          }

          if (filter.searchText) {
            const searchText = filter.searchText.toLowerCase();
            filteredTodos = filteredTodos.filter(
              todo =>
                todo.title.toLowerCase().includes(searchText) ||
                (todo.description && todo.description.toLowerCase().includes(searchText))
            );
          }

          // 마감일 범위 필터링
          if (filter.dueFrom) {
            filteredTodos = filteredTodos.filter(todo => {
              if (!todo.dueDate) return false;
              return todo.dueDate >= filter.dueFrom!;
            });
          }

          if (filter.dueTo) {
            filteredTodos = filteredTodos.filter(todo => {
              if (!todo.dueDate) return false;
              return todo.dueDate <= filter.dueTo!;
            });
          }
        }

        return filteredTodos;
      }
    } catch (error) {
      logger.error('할 일 목록 조회 실패:', error);
      throw new Error('할 일 목록을 불러오는 데 실패했습니다.');
    }
  }

  /**
   * Todo ID로 조회
   */
  async getTodoById(id: string): Promise<Todo> {
    try {
      const response = await apiClient.get<Todo>(`${this.basePath}/${id}`);
      logger.info(`할 일 ID ${id} 조회 성공`);
      return response.data;
    } catch (error) {
      logger.error(`할 일 ID ${id} 조회 실패:`, error);
      throw new Error(`ID가 ${id}인 할 일을 찾을 수 없습니다.`);
    }
  }

  /**
   * Todo 생성
   */
  async createTodo(todoData: TodoCreateRequest): Promise<Todo> {
    try {
      const response = await apiClient.post<Todo>(this.basePath, todoData);
      logger.info('새 할 일 생성 성공');
      return response.data;
    } catch (error) {
      logger.error('할 일 생성 실패:', error);
      throw new Error('할 일을 생성하는 데 실패했습니다.');
    }
  }

  /**
   * Todo 업데이트
   */
  async updateTodo(id: string, todoData: TodoUpdateRequest): Promise<Todo> {
    try {
      const response = await apiClient.patch<Todo>(`${this.basePath}/${id}`, todoData);
      logger.info(`할 일 ID ${id}가 업데이트되었습니다`);
      return response.data;
    } catch (error) {
      logger.error(`할 일 ID ${id} 업데이트 실패:`, error);
      throw new Error('할 일을 업데이트하는 데 실패했습니다.');
    }
  }

  /**
   * Todo 삭제
   */
  async deleteTodo(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`${this.basePath}/${id}`);
      logger.info(`할 일 ID ${id}가 삭제되었습니다`);
      return true;
    } catch (error) {
      logger.error(`할 일 ID ${id} 삭제 실패:`, error);
      throw new Error('할 일을 삭제하는 데 실패했습니다.');
    }
  }

  /**
   * Todo 완료 상태 토글
   */
  async toggleComplete(id: string, completed: boolean): Promise<Todo> {
    try {
      const status = completed ? TodoStatus.COMPLETED : TodoStatus.PENDING;
      return await this.updateTodo(id, { completed, status });
    } catch (error) {
      logger.error(`할 일 ID ${id} 완료 상태 토글 실패:`, error);
      throw new Error('할 일 상태를 변경하는 데 실패했습니다.');
    }
  }
}
