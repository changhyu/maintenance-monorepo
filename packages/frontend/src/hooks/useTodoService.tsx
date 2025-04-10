import { useState, useCallback, useEffect } from 'react';
import { TodoService, Todo, TodoCreateRequest, TodoStatusType, TodoPriorityType, TodoFilter } from '../services/todoService';
import type { TodoUpdateRequest as ServiceTodoUpdateRequest } from '../services/todoService';
import { TodoFilterType } from '../context/TodoContext';

// TodoUpdateRequest 타입을 확장
export interface TodoUpdateRequest extends ServiceTodoUpdateRequest {
  vehicleId?: string;
}

// TodoFilterType을 TodoFilter로 변환하는 어댑터 함수
const adaptContextFilterToServiceFilter = (filter?: TodoFilterType): TodoFilter | undefined => {
  if (!filter) return undefined;
  
  const serviceFilter: TodoFilter = {};
  
  if (filter.completed && filter.completed !== 'all') {
    serviceFilter.completed = filter.completed === 'completed';
  }
  
  if (filter.priority && filter.priority !== 'all') {
    serviceFilter.priority = filter.priority;
  }
  
  if (filter.search) {
    serviceFilter.searchText = filter.search;
  }
  
  if (filter.dueDate === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    serviceFilter.dueFrom = today.toISOString().split('T')[0];
    today.setHours(23, 59, 59, 999);
    serviceFilter.dueTo = today.toISOString().split('T')[0];
  } else if (filter.dueDate === 'overdue') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    serviceFilter.dueTo = today.toISOString().split('T')[0];
  }
  
  if (filter.vehicleId) {
    serviceFilter.vehicleId = filter.vehicleId;
  }
  
  return serviceFilter;
};

/**
 * Todo 서비스 관련 상태와 기능을 제공하는 커스텀 훅
 */
export const useTodoService = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // TodoService 인스턴스 생성
  const todoService = new TodoService();
  
  /**
   * Todo 목록 조회
   */
  const fetchTodos = useCallback(async (filter?: TodoFilterType): Promise<Todo[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const serviceFilter = adaptContextFilterToServiceFilter(filter);
      const fetchedTodos = await todoService.getTodos(serviceFilter);
      setTodos(fetchedTodos);
      return fetchedTodos;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('할 일 목록을 불러오는 데 실패했습니다.');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [todoService]);
  
  /**
   * 특정 Todo 항목 조회
   */
  const fetchTodoById = useCallback(async (id: string): Promise<Todo> => {
    setLoading(true);
    setError(null);
    
    try {
      return await todoService.getTodoById(id);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('할 일을 불러오는 데 실패했습니다.');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [todoService]);
  
  /**
   * Todo 생성
   */
  const createTodo = useCallback(async (todoData: TodoCreateRequest): Promise<Todo> => {
    setLoading(true);
    setError(null);
    
    try {
      const newTodo = await todoService.createTodo(todoData);
      setTodos(prevTodos => [...prevTodos, newTodo]);
      return newTodo;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('할 일을 생성하는 데 실패했습니다.');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [todoService]);
  
  /**
   * Todo 업데이트
   */
  const updateTodo = useCallback(async (id: string, updates: TodoUpdateRequest): Promise<Todo> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedTodo = await todoService.updateTodo(id, updates);
      setTodos(prevTodos => 
        prevTodos.map(todo => todo.id === id ? updatedTodo : todo)
      );
      return updatedTodo;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('할 일을 업데이트하는 데 실패했습니다.');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [todoService]);
  
  /**
   * Todo 삭제
   */
  const deleteTodo = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await todoService.deleteTodo(id);
      if (success) {
        setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
      }
      return success;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('할 일을 삭제하는 데 실패했습니다.');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [todoService]);
  
  /**
   * Todo 완료 상태 토글
   */
  const toggleComplete = useCallback(async (id: string, completed: boolean): Promise<{ todo: Todo, previousState: { completed: boolean } }> => {
    setLoading(true);
    setError(null);
    
    try {
      // 현재 상태 기억
      const todoToUpdate = todos.find(todo => todo.id === id);
      if (!todoToUpdate) throw new Error('해당 ID의 할 일을 찾을 수 없습니다.');
      
      const previousState = { completed: todoToUpdate.completed };
      
      // 업데이트 실행
      const updatedTodo = await todoService.toggleComplete(id, completed);
      
      // 상태 업데이트
      setTodos(prevTodos => 
        prevTodos.map(todo => todo.id === id ? updatedTodo : todo)
      );
      
      return { todo: updatedTodo, previousState };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('할 일 상태를 변경하는 데 실패했습니다.');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [todos, todoService]);
  
  return {
    todos,
    loading,
    error,
    fetchTodos,
    fetchTodoById,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete
  };
};

// 필요한 타입을 다시 내보내기
export type { Todo, TodoCreateRequest, TodoStatusType, TodoPriorityType, TodoFilter } from '../services/todoService'; 