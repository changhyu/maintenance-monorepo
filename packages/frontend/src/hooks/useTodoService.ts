import { useState, useCallback } from 'react';
import axios from 'axios';

// 임시 타입 정의
export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignedTo?: string;
  vehicleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodoCreateRequest {
  title: string;
  description?: string;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignedTo?: string;
  vehicleId?: string;
}

export interface TodoUpdateRequest {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignedTo?: string;
  vehicleId?: string;
}

export interface TodoFilter {
  vehicleId?: string;
  assigneeId?: string;
  userId?: string;
  status?: 'completed' | 'pending';
  priority?: 'low' | 'medium' | 'high';
  dueFrom?: string;
  dueTo?: string;
}

// 임시 Todo 서비스 클래스
class TodoService {
  private basePath = '/api/todos';
  
  // 할일 목록 조회
  async getTodos(filter?: TodoFilter): Promise<Todo[]> {
    try {
      // 실제 구현에서는 API 호출
      // 현재는 더미 데이터 반환
      return this.getDummyTodos();
    } catch (error) {
      console.error('Error fetching todos:', error);
      throw error;
    }
  }

  // 특정 할일 조회
  async getTodoById(id: string): Promise<Todo> {
    try {
      // 실제 구현에서는 API 호출
      const todos = this.getDummyTodos();
      const todo = todos.find(todo => todo.id === id);
      
      if (!todo) {
        throw new Error(`Todo with ID ${id} not found`);
      }
      
      return todo;
    } catch (error) {
      console.error(`Error fetching todo ${id}:`, error);
      throw error;
    }
  }

