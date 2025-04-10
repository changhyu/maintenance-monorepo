import React from 'react';
import { Todo as TodoType, TodoUpdateRequest } from '../../hooks/useTodoService';
import TodoItem from '../TodoItem';
import { FilterState } from '../../hooks/useFilterState';

interface TodoListProps {
  loading: boolean;
  todos: TodoType[];
  filterState?: FilterState;
  onTodoClick?: (todo: TodoType) => void;
  onUpdateTodo?: (id: string, updates: TodoUpdateRequest) => Promise<TodoType | null>;
  onDeleteTodo?: (id: string) => Promise<boolean | void>;
  onToggleComplete?: (id: string) => Promise<boolean | TodoType | null>;
}

// 우선순위에 따른 색상 클래스 반환 함수
const getPriorityClass = (priority: string): string => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const TodoList: React.FC<TodoListProps> = ({
  loading,
  todos,
  filterState,
  onTodoClick,
  onUpdateTodo,
  onDeleteTodo,
  onToggleComplete
}) => {
  if (loading) {
    return <p className="text-gray-500">로딩 중...</p>;
  }

  if (todos.length === 0) {
    return <p className="text-gray-500">등록된 정비 작업이 없습니다.</p>;
  }

  const handleToggle = async (id: string, e: React.SyntheticEvent) => {
    e.preventDefault();
    if (onToggleComplete) {
      await onToggleComplete(id);
    }
  };

  const handleDelete = async (id: string) => {
    if (onDeleteTodo) {
      await onDeleteTodo(id);
    }
  };

  const handleClick = (todo: TodoType) => {
    if (onTodoClick) {
      onTodoClick(todo);
    }
  };

  const handleViewVehicle = (e: React.MouseEvent, vehicleId: string) => {
    e.stopPropagation();
    // 차량 상세 페이지로 이동하는 로직은 별도로 구현
    console.log('차량 상세 보기:', vehicleId);
  };

  return (
    <ul className="space-y-2">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onClick={handleClick}
          onViewVehicle={handleViewVehicle}
          getPriorityClass={getPriorityClass}
        />
      ))}
    </ul>
  );
};

export default TodoList; 