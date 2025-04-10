import axios, { AxiosInstance } from 'axios';
import config from '../config';
import logger from '../utils/logger';

/**
 * Todo 우선순위 상수
 */
export const TodoPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
} as const;

export type TodoPriorityType = typeof TodoPriority[keyof typeof TodoPriority];

/**
 * Todo 상태 상수
 */
export const TodoStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export type TodoStatusType = typeof TodoStatus[keyof typeof TodoStatus];

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
  private client: AxiosInstance;
  private basePath = '/todos';
  
  constructor() {
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 10000
    });
  }
  
  /**
   * Todo 목록 조회
   */
  async getTodos(filter?: TodoFilter): Promise<Todo[]> {
    try {
      // 실제 API 구현 전 임시 데이터 사용
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

      // 필터 적용
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
          filteredTodos = filteredTodos.filter(todo => 
            todo.title.toLowerCase().includes(searchText) || 
            (todo.description && todo.description.toLowerCase().includes(searchText))
          );
        }
        
        // 마감일 범위 필터링
        if (filter.dueFrom) {
          filteredTodos = filteredTodos.filter(todo => 
            todo.dueDate && todo.dueDate >= filter.dueFrom
          );
        }
        
        if (filter.dueTo) {
          filteredTodos = filteredTodos.filter(todo => 
            todo.dueDate && todo.dueDate <= filter.dueTo
          );
        }
      }
      
      logger.info(`${filteredTodos.length}개의 할 일을 조회했습니다.`);
      return filteredTodos;
    } catch (error) {
      logger.error('할 일 목록 조회 실패:', error);
      throw new Error('할 일 목록을 불러오는 데 실패했습니다.');
    }
  }
  
  /**
   * 특정 ID의 Todo 조회
   */
  async getTodoById(id: string): Promise<Todo> {
    try {
      // 실제 API 구현 전 임시 데이터
      const mockTodos = await this.getTodos();
      const todo = mockTodos.find(t => t.id === id);
      
      if (!todo) {
        throw new Error(`ID ${id}에 해당하는 할 일을 찾을 수 없습니다.`);
      }
      
      return todo;
    } catch (error) {
      logger.error(`ID ${id} 할 일 조회 실패:`, error);
      throw new Error('할 일을 불러오는 데 실패했습니다.');
    }
  }
  
  /**
   * 새 Todo 생성
   */
  async createTodo(todoData: TodoCreateRequest): Promise<Todo> {
    try {
      // 실제 API 구현 전 임시 로직
      // 실제로는 API 호출하여 생성된 데이터를 받아옴
      const newTodo: Todo = {
        id: `${Date.now()}`,
        title: todoData.title,
        description: todoData.description,
        completed: todoData.completed ?? false,
        status: todoData.status ?? TodoStatus.PENDING,
        priority: todoData.priority ?? TodoPriority.MEDIUM,
        dueDate: todoData.dueDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        vehicleId: todoData.vehicleId,
        assignedTo: todoData.assignedTo,
        category: todoData.category
      };
      
      logger.info('새 할 일이 생성되었습니다:', newTodo.title);
      return newTodo;
    } catch (error) {
      logger.error('할 일 생성 실패:', error);
      throw new Error('새 할 일을 생성하는 데 실패했습니다.');
    }
  }
  
  /**
   * Todo 업데이트
   */
  async updateTodo(id: string, todoData: TodoUpdateRequest): Promise<Todo> {
    try {
      // 실제 API 구현 전 임시 로직
      const todo = await this.getTodoById(id);
      
      const updatedTodo: Todo = {
        ...todo,
        ...todoData,
        updatedAt: new Date().toISOString()
      };
      
      logger.info(`ID ${id} 할 일이 업데이트되었습니다.`);
      return updatedTodo;
    } catch (error) {
      logger.error(`ID ${id} 할 일 업데이트 실패:`, error);
      throw new Error('할 일을 업데이트하는 데 실패했습니다.');
    }
  }
  
  /**
   * Todo 삭제
   */
  async deleteTodo(id: string): Promise<boolean> {
    try {
      // 실제 API 구현 전 임시 로직
      // ID가 존재하는지 확인
      await this.getTodoById(id);
      
      logger.info(`ID ${id} 할 일이 삭제되었습니다.`);
      return true;
    } catch (error) {
      logger.error(`ID ${id} 할 일 삭제 실패:`, error);
      throw new Error('할 일을 삭제하는 데 실패했습니다.');
    }
  }
  
  /**
   * Todo 완료 상태 토글
   */
  async toggleComplete(id: string, completed: boolean): Promise<Todo> {
    try {
      const todo = await this.getTodoById(id);
      
      const status = completed ? TodoStatus.COMPLETED : TodoStatus.PENDING;
      
      return await this.updateTodo(id, { 
        completed, 
        status
      });
    } catch (error) {
      logger.error(`ID ${id} 할 일 완료 상태 변경 실패:`, error);
      throw new Error('할 일 상태를 변경하는 데 실패했습니다.');
    }
  }
} 