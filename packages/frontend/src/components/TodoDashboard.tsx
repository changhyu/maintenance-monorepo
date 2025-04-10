import React, { useState, useEffect } from 'react';
import TodoStats from './TodoStats';
import TodoCalendar from './TodoCalendar';
import TodoDetailModal from './TodoDetailModal';
import TodoNotifications from './TodoNotifications';
import TodoFilter from './TodoFilter';
import { Modal, Form, Input, Select, DatePicker, Button, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { TodoList } from './todo/TodoList';
import TodoTemplates from './TodoTemplates';
import { useTodoContext, TodoTemplate, TodoFilterType } from '../context/TodoContext';
import { Todo, TodoCreateRequest, TodoUpdateRequest } from '../services/todoService';

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
    filter,
    setFilter,
    fetchTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
    createTodosFromTemplate,
    requestNotificationPermission
  } = useTodoContext();
  
  // 현재 선택된 탭
  const [activeTab, setActiveTab] = useState<'list' | 'stats' | 'calendar' | 'templates'>('list');
  
  // 모달 상태
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 할 일 추가 모달 상태
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [createLoading, setCreateLoading] = useState(false);
  
  // 브라우저 알림 권한 요청 (컴포넌트 마운트 시 한 번만 실행)
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);
  
  // Todo 항목 클릭 처리
  const handleTodoClick = (todo: Todo) => {
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
  
  // 필터 변경 핸들러
  const handleFilterChange = (newFilter: TodoFilterType) => {
    setFilter(newFilter);
    fetchTodos(newFilter);
  };
  
  // 할 일 추가 폼 제출 처리
  const handleCreateFormSubmit = async (values: TodoCreateRequest) => {
    try {
      setCreateLoading(true);
      
      const todoData: TodoCreateRequest = {
        title: values.title,
        description: values.description || '',
        priority: values.priority || 'medium',
        dueDate: values.dueDate ? values.dueDate : undefined,
        category: values.category || '일반',
        completed: false
      };
      
      await createTodo(todoData);
      message.success('할 일이 성공적으로 생성되었습니다');
      setCreateModalVisible(false);
      createForm.resetFields();
    } catch (err) {
      console.error('Todo 생성 중 오류가 발생했습니다:', err);
      message.error('할 일 생성 중 오류가 발생했습니다');
    } finally {
      setCreateLoading(false);
    }
  };
  
  // 할 일 업데이트 처리
  const handleTodoEdit = async (id: string, updates: TodoUpdateRequest) => {
    try {
      const updatedTodo = await updateTodo(id, updates);
      return updatedTodo;
    } catch (err) {
      console.error('Todo 업데이트 중 오류가 발생했습니다:', err);
      return null;
    }
  };
  
  // 할 일 삭제 처리
  const handleTodoDelete = async (id: string): Promise<void> => {
    try {
      await deleteTodo(id);
    } catch (err) {
      console.error('Todo 삭제 중 오류가 발생했습니다:', err);
    }
  };
  
  // Todo 완료 상태 토글 처리
  const handleToggleComplete = async (id: string) => {
    try {
      const todo = todos.find(t => t.id === id);
      if (todo) {
        return await toggleComplete(id, !todo.completed);
      }
      return false;
    } catch (err) {
      console.error('Todo 완료 상태 변경 중 오류가 발생했습니다:', err);
      return false;
    }
  };
  
  // 탭 버튼 클래스
  const getTabClass = (tab: 'list' | 'stats' | 'calendar' | 'templates') => {
    return `px-4 py-2 font-medium rounded-t-lg ${
      activeTab === tab
        ? 'bg-white text-blue-600 border-t border-l border-r'
        : 'bg-gray-100 text-gray-500 hover:text-gray-700'
    }`;
  };

  // 할 일 목록 탭 렌더링
  const renderTodoList = () => {
    return (
      <>
        <div className="mb-4">
          <TodoFilter 
            onFilterChange={handleFilterChange} 
            initialFilter={filter}
          />
        </div>
        <div className="mb-4 flex justify-between items-center">
          <div>
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => setCreateModalVisible(true)}
            >
              새 할 일 추가
            </button>
          </div>
          <div>
            <span className="mr-2">총 {todos.length}개의 할 일</span>
          </div>
        </div>
        <TodoList
          todos={todos}
          loading={loading}
          onTodoClick={handleTodoClick}
          onUpdateTodo={handleTodoEdit}
          onDeleteTodo={handleTodoDelete}
          onToggleComplete={handleToggleComplete}
        />
      </>
    );
  };

  // 캘린더 탭 렌더링
  const renderCalendar = () => {
    return (
      <TodoCalendar
        todos={todos}
        onTodoClick={handleTodoClick}
        className="mt-4"
      />
    );
  };

  // 템플릿 탭 렌더링
  const renderTemplates = () => {
    return (
      <TodoTemplates 
        className="mt-4"
        onTemplateSelect={(template: TodoTemplate) => {
          // 템플릿 선택 시 기본 탭으로 이동하고 템플릿에서 할 일 생성
          setActiveTab('list');
          
          // 진행 상황 표시
          message.loading(`템플릿 '${template.name}'의 ${template.items.length}개 항목 생성 중...`, 0);
          
          // 템플릿 항목 생성
          createTodosFromTemplate(template)
            .then(() => {
              message.destroy();
              message.success(`템플릿 '${template.name}'에서 ${template.items.length}개의 할 일이 생성되었습니다`);
            })
            .catch(() => {
              message.destroy();
              message.error('템플릿 적용 중 오류가 발생했습니다');
            });
        }}
      />
    );
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
            <button
              onClick={() => setActiveTab('templates')}
              className={getTabClass('templates')}
            >
              템플릿
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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error.message || '할 일을 불러오는 중 오류가 발생했습니다.'}
        </div>
      )}
      
      <div className="tab-content">
        {activeTab === 'list' && renderTodoList()}
        
        {activeTab === 'stats' && <TodoStats todos={todos} className="mt-4" />}
        
        {activeTab === 'calendar' && renderCalendar()}

        {activeTab === 'templates' && renderTemplates()}
      </div>
      
      {/* Todo 상세 모달 */}
      <TodoDetailModal
        todo={selectedTodo}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onUpdate={handleTodoEdit}
        isLoading={loading}
      />
      
      {/* 할 일 추가 모달 */}
      <Modal
        title="새 할 일 추가"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateFormSubmit}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item 
              name="title" 
              label="제목" 
              rules={[{ required: true, message: '제목을 입력해주세요' }]}
            >
              <Input placeholder="할 일 제목" />
            </Form.Item>
            
            <Form.Item name="category" label="카테고리">
              <Select placeholder="카테고리 선택">
                <Select.Option value="정기 점검">정기 점검</Select.Option>
                <Select.Option value="일상 점검">일상 점검</Select.Option>
                <Select.Option value="부품 교체">부품 교체</Select.Option>
                <Select.Option value="사고 수리">사고 수리</Select.Option>
                <Select.Option value="일반">일반</Select.Option>
              </Select>
            </Form.Item>
          </div>
          
          <Form.Item name="description" label="설명">
            <Input.TextArea placeholder="할 일에 대한 상세 설명" rows={4} />
          </Form.Item>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="priority" label="우선순위">
              <Select placeholder="우선순위 선택" defaultValue="medium">
                <Select.Option value="high">높음</Select.Option>
                <Select.Option value="medium">중간</Select.Option>
                <Select.Option value="low">낮음</Select.Option>
              </Select>
            </Form.Item>
            
            <Form.Item name="dueDate" label="마감일">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          
          <div className="flex justify-between mt-4">
            <Button onClick={() => setCreateModalVisible(false)}>
              취소
            </Button>
            
            <Space>
              <Button 
                onClick={() => {
                  setCreateModalVisible(false);
                  setActiveTab('templates');
                }}
              >
                템플릿에서 추가
              </Button>
              
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={createLoading}
                icon={<PlusOutlined />}
              >
                할 일 추가
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TodoDashboard; 