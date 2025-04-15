import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
  useMemo
} from 'react';

import { useTodoService } from '../hooks/useTodoService';
import todoNotificationService from '../services/todoNotificationService';
import {
  TodoService,
  Todo,
  TodoPriority,
  TodoStatus,
  TodoStatusType,
  TodoPriorityType,
  TodoCreateRequest,
  TodoUpdateRequest
} from '../services/todoService';
import { formatDate, isPastDate } from '../utils/dateUtils';
import logger from '../utils/logger';
import useNetwork from '../hooks/useNetwork';
import useLocalStorage from '../hooks/useLocalStorage';
import { SyncStatus, PendingChange as PendingChangeType, OfflineOperation } from '../types/todoTypes';

// 로컬 스토리지 키
const TODOS_STORAGE_KEY = 'vehicle_maintenance_todos';
const PENDING_CHANGES_KEY = 'vehicle_maintenance_pending_changes';
const LAST_SYNC_KEY = 'vehicle_maintenance_last_sync';

// 동기화 타입 정의
type SyncStatus = 'idle' | 'syncing' | 'error';
type PendingAction = 'create' | 'update' | 'delete';

// 오프라인에서 사용할 대기중인 변경사항 타입
interface PendingChange {
  id: string;
  action: PendingAction;
  data: Partial<TodoCreateRequest | TodoUpdateRequest>;
  timestamp: number;
  tempId?: string;
}

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
  isOffline: boolean;
  syncStatus: SyncStatus;
  hasPendingChanges: boolean;
  lastSyncTime: Date | null;
  isPending: boolean;

  // 기본 CRUD 작업
  fetchTodos: (filter?: TodoFilterType) => Promise<void>;
  createTodo: (todo: TodoCreateRequest) => Promise<Todo | null>;
  updateTodo: (id: string, todo: TodoUpdateRequest) => Promise<Todo | null>;
  deleteTodo: (id: string) => Promise<boolean>;
  toggleComplete: (id: string, completed: boolean) => Promise<Todo | null | boolean>;

  // 템플릿 관련
  createTodosFromTemplate: (template: TodoTemplate, vehicleId?: string) => Promise<Todo[]>;

  // 필터 관련
  setFilter: (filter: TodoFilterType) => void;
  clearFilter: () => void;

  // 동기화 관련
  syncPendingChanges: () => Promise<boolean>;
  refreshTodos: () => Promise<void>;

  // 알림 관련
  requestNotificationPermission: () => Promise<boolean>;
}

// 초기 컨텍스트 값
const initialContext: TodoContextType = {
  todos: [],
  loading: false,
  error: null,
  filter: {
    completed: 'all',
    priority: 'all',
    search: '',
    dueDate: 'all'
  },
  isOffline: !navigator.onLine,
  syncStatus: 'idle',
  hasPendingChanges: false,
  lastSyncTime: null,
  isPending: false,
  fetchTodos: async () => {},
  createTodo: async () => null,
  updateTodo: async () => null,
  deleteTodo: async () => false,
  toggleComplete: async () => null,
  createTodosFromTemplate: async () => [],
  setFilter: () => {},
  clearFilter: () => {},
  syncPendingChanges: async () => false,
  refreshTodos: async () => {},
  requestNotificationPermission: async () => false
};

// 컨텍스트 생성
const TodoContext = createContext<TodoContextType>(initialContext);

/**
 * Todo 컨텍스트 제공자 프롭스
 */
interface TodoProviderProps {
  children: ReactNode;
  initialTodos?: Todo[];
}

/**
 * Todo 컨텍스트 프로바이더
 */
