import React, { memo } from 'react';
import { Todo as TodoType } from '../hooks/useTodoService';

// 날짜 포맷 함수
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '유효하지 않은 날짜';
    }
    
    // 한국어 로컬 형식으로 날짜 표시
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return '날짜 오류';
  }
};

// 마감일 지남 여부 확인 함수
const isOverdue = (dateString: string): boolean => {
  try {
    const dueDate = new Date(dateString);
    const today = new Date();
    
    // 시간 정보 제거하고 날짜만 비교
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  } catch (error) {
    return false;
  }
};

// TodoItem 컴포넌트
const TodoItem = memo(({
  todo,
  onToggle,
  onDelete,
  onClick,
  onViewVehicle,
  getPriorityClass
}: {
  todo: TodoType;
  onToggle: (id: string, e: React.SyntheticEvent) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClick: (todo: TodoType) => void;
  onViewVehicle: (e: React.MouseEvent, vehicleId: string) => void;
  getPriorityClass: (priority: string) => string;
}) => {
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onDelete(todo.id);
  };

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    await onToggle(todo.id, e);
  };

  const handleViewVehicle = (e: React.MouseEvent) => {
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
          onClick={(e) => e.stopPropagation()}
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
              <span className={`text-xs ${
                isOverdue(todo.dueDate) ? 'text-red-600 font-semibold' : 'text-gray-600'
              }`}>
                마감일: {formatDate(todo.dueDate)}
              </span>
            )}
            
            {todo.vehicleId && (
              <button
                onClick={handleViewVehicle}
                className="text-xs text-blue-600 hover:underline"
              >
                차량 보기
              </button>
            )}
          </div>
        </div>
      </div>
      
      <button
        onClick={handleDelete}
        className="text-red-500 hover:text-red-700"
      >
        삭제
      </button>
    </li>
  );
});

export default TodoItem; 