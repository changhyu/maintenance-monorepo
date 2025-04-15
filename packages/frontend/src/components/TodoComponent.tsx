import React, { useEffect, useCallback, memo, useState, useMemo } from 'react';
import { Divider, Typography } from 'antd';

import TodoFilter from './TodoFilter';
import { useFilterState } from '../hooks/useFilterState';
import { useTemplateState } from '../hooks/useTemplateState';
import {
  useTodoService,
  Todo as TodoType,
  TodoCreateRequest,
  TodoUpdateRequest,
  TodoPriorityType,
  TodoStatusType
} from '../hooks/useTodoService';
import { TodoFilter as FilterType, TodoPriority, TodoStatus } from '../services/todoService';
import todoNotificationService from '../services/todoNotificationService';
import { AddTodoForm } from './todo/AddTodoForm';
import TodoList from './todo/TodoList';
import logger from '../utils/logger';
import { PendingChange } from '../types/todoTypes';

// TodoNotificationService 인터페이스 확장
interface TodoNotificationService {
  notifyStatusChange: (todo: TodoType, previousCompleted: boolean) => void;
  notifyError: (message: string) => void;
}

// TodoFilterContextType 인터페이스 정의
export interface TodoFilterContextType {
  completed?: TodoStatusType | 'all';
  priority?: TodoPriorityType | 'all';
  dueDate?: 'all' | 'today' | 'overdue';
  search?: string;
  vehicleId?: string;
}

// FilterType을 TodoFilterContextType으로 변환하는 함수
const adaptFilterToContextFilter = (filter: FilterType): TodoFilterContextType => {
  let completed: TodoStatusType | 'all' = 'all';
  if (filter.completed) {
    completed = TodoStatus.COMPLETED;
  } else if (filter.status === TodoStatus.PENDING) {
    completed = TodoStatus.PENDING;
  }

  let priority: TodoPriorityType | 'all' = 'all';
  if (filter.priority) {
    priority = Array.isArray(filter.priority) ? filter.priority[0] : filter.priority;
  }

  const dueDate = filter.dueFrom ? 'today' : 'all';

  return {
    completed,
    priority,
    dueDate,
    search: filter.searchText,
    vehicleId: filter.vehicleId
  };
};

// TodoFilterContextType을 FilterType으로 변환하는 함수
const adaptContextFilterToFilter = (contextFilter: TodoFilterContextType): FilterType => {
  return {
    completed: contextFilter.completed === TodoStatus.COMPLETED,
    status: contextFilter.completed === 'all' ? undefined : contextFilter.completed,
    priority: contextFilter.priority === 'all' ? undefined : contextFilter.priority,
    searchText: contextFilter.search,
    vehicleId: contextFilter.vehicleId,
    dueFrom: contextFilter.dueDate === 'today' ? new Date().toISOString().split('T')[0] : undefined
  };
};

/**
 * Todo 컴포넌트 프롭스 인터페이스
 */
interface TodoComponentProps {
  vehicleId?: string;
  className?: string;
  showCompleted?: boolean;
  todos?: TodoType[]; // 낙관적 업데이트된 할 일 목록
  isPending?: boolean; // 트랜지션 진행 중 상태
  onTodoClick?: (todo: TodoType) => void;
  onCreateTodo?: (todoData: TodoCreateRequest) => Promise<TodoType | null>;
  onUpdateTodo?: (id: string, updates: TodoUpdateRequest) => Promise<TodoType | null>;
  onDeleteTodo?: (id: string) => Promise<boolean | void>;
  onToggleComplete?: (id: string) => Promise<boolean | TodoType | null>;
  compact?: boolean;
  pendingChanges?: PendingChange[];
  isOffline?: boolean;
  maxHeight?: string;
  emptyMessage?: string;
}

/**
 * 정비 작업 관리를 위한 Todo 컴포넌트
 */
