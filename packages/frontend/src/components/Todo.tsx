import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Typography, message } from 'antd';
import TodoComponent from './TodoComponent';
import TodoAuthWrapper from './TodoAuthWrapper';
import OfflineNotice from './OfflineNotice';
import { Todo as TodoType, TodoCreateRequest, TodoPriority } from '../services/todoService';
import { useTodoService, TodoUpdateRequest } from '../hooks/useTodoService';
import { useTodoContext } from '../context/TodoContext';
import useNetwork from '../hooks/useNetwork';
import logger from '../utils/logger';

const { Title } = Typography;

interface TodoProps {
  vehicleId?: string;
  className?: string;
  showCompleted?: boolean;
  onTodoClick?: (todo: TodoType) => void;
  showTitle?: boolean;
  compact?: boolean;
}

// 오프라인 변경사항 타입 정의
type PendingActionType = 'create' | 'update' | 'delete';

interface PendingChange extends TodoType {
  _pending: PendingActionType;
  _originalId?: string; // 임시 ID와 원본 ID 매핑을 위한 필드
}

/**
 * Todo 컴포넌트
 * 
 * @param props TodoProps
 * @returns JSX.Element
 */
const Todo: React.FC<TodoProps> = memo(({
  vehicleId,
  className = '',
  showCompleted = false,
  onTodoClick,
  showTitle = true,
  compact = false
}) => {
  const [todos, setTodos] = useState<TodoType[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [optimisticTodos, setOptimisticTodos] = useState<TodoType[]>([]);
  
  const { isOnline } = useNetwork();
  
  const { 
    createTodo,
    updateTodo,
    deleteTodo
  } = useTodoService();
  
  const todoContext = useTodoContext();

  // 낙관적 업데이트를 수동으로 처리하는 함수들
  const applyOptimisticAdd = useCallback((todo: TodoType) => {
    setOptimisticTodos(prev => [...prev, todo]);
  }, []);
  
  const applyOptimisticUpdate = useCallback((todo: TodoType, updates: Partial<TodoType>) => {
    setOptimisticTodos(prev => 
      prev.map(item => item.id === todo.id ? { ...item, ...updates } : item)
    );
  }, []);
  
  const applyOptimisticDelete = useCallback((todo: TodoType) => {
    setOptimisticTodos(prev => prev.filter(item => item.id !== todo.id));
  }, []);
  
  // 실제 todos가 변경되면 optimisticTodos도 업데이트
  useEffect(() => {
    setOptimisticTodos(todos);
  }, [todos]);
  
  // 필터링된 할 일 목록 가져오기
  const getFilteredTodos = useCallback(() => {
    return todoContext?.todos?.filter(todo => {
      if (vehicleId && todo.vehicleId !== vehicleId) {
        return false;
      }
      
      if (!showCompleted && todo.completed) {
        return false;
      }
      
      return true;
    }) ?? [];
  }, [todoContext?.todos, vehicleId, showCompleted]);
  
  // 메모이제이션된 할 일 목록
  const filteredTodos = useMemo(() => getFilteredTodos(), [getFilteredTodos]);
  
  useEffect(() => {
    setTodos(filteredTodos);
  }, [filteredTodos]);

  // 오프라인 상태에서 변경된 데이터를 로컬 스토리지에 저장
  useEffect(() => {
    try {
      if (pendingChanges.length > 0) {
        localStorage.setItem('vehicle_maintenance_pending_changes', JSON.stringify(pendingChanges));
      } else {
        localStorage.removeItem('vehicle_maintenance_pending_changes');
      }
    } catch (error) {
      logger.error('오프라인 변경사항 저장 실패:', error);
    }
  }, [pendingChanges]);

  // 컴포넌트 마운트 시 로컬 스토리지에서 대기 중인 변경사항 로드
  useEffect(() => {
    try {
      const savedChanges = localStorage.getItem('vehicle_maintenance_pending_changes');
      if (savedChanges) {
        const parsed = JSON.parse(savedChanges) as PendingChange[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPendingChanges(parsed);
        }
      }
    } catch (error) {
      logger.error('저장된 변경사항 로드 실패:', error);
    }
  }, []);
  
  // 오프라인 상태에서 대기 중인 변경사항 동기화
  const syncPendingChanges = useCallback(async () => {
    if (!isOnline || pendingChanges.length === 0 || isSyncing) {
      return;
    }
    
    setIsSyncing(true);
    try {
      logger.info(`동기화 시작: ${pendingChanges.length}개 작업 처리 중...`);
      message.loading('오프라인 변경사항 동기화 중...');

      // 작업 타입별로 그룹화
      const deleteChanges = pendingChanges.filter(todo => todo._pending === 'delete');
      const createChanges = pendingChanges.filter(todo => todo._pending === 'create');
      const updateChanges = pendingChanges.filter(todo => todo._pending === 'update');

      const successfulChanges: string[] = [];
      const failedChanges: PendingChange[] = [];
      
      // 1. 먼저 삭제 작업 처리 (의존성 문제 방지)
      for (const todo of deleteChanges) {
        try {
          const success = await deleteTodo(todo.id);
          if (success) {
            successfulChanges.push(todo.id);
          } else {
            failedChanges.push(todo);
          }
        } catch (err) {
          logger.error(`Todo ID ${todo.id} 삭제 실패:`, err);
          failedChanges.push(todo);
        }
      }
      
      // 2. 생성 작업 처리
      const createdItemsMap = new Map<string, string>(); // tempId -> realId 매핑
      
      for (const todo of createChanges) {
        try {
          const { title, description, dueDate, priority, vehicleId: todoVehicleId, status } = todo;
          const createdTodo = await createTodo({
            title,
            description: description ?? '',
            dueDate: dueDate ? new Date(dueDate).toISOString() : (undefined as unknown as string | undefined),
            priority: priority ?? 'medium',
            vehicleId: todoVehicleId ?? '',
            status: status ?? 'pending'
          });
          
          if (createdTodo) {
            successfulChanges.push(todo.id);
            // 임시 ID와 실제 ID 매핑 저장
            createdItemsMap.set(todo.id, createdTodo.id);
          } else {
            failedChanges.push(todo);
          }
        } catch (err) {
          logger.error(`Todo 생성 실패:`, err);
          failedChanges.push(todo);
        }
      }
      
      // 3. 업데이트 작업 처리 (생성된 항목에 대한 임시 ID 매핑 처리)
      for (const todo of updateChanges) {
        try {
          // 만약 이 항목이 임시 ID에 대한 업데이트라면, 실제 ID로 교체
          const actualId = createdItemsMap.get(todo.id) || todo.id;
          
          const updatedTodo = await updateTodo(actualId, {
            title: todo.title,
            description: todo.description ?? '',
            dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString() : (undefined as unknown as string | undefined),
            priority: todo.priority ?? 'medium',
            completed: todo.completed,
            status: todo.status ?? 'pending'
          });
          
          if (updatedTodo) {
            successfulChanges.push(todo.id);
          } else {
            failedChanges.push(todo);
          }
        } catch (err) {
          logger.error(`Todo ID ${todo.id} 업데이트 실패:`, err);
          failedChanges.push(todo);
        }
      }
      
      // 성공한 작업은 대기열에서 제거
      if (successfulChanges.length > 0) {
        setPendingChanges(prev => prev.filter(change => !successfulChanges.includes(change.id)));
      }
      
      message.success('동기화 완료: ${successfulChanges.length}개 성공, ${failedChanges.length}개 실패');
      
      // 실패한 작업이 있으면 사용자에게 알림
      if (failedChanges.length > 0) {
        logger.warn(`동기화 일부 실패: ${failedChanges.length}개 작업 처리 실패`);
      }
      
      // 이벤트 발생 - 동기화 완료
      window.dispatchEvent(new CustomEvent('todo:sync-completed', {
        detail: {
          success: successfulChanges.length,
          failed: failedChanges.length,
          remaining: failedChanges.length
        }
      }));
    } catch (error) {
      logger.error('변경사항 동기화 중 오류 발생:', error);
      message.error('변경사항 동기화 중 오류가 발생했습니다.');
      
      // 이벤트 발생 - 동기화 실패
      window.dispatchEvent(new CustomEvent('todo:sync-error'));
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, pendingChanges, createTodo, updateTodo, deleteTodo]);
  
  // 온라인 상태 변경 시 자동 동기화
  useEffect(() => {
    if (isOnline && pendingChanges.length > 0) {
      syncPendingChanges();
    }
  }, [isOnline, pendingChanges.length, syncPendingChanges]);
  
  // Todo 생성 처리
  const handleCreateTodo = useCallback(async (todoData: TodoCreateRequest): Promise<TodoType | null> => {
    if (isOnline) {
      try {
        const createdTodo = await createTodo(todoData);
        return createdTodo;
      } catch (error) {
        logger.error('할 일 생성 중 오류 발생:', error);
        message.error('할 일을 생성하는 중 오류가 발생했습니다.');
        return null;
      }
    } else {
      // 오프라인 모드: 로컬에서 임시 ID로 생성
      const tempId = `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // 임시 Todo 객체 생성
      const tempTodo: TodoType & PendingChange = {
        id: tempId,
        title: todoData.title,
        description: todoData.description || '',
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dueDate: todoData.dueDate || null,
        priority: todoData.priority || 'medium',
        vehicleId: todoData.vehicleId || '',
        status: todoData.status || 'pending',
        _pending: 'create'
      };
      
      // 낙관적 업데이트
      applyOptimisticAdd(tempTodo);
      
      // 오프라인 변경사항에 추가
      setPendingChanges(prev => [...prev, tempTodo]);
      
      message.info('오프라인 모드: 변경사항이 저장되었으며, 온라인 상태가 되면 동기화됩니다.');
      
      return tempTodo;
    }
  }, [isOnline, createTodo, applyOptimisticAdd, setPendingChanges]);
  
  // Todo 업데이트 처리
  const handleUpdateTodo = useCallback(async (
    id: string, 
    updates: TodoUpdateRequest
  ): Promise<TodoType | null> => {
    // 현재 Todo 찾기
    const currentTodo = todos.find(todo => todo.id === id);
    
    if (!currentTodo) {
      logger.error(`ID가 ${id}인 할 일을 찾을 수 없습니다.`);
      message.error('업데이트할 할 일을 찾을 수 없습니다.');
      return null;
    }
    
    // 변경할 필드만 포함된 업데이트 객체 생성
    const updateFields: Partial<TodoType> = {};
    
    if (updates.title !== undefined) updateFields.title = updates.title;
    if (updates.description !== undefined) updateFields.description = updates.description;
    if (updates.completed !== undefined) updateFields.completed = updates.completed;
    if (updates.dueDate !== undefined) updateFields.dueDate = updates.dueDate;
    if (updates.priority !== undefined) updateFields.priority = updates.priority;
    if (updates.status !== undefined) updateFields.status = updates.status;
    
    // 낙관적 업데이트
    applyOptimisticUpdate(currentTodo, updateFields);
    
    if (isOnline) {
      try {
        const updatedTodo = await updateTodo(id, updates);
        return updatedTodo;
      } catch (error) {
        logger.error(`할 일 업데이트 중 오류 발생 (ID: ${id}):`, error);
        message.error('할 일을 업데이트하는 중 오류가 발생했습니다.');
        
        // 낙관적 업데이트 되돌리기
        applyOptimisticUpdate(currentTodo, {});
        
        return null;
      }
    } else {
      // 오프라인 모드: 로컬에서 업데이트
      const isPendingCreate = pendingChanges.some(
        change => change.id === id && change._pending === 'create'
      );
      
      if (isPendingCreate) {
        // 아직 서버에 생성되지 않은 항목이라면 로컬 상태만 업데이트
        setPendingChanges(prev => prev.map(change => 
          change.id === id 
            ? { ...change, ...updateFields, updatedAt: new Date().toISOString() }
            : change
        ));
      } else {
        // 이미 서버에 있는 항목이라면 오프라인 변경사항에 추가
        const pendingUpdate: PendingChange = {
          ...currentTodo,
          ...updateFields,
          updatedAt: new Date().toISOString(),
          _pending: 'update'
        };
        
        const existingChangeIndex = pendingChanges.findIndex(
          change => change.id === id && change._pending === 'update'
        );
        
        if (existingChangeIndex >= 0) {
          // 이미 동일한 항목에 대한 오프라인 업데이트가 있다면 병합
          setPendingChanges(prev => {
            const newChanges = [...prev];
            newChanges[existingChangeIndex] = {
              ...newChanges[existingChangeIndex],
              ...updateFields,
              updatedAt: new Date().toISOString()
            };
            return newChanges;
          });
        } else {
          // 새로운 오프라인 업데이트 추가
          setPendingChanges(prev => [...prev, pendingUpdate]);
        }
      }
      
      message.info('오프라인 모드: 변경사항이 저장되었으며, 온라인 상태가 되면 동기화됩니다.');
      
      // 업데이트된 Todo 반환
      return {
        ...currentTodo,
        ...updateFields,
        updatedAt: new Date().toISOString()
      };
    }
  }, [isOnline, todos, pendingChanges, updateTodo, applyOptimisticUpdate]);
  
  // Todo 삭제 처리
  const handleDeleteTodo = useCallback(async (id: string): Promise<boolean | void> => {
    // 현재 Todo 찾기
    const todoToDelete = todos.find(todo => todo.id === id);
    
    if (!todoToDelete) {
      logger.error(`ID가 ${id}인 할 일을 찾을 수 없습니다.`);
      message.error('삭제할 할 일을 찾을 수 없습니다.');
      return false;
    }
    
    // 낙관적 업데이트
    applyOptimisticDelete(todoToDelete);
    
    if (isOnline) {
      try {
        const success = await deleteTodo(id);
        
        if (!success) {
          // 삭제 실패 시 낙관적 업데이트 되돌리기
          applyOptimisticDelete(todoToDelete);
          message.error('할 일을 삭제하는 중 오류가 발생했습니다.');
          return false;
        }
        
        return true;
      } catch (error) {
        logger.error(`할 일 삭제 중 오류 발생 (ID: ${id}):`, error);
        
        // 낙관적 업데이트 되돌리기
        applyOptimisticDelete(todoToDelete);
        
        message.error('할 일을 삭제하는 중 오류가 발생했습니다.');
        return false;
      }
    } else {
      // 오프라인 모드: 로컬에서 삭제 표시
      const isPendingCreate = pendingChanges.some(
        change => change.id === id && change._pending === 'create'
      );
      
      if (isPendingCreate) {
        // 생성된 적 없는 항목이라면 오프라인 목록에서 완전히 제거
        setPendingChanges(prev => prev.filter(change => change.id !== id));
      } else {
        // 이미 서버에 있는 항목이라면 삭제 표시
        const pendingDelete: PendingChange = {
          ...todoToDelete,
          _pending: 'delete'
        };
        
        // 기존 업데이트 변경사항이 있다면 제거
        setPendingChanges(prev => {
          // 기존 업데이트 변경사항 제거
          const filtered = prev.filter(
            change => !(change.id === id && change._pending === 'update')
          );
          // 삭제 변경사항 추가
          return [...filtered, pendingDelete];
        });
      }
      
      message.info('오프라인 모드: 변경사항이 저장되었으며, 온라인 상태가 되면 동기화됩니다.');
      return true;
    }
  }, [isOnline, todos, pendingChanges, deleteTodo, applyOptimisticDelete]);
  
  // 완료 상태 전환
  const handleToggleComplete = useCallback(async (id: string): Promise<boolean | TodoType | null> => {
    const todo = todos.find(t => t.id === id);
    
    if (!todo) {
      return false;
    }
    
    return handleUpdateTodo(id, {
      completed: !todo.completed
    });
  }, [todos, handleUpdateTodo]);
  
  // 메모이제이션된 컴포넌트 속성
  const componentProps = useMemo(() => ({
    todos: optimisticTodos,
    pendingChanges,
    onCreateTodo: handleCreateTodo,
    onUpdateTodo: handleUpdateTodo,
    onDeleteTodo: handleDeleteTodo,
    onToggleComplete: handleToggleComplete,
    onTodoClick,
    isOffline: !isOnline,
    compact
  }), [
    optimisticTodos, 
    pendingChanges, 
    handleCreateTodo, 
    handleUpdateTodo, 
    handleDeleteTodo, 
    handleToggleComplete, 
    onTodoClick, 
    isOnline, 
    compact
  ]);

  return (
    <div className={`todo-container ${className}`}>
      {showTitle && (
        <div className="todo-header">
          <Title level={4}>작업 목록</Title>
          {!isOnline && <OfflineNotice />}
        </div>
      )}
      
      <TodoAuthWrapper>
        <TodoComponent {...componentProps} />
      </TodoAuthWrapper>
    </div>
  );
});

Todo.displayName = 'Todo';

export default Todo;