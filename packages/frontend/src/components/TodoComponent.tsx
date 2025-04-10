import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTodoService, Todo as TodoType, TodoCreateRequest, TodoFilter as FilterType, TodoUpdateRequest } from '../hooks/useTodoService';
import { TodoPriority } from '../services/todoService';
import todoNotificationService from '../services/todoNotificationService';
import TodoFilter from './TodoFilter';
import { TodoList } from './todo/TodoList';
import { AddTodoForm } from './todo/AddTodoForm';
import { useTemplateState } from '../hooks/useTemplateState';
import { useFilterState } from '../hooks/useFilterState';
import logger from '../utils/logger';
import { Button, Divider, Space, Typography } from 'antd';

/**
 * Todo 컴포넌트 프롭스 인터페이스
 */
interface TodoComponentProps {
  vehicleId?: string;
  className?: string;
  showCompleted?: boolean;
  onTodoClick?: (todo: TodoType) => void;
  onCreateTodo?: (todoData: TodoCreateRequest) => Promise<TodoType | null>;
  onUpdateTodo?: (id: string, updates: TodoUpdateRequest) => Promise<TodoType | null>;
  onDeleteTodo?: (id: string) => Promise<boolean | void>;
  onToggleComplete?: (id: string) => Promise<boolean | any>;
}

/**
 * 정비 작업 관리를 위한 Todo 컴포넌트
 */
const TodoComponent: React.FC<TodoComponentProps> = ({ 
  vehicleId, 
  className = '', 
  showCompleted = true,
  onTodoClick,
  onCreateTodo,
  onUpdateTodo,
  onDeleteTodo,
  onToggleComplete
}) => {
  const navigate = useNavigate();
  const { 
    todos, 
    loading, 
    error, 
    fetchTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete
  } = useTodoService();
  
  const [filterState, filterDispatch] = useFilterState();
  const [templateState, templateDispatch] = useTemplateState();

  // 투두 목록 조회
  useEffect(() => {
    // vehicleId가 제공된 경우, 해당 차량에 대한 할 일만 조회
    const filter = vehicleId ? { vehicleId } : {};
    fetchTodos(filter);
  }, [vehicleId, fetchTodos]);
  
  // 투두 목록이 업데이트될 때마다 알림 서비스 실행
  useEffect(() => {
    if (todos && todos.length > 0) {
      // 높은 우선순위 Todo 확인
      todos.forEach(todo => {
        if (todo.priority === TodoPriority.HIGH) {
          todoNotificationService.notifyHighPriorityTodo(todo);
        }
      });
      
      // 마감일 임박 알림 확인
      todoNotificationService.checkAndNotifyUpcomingDue(todos);
      
      // 기한 초과 알림 확인
      todoNotificationService.checkAndNotifyOverdue(todos);
    }
  }, [todos]);
  
  // 필터 변경 처리
  const handleFilterChange = useCallback((filter: FilterType) => {
    filterDispatch({ type: 'SET_CURRENT_FILTER', payload: filter });
    fetchTodos(filter);
  }, [filterDispatch, fetchTodos]);
  
  // 투두 생성 처리
  const handleCreateTodo = useCallback(async (todoData: TodoCreateRequest) => {
    try {
      // 외부에서 제공된 핸들러가 있다면 해당 핸들러 사용
      const newTodo = onCreateTodo 
        ? await onCreateTodo(todoData) 
        : await createTodo(todoData);
      
      if (newTodo) {
        // 높은 우선순위 알림 처리
        if (newTodo.priority === TodoPriority.HIGH) {
          todoNotificationService.notifyHighPriorityTodo(newTodo);
        }
        
        return newTodo;
      }
      return null;
    } catch (error) {
      logger.error('Todo 생성 실패:', error);
      return null;
    }
  }, [onCreateTodo, createTodo]);
  
  // 투두 업데이트 처리
  const handleUpdateTodo = useCallback(async (id: string, updates: TodoUpdateRequest) => {
    try {
      // 업데이트 전 이전 상태의 Todo 객체 조회
      const prevTodo = todos.find(todo => todo.id === id);
      
      if (!prevTodo) {
        return null;
      }
      
      // 외부에서 제공된 핸들러가 있다면 해당 핸들러 사용
      const updatedTodo = onUpdateTodo 
        ? await onUpdateTodo(id, updates) 
        : await updateTodo(id, updates);
        
      if (updatedTodo) {
        // 완료 상태 변경 시 알림
        if (prevTodo.completed !== updatedTodo.completed) {
          todoNotificationService.notifyStatusChange(updatedTodo, prevTodo.completed);
        }
        
        // 우선순위가 높음으로 변경된 경우 알림
        if (prevTodo.priority !== TodoPriority.HIGH && updatedTodo.priority === TodoPriority.HIGH) {
          todoNotificationService.notifyHighPriorityTodo(updatedTodo);
        }
        
        return updatedTodo;
      }
      return null;
    } catch (error) {
      logger.error('Todo 업데이트 실패:', error);
      return null;
    }
  }, [todos, onUpdateTodo, updateTodo]);
  
  // 투두 완료 상태 토글 처리
  const handleToggleComplete = useCallback(async (id: string) => {
    try {
      // 토글 전 이전 상태의 Todo 객체 조회
      const prevTodo = todos.find(todo => todo.id === id);
      
      if (!prevTodo) {
        return false;
      }
      
      // 외부에서 제공된 핸들러가 있다면 해당 핸들러 사용
      const result = onToggleComplete 
        ? await onToggleComplete(id) 
        : await toggleComplete(id);
      
      if (result) {
        // 상태 변경 알림 - 필요시 업데이트된 객체 조회
        const updatedTodo = todos.find(todo => todo.id === id);
        if (updatedTodo) {
          todoNotificationService.notifyStatusChange(updatedTodo, prevTodo.completed);
        }
      }
      
      return true; // 결과와 상관없이 성공으로 간주
    } catch (error) {
      logger.error('Todo 완료 상태 변경 실패:', error);
      return false;
    }
  }, [todos, onToggleComplete, toggleComplete]);
  
  return (
    <div className={`todo-component ${className}`}>
      <h2 className="text-xl font-bold mb-4">정비 작업 목록</h2>
      
      <TodoFilter 
        onFilterChange={handleFilterChange}
        initialFilter={filterState.currentFilter}
        className="mb-4"
      />
      
      <Divider />
      
      <AddTodoForm 
        onCreateTodo={handleCreateTodo}
        templateState={templateState}
        templateDispatch={templateDispatch}
      />
      
      <Divider />
      
      {error ? (
        <Typography.Text type="danger">작업 목록을 불러오는 중 오류가 발생했습니다.</Typography.Text>
      ) : (
        <TodoList 
          todos={todos}
          loading={loading}
          filterState={filterState}
          onTodoClick={onTodoClick}
          onUpdateTodo={handleUpdateTodo}
          onDeleteTodo={onDeleteTodo}
          onToggleComplete={handleToggleComplete}
        />
      )}
    </div>
  );
};

export default TodoComponent;