import React, { useState, useEffect } from 'react';
import { Todo, TodoUpdateRequest } from '../hooks/useTodoService';

interface TodoDetailModalProps {
  todo: Todo | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: TodoUpdateRequest) => Promise<Todo | void>;
  isLoading?: boolean;
}

const TodoDetailModal: React.FC<TodoDetailModalProps> = ({
  todo,
  isOpen,
  onClose,
  onUpdate,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<TodoUpdateRequest>({});
  const [error, setError] = useState<string | null>(null);
  
  // todo 데이터가 변경될 때마다 폼 데이터 업데이트
  useEffect(() => {
    if (todo) {
      setFormData({
        title: todo.title,
        description: todo.description,
        priority: todo.priority,
        dueDate: todo.dueDate,
        assignedTo: todo.assignedTo,
        vehicleId: todo.vehicleId,
        completed: todo.completed
      });
    }
  }, [todo]);
  
  // 입력 변경 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // 체크박스 변경 처리
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  // 업데이트 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!todo) return;
    
    setError(null);
    
    try {
      await onUpdate(todo.id, formData);
      onClose();
    } catch (err) {
      setError('정비 작업을 업데이트하는 중 오류가 발생했습니다.');
      console.error(err);
    }
  };
  
  // 모달이 닫혀있으면 아무것도 렌더링하지 않음
  if (!isOpen || !todo) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">정비 작업 상세</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* 제목 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              type="text"
              name="title"
              value={formData.title || ''}
              onChange={handleInputChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          
          {/* 설명 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
              rows={3}
              className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          
          {/* 우선순위 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              우선순위
            </label>
            <select
              name="priority"
              value={formData.priority || 'medium'}
              onChange={handleInputChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="high">높음</option>
              <option value="medium">중간</option>
              <option value="low">낮음</option>
            </select>
          </div>
          
          {/* 마감일 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              마감일
            </label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate || ''}
              onChange={handleInputChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          
          {/* 차량 ID */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              차량 ID
            </label>
            <input
              type="text"
              name="vehicleId"
              value={formData.vehicleId || ''}
              onChange={handleInputChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          
          {/* 담당자 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              담당자
            </label>
            <input
              type="text"
              name="assignedTo"
              value={formData.assignedTo || ''}
              onChange={handleInputChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          
          {/* 완료 여부 */}
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="completed"
                checked={!!formData.completed}
                onChange={handleCheckboxChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">완료됨</span>
            </label>
          </div>
          
          {error && (
            <div className="mb-4 text-sm text-red-600">{error}</div>
          )}
          
          {/* 메타데이터 */}
          <div className="mb-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              생성일: {new Date(todo.createdAt).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">
              최종 수정일: {new Date(todo.updatedAt).toLocaleString()}
            </p>
          </div>
          
          {/* 액션 버튼 */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
              disabled={isLoading}
            >
              {isLoading ? '처리 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TodoDetailModal; 