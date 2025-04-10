import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { TodoService, Todo, TodoPriority, TodoStatus, TodoUpdateRequest, TodoCreateRequest, TodoStatusType, TodoPriorityType } from '../services/todoService';
import todoNotificationService, { NotificationType, TodoNotification } from '../services/todoNotificationService';
import { formatDate, isPastDate } from '../utils/dateUtils';
import logger from '../utils/logger';

/**
 * Todo 템플릿 인터페이스
 */
export interface TodoTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  items: {
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high';
    status?: 'todo' | 'in_progress' | 'completed';
    dueDate?: string;
  }[];
}

/**
 * Todo 필터 타입
 */
export interface TodoFilterType {
  completed?: TodoStatusType | 'all';
  priority?: TodoPriorityType | 'all';
  search?: string;
  dueDate?: 'today' | 'overdue' | 'all';
  vehicleId?: string;
}

/**
 * Todo 컨텍스트 타입
 */
export interface TodoContextType {
  // 상태
  todos: Todo[];
  loading: boolean;
  error: Error | null;
  filter: TodoFilterType;
  
  // 기본 CRUD 작업
  fetchTodos: (filter?: TodoFilterType) => Promise<void>;
  createTodo: (todo: TodoCreateRequest) => Promise<Todo | null>;
  updateTodo: (id: string, todo: TodoUpdateRequest) => Promise<Todo | null>;
  deleteTodo: (id: string) => Promise<boolean>;
  toggleComplete: (id: string, completed: boolean) => Promise<Todo | null>;
  
  // 템플릿 관련
  createTodosFromTemplate: (template: TodoTemplate, vehicleId?: string) => Promise<Todo[]>;
  
  // 필터 관련
  setFilter: (filter: TodoFilterType) => void;
  
  // 알림 관련
  requestNotificationPermission: () => Promise<boolean>;
}

// 컨텍스트 생성
const TodoContext = createContext<TodoContextType | undefined>(undefined);

/**
 * Todo 컨텍스트 제공자 프롭스
 */
interface TodoProviderProps {
  children: ReactNode;
}

// TodoService 인스턴스 생성
const todoService = new TodoService();

/**
 * Todo 컨텍스트 프로바이더
 */
