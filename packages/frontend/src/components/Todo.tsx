import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTodoService, Todo as TodoType, TodoCreateRequest, TodoFilter as FilterType, TodoUpdateRequest } from '../hooks/useTodoService';
import TodoFilter from './TodoFilter';

/**
 * Todo 컴포넌트 프롭스 인터페이스
 */
interface TodoProps {
  vehicleId?: string;
  className?: string;
  showCompleted?: boolean;
  onTodoClick?: (todo: TodoType) => void;
  onCreateTodo?: (todoData: TodoCreateRequest) => Promise<TodoType>;
  onUpdateTodo?: (id: string, updates: TodoUpdateRequest) => Promise<TodoType>;
  onDeleteTodo?: (id: string) => Promise<void>;
}

/**
 * 정비 작업 관리를 위한 Todo 컴포넌트
 */
const Todo: React.FC<TodoProps> = ({ 
  vehicleId, 
  className = '', 
  showCompleted = true,
  onTodoClick,
  onCreateTodo,
  onUpdateTodo,
  onDeleteTodo
}) => {
  const navigate = useNavigate();
  const { 
    todos, 
    loading: serviceLoading, 
    error: serviceError, 
    fetchTodos,
    createTodo: serviceCreateTodo,
    updateTodo: serviceUpdateTodo,
    deleteTodo: serviceDeleteTodo 
  } = useTodoService();
  
  const [filteredTodos, setFilteredTodos] = useState<TodoType[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 필터 상태
  const [currentFilter, setCurrentFilter] = useState<FilterType>({});

  // 초기 데이터 로드
  useEffect(() => {
    const loadTodos = async () => {
      try {
        await fetchTodos(vehicleId ? { vehicleId, ...currentFilter } : currentFilter);
      } catch (err) {
        console.error('Failed to load todos:', err);
      }
    };
    
    loadTodos();
  }, [fetchTodos, vehicleId, currentFilter]);

  // 필터링된 Todo 항목 설정
  useEffect(() => {
    if (!todos) return;

    let filtered = [...todos];
    
    // 완료 상태로 필터링 (컴포넌트 prop 기반)
    if (!showCompleted) {
      filtered = filtered.filter(todo => !todo.completed);
    }
    
    // 우선순위 및 날짜로 정렬
    filtered.sort((a, b) => {
      // 우선순위로 먼저 정렬
      const priorityValues = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityValues[b.priority] - priorityValues[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // 날짜로 정렬
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });
    
    setFilteredTodos(filtered);
  }, [todos, vehicleId, showCompleted]);

  // 새 Todo 추가
  const handleAddTodo = async () => {
    if (!newTodo.trim()) return;
    
    setLoading(true);
    setError(null);
    
    const todoData: TodoCreateRequest = {
      title: newTodo.trim(),
      completed: false,
      priority,
      vehicleId,
      dueDate: dueDate || undefined
    };
    
    try {
      // 외부 핸들러 사용 또는 서비스 직접 호출
      if (onCreateTodo) {
        await onCreateTodo(todoData);
      } else {
        await serviceCreateTodo(todoData);
      }
      
      setNewTodo('');
      setPriority('medium');
      setDueDate('');
    } catch (err) {
      setError('정비 작업을 추가하는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Todo 상태 토글
  const handleToggleComplete = async (id: string, completed: boolean) => {
    try {
      // 외부 핸들러 사용 또는 서비스 직접 호출
      if (onUpdateTodo) {
        await onUpdateTodo(id, { completed: !completed });
      } else {
        await serviceUpdateTodo(id, { completed: !completed });
      }
    } catch (err) {
      console.error('Failed to update todo:', err);
    }
  };

  // Todo 삭제
  const handleRemoveTodo = async (id: string) => {
    if (window.confirm('이 정비 작업을 삭제하시겠습니까?')) {
      try {
        // 외부 핸들러 사용 또는 서비스 직접 호출
        if (onDeleteTodo) {
          await onDeleteTodo(id);
        } else {
          await serviceDeleteTodo(id);
        }
      } catch (err) {
        console.error('Failed to delete todo:', err);
      }
    }
  };

  // Todo 클릭 시 상세보기
  const handleTodoClick = (todo: TodoType) => {
    if (onTodoClick) {
      onTodoClick(todo);
    }
  };

  // 필터 변경 처리
  const handleFilterChange = (filter: FilterType) => {
    setCurrentFilter(filter);
  };

  // 차량 상세 페이지로 이동
  const handleViewVehicle = (e: React.MouseEvent, vehicleId: string) => {
    e.stopPropagation();
    navigate(`/vehicles/${vehicleId}`);
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 서비스 에러 표시
  const displayError = serviceError || error;

  return (
    <div className={`todo-component ${className}`}>
      <h2 className="text-xl font-bold mb-4">정비 작업</h2>
      
      {/* 필터링 컴포넌트 */}
      <TodoFilter
        onFilterChange={handleFilterChange}
        className="mb-6"
      />
      
      {/* 새 작업 추가 폼 */}
      <div className="flex flex-col gap-2 mb-4">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="새 정비 작업 추가..."
          className="border p-2 rounded"
        />
        
        <div className="flex gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
            className="border p-2 rounded"
          >
            <option value="low">낮음</option>
            <option value="medium">중간</option>
            <option value="high">높음</option>
          </select>
          
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border p-2 rounded"
          />
          
          <button
            onClick={handleAddTodo}
            disabled={loading || serviceLoading || !newTodo.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            {loading || serviceLoading ? '처리 중...' : '추가'}
          </button>
        </div>
        
        {displayError && <p className="text-red-500 text-sm">{displayError}</p>}
      </div>

      {/* Todo 목록 */}
      {serviceLoading ? (
        <p className="text-gray-500">로딩 중...</p>
      ) : filteredTodos.length === 0 ? (
        <p className="text-gray-500">등록된 정비 작업이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {filteredTodos.map((todo) => (
            <li
              key={todo.id}
              onClick={() => handleTodoClick(todo)}
              className={`border p-3 rounded flex items-center justify-between ${
                todo.completed ? 'bg-gray-100' : ''
              } cursor-pointer hover:bg-gray-50`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleToggleComplete(todo.id, todo.completed);
                  }}
                />
                
                <div>
                  <p className={todo.completed ? 'line-through text-gray-500' : ''}>
                    {todo.title}
                  </p>
                  
                  <div className="flex gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-1 rounded ${getPriorityClass(todo.priority)}`}
                    >
                      {todo.priority === 'high'
                        ? '높음'
                        : todo.priority === 'medium'
                        ? '중간'
                        : '낮음'}
                    </span>
                    
                    {todo.dueDate && (
                      <span className="text-xs text-gray-600">
                        마감일: {new Date(todo.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    
                    {todo.vehicleId && (
                      <button
                        onClick={(e) => handleViewVehicle(e, todo.vehicleId!)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        차량 보기
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTodo(todo.id);
                }}
                className="text-red-500 hover:text-red-700"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Todo; 