const TodoComponent: React.FC<TodoComponentProps> = memo(({
  vehicleId,
  className = '',
  showCompleted = true,
  todos: optimisticTodos,
  isPending = false,
  onTodoClick,
  onCreateTodo,
  onUpdateTodo,
  onDeleteTodo,
  onToggleComplete,
  compact = false,
  pendingChanges = [],
  isOffline = false,
  maxHeight = '100%',
  emptyMessage = '할 일이 없습니다'
}) => {
  const { todos, loading, error, fetchTodos, createTodo, updateTodo, toggleComplete, deleteTodo } = useTodoService();
  const [filterState, filterDispatch] = useFilterState();
  const [templateState, templateDispatch] = useTemplateState();

  // 낙관적 업데이트가 없을 경우 서비스의 todos를 사용
  const displayTodos = optimisticTodos || todos;
  const isLoading = isPending || loading;

  // 대기 중인 변경사항을 가진 Todo 아이템 ID 목록
  const pendingItemIds = useMemo(() => 
    pendingChanges.map(change => change.id),
    [pendingChanges]
  );
  
  // 할 일 정렬: 우선순위, 마감일, 미완료 우선
  const sortedTodos = useMemo(() => {
    // 모든 할 일을 깊은 복사
    return [...displayTodos].sort((a, b) => {
      // 1. 완료되지 않은 할 일 우선
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      // 2. 우선순위 순: high, medium, low
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority] ?? 1;
      const bPriority = priorityOrder[b.priority] ?? 1;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // 3. 마감일 순 (없으면 맨 뒤로)
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      
      // 4. 생성일 순
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [displayTodos]);

  // 투두 목록 조회
  useEffect(() => {
    if (!optimisticTodos) {
      const filter = vehicleId ? { vehicleId } : {};
      fetchTodos(filter);
    }
  }, [vehicleId, fetchTodos, optimisticTodos]);

  // 알림 처리
  useEffect(() => {
    if (!displayTodos?.length) {
      return;
    }

    // 높은 우선순위 Todo 알림
    displayTodos.forEach(todo => {
      if (todo.priority === TodoPriority.HIGH) {
        todoNotificationService.notifyHighPriorityTodo(todo);
      }
    });

    // 마감일 관련 알림
    todoNotificationService.checkAndNotifyUpcomingDue(displayTodos);
    todoNotificationService.checkAndNotifyOverdue(displayTodos);
  }, [displayTodos]);

  // 필터 변경 처리
  const handleFilterChange = useCallback(
    (filter: FilterType) => {
      filterDispatch({ type: 'SET_CURRENT_FILTER', payload: filter });
      const adaptedFilter = adaptFilterToContextFilter(filter);
      fetchTodos(adaptedFilter);
    },
    [filterDispatch, fetchTodos]
  );

  // 투두 생성 핸들러
  const handleCreate = useCallback(async (todo: TodoCreateRequest) => {
    try {
      if (onCreateTodo) {
        return await onCreateTodo(todo);
      }
      
      const newTodo = await createTodo(todo);
      if (newTodo && newTodo.priority === TodoPriority.HIGH) {
        todoNotificationService.notifyHighPriorityTodo(newTodo);
      }
      return newTodo;
    } catch (error) {
      todoNotificationService.notifyError('Todo 생성 중 오류가 발생했습니다.');
      logger.error('Todo 생성 중 오류 발생:', error);
      return null;
    }
  }, [onCreateTodo, createTodo]);

  // 투두 업데이트 핸들러
  const handleUpdate = useCallback(async (todoId: string, updates: TodoUpdateRequest): Promise<TodoType | null> => {
    try {
      if (onUpdateTodo) {
        return await onUpdateTodo(todoId, updates);
      }
      
      const currentTodo = displayTodos.find(todo => todo.id === todoId);
      if (!currentTodo) {
        return null;
      }

      const previousCompleted = currentTodo.completed;
      const updatedTodo = await updateTodo(todoId, updates);
      
      if (updatedTodo) {
        // 상태 변경에 대한 알림
        if (updatedTodo.completed !== previousCompleted) {
          todoNotificationService.notifyStatusChange(updatedTodo, previousCompleted);
        }
        return updatedTodo;
      }
      return null;
    } catch (error) {
      todoNotificationService.notifyError('Todo 업데이트 중 오류가 발생했습니다.');
      logger.error('Todo 업데이트 중 오류 발생:', error);
      return null;
    }
  }, [onUpdateTodo, displayTodos, updateTodo]);

  // 투두 삭제 핸들러
  const handleDelete = useCallback(async (todoId: string): Promise<boolean> => {
    try {
      if (onDeleteTodo) {
        const result = await onDeleteTodo(todoId);
        return Boolean(result);
      }
      
      await deleteTodo(todoId);
      return true;
    } catch (error) {
      todoNotificationService.notifyError('Todo 삭제 중 오류가 발생했습니다.');
      logger.error('Todo 삭제 중 오류 발생:', error);
      return false;
    }
  }, [onDeleteTodo, deleteTodo]);

  // 투두 완료 상태 토글 처리
  const handleToggleComplete = useCallback(async (id: string): Promise<boolean | TodoType | null> => {
    try {
      if (onToggleComplete) {
        return await onToggleComplete(id);
      }
      const prevTodo = displayTodos.find(todo => todo.id === id);
      if (!prevTodo) {
        return null;
      }
      const updatedTodo = await toggleComplete(id);
      if (updatedTodo) {
        todoNotificationService.notifyStatusChange(updatedTodo, !updatedTodo.completed);
      }
      return updatedTodo;
    } catch (error) {
      todoNotificationService.notifyError('완료 상태 변경 중 오류가 발생했습니다.');
      logger.error('Todo 상태 변경 중 오류 발생:', error);
      return null;
    }
  }, [onToggleComplete, displayTodos, toggleComplete]);

  // 필터링된 Todo 목록 구하기
  const getFilteredTodos = useCallback(() => {
    if (!displayTodos || displayTodos.length === 0) {
      return [];
    }

    let filtered = [...displayTodos];

    // 차량 ID로 필터링
    if (vehicleId) {
      filtered = filtered.filter(todo => todo.vehicleId === vehicleId);
    }

    // 완료 상태로 필터링
    if (!showCompleted) {
      filtered = filtered.filter(todo => !todo.completed);
    }

    // 현재 필터 상태 적용
    const currentFilter = filterState.currentFilter;
    if (currentFilter) {
      if (currentFilter.status) {
        filtered = filtered.filter(todo => todo.status === currentFilter.status);
      }
      if (currentFilter.priority) {
        filtered = filtered.filter(todo => todo.priority === currentFilter.priority);
      }
      if (currentFilter.searchText) {
        const searchLower = currentFilter.searchText.toLowerCase();
        filtered = filtered.filter(
          todo =>
            todo.title.toLowerCase().includes(searchLower) ||
            (todo.description && todo.description.toLowerCase().includes(searchLower))
        );
      }
      if (currentFilter.dueFrom) {
        const dueDate = new Date(currentFilter.dueFrom);
        filtered = filtered.filter(todo => todo.dueDate && new Date(todo.dueDate) >= dueDate);
      }
    }

    return filtered;
  }, [displayTodos, vehicleId, showCompleted, filterState.currentFilter]);

  const filteredTodos = getFilteredTodos();

  return (
    <div className={`todo-component ${className}`}>
      {!compact && (
        <TodoFilter
          onFilterChange={handleFilterChange}
          initialFilter={filterState.currentFilter}
          className=""
        />
      )}
      
      <AddTodoForm
        onSubmit={handleCreate}
        vehicleId={vehicleId}
        disabled={isPending}
      />
      
      <Divider style={{ margin: '16px 0' }} />
      
      <TodoList
        todos={filteredTodos}
        loading={isLoading}
        filterState={filterState}
        onTodoClick={onTodoClick}
        onToggleComplete={handleToggleComplete}
        onUpdateTodo={handleUpdate}
        onDeleteTodo={handleDelete}
      />
    </div>
  );
});

// 디스플레이 이름 설정
TodoComponent.displayName = 'TodoComponent';

export default TodoComponent;