export const TodoProvider: React.FC<TodoProviderProps> = ({ children }) => {
  // 상태 관리
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<TodoFilterType>({
    completed: 'all',
    priority: 'all',
    search: '',
    dueDate: 'all'
  });

  /**
   * Todo 목록 조회
   */
  const fetchTodos = useCallback(async (newFilter?: TodoFilterType) => {
    setLoading(true);
    setError(null);
    
    try {
      const fetchedTodos = await todoService.getTodos();
      setTodos(fetchedTodos);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('투두 조회 실패');
      setError(error);
      logger.error('투두 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Todo 생성
   */
  const createTodo = useCallback(async (todo: TodoCreateRequest): Promise<Todo | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const newTodo = await todoService.createTodo(todo);
      setTodos(prevTodos => [...prevTodos, newTodo]);
      
      // 우선순위가 높은 경우 알림 생성
      if (todo.priority === TodoPriority.HIGH) {
        todoNotificationService.notifyHighPriorityTodo(newTodo);
      }
      
      return newTodo;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('투두 생성 실패');
      setError(error);
      logger.error('투두 생성 실패:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Todo 수정
   */
  const updateTodo = useCallback(async (id: string, todo: TodoUpdateRequest): Promise<Todo | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const oldTodo = todos.find(t => t.id === id);
      const updatedTodo = await todoService.updateTodo(id, todo);
      
      setTodos(prevTodos => 
        prevTodos.map(t => t.id === id ? updatedTodo : t)
      );
      
      // 상태 변경 시 알림 생성
      if (oldTodo && oldTodo.status !== todo.status) {
        const completedChanged = oldTodo.completed !== updatedTodo.completed;
        todoNotificationService.notifyStatusChange(updatedTodo, oldTodo.completed);
      }
      
      return updatedTodo;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('투두 수정 실패');
      setError(error);
      logger.error('투두 수정 실패:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [todos]);

  /**
   * Todo 삭제
   */
  const deleteTodo = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      await todoService.deleteTodo(id);
      setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('투두 삭제 실패');
      setError(error);
      logger.error('투두 삭제 실패:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Todo 완료 상태 토글
   */
  const toggleComplete = useCallback(async (id: string, completed: boolean): Promise<Todo | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const status = completed ? TodoStatus.COMPLETED : TodoStatus.PENDING;
      const updatedTodo = await todoService.updateTodo(id, { status });
      
      setTodos(prevTodos => 
        prevTodos.map(todo => todo.id === id ? updatedTodo : todo)
      );
      
      // 완료 상태 변경 시 알림
      const originalTodo = todos.find(t => t.id === id);
      if (originalTodo) {
        todoNotificationService.notifyStatusChange(updatedTodo, !completed);
      }
      
      return updatedTodo;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('투두 상태 변경 실패');
      setError(error);
      logger.error('투두 상태 변경 실패:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [todos]);

  /**
   * 템플릿으로부터 Todo 생성
   */
  const createTodosFromTemplate = useCallback(async (template: TodoTemplate, vehicleId?: string): Promise<Todo[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const createdTodos: Todo[] = [];
      
      // 각 템플릿 항목에 대해 Todo 생성
      for (const item of template.items) {
        const todoData: TodoCreateRequest = {
          title: item.title,
          description: item.description || '',
          priority: item.priority as TodoPriorityType,
          status: (item.status as TodoStatusType) || TodoStatus.PENDING,
          dueDate: item.dueDate,
          vehicleId: vehicleId
        };
        
        const newTodo = await todoService.createTodo(todoData);
        createdTodos.push(newTodo);
        
        // 우선순위가 높은 경우 알림 생성
        if (item.priority === TodoPriority.HIGH) {
          todoNotificationService.notifyHighPriorityTodo(newTodo);
        }
      }
      
      // 전체 투두 목록에 추가
      setTodos(prevTodos => [...prevTodos, ...createdTodos]);
      
      return createdTodos;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('템플릿 적용 실패');
      setError(error);
      logger.error('템플릿 적용 실패:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 마감일이 임박한 Todo 확인 및 알림
   */
  const checkUpcomingDueTodos = useCallback(() => {
    if (todos.length > 0) {
      todoNotificationService.checkAndNotifyUpcomingDue(todos);
    }
  }, [todos]);

  /**
   * 마감일이 지난 Todo 확인 및 알림
   */
  const checkOverdueTodos = useCallback(() => {
    if (todos.length > 0) {
      todoNotificationService.checkAndNotifyOverdue(todos);
    }
  }, [todos]);

  // Todo 데이터 로드 후 알림 체크
  useEffect(() => {
    if (todos.length > 0) {
      checkUpcomingDueTodos();
      checkOverdueTodos();
    }
  }, [todos, checkUpcomingDueTodos, checkOverdueTodos]);

  // 정기적인 알림 체크 (1시간마다)
  useEffect(() => {
    const intervalId = setInterval(() => {
      checkUpcomingDueTodos();
      checkOverdueTodos();
    }, 60 * 60 * 1000); // 1시간마다
    
    return () => clearInterval(intervalId);
  }, [checkUpcomingDueTodos, checkOverdueTodos]);

  /**
   * 알림 권한 요청
   */
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    try {
      return await todoNotificationService.requestNotificationPermission();
    } catch (error) {
      logger.error('알림 권한 요청 실패:', error);
      return false;
    }
  }, []);

  /**
   * 초기 데이터 로드
   */
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  // 컨텍스트 값 메모이제이션
  const contextValue = useMemo<TodoContextType>(() => ({
    todos,
    loading,
    error,
    filter,
    fetchTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
    createTodosFromTemplate,
    setFilter,
    requestNotificationPermission
  }), [
    todos,
    loading,
    error,
    filter,
    fetchTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
    createTodosFromTemplate,
    setFilter,
    requestNotificationPermission
  ]);
  
  return (
    <TodoContext.Provider value={contextValue}>
      {children}
    </TodoContext.Provider>
  );
};

/**
 * Todo 컨텍스트 사용 훅
 */
export const useTodoContext = (): TodoContextType => {
  const context = useContext(TodoContext);
  
  if (!context) {
    throw new Error('useTodoContext는 TodoProvider 내부에서만 사용할 수 있습니다.');
  }
  
  return context;
};

export default TodoContext; 