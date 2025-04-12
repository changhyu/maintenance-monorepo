import React, { memo } from 'react';

import { Todo as TodoType } from '../services/todoService';
import { formatDate, isPastDate } from '../utils/dateUtils';

interface TodoItemProps {
  todo: TodoType;
  onToggle: (id: string, e: React.SyntheticEvent) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClick: (todo: TodoType) => void;
  onViewVehicle: (e: React.MouseEvent<HTMLButtonElement>, vehicleId: string) => void;
  getPriorityClass: (priority: string) => string;
}

// 명시적 타입 정의를 사용한 컴포넌트
const TodoItemComponent = (props: TodoItemProps): JSX.Element => {
  const { todo, onToggle, onDelete, onClick, onViewVehicle, getPriorityClass } = props;

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    await onDelete(todo.id);
  };

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    await onToggle(todo.id, e);
  };

  const handleViewVehicle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (todo.vehicleId) {
      onViewVehicle(e, todo.vehicleId);
    }
  };

  return (
    <li
      onClick={() => onClick(todo)}
      className={`border p-3 rounded flex items-center justify-between ${
        todo.completed ? 'bg-gray-100' : ''
      } cursor-pointer hover:bg-gray-50`}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={handleToggle}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />

        <div>
          <p className={todo.completed ? 'line-through text-gray-500' : ''}>{todo.title}</p>

          <div className="flex gap-2 mt-1">
            <span className={`text-xs px-2 py-1 rounded ${getPriorityClass(todo.priority)}`}>
              {todo.priority === 'high' ? '높음' : todo.priority === 'medium' ? '중간' : '낮음'}
            </span>

            {todo.dueDate && (
              <span
                className={`text-xs ${
                  isPastDate(todo.dueDate) ? 'text-red-600 font-semibold' : 'text-gray-600'
                }`}
              >
                마감일: {formatDate(todo.dueDate)}
              </span>
            )}

            {todo.vehicleId && (
              <button onClick={handleViewVehicle} className="text-xs text-blue-600 hover:underline">
                차량 보기
              </button>
            )}
          </div>
        </div>
      </div>

      <button onClick={handleDelete} className="text-red-500 hover:text-red-700">
        삭제
      </button>
    </li>
  );
};

// memo로 감싸서 내보내기
const TodoItem = memo(TodoItemComponent);

export default TodoItem;
