import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTodoService, Todo as TodoType, TodoCreateRequest, TodoFilter as FilterType, TodoUpdateRequest } from '../hooks/useTodoService';
import TodoFilter from './TodoFilter';
import TodoTemplates from './TodoTemplates';
import { useTodoContext } from '../context/TodoContext';
import { 
  Button, 
  Input, 
  List, 
  Tag, 
  Modal, 
  Select, 
  Popconfirm, 
  Drawer, 
  Card, 
  Divider, 
  Space, 
  Typography, 
  Empty, 
  Form, 
  message 
} from 'antd';
const { Title, Text, Paragraph } = Typography;

/**
 * Todo 컴포넌트 프롭스 인터페이스
 */
interface TodoProps {
  vehicleId?: string;
  className?: string;
  showCompleted?: boolean;
  onTodoClick?: (todo: TodoType) => void;
  onCreateTodo?: (todoData: TodoCreateRequest) => Promise<TodoType>;
  onUpdateTodo?: (id: string, updates: TodoUpdateRequest) => Promise<TodoType>;
  onDeleteTodo?: (id: string) => Promise<void>;
}

interface TodoItem {
  id: string;
  vehicleId?: string;
  title: string;
  completed: boolean;
  createdAt: Date | string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date | string;
  assignedTo?: string;
  category?: string;
  description?: string;
}

// 추가: 템플릿 인터페이스 정의
interface TodoTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  items: {
    title: string;
    description?: string; 
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
    assignedTo?: string;
  }[];
}

// 테마 색상 정의
const priorityColors = {
  low: '#87d068',
  medium: '#108ee9',
  high: '#f50'
};

/**
 * 정비 작업 관리를 위한 Todo 컴포넌트
 */
