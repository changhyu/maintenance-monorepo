import React, { useState, useEffect } from 'react';
import todoTemplateService, { TodoTemplate } from '../services/todoTemplateService';
import { TodoCreateRequest } from '../hooks/useTodoService';

interface TodoTemplatesProps {
  className?: string;
  onApplyTemplate?: (todoData: TodoCreateRequest) => Promise<void>;
  vehicleId?: string;
}

/**
 * Todo 템플릿 관리 컴포넌트
 */
const TodoTemplates: React.FC<TodoTemplatesProps> = ({ 
  className = '', 
  onApplyTemplate,
  vehicleId 
}) => {
  const [templates, setTemplates] = useState<TodoTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TodoTemplate | null>(null);
  
  // 템플릿 폼 상태
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [templatePriority, setTemplatePriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newCategory, setNewCategory] = useState('');
  const [templateDescriptionDetail, setTemplateDescriptionDetail] = useState('');
  
  // 템플릿 적용 상태
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  
  // 템플릿 변경사항 구독
  useEffect(() => {
    const unsubscribe = todoTemplateService.subscribeToTemplates(
      (updatedTemplates) => {
        setTemplates(updatedTemplates);
        const allCategories = todoTemplateService.getAllCategories();
        setCategories(allCategories);
        
        if (allCategories.length > 0 && !selectedCategory) {
          setSelectedCategory(allCategories[0]);
        }
      }
    );
    
    return unsubscribe;
  }, [selectedCategory]);
  
  /**
   * 신규 템플릿 폼 초기화
   */
  const initNewTemplateForm = () => {
    setTemplateName('');
    setTemplateDescription('');
    setTemplateTitle('');
    setTemplateCategory(categories.length > 0 ? categories[0] : '');
    setTemplatePriority('medium');
    setNewCategory('');
    setTemplateDescriptionDetail('');
    setEditingTemplate(null);
    setShowNewTemplateForm(true);
  };
  
  /**
   * 템플릿 편집 폼 초기화
   */
  const initEditTemplateForm = (template: TodoTemplate) => {
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setTemplateTitle(template.template.title);
    setTemplateCategory(template.category);
    setTemplatePriority(template.template.priority || 'medium');
    setTemplateDescriptionDetail(template.template.description || '');
    setEditingTemplate(template);
    setShowNewTemplateForm(true);
  };
  
  /**
   * 템플릿 폼 취소
   */
  const handleCancelForm = () => {
    setShowNewTemplateForm(false);
    setEditingTemplate(null);
  };
  
  /**
   * 템플릿 저장
   */
  const handleSaveTemplate = () => {
    if (!templateName || !templateTitle || !templateCategory) {
      alert('이름, 제목, 카테고리는 필수 입력 항목입니다.');
      return;
    }
    
    const templateData: Omit<TodoCreateRequest, 'vehicleId'> = {
      title: templateTitle,
      description: templateDescriptionDetail || undefined,
      priority: templatePriority,
      completed: false
    };
    
    // 카테고리가 새로운 카테고리인 경우
    const category = newCategory.trim() ? newCategory.trim() : templateCategory;
    
    if (editingTemplate) {
      // 템플릿 업데이트
      todoTemplateService.updateTemplate(editingTemplate.id, {
        name: templateName,
        description: templateDescription || undefined,
        template: templateData,
        category
      });
    } else {
      // 새 템플릿 생성
      todoTemplateService.createTemplate(
        templateName,
        templateData,
        category,
        templateDescription || undefined
      );
    }
    
    setShowNewTemplateForm(false);
    setEditingTemplate(null);
    
    // 새 카테고리를 만든 경우 선택
    if (newCategory.trim()) {
      setSelectedCategory(newCategory.trim());
      setNewCategory('');
    }
  };
  
  /**
   * 템플릿 삭제
   */
  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('이 템플릿을 삭제하시겠습니까?')) {
      todoTemplateService.deleteTemplate(templateId);
    }
  };
  
  /**
   * 템플릿 적용
   */
  const handleApplyTemplate = () => {
    if (!selectedTemplate) {
      alert('템플릿을 선택해주세요.');
      return;
    }
    
    const todoData = todoTemplateService.applyTemplate(
      selectedTemplate,
      vehicleId,
      dueDate || undefined
    );
    
    if (!todoData) {
      alert('템플릿을 적용하는 중 오류가 발생했습니다.');
      return;
    }
    
    if (onApplyTemplate) {
      onApplyTemplate(todoData);
      setSelectedTemplate('');
      setDueDate('');
    }
  };
  
  const filteredTemplates = selectedCategory 
    ? templates.filter(t => t.category === selectedCategory)
    : templates;
  
  return (
    <div className={`todo-templates ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">정비 작업 템플릿</h2>
        <button 
          onClick={initNewTemplateForm}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          + 새 템플릿
        </button>
      </div>
      
      {/* 카테고리 탭 */}
      <div className="categories-tabs flex flex-wrap mb-4 border-b">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-2 mr-2 ${
              selectedCategory === category
                ? 'border-b-2 border-blue-500 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {category}
          </button>
        ))}
        
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-3 py-2 ${
            selectedCategory === ''
              ? 'border-b-2 border-blue-500 font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          모든 템플릿
        </button>
      </div>
      
      {/* 템플릿 적용 폼 */}
      {onApplyTemplate && (
        <div className="apply-template bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-2">템플릿으로 정비 작업 생성</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="">템플릿 선택...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.category} - {template.name}
                </option>
              ))}
            </select>
            
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              placeholder="마감일(선택)"
              className="border p-2 rounded"
            />
            
            <button
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate}
              className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
            >
              템플릿 적용
            </button>
          </div>
        </div>
      )}
      
      {/* 템플릿 목록 */}
      <div className="templates-list">
        {filteredTemplates.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            {selectedCategory 
              ? `'${selectedCategory}' 카테고리에 템플릿이 없습니다.` 
              : '등록된 템플릿이 없습니다.'}
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map(template => (
              <li key={template.id} className="border rounded-lg p-4 bg-white hover:shadow-md">
                <div className="flex justify-between">
                  <h3 className="font-bold">{template.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => initEditTemplateForm(template)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded inline-block mt-1">
                  {template.category}
                </span>
                
                {template.description && (
                  <p className="text-gray-600 text-sm mt-2">{template.description}</p>
                )}
                
                <div className="mt-3 border-t pt-2">
                  <p className="font-medium">{template.template.title}</p>
                  
                  {template.template.description && (
                    <p className="text-sm text-gray-600 mt-1">{template.template.description}</p>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    <span className={`inline-block px-2 py-1 rounded mr-2 ${
                      template.template.priority === 'high'
                        ? 'bg-red-100 text-red-800'
                        : template.template.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {template.template.priority === 'high'
                        ? '높음'
                        : template.template.priority === 'medium'
                        ? '중간'
                        : '낮음'}
                    </span>
                    
                    <span>
                      마지막 수정: {new Date(template.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* 템플릿 생성/수정 모달 */}
      {showNewTemplateForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {editingTemplate ? '템플릿 수정' : '새 템플릿 만들기'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">템플릿 이름</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full border p-2 rounded"
                  placeholder="예: 정기 오일 교체"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">템플릿 설명(선택)</label>
                <input
                  type="text"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="w-full border p-2 rounded"
                  placeholder="예: 5,000km 주행 후 엔진 오일 교체"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">카테고리</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="border p-2 rounded"
                    disabled={!!newCategory.trim()}
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                    {categories.length === 0 && (
                      <option value="">새 카테고리 추가...</option>
                    )}
                  </select>
                  
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="border p-2 rounded"
                    placeholder="새 카테고리..."
                  />
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">템플릿 내용</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-1">제목</label>
                  <input
                    type="text"
                    value={templateTitle}
                    onChange={(e) => setTemplateTitle(e.target.value)}
                    className="w-full border p-2 rounded"
                    placeholder="예: 엔진 오일 교체"
                  />
                </div>
                
                <div className="mt-2">
                  <label className="block text-sm font-medium mb-1">세부 내용(선택)</label>
                  <textarea
                    value={templateDescriptionDetail}
                    onChange={(e) => setTemplateDescriptionDetail(e.target.value)}
                    className="w-full border p-2 rounded"
                    rows={3}
                    placeholder="예: 5,000km 주행 후 엔진 오일 및 필터 교체"
                  />
                </div>
                
                <div className="mt-2">
                  <label className="block text-sm font-medium mb-1">우선순위</label>
                  <select
                    value={templatePriority}
                    onChange={(e) => setTemplatePriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="border p-2 rounded"
                  >
                    <option value="low">낮음</option>
                    <option value="medium">중간</option>
                    <option value="high">높음</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6 space-x-2">
              <button
                onClick={handleCancelForm}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodoTemplates; 