export const TodoProvider = ({ children, initialTodos = [] }: TodoProviderProps) => {
  // useTodoService 훅 활용
  const todoServiceHook = useTodoService();
  const { isOnline } = useNetwork();
  const [isTransitionPending, setIsTransitionPending] = useState(false);

  // 로컬 스토리지 훅 활용
  const [localTodos, setLocalTodos] = useLocalStorage<Todo[]>(TODOS_STORAGE_KEY, []);
  const [pendingChanges, setPendingChanges] = useLocalStorage<PendingChange[]>(PENDING_CHANGES_KEY, []);
  const [lastSyncTime, setLastSyncTime] = useLocalStorage<string | null>(LAST_SYNC_KEY, null);

  // 상태 관리
  const [todos, setTodos] = useState<Todo[]>(initialTodos.length > 0 ? initialTodos : localTodos);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [filter, setFilterState] = useState<TodoFilterType>({
    completed: 'all',
    priority: 'all',
    search: '',
    dueDate: 'all'
  });

  // 필터링된 할 일 목록
  const filteredTodos = useMemo(() => {
    return todos.filter(todo => {
      // 완료 필터
      if (filter.completed !== 'all' && todo.completed !== (filter.completed === 'completed')) {
        return false;
      }

      // 우선순위 필터
      if (filter.priority !== 'all' && todo.priority !== filter.priority) {
        return false;
      }

      // 검색 필터
      if (filter.search && !(
        todo.title.toLowerCase().includes(filter.search.toLowerCase()) ||
        (todo.description && todo.description.toLowerCase().includes(filter.search.toLowerCase()))
      )) {
        return false;
      }

      // 마감일 필터
      if (filter.dueDate === 'today') {
        // isToday 대신 직접 날짜 비교
        if (!todo.dueDate) return false;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dueDate = new Date(todo.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        if (today.getTime() !== dueDate.getTime()) {
          return false;
        }
      }

      if (filter.dueDate === 'overdue' && (!todo.dueDate || !isPastDate(todo.dueDate))) {
        return false;
      }

      // 차량 필터
      if (filter.vehicleId && todo.vehicleId !== filter.vehicleId) {
        return false;
      }

      return true;
    });
  }, [todos, filter]);

  // 필터 설정
  const setFilter = useCallback((newFilter: TodoFilterType) => {
    setFilterState(prevFilter => ({
      ...prevFilter,
      ...newFilter
    }));
  }, []);

  // 필터 초기화
  const clearFilter = useCallback(() => {
    setFilterState({
      completed: 'all',
      priority: 'all',
      search: '',
      dueDate: 'all'
    });
  }, []);

  // 로컬 스토리지 동기화
  useEffect(() => {
    setLocalTodos(todos);
  }, [todos, setLocalTodos]);

  /**
   * Todo 목록 조회
   */
  const fetchTodos = useCallback(
    async (newFilter?: TodoFilterType) => {
      if (loading) return;
      
      setLoading(true);
      setError(null);

      try {
        const fetchedTodos = await todoServiceHook.fetchTodos(newFilter);
        
        setTodos(fetchedTodos);
        setLastSyncTime(new Date().toISOString());
      } catch (err) {
        // 오프라인이면 로컬 데이터 사용
        if (!isOnline) {
          logger.info('오프라인 모드에서 로컬 데이터 사용');
          return;
        }
        const error = err instanceof Error ? err : new Error('투두 조회 실패');
        setError(error);
        logger.error('투두 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    },
    [todoServiceHook, isOnline, loading, setLastSyncTime]
  );

  // 새로고침 함수
  const refreshTodos = useCallback(async () => {
    await fetchTodos(filter);
  }, [fetchTodos, filter]);

  /**
   * 대기 중인 변경사항 처리
   */
  const processPendingChanges = useCallback(async (): Promise<boolean> => {
    try {
      // 변경사항을 생성 시간 순으로 정렬
      const sortedChanges = [...pendingChanges].sort((a, b) => a.timestamp - b.timestamp);
      const failedChanges: PendingChange[] = [];

      // 각 변경사항 처리
      for (const change of sortedChanges) {
        try {
          if (change.action === 'create') {
            await todoServiceHook.createTodo(change.data as TodoCreateRequest);
          } else if (change.action === 'update') {
            await todoServiceHook.updateTodo(change.id, change.data as TodoUpdateRequest);
          } else if (change.action === 'delete') {
            await todoServiceHook.deleteTodo(change.id);
          }
        } catch (err) {
          logger.error(`변경사항 동기화 실패 (${change.action})`, err);
          failedChanges.push(change);
        }
      }

      // 실패한 변경사항만 유지
      setPendingChanges(failedChanges);

      // 동기화 완료 후 데이터 새로고침
      await fetchTodos();
      
      return failedChanges.length === 0;
    } catch (error) {
      logger.error('변경사항 처리 중 오류 발생:', error);
      return false;
    }
  }, [pendingChanges, todoServiceHook, setPendingChanges, fetchTodos]);

  /**
   * 대기 중인 변경사항 동기화
   */
  const syncPendingChanges = useCallback(async (): Promise<boolean> => {
    if (!isOnline || pendingChanges.length === 0 || isTransitionPending || syncStatus === 'syncing') {
      return false;
    }

    // 전환 시작
    setIsTransitionPending(true);
    setSyncStatus('syncing');

    try {
      logger.info(`동기화 시작: ${pendingChanges.length}개 변경사항 처리 중...`);
      const syncResult = await processPendingChanges();
      setLastSyncTime(new Date().toISOString());
      setSyncStatus('idle');
      return syncResult;
    } catch (error) {
      logger.error('동기화 중 오류 발생:', error);
      setSyncStatus('error');
      return false;
    } finally {
      setIsTransitionPending(false);
    }
  }, [isOnline, pendingChanges, syncStatus, isTransitionPending, processPendingChanges, setLastSyncTime]);

  // 온라인 상태 변경 시 자동 동기화
  useEffect(() => {
    if (isOnline && pendingChanges.length > 0) {
      syncPendingChanges();
    }
  }, [isOnline, pendingChanges.length, syncPendingChanges]);

  // 로컬 임시 ID 생성
  const generateTempId = useCallback((): string => {
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // 변경사항 추가 함수
  const addPendingChange = useCallback(
    (change: PendingChange) => {
      setPendingChanges(prev => {
        // 동일 ID에 대한 이전 변경사항 제거 (최신 것만 유지)
        const filtered = prev.filter(c => 
          c.id !== change.id || 
          (c.tempId && c.tempId !== change.tempId)
        );
        return [...filtered, change];
      });
    },
    [setPendingChanges]
  );

  /**
   * Todo 생성
   */
  const createTodo = useCallback(
    async (todo: TodoCreateRequest): Promise<Todo | null> => {
      setError(null);

      // 오프라인 모드 처리
      if (!isOnline) {
        const tempId = generateTempId();
        const timestamp = Date.now();
        
        // 임시 Todo 객체 생성
        const newTodo: Todo = {
          id: tempId,
          title: todo.title,
          description: todo.description || '',
          priority: todo.priority,
          status: todo.status || TodoStatus.PENDING,
          completed: false,
          dueDate: todo.dueDate || null,
          vehicleId: todo.vehicleId || '',
          createdAt: new Date(timestamp).toISOString(),
          updatedAt: new Date(timestamp).toISOString(),
          _tempId: tempId
        };
        
        // 변경사항 큐에 추가
        addPendingChange({
          id: tempId,
          tempId: tempId,
          action: 'create',
          data: todo,
          timestamp
        });
        
        // 로컬 상태 업데이트
        setTodos(prevTodos => [...prevTodos, newTodo]);
        
        return newTodo;
      }

      setLoading(true);

      try {
        const newTodo = await todoServiceHook.createTodo(todo);
        
        // 상태 업데이트
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
        
        // 오프라인으로 전환된 경우 로컬에 저장
        if (!navigator.onLine) {
          return createTodo(todo);
        }
        
        return null;
      } finally {
        setLoading(false);
      }
    },
    [isOnline, todoServiceHook, generateTempId, addPendingChange]
  );

  /**
   * Todo 수정
   */
  const updateTodo = useCallback(
    async (id: string, updates: TodoUpdateRequest): Promise<Todo | null> => {
      setError(null);

      // 임시 ID로 시작하는 경우 로컬 업데이트
      const isTempId = id.startsWith('temp-');
      
      // 오프라인 모드 처리
      if (!isOnline || isTempId) {
        const timestamp = Date.now();
        const existingTodoIndex = todos.findIndex(t => t.id === id);
        
        if (existingTodoIndex === -1) {
          return null;
        }
        
        const existingTodo = todos[existingTodoIndex];
        const updatedTodo = {
          ...existingTodo,
          ...updates,
          updatedAt: new Date(timestamp).toISOString()
        };
        
        // 변경사항 큐에 추가
        addPendingChange({
          id,
          tempId: existingTodo._tempId,
          action: 'update',
          data: updates,
          timestamp
        });
        
        // 로컬 상태 업데이트
        setTodos(prevTodos => 
          prevTodos.map(todo => todo.id === id ? updatedTodo : todo)
        );
        
        return updatedTodo;
      }

      setLoading(true);

      try {
        const oldTodo = todos.find(t => t.id === id);
        const updatedTodo = await todoServiceHook.updateTodo(id, updates);

        // 상태 업데이트
        setTodos(prevTodos => prevTodos.map(todo => todo.id === id ? updatedTodo : todo));

        // 상태 변경 시 알림 생성
        if (oldTodo && oldTodo.status !== updates.status && updatedTodo) {
          todoNotificationService.notifyStatusChange(updatedTodo, oldTodo.completed);
        }

        return updatedTodo;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('투두 수정 실패');
        setError(error);
        logger.error('투두 수정 실패:', error);
        
        // 오프라인으로 전환된 경우 로컬에 저장
        if (!navigator.onLine) {
          return updateTodo(id, updates);
        }
        
        return null;
      } finally {
        setLoading(false);
      }
    },
    [isOnline, todos, todoServiceHook, addPendingChange]
  );

  /**
   * Todo 삭제
   */
  const deleteTodo = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);

      // 임시 ID로 시작하는 경우 로컬 삭제
      const isTempId = id.startsWith('temp-');
      
      // 오프라인 모드 처리
      if (!isOnline || isTempId) {
        const timestamp = Date.now();
        const existingTodoIndex = todos.findIndex(t => t.id === id);
        
        if (existingTodoIndex === -1) {
          return false;
        }
        
        const existingTodo = todos[existingTodoIndex];
        
        // 이미 임시 ID인 경우 대기 목록에서 제거, 아니면 삭제 요청 추가
        if (isTempId) {
          // 임시 ID 항목은 대기열에서 해당 생성 요청 제거
          setPendingChanges(prev => 
            prev.filter(change => 
              !(change.tempId === id && change.action === 'create')
            )
          );
        } else {
          // 실제 ID인 경우 삭제 요청 추가
          addPendingChange({
            id,
            action: 'delete',
            data: {},
            timestamp
          });
        }
        
        // 로컬 상태 업데이트
        setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
        
        return true;
      }

      setLoading(true);

      try {
        const success = await todoServiceHook.deleteTodo(id);
        
        if (success) {
          // 상태 업데이트
          setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
        }
        
        return success;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('투두 삭제 실패');
        setError(error);
        logger.error('투두 삭제 실패:', error);
        
        // 오프라인으로 전환된 경우 로컬에 저장
        if (!navigator.onLine) {
          return deleteTodo(id);
        }
        
        return false;
      } finally {
        setLoading(false);
      }
    },
    [isOnline, todos, todoServiceHook, addPendingChange]
  );

  /**
   * Todo 완료 상태 토글
   */
  const toggleComplete = useCallback(
    async (id: string, completed: boolean): Promise<Todo | null | boolean> => {
      // 상태 업데이트 함수에 위임
      return updateTodo(id, { completed });
    },
    [updateTodo]
  );

  /**
   * 템플릿으로부터 Todo 생성
   */
  const createTodosFromTemplate = useCallback(
    async (template: TodoTemplate, vehicleId?: string): Promise<Todo[]> => {
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

          const newTodo = await createTodo(todoData);
          if (newTodo) {
            createdTodos.push(newTodo);
          }
        }

        return createdTodos;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('템플릿 적용 실패');
        setError(error);
        logger.error('템플릿 적용 실패:', error);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [createTodo]
  );

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
    const intervalId = setInterval(
      () => {
        checkUpcomingDueTodos();
        checkOverdueTodos();
      },
      60 * 60 * 1000
    ); // 1시간마다

    return () => clearInterval(intervalId);
  }, [checkUpcomingDueTodos, checkOverdueTodos]);

  // 정기적인 데이터 동기화 (10분마다)
  useEffect(() => {
    if (!isOnline) return;
    
    const intervalId = setInterval(
      () => {
        refreshTodos();
      },
      10 * 60 * 1000
    ); // 10분마다
    
    return () => clearInterval(intervalId);
  }, [isOnline, refreshTodos]);

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
    if (todos.length === 0 || !localTodos.length) {
      fetchTodos();
    }
  }, [fetchTodos, todos.length, localTodos.length]);

  // 컨텍스트 값
  const contextValue: TodoContextType = {
    todos: filteredTodos,
    loading,
    error,
    filter,
    isOffline: !isOnline,
    syncStatus,
    hasPendingChanges: pendingChanges.length > 0,
    lastSyncTime: lastSyncTime ? new Date(lastSyncTime) : null,
    isPending: isTransitionPending,
    fetchTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
    createTodosFromTemplate,
    setFilter,
    clearFilter,
    syncPendingChanges,
    refreshTodos,
    requestNotificationPermission
  };

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
  
  if (context === undefined) {
    throw new Error('useTodoContext는 TodoProvider 내부에서 사용해야 합니다');
  }
  
  return context;
};

export default TodoContext;
