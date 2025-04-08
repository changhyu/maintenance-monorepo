import { ApiClient } from '../client';

export enum TodoPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum TodoStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  userId: string;
  assigneeId?: string;
  status: TodoStatus;
  priority: TodoPriority;
  dueDate?: string;
  completedAt?: string;
  relatedEntityType?: 'vehicle' | 'maintenance' | 'shop' | 'other';
  relatedEntityId?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TodoCreateRequest {
  title: string;
  description?: string;
  userId: string;
  assigneeId?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  dueDate?: string;
  relatedEntityType?: 'vehicle' | 'maintenance' | 'shop' | 'other';
  relatedEntityId?: string;
  tags?: string[];
}

export interface TodoUpdateRequest {
  title?: string;
  description?: string;
  assigneeId?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  dueDate?: string;
  relatedEntityType?: 'vehicle' | 'maintenance' | 'shop' | 'other';
  relatedEntityId?: string;
  tags?: string[];
}

export interface TodoFilter {
  userId?: string;
  assigneeId?: string;
  status?: TodoStatus | TodoStatus[];
  priority?: TodoPriority | TodoPriority[];
  dueFrom?: string;
  dueTo?: string;
  relatedEntityType?: 'vehicle' | 'maintenance' | 'shop' | 'other';
  relatedEntityId?: string;
  tags?: string[];
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class TodoService {
  private client: ApiClient;
  private basePath = '/todos';

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  // 할일 목록 조회
  async getTodos(filter?: TodoFilter): Promise<Todo[]> {
    return this.client.get<Todo[]>(this.basePath, { params: filter });
  }

  // 특정 할일 조회
  async getTodoById(id: string): Promise<Todo> {
    return this.client.get<Todo>(`${this.basePath}/${id}`);
  }

  // 할일 생성
  async createTodo(todoData: TodoCreateRequest): Promise<Todo> {
    return this.client.post<Todo>(this.basePath, todoData);
  }

  // 할일 업데이트
  async updateTodo(id: string, todoData: TodoUpdateRequest): Promise<Todo> {
    return this.client.put<Todo>(`${this.basePath}/${id}`, todoData);
  }

  // 할일 삭제
  async deleteTodo(id: string): Promise<void> {
    return this.client.delete(`${this.basePath}/${id}`);
  }

  // 할일 상태 변경
  async updateTodoStatus(id: string, status: TodoStatus): Promise<Todo> {
    return this.client.patch<Todo>(`${this.basePath}/${id}/status`, { status });
  }

  // 할일 완료 처리
  async completeTodo(id: string): Promise<Todo> {
    return this.client.patch<Todo>(`${this.basePath}/${id}/complete`, {
      status: TodoStatus.COMPLETED,
      completedAt: new Date().toISOString()
    });
  }

  // 특정 사용자의 할일 조회
  async getUserTodos(userId: string, filter?: Omit<TodoFilter, 'userId'>): Promise<Todo[]> {
    return this.client.get<Todo[]>(`/users/${userId}/todos`, { params: filter });
  }

  // 특정 담당자의 할일 조회
  async getAssigneeTodos(assigneeId: string, filter?: Omit<TodoFilter, 'assigneeId'>): Promise<Todo[]> {
    return this.client.get<Todo[]>(`${this.basePath}/assignee/${assigneeId}`, { params: filter });
  }

  // 특정 엔티티와 관련된 할일 조회
  async getRelatedTodos(entityType: 'vehicle' | 'maintenance' | 'shop', entityId: string): Promise<Todo[]> {
    return this.client.get<Todo[]>(`${this.basePath}/related/${entityType}/${entityId}`);
  }

  // 만기된 할일 조회
  async getOverdueTodos(filter?: Omit<TodoFilter, 'dueFrom' | 'dueTo'>): Promise<Todo[]> {
    return this.client.get<Todo[]>(`${this.basePath}/overdue`, { params: filter });
  }

  // 곧 만기될 할일 조회 (오늘 기준 N일 이내)
  async getUpcomingTodos(daysThreshold: number, filter?: Omit<TodoFilter, 'dueFrom' | 'dueTo'>): Promise<Todo[]> {
    return this.client.get<Todo[]>(`${this.basePath}/upcoming`, { 
      params: { daysThreshold, ...filter }
    });
  }
} 