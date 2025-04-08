import React, { useState } from 'react';
import { TodoFilter as FilterType } from '../hooks/useTodoService';

interface TodoFilterProps {
  onFilterChange: (filter: FilterType) => void;
  className?: string;
}

const TodoFilter: React.FC<TodoFilterProps> = ({ onFilterChange, className = '' }) => {
  const [status, setStatus] = useState<'all' | 'completed' | 'pending'>('all');
  const [priority, setPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [dueFrom, setDueFrom] = useState<string>('');
  const [dueTo, setDueTo] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');

  // 필터 변경 처리
  const handleFilterChange = () => {
    const filter: FilterType = {};
    
    // 상태 필터
    if (status !== 'all') {
      filter.status = status;
    }
    
    // 우선순위 필터
    if (priority !== 'all') {
      filter.priority = priority;
    }
    
    // 날짜 필터
    if (dueFrom) {
      filter.dueFrom = dueFrom;
    }
    if (dueTo) {
      filter.dueTo = dueTo;
    }
    
    // 차량 ID 필터
    if (vehicleId) {
      filter.vehicleId = vehicleId;
    }
    
    onFilterChange(filter);
  };

  // 필터 초기화
  const resetFilters = () => {
    setStatus('all');
    setPriority('all');
    setDueFrom('');
    setDueTo('');
    setVehicleId('');
    onFilterChange({});
  };

  return (
    <div className={`todo-filter p-4 bg-gray-50 rounded-lg shadow-sm mb-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-3">정비 작업 필터</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 상태 필터 */}
        <div className="filter-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            상태
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | 'completed' | 'pending')}
            className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
          >
            <option value="all">모든 상태</option>
            <option value="completed">완료됨</option>
            <option value="pending">진행 중</option>
          </select>
        </div>
        
        {/* 우선순위 필터 */}
        <div className="filter-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            우선순위
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'all' | 'low' | 'medium' | 'high')}
            className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
          >
            <option value="all">모든 우선순위</option>
            <option value="high">높음</option>
            <option value="medium">중간</option>
            <option value="low">낮음</option>
          </select>
        </div>
        
        {/* 차량 ID 필터 */}
        <div className="filter-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            차량 ID
          </label>
          <input
            type="text"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            placeholder="차량 ID 입력"
            className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        
        {/* 마감일 시작 */}
        <div className="filter-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            마감일 시작
          </label>
          <input
            type="date"
            value={dueFrom}
            onChange={(e) => setDueFrom(e.target.value)}
            className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        
        {/* 마감일 종료 */}
        <div className="filter-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            마감일 종료
          </label>
          <input
            type="date"
            value={dueTo}
            onChange={(e) => setDueTo(e.target.value)}
            className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
      </div>
      
      {/* 액션 버튼 */}
      <div className="flex justify-end mt-4 gap-2">
        <button
          onClick={resetFilters}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          초기화
        </button>
        <button
          onClick={handleFilterChange}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          적용
        </button>
      </div>
    </div>
  );
};

export default TodoFilter; 