  // 할일 생성
  async createTodo(todoData: TodoCreateRequest): Promise<Todo> {
    try {
      // 실제 구현에서는 API 호출
      const newTodo: Todo = {
        ...todoData,
        id: `temp-${Date.now()}`,
        completed: todoData.completed ?? false,
        priority: todoData.priority ?? 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return newTodo;
    } catch (error) {
      console.error('Error creating todo:', error);
      throw error;
    }
  }

  // 할일 업데이트
  async updateTodo(id: string, todoData: TodoUpdateRequest): Promise<Todo> {
    try {
      // 실제 구현에서는 API 호출
      const todos = this.getDummyTodos();
      const todoIndex = todos.findIndex(todo => todo.id === id);
      
      if (todoIndex === -1) {
        throw new Error(`Todo with ID ${id} not found`);
      }
      
      const updatedTodo: Todo = {
        ...todos[todoIndex],
        ...todoData,
        updatedAt: new Date().toISOString()
      };
      
      return updatedTodo;
    } catch (error) {
      console.error(`Error updating todo ${id}:`, error);
      throw error;
    }
  }

  // 할일 삭제
  async deleteTodo(id: string): Promise<void> {
    try {
      // 실제 구현에서는 API 호출
      // 현재는 아무것도 하지 않음
    } catch (error) {
      console.error(`Error deleting todo ${id}:`, error);
      throw error;
    }
  }

  // 곧 만기될 할일 조회
  async getUpcomingTodos(daysThreshold: number, filter?: Omit<TodoFilter, 'dueFrom' | 'dueTo'>): Promise<Todo[]> {
    try {
      // 실제 구현에서는 API 호출
      const todos = this.getDummyTodos();
      const now = new Date();
      const threshold = new Date(now);
      threshold.setDate(threshold.getDate() + daysThreshold);
      
      return todos.filter(todo => {
        if (!todo.dueDate) return false;
        
        const dueDate = new Date(todo.dueDate);
        return dueDate > now && dueDate <= threshold;
      });
    } catch (error) {
      console.error('Error fetching upcoming todos:', error);
      throw error;
    }
  }

  // 특정 사용자의 할일 조회
  async getUserTodos(userId: string, filter?: Omit<TodoFilter, 'userId'>): Promise<Todo[]> {
    try {
      // 실제 구현에서는 API 호출
      const todos = this.getDummyTodos();
      return todos.filter(todo => todo.assignedTo === userId);
    } catch (error) {
      console.error(`Error fetching todos for user ${userId}:`, error);
      throw error;
    }
  }
  
  // 더미 데이터 생성
  private getDummyTodos(): Todo[] {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return [
      {
        id: '1',
        title: '엔진 오일 교체',
        description: '5000km 주행 후 교체 필요',
        completed: false,
        priority: 'high',
        dueDate: tomorrow.toISOString().split('T')[0],
        vehicleId: 'v001',
        assignedTo: 'user1',
        createdAt: today.toISOString(),
        updatedAt: today.toISOString()
      },
      {
        id: '2',
        title: '타이어 공기압 점검',
        completed: true,
        priority: 'medium',
        vehicleId: 'v001',
        assignedTo: 'user2',
        createdAt: today.toISOString(),
        updatedAt: today.toISOString()
      },
      {
        id: '3',
        title: '브레이크 패드 교체',
        description: '마모 상태 확인 필요',
        completed: false,
        priority: 'high',
        dueDate: new Date(today.setDate(today.getDate() + 3)).toISOString().split('T')[0],
        vehicleId: 'v002',
        assignedTo: 'user1',
        createdAt: today.toISOString(),
        updatedAt: today.toISOString()
      }
    ];
  }
}

// Todo 서비스에서 사용할 상태 인터페이스
interface TodoServiceState {
  todos: Todo[];
  loading: boolean;
  error: string | null;
}

/**
 * Todo 서비스를 관리하는 커스텀 훅
 */
export const useTodoService = () => {
  const [state, setState] = useState<TodoServiceState>({
    todos: [],
    loading: false,
    error: null
  });

  // TodoService 인스턴스 생성
  const todoService = new TodoService();

  /**
   * Todo 목록 조회
   */
  const fetchTodos = useCallback(async (filter?: TodoFilter) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await todoService.getTodos(filter);
      setState(prev => ({ ...prev, todos: data, loading: false }));
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '할일 목록을 불러오는 중 오류가 발생했습니다.';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw err;
    }
  }, []);

  /**
   * 특정 Todo 조회
   */
  const fetchTodoById = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await todoService.getTodoById(id);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '할일을 불러오는 중 오류가 발생했습니다.';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw err;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  /**
   * Todo 생성
   */
  const createTodo = useCallback(async (todoData: TodoCreateRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const newTodo = await todoService.createTodo(todoData);
      setState(prev => ({
        ...prev,
        todos: [...prev.todos, newTodo],
        loading: false
      }));
      return newTodo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '할일을 생성하는 중 오류가 발생했습니다.';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw err;
    }
  }, [state.todos]);

  /**
   * Todo 업데이트
   */
  const updateTodo = useCallback(async (id: string, todoData: TodoUpdateRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const updatedTodo = await todoService.updateTodo(id, todoData);
      setState(prev => ({
        ...prev,
        todos: prev.todos.map(todo => (todo.id === id ? updatedTodo : todo)),
        loading: false
      }));
      return updatedTodo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '할일을 업데이트하는 중 오류가 발생했습니다.';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw err;
    }
  }, [state.todos]);

  /**
   * Todo 삭제
   */
  const deleteTodo = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await todoService.deleteTodo(id);
      setState(prev => ({
        ...prev,
        todos: prev.todos.filter(todo => todo.id !== id),
        loading: false
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '할일을 삭제하는 중 오류가 발생했습니다.';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw err;
    }
  }, [state.todos]);

  /**
   * 만기 임박 할일 조회
   */
  const fetchUpcomingTodos = useCallback(async (daysThreshold: number, filter?: Omit<TodoFilter, 'dueFrom' | 'dueTo'>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await todoService.getUpcomingTodos(daysThreshold, filter);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '만기 임박 할일을 불러오는 중 오류가 발생했습니다.';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw err;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  /**
   * 사용자 할일 조회
   */
  const fetchUserTodos = useCallback(async (userId: string, filter?: Omit<TodoFilter, 'userId'>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await todoService.getUserTodos(userId, filter);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '사용자 할일을 불러오는 중 오류가 발생했습니다.';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw err;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  return {
    ...state,
    fetchTodos,
    fetchTodoById,
    createTodo,
    updateTodo,
    deleteTodo,
    fetchUpcomingTodos,
    fetchUserTodos
  };
}; 