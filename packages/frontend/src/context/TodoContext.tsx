import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Todo 아이템 인터페이스
export interface TodoItem {
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

// Todo 컨텍스트 인터페이스
interface TodoContextType {
  todos: TodoItem[];
  loading: boolean;
  error: string | null;
  addTodo: (todo: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTodo: (id: string, updates: Partial<TodoItem>) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;
  refreshTodos: () => Promise<void>;
}

// 초기 컨텍스트 값
const initialTodoContext: TodoContextType = {
  todos: [],
  loading: false,
  error: null,
  addTodo: async () => {},
  updateTodo: async () => {},
  removeTodo: async () => {},
  refreshTodos: async () => {}
};

// Todo 컨텍스트 생성
const TodoContext = createContext<TodoContextType>(initialTodoContext);

// 컨텍스트 훅
export const useTodoContext = () => useContext(TodoContext);

// Props 인터페이스
interface TodoProviderProps {
  children: ReactNode;
}

/**
 * Todo 컨텍스트 제공자 컴포넌트
 */
export const TodoProvider: React.FC<TodoProviderProps> = ({ children }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 초기 데이터 로드
  useEffect(() => {
    refreshTodos();
  }, []);

  /**
   * Todo 목록 새로고침
   */
  const refreshTodos = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // 실제 API 호출은 향후 구현
      // 샘플 데이터 사용
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const sampleTodos: TodoItem[] = [
        {
          id: '1',
          title: '엔진 오일 교체',
          description: '5000km 주행 후 교체 필요',
          completed: false,
          priority: 'high',
          dueDate: tomorrow.toISOString().split('T')[0],
          vehicleId: 'v001',
          createdAt: today.toISOString(),
          updatedAt: today.toISOString()
        },
        {
          id: '2',
          title: '타이어 공기압 점검',
          completed: true,
          priority: 'medium',
          vehicleId: 'v001',
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
          createdAt: today.toISOString(),
          updatedAt: today.toISOString()
        }
      ];
      
      setTodos(sampleTodos);
    } catch (err) {
      setError('정비 작업을 불러오는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 새 Todo 추가
   */
  const addTodo = async (todo: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // 실제 API 호출은 향후 구현
      // 임시 ID 생성
      const now = new Date();
      const newTodo: TodoItem = {
        ...todo,
        id: `temp-${Date.now()}`,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      
      setTodos(prev => [...prev, newTodo]);
    } catch (err) {
      setError('정비 작업을 추가하는 중 오류가 발생했습니다.');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Todo 업데이트
   */
  const updateTodo = async (id: string, updates: Partial<TodoItem>): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // 실제 API 호출은 향후 구현
      const now = new Date();
      setTodos(prevTodos => 
        prevTodos.map(todo => 
          todo.id === id
            ? { 
                ...todo, 
                ...updates, 
                updatedAt: now.toISOString() 
              }
            : todo
        )
      );
    } catch (err) {
      setError('정비 작업을 업데이트하는 중 오류가 발생했습니다.');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Todo 삭제
   */
  const removeTodo = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // 실제 API 호출은 향후 구현
      setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
    } catch (err) {
      setError('정비 작업을 삭제하는 중 오류가 발생했습니다.');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 컨텍스트 값
  const value: TodoContextType = {
    todos,
    loading,
    error,
    addTodo,
    updateTodo,
    removeTodo,
    refreshTodos
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
};

export default TodoProvider; 