const Todo: React.FC<TodoProps> = ({ 
  vehicleId, 
  className = '', 
  showCompleted = true,
  onTodoClick,
  onCreateTodo,
  onUpdateTodo,
  onDeleteTodo
}) => {
  const navigate = useNavigate();
  const { 
    todos, 
    loading: serviceLoading, 
    error: serviceError, 
    fetchTodos,
    createTodo: serviceCreateTodo,
    updateTodo: serviceUpdateTodo,
    deleteTodo: serviceDeleteTodo 
  } = useTodoService();
  
  const [filteredTodos, setFilteredTodos] = useState<TodoType[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 필터 상태
  const [currentFilter, setCurrentFilter] = useState<FilterType>({});
  const [showTemplates, setShowTemplates] = useState(false);
  
  // 추가: 필터 옵션과 선택된 필터
  const [filter, setFilter] = useState<string>('all');
  const filterOptions = [
    { value: 'all', label: '모든 작업' },
    { value: 'active', label: '활성 작업' },
    { value: 'completed', label: '완료된 작업' }
  ];

  // 템플릿 상태
  const [templates, setTemplates] = useState<TodoTemplate[]>([]);
  const [templateVisible, setTemplateVisible] = useState(false);
  const [templateManageVisible, setTemplateManageVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TodoTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TodoTemplate | null>(null);
  const [newTemplateItems, setNewTemplateItems] = useState<TodoTemplate['items']>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('일반');
  const [categories, setCategories] = useState<string[]>(['일반', '정기 점검', '긴급 정비', '부품 교체']);

  // 초기 데이터 로드
  useEffect(() => {
    const loadTodos = async () => {
      try {
        await fetchTodos(vehicleId ? { vehicleId, ...currentFilter } : currentFilter);
      } catch (err) {
        console.error('Failed to load todos:', err);
      }
    };
    
    loadTodos();
  }, [fetchTodos, vehicleId, currentFilter]);

  // 템플릿 로드 함수
  useEffect(() => {
    // 실제 구현에서는 API 호출로 대체
    const loadTemplates = async () => {
      try {
        // 예시 템플릿 데이터
        const mockTemplates: TodoTemplate[] = [
          {
            id: '1',
            name: '정기 엔진 점검',
            description: '3개월 주기 엔진 점검 항목',
            category: '정기 점검',
            items: [
              { title: '엔진 오일 확인', priority: 'high', description: '오일 레벨 및 상태 확인' },
              { title: '냉각수 확인', priority: 'medium', description: '냉각수 레벨 확인 및 필요시 보충' },
              { title: '벨트 점검', priority: 'medium', description: '벨트 장력 및 마모 정도 확인' }
            ]
          },
          {
            id: '2',
            name: '타이어 교체',
            description: '타이어 교체 작업',
            category: '부품 교체',
            items: [
              { title: '타이어 공기압 확인', priority: 'medium' },
              { title: '타이어 회전', priority: 'medium' },
              { title: '볼트 토크 확인', priority: 'high', description: '규정 토크로 체결 확인' }
            ]
          }
        ];
        setTemplates(mockTemplates);
      } catch (error) {
        console.error('템플릿 로드 실패:', error);
      }
    };
    
    loadTemplates();
  }, []);

  // 필터링된 Todo 항목 설정
  useEffect(() => {
    if (!todos) return;

    let filtered = [...todos];
    
    // 완료 상태로 필터링 (컴포넌트 prop 기반)
    if (!showCompleted) {
      filtered = filtered.filter(todo => !todo.completed);
    }
    
    // 추가: 선택된 필터에 따라 필터링
    if (filter === 'active') {
      filtered = filtered.filter(todo => !todo.completed);
    } else if (filter === 'completed') {
      filtered = filtered.filter(todo => todo.completed);
    }
    
    // 우선순위 및 날짜로 정렬
    filtered.sort((a, b) => {
      // 우선순위로 먼저 정렬
      const priorityValues = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityValues[b.priority] - priorityValues[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // 날짜로 정렬
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });
    
    setFilteredTodos(filtered);
  }, [todos, vehicleId, showCompleted, filter]);

  // 새 Todo 추가
  const handleAddTodo = useCallback(async () => {
    if (!newTodo.trim()) return;
    
    setLoading(true);
    setError(null);
    
    const todoData: TodoCreateRequest = {
      title: newTodo.trim(),
      completed: false,
      priority,
      vehicleId,
      dueDate: dueDate || undefined
    };
    
    try {
      // 외부 핸들러 사용 또는 서비스 직접 호출
      if (onCreateTodo) {
        await onCreateTodo(todoData);
      } else {
        await serviceCreateTodo(todoData);
      }
      
      setNewTodo('');
      setPriority('medium');
      setDueDate('');
    } catch (err) {
      setError('정비 작업을 추가하는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [newTodo, dueDate, priority, onCreateTodo, serviceCreateTodo, vehicleId]);

  // Todo 상태 토글
  const handleToggleComplete = async (id: string, completed: boolean) => {
    try {
      // 외부 핸들러 사용 또는 서비스 직접 호출
      if (onUpdateTodo) {
        await onUpdateTodo(id, { completed: !completed });
      } else {
        await serviceUpdateTodo(id, { completed: !completed });
      }
    } catch (err) {
      console.error('Failed to update todo:', err);
    }
  };

  // Todo 삭제
  const handleRemoveTodo = async (id: string) => {
    if (window.confirm('이 정비 작업을 삭제하시겠습니까?')) {
      try {
        // 외부 핸들러 사용 또는 서비스 직접 호출
        if (onDeleteTodo) {
          await onDeleteTodo(id);
        } else {
          await serviceDeleteTodo(id);
        }
      } catch (err) {
        console.error('Failed to delete todo:', err);
      }
    }
  };

  // Todo 클릭 시 상세보기
  const handleTodoClick = (todo: TodoType) => {
    if (onTodoClick) {
      onTodoClick(todo);
    }
  };

  // 필터 변경 처리
  const handleFilterChange = (filter: FilterType) => {
    setCurrentFilter(filter);
  };

  // 차량 상세 페이지로 이동
  const handleViewVehicle = (e: React.MouseEvent, vehicleId: string) => {
    e.stopPropagation();
    navigate(`/vehicles/${vehicleId}`);
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 서비스 에러 표시
  const displayError = serviceError || error;

  /**
   * 템플릿에서 Todo 생성
   */
  const handleCreateFromTemplate = async (todoData: TodoCreateRequest) => {
    try {
      await serviceCreateTodo(todoData);
      // 새로운 데이터를 가져와서 상태 업데이트
      fetchTodos();
    } catch (error) {
      console.error('템플릿에서 Todo를 생성하는 중 오류가 발생했습니다:', error);
    }
  };

  // 템플릿 선택 전 addTodo 함수 추가
  const addTodo = (todoItem: TodoItem) => {
    const todoData: TodoCreateRequest = {
      title: todoItem.title,
      completed: todoItem.completed,
      priority: todoItem.priority,
      vehicleId: todoItem.vehicleId,
      dueDate: typeof todoItem.dueDate === 'string' ? todoItem.dueDate : undefined,
      description: todoItem.description
    };
    
    try {
      if (onCreateTodo) {
        onCreateTodo(todoData);
      } else if (serviceCreateTodo) {
        serviceCreateTodo(todoData);
      }
    } catch (error) {
      console.error('템플릿에서 Todo 추가 중 오류 발생:', error);
      setError('템플릿에서 작업을 추가하는 중 오류가 발생했습니다.');
    }
  };

  // 템플릿 선택 처리
  const handleTemplateSelect = (template: TodoTemplate) => {
    setSelectedTemplate(template);
    setTemplateVisible(false);
    
    // 선택된 템플릿의 항목들을 할 일 목록에 추가
    template.items.forEach(item => {
      const newTodo: TodoItem = {
        id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: item.title,
        description: item.description || '',
        completed: false,
        createdAt: new Date().toISOString(),
        priority: item.priority || 'medium',
        vehicleId: vehicleId || '',
        dueDate: item.dueDate || '',
      };
      
      addTodo(newTodo);
    });
    
    message.success(`'${template.name}' 템플릿을 할 일 목록에 추가했습니다.`);
  };

  // 템플릿 추가 처리
  const handleAddTemplate = () => {
    if (!newTemplateName) {
      message.error('템플릿 이름을 입력해주세요');
      return;
    }
    
    if (newTemplateItems.length === 0) {
      message.error('최소 하나 이상의 항목을 추가해주세요');
      return;
    }
    
    const newTemplate: TodoTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newTemplateName,
      description: newTemplateDescription,
      category: newTemplateCategory,
      items: [...newTemplateItems]
    };
    
    setTemplates([...templates, newTemplate]);
    setNewTemplateName('');
    setNewTemplateDescription('');
    setNewTemplateCategory('일반');
    setNewTemplateItems([]);
    
    message.success('새 템플릿이 추가되었습니다');
  };

  // 템플릿 항목 추가
  const handleAddTemplateItem = () => {
    const newItem = {
      title: `항목 ${newTemplateItems.length + 1}`,
      description: '',
      priority: 'medium' as 'low' | 'medium' | 'high'
    };
    
    setNewTemplateItems([...newTemplateItems, newItem]);
  };

  // 템플릿 항목 제거
  const handleRemoveTemplateItem = (index: number) => {
    const updatedItems = [...newTemplateItems];
    updatedItems.splice(index, 1);
    setNewTemplateItems(updatedItems);
  };

  // 템플릿 항목 수정
  const handleTemplateItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...newTemplateItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setNewTemplateItems(updatedItems);
  };

  // 템플릿 삭제
  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(templates.filter(template => template.id !== templateId));
    message.success('템플릿이 삭제되었습니다');
  };

  // 템플릿 편집 시작
  const handleEditTemplate = (template: TodoTemplate) => {
    setEditingTemplate(template);
    setNewTemplateName(template.name);
    setNewTemplateDescription(template.description);
    setNewTemplateCategory(template.category);
    setNewTemplateItems([...template.items]);
  };

  // 템플릿 편집 저장
  const handleSaveEditedTemplate = () => {
    if (!editingTemplate) return;
    
    const updatedTemplate: TodoTemplate = {
      ...editingTemplate,
      name: newTemplateName,
      description: newTemplateDescription,
      category: newTemplateCategory,
      items: [...newTemplateItems]
    };
    
    setTemplates(
      templates.map(template => 
        template.id === editingTemplate.id ? updatedTemplate : template
      )
    );
    
    setEditingTemplate(null);
    setNewTemplateName('');
    setNewTemplateDescription('');
    setNewTemplateCategory('일반');
    setNewTemplateItems([]);
    
    message.success('템플릿이 수정되었습니다');
  };

  // 템플릿 편집 취소
  const handleCancelEdit = () => {
    setEditingTemplate(null);
    setNewTemplateName('');
    setNewTemplateDescription('');
    setNewTemplateCategory('일반');
    setNewTemplateItems([]);
  };

  return (
    <div className={`todo-container ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">정비 작업 관리</h2>
        <div className="flex space-x-2">
          <Button
            onClick={() => setTemplateVisible(true)}
            type="primary"
            style={{ marginRight: 8 }}
          >
            템플릿에서 생성
          </Button>
          <Button
            onClick={() => setTemplateManageVisible(true)}
            type="default"
          >
            템플릿 관리
          </Button>
          {filterOptions && (
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="border p-1 rounded"
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      
      {/* 템플릿 선택 드로어 */}
      <Drawer
        title="템플릿 선택"
        placement="right"
        onClose={() => setTemplateVisible(false)}
        open={templateVisible}
        width={500}
      >
        <List
          dataSource={templates}
          renderItem={template => (
            <List.Item
              actions={[
                <Button key="select" type="primary" onClick={() => handleTemplateSelect(template)}>
                  선택
                </Button>
              ]}
            >
              <List.Item.Meta
                title={template.name}
                description={
                  <>
                    <Typography.Paragraph>{template.description}</Typography.Paragraph>
                    <Tag color="blue">{template.category}</Tag>
                    <Typography.Text type="secondary">
                      {template.items.length}개 항목
                    </Typography.Text>
                  </>
                }
              />
            </List.Item>
          )}
        />
      </Drawer>
      
      {/* 템플릿 관리 드로어 */}
      <Drawer
        title={editingTemplate ? '템플릿 편집' : '템플릿 관리'}
        placement="right"
        onClose={() => {
          setTemplateManageVisible(false);
          handleCancelEdit();
        }}
        open={templateManageVisible}
        width={600}
        extra={
          editingTemplate ? (
            <Space>
              <Button onClick={handleCancelEdit}>취소</Button>
              <Button type="primary" onClick={handleSaveEditedTemplate}>
                저장
              </Button>
            </Space>
          ) : null
        }
      >
        <Typography.Title level={4}>
          {editingTemplate ? '템플릿 수정' : '새 템플릿 추가'}
        </Typography.Title>
        
        <Form layout="vertical">
          <Form.Item label="템플릿 이름" required>
            <Input 
              value={newTemplateName} 
              onChange={e => setNewTemplateName(e.target.value)}
              placeholder="템플릿 이름을 입력하세요"
            />
          </Form.Item>
          
          <Form.Item label="설명">
            <Input.TextArea 
              value={newTemplateDescription}
              onChange={e => setNewTemplateDescription(e.target.value)}
              placeholder="템플릿에 대한 설명을 입력하세요"
              rows={2}
            />
          </Form.Item>
          
          <Form.Item label="카테고리">
            <Select
              value={newTemplateCategory}
              onChange={value => setNewTemplateCategory(value)}
              style={{ width: '100%' }}
            >
              {categories.map(category => (
                <Select.Option key={category} value={category}>
                  {category}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item label="항목">
            <List
              dataSource={newTemplateItems}
              renderItem={(item, index) => (
                <List.Item
                  actions={[
                    <Button 
                      key="delete" 
                      type="text" 
                      danger 
                      onClick={() => handleRemoveTemplateItem(index)}
                    >
                      삭제
                    </Button>
                  ]}
                >
                  <div style={{ width: '100%' }}>
                    <Input 
                      value={item.title}
                      onChange={e => handleTemplateItemChange(index, 'title', e.target.value)}
                      placeholder="항목 제목"
                      style={{ marginBottom: 8 }}
                    />
                    <Input 
                      value={item.description}
                      onChange={e => handleTemplateItemChange(index, 'description', e.target.value)}
                      placeholder="항목 설명 (선택사항)"
                      style={{ marginBottom: 8 }}
                    />
                    <Select
                      value={item.priority}
                      onChange={value => handleTemplateItemChange(index, 'priority', value)}
                      style={{ width: '100%' }}
                    >
                      <Select.Option value="low">낮음</Select.Option>
                      <Select.Option value="medium">중간</Select.Option>
                      <Select.Option value="high">높음</Select.Option>
                    </Select>
                  </div>
                </List.Item>
              )}
              footer={
                <Button type="dashed" onClick={handleAddTemplateItem} block>
                  + 항목 추가
                </Button>
              }
            />
          </Form.Item>
          
          {!editingTemplate && (
            <Form.Item>
              <Button type="primary" onClick={handleAddTemplate} block>
                템플릿 저장
              </Button>
            </Form.Item>
          )}
        </Form>
        
        {!editingTemplate && (
          <>
            <Divider />
            
            <Typography.Title level={4}>
              기존 템플릿 관리
            </Typography.Title>
            
            <List
              dataSource={templates}
              renderItem={template => (
                <List.Item
                  actions={[
                    <Button 
                      key="edit" 
                      type="text"
                      onClick={() => handleEditTemplate(template)}
                    >
                      편집
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="정말 삭제하시겠습니까?"
                      onConfirm={() => handleDeleteTemplate(template.id)}
                      okText="예"
                      cancelText="아니오"
                    >
                      <Button type="text" danger>
                        삭제
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    title={template.name}
                    description={
                      <>
                        <Typography.Paragraph>{template.description}</Typography.Paragraph>
                        <Tag color="blue">{template.category}</Tag>
                        <Typography.Text type="secondary">
                          {template.items.length}개 항목
                        </Typography.Text>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </Drawer>
      
      <div className="add-todo mb-6">
        <TodoFilter
          onFilterChange={handleFilterChange}
          className="mb-6"
        />
        
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="새 정비 작업 추가..."
            className="border p-2 rounded"
          />
          
          <div className="flex gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="border p-2 rounded"
            >
              <option value="low">낮음</option>
              <option value="medium">중간</option>
              <option value="high">높음</option>
            </select>
            
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border p-2 rounded"
            />
            
            <button
              onClick={handleAddTodo}
              disabled={loading || serviceLoading || !newTodo.trim()}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
            >
              {loading || serviceLoading ? '처리 중...' : '추가'}
            </button>
          </div>
          
          {displayError && <p className="text-red-500 text-sm">{displayError}</p>}
        </div>
      </div>

      {/* Todo 목록 */}
      {serviceLoading ? (
        <p className="text-gray-500">로딩 중...</p>
      ) : filteredTodos.length === 0 ? (
        <p className="text-gray-500">등록된 정비 작업이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {filteredTodos.map((todo) => (
            <li
              key={todo.id}
              onClick={() => handleTodoClick(todo)}
              className={`border p-3 rounded flex items-center justify-between ${
                todo.completed ? 'bg-gray-100' : ''
              } cursor-pointer hover:bg-gray-50`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleToggleComplete(todo.id, todo.completed);
                  }}
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
                      <span className="text-xs text-gray-600">
                        마감일: {new Date(todo.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    
                    {todo.vehicleId && (
                      <button
                        onClick={(e) => handleViewVehicle(e, todo.vehicleId!)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        차량 보기
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTodo(todo.id);
                }}
                className="text-red-500 hover:text-red-700"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Todo; 