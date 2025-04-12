import React, { useState, useEffect } from 'react';

import { Space, Card, Typography, Spin, Alert, Divider, Empty, Badge, Button } from 'antd';

import TodoComponent from './TodoComponent';
import TodoAuthWrapper from './TodoAuthWrapper';
import OfflineNotice from './OfflineNotice';
import { Todo as TodoType, TodoCreateRequest, TodoUpdateRequest } from '../services/todoService';
import { useTodoService } from '../hooks/useTodoService';
import { useTodoContext } from '../context/TodoContext';
import useNetwork from '../hooks/useNetwork';

const { Title, Text } = Typography;

interface TodoProps {
  vehicleId?: string;
  className?: string;
  showCompleted?: boolean;
  onTodoClick?: (todo: TodoType) => void;
  showTitle?: boolean;
  compact?: boolean;
}

/**
 * Todo 컴포넌트
 * 
 * @param props TodoProps
 * @returns JSX.Element
 */
const Todo: React.FC<TodoProps> = ({
  vehicleId,
  className = '',
  showCompleted = false,
  onTodoClick,
  showTitle = true,
  compact = false
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [todos, setTodos] = useState<TodoType[]>([]);
  const [pendingChanges, setPendingChanges] = useState<TodoType[]>([]);
  
  const { isOnline } = useNetwork();
  
  const { 
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
    fetchTodos
  } = useTodoService();
  
  const todoContext = useTodoContext();
  
  useEffect(() => {
    if (todoContext && todoContext.todos) {
      // 컨텍스트에서 필터링된 투두 목록 가져오기
      const filteredTodos = todoContext.todos.filter(todo => {
        if (vehicleId && todo.vehicleId !== vehicleId) {
          return false;
        }
        
        if (!showCompleted && todo.completed) {
          return false;
        }
        
        return true;
      });
      
      setTodos(filteredTodos);
    }
  }, [todoContext?.todos, vehicleId, showCompleted]);
  
  const syncPendingChanges = async () => {
    if (!isOnline || pendingChanges.length === 0) return;
    
    setLoading(true);
    
    try {
      // 오프라인 상태에서 대기 중인 변경사항 처리
      for (const todo of pendingChanges) {
        if (todo._pending === 'create') {
          await createTodo({
            title: todo.title,
            description: todo.description,
            dueDate: todo.dueDate,
            priority: todo.priority,
            vehicleId: todo.vehicleId
          });
        } else if (todo._pending === 'update') {
          await updateTodo(todo.id, {
            title: todo.title,
            description: todo.description,
            dueDate: todo.dueDate,
            priority: todo.priority,
            completed: todo.completed
          });
        } else if (todo._pending === 'delete') {
          await deleteTodo(todo.id);
        }
      }
      
      // 대기 중인 변경사항 초기화
      setPendingChanges([]);
      
      // 컨텍스트 새로고침
      if (todoContext) {
        todoContext.refreshTodos();
      }
    } catch (err) {
      setError('오프라인 변경사항 동기화 중 오류가 발생했습니다.');
      console.error('동기화 오류:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // 온라인 상태가 변경될 때 대기 중인 변경사항 동기화
  useEffect(() => {
    if (isOnline && pendingChanges.length > 0) {
      syncPendingChanges();
    }
  }, [isOnline]);

  const handleCreateTodo = async (todoData: TodoCreateRequest): Promise<TodoType | null> => {
    setError(null);
    
    if (!isOnline) {
      // 오프라인 상태에서 임시 ID 생성
      const tempId = `temp-${Date.now()}`;
      const newTodo: TodoType = {
        id: tempId,
        title: todoData.title,
        description: todoData.description || '',
        dueDate: todoData.dueDate || null,
        priority: todoData.priority,
        completed: false,
        vehicleId: todoData.vehicleId || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _pending: 'create'
      };
      
      // 대기 중인 변경사항에 추가
      setPendingChanges([...pendingChanges, newTodo]);
      
      // 로컬 상태 업데이트
      setTodos([...todos, newTodo]);
      
      return newTodo;
    }
    
    setLoading(true);
    
    try {
      const newTodo = await createTodo(todoData);
      
      // Todo 생성 후 컨텍스트 업데이트 또는 기타 작업
      if (todoContext) {
        todoContext.refreshTodos();
      }
      
      return newTodo;
    } catch (err) {
      setError('작업 생성 중 오류가 발생했습니다.');
      console.error('작업 생성 오류:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateTodo = async (
    id: string, 
    updates: TodoUpdateRequest
  ): Promise<TodoType | null> => {
    setError(null);
    
    if (!isOnline) {
      // 오프라인 상태에서 로컬 업데이트
      const todoIndex = todos.findIndex(t => t.id === id);
      if (todoIndex === -1) return null;
      
      const updatedTodo = {
        ...todos[todoIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
        _pending: 'update'
      };
      
      // 대기 중인 변경사항에 추가
      const existingPendingIndex = pendingChanges.findIndex(t => t.id === id);
      if (existingPendingIndex !== -1) {
        const newPendingChanges = [...pendingChanges];
        newPendingChanges[existingPendingIndex] = updatedTodo;
        setPendingChanges(newPendingChanges);
      } else {
        setPendingChanges([...pendingChanges, updatedTodo]);
      }
      
      // 로컬 상태 업데이트
      const newTodos = [...todos];
      newTodos[todoIndex] = updatedTodo;
      setTodos(newTodos);
      
      return updatedTodo;
    }
    
    setLoading(true);
    
    try {
      const updatedTodo = await updateTodo(id, updates);
      
      // Todo 업데이트 후 컨텍스트 업데이트 또는 기타 작업
      if (todoContext) {
        todoContext.refreshTodos();
      }
      
      return updatedTodo;
    } catch (err) {
      setError('작업 업데이트 중 오류가 발생했습니다.');
      console.error('작업 업데이트 오류:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteTodo = async (id: string): Promise<boolean | void> => {
    setError(null);
    
    if (!isOnline) {
      // 오프라인 상태에서 로컬 삭제
      const todoIndex = todos.findIndex(t => t.id === id);
      if (todoIndex === -1) return false;
      
      const todoToDelete = todos[todoIndex];
      
      // 임시 아이템인 경우 바로 삭제, 아니면 대기열에 추가
      if (todoToDelete.id.startsWith('temp-')) {
        // 대기 중인 변경사항에서도 제거
        setPendingChanges(pendingChanges.filter(t => t.id !== id));
      } else {
        // 대기 중인 변경사항에 추가
        setPendingChanges([...pendingChanges, {
          ...todoToDelete,
          _pending: 'delete'
        }]);
      }
      
      // 로컬 상태 업데이트
      setTodos(todos.filter(t => t.id !== id));
      
      return true;
    }
    
    setLoading(true);
    
    try {
      const result = await deleteTodo(id);
      
      // Todo 삭제 후 컨텍스트 업데이트 또는 기타 작업
      if (todoContext) {
        todoContext.refreshTodos();
      }
      
      return result;
    } catch (err) {
      setError('작업 삭제 중 오류가 발생했습니다.');
      console.error('작업 삭제 오류:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleComplete = async (id: string): Promise<boolean | TodoType | null> => {
    setError(null);
    
    // 현재 Todo 항목 찾기
    const todoIndex = todos.findIndex(t => t.id === id);
    if (todoIndex === -1) return null;
    
    const todo = todos[todoIndex];
    const completed = !todo.completed;
    
    return handleUpdateTodo(id, { completed });
  };
  
  return (
    <TodoAuthWrapper>
      <Card 
        className={`todo-card ${className}`}
        title={showTitle && <Title level={4}>정비 작업 관리</Title>}
        bordered={true}
        loading={loading}
        size={compact ? 'small' : 'default'}
      >
        {!isOnline && (
          <OfflineNotice 
            pendingChangesCount={pendingChanges.length}
            onSync={syncPendingChanges}
          />
        )}
        
        {error && (
          <Alert 
            message="오류" 
            description={error} 
            type="error" 
            showIcon 
            className="mb-4"
            closable
            onClose={() => setError(null)}
          />
        )}
        
        {pendingChanges.length > 0 && isOnline && (
          <Alert
            message="동기화 필요"
            description={`대기 중인 변경사항 ${pendingChanges.length}개가 있습니다.`}
            type="warning"
            showIcon
            className="mb-4"
            action={
              <Button size="small" type="primary" onClick={syncPendingChanges}>
                지금 동기화
              </Button>
            }
          />
        )}
        
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <TodoComponent
            vehicleId={vehicleId}
            className={className}
            showCompleted={showCompleted}
            onTodoClick={onTodoClick}
            onCreateTodo={handleCreateTodo}
            onUpdateTodo={handleUpdateTodo}
            onDeleteTodo={handleDeleteTodo}
            onToggleComplete={handleToggleComplete}
            compact={compact}
          />
          
          {todos.length === 0 && !loading && (
            <Empty description="등록된 정비 작업이 없습니다." />
          )}
        </Space>
      </Card>
    </TodoAuthWrapper>
  );
};

export default Todo; 