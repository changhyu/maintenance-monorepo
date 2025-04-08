import React, { useState, useEffect } from 'react';
import { useTodoService, Todo as TodoType, TodoCreateRequest } from '../hooks/useTodoService';
import TodoComponent from './Todo';
import TodoStats from './TodoStats';
import TodoCalendar from './TodoCalendar';
import TodoDetailModal from './TodoDetailModal';
import TodoNotifications from './TodoNotifications';
import todoNotificationService from '../services/todoNotificationService';

interface TodoDashboardProps {
  className?: string;
}

/**
 * Todo 통합 대시보드 컴포넌트
 */
const TodoDashboard: React.FC<TodoDashboardProps> = ({ className = '' }) => {
  const { 
    todos, 
    loading, 
    error, 
    fetchTodos, 
    updateTodo, 
    createTodo, 
    deleteTodo 
  } = useTodoService();
  
  // 현재 선택된 탭
  const [activeTab, setActiveTab] = useState<'list' | 'stats' | 'calendar'>('list');
  
  // 모달 상태
  const [selectedTodo, setSelectedTodo] = useState<TodoType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 초기 데이터 로드 및 알림 검사
  useEffect(() => {
    const loadTodos = async () => {
      try {
        await fetchTodos();
      } catch (err) {
        console.error('Todo 목록을 불러오는 중 오류가 발생했습니다:', err);
      }
    };
    
    loadTodos();
    
    // 브라우저 알림 권한 요청
    todoNotificationService.requestNotificationPermission();
    
    // 1분마다 마감일 알림 확인
    const checkInterval = setInterval(() => {
      if (todos.length > 0) {
        todoNotificationService.checkAndNotifyUpcomingDue(todos);
      }
    }, 60000);
    
    return () => {
      clearInterval(checkInterval);
    };
  }, [fetchTodos, todos]);
  
  // Todo 항목 클릭 처리
  const handleTodoClick = (todo: TodoType) => {
    setSelectedTodo(todo);
    setIsModalOpen(true);
  };
  
  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTodo(null);
  };
  
  // 알림의 Todo 항목 클릭 처리
  const handleNotificationTodoClick = (todoId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (todo) {
      setSelectedTodo(todo);
      setIsModalOpen(true);
    }
  };
  
  // Todo 업데이트 처리
  const handleUpdateTodo = async (id: string, updates: Partial<TodoType>) => {
    try {
      // 상태 변경 감지
      const oldTodo = todos.find(t => t.id === id);
      if (oldTodo && 'completed' in updates && updates.completed !== oldTodo.completed) {
        todoNotificationService.notifyStatusChange(
          { ...oldTodo, ...updates } as TodoType,
          oldTodo.completed
        );
      }
      
      const updatedTodo = await updateTodo(id, updates);
      return updatedTodo;
    } catch (err) {
      console.error('Todo 업데이트 중 오류가 발생했습니다:', err);
      throw err;
    }
  };
  
  // Todo 생성 처리
  const handleCreateTodo = async (todoData: TodoCreateRequest) => {
    try {
      const newTodo = await createTodo(todoData);
      
      // 우선순위 높음 알림
      if (newTodo.priority === 'high') {
        todoNotificationService.notifyHighPriorityTodo(newTodo);
      }
      
      return newTodo;
    } catch (err) {
      console.error('Todo 생성 중 오류가 발생했습니다:', err);
      throw err;
    }
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
        <div className="flex items-center space-x-2">
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
          
          <TodoNotifications 
            onTodoClick={handleNotificationTodoClick} 
            className="ml-4"
          />
        </div>
      </div>
      
      {loading && <div className="text-center py-4">로딩 중...</div>}
      
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      <div className="tab-content">
        {activeTab === 'list' && (
          <TodoComponent 
            className="bg-white rounded-lg shadow-md" 
            onTodoClick={handleTodoClick}
            onCreateTodo={handleCreateTodo}
            onUpdateTodo={handleUpdateTodo}
            onDeleteTodo={deleteTodo}
          />
        )}
        
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
        onUpdate={handleUpdateTodo}
        isLoading={loading}
      />
    </div>
  );
};

export default TodoDashboard; 