import React, { useState, useEffect } from 'react';
import { useTodoService } from '../hooks/useTodoService';
import Todo from './Todo';
import TodoStats from './TodoStats';
import TodoCalendar from './TodoCalendar';
import TodoDetailModal from './TodoDetailModal';

interface TodoDashboardProps {
  className?: string;
}

/**
 * Todo 통합 대시보드 컴포넌트
 */
const TodoDashboard: React.FC<TodoDashboardProps> = ({ className = '' }) => {
  const { todos, loading, error, fetchTodos, updateTodo } = useTodoService();
  
  // 현재 선택된 탭
  const [activeTab, setActiveTab] = useState<'list' | 'stats' | 'calendar'>('list');
  
  // 모달 상태
  const [selectedTodo, setSelectedTodo] = useState<null | any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 초기 데이터 로드
  useEffect(() => {
    const loadTodos = async () => {
      try {
        await fetchTodos();
      } catch (err) {
        console.error('Todo 목록을 불러오는 중 오류가 발생했습니다:', err);
      }
    };
    
    loadTodos();
  }, [fetchTodos]);
  
  // Todo 항목 클릭 처리
  const handleTodoClick = (todo: any) => {
    setSelectedTodo(todo);
    setIsModalOpen(true);
  };
  
  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTodo(null);
  };
  
  // 탭 버튼 클래스
  const getTabClass = (tab: 'list' | 'stats' | 'calendar') => {
    return `px-4 py-2 font-medium rounded-t-lg ${
      activeTab === tab
        ? 'bg-white text-blue-600 border-t border-l border-r'
        : 'bg-gray-100 text-gray-500 hover:text-gray-700'
    }`;
  };

  return (
    <div className={`todo-dashboard ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">정비 작업 관리</h1>
        <div className="tabs flex space-x-1">
          <button
            onClick={() => setActiveTab('list')}
            className={getTabClass('list')}
          >
            목록
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={getTabClass('stats')}
          >
            통계
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={getTabClass('calendar')}
          >
            캘린더
          </button>
        </div>
      </div>
      
      {loading && <div className="text-center py-4">로딩 중...</div>}
      
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      <div className="tab-content">
        {activeTab === 'list' && <Todo className="bg-white rounded-lg shadow-md" />}
        
        {activeTab === 'stats' && <TodoStats todos={todos} className="mt-4" />}
        
        {activeTab === 'calendar' && (
          <TodoCalendar
            todos={todos}
            onTodoClick={handleTodoClick}
            className="mt-4"
          />
        )}
      </div>
      
      <TodoDetailModal
        todo={selectedTodo}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onUpdate={updateTodo}
        isLoading={loading}
      />
    </div>
  );
};

export default TodoDashboard; 