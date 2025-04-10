import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Typography, Button, Row, Col, Card, Tabs, Tag, Input, Select, Empty, Space, Tooltip, Divider } from 'antd';
import { FolderOutlined, StarOutlined, StarFilled, PlusOutlined, SettingOutlined, FilterOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import { TodoTemplate } from '../context/TodoContext';
import TemplateManageDrawer from './todo/TemplateManageDrawer';
import TemplateSelectionDrawer from './todo/TemplateSelectionDrawer';
import logger from '../utils/logger';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

/**
 * Todo 템플릿 관리 컴포넌트 프롭스
 */
interface TodoTemplatesProps {
  className?: string;
  onTemplateSelect?: (template: TodoTemplate) => void;
  initialTemplates?: TodoTemplate[];
}

/**
 * Todo 템플릿 관리 컴포넌트
 */
const TodoTemplates: React.FC<TodoTemplatesProps> = ({ 
  className = '', 
  onTemplateSelect, 
  initialTemplates = [] 
}) => {
  // 상태 관리
  const [templates, setTemplates] = useState<TodoTemplate[]>(initialTemplates);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [favoriteTemplates, setFavoriteTemplates] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // 드로어 상태
  const [manageDrawerVisible, setManageDrawerVisible] = useState(false);
  const [selectionDrawerVisible, setSelectionDrawerVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TodoTemplate | null>(null);
  
  // 샘플 템플릿 생성
  useEffect(() => {
    if (templates.length === 0) {
      const sampleTemplates: TodoTemplate[] = [
        {
          id: 'template-1',
          name: '정기 엔진 오일 교체',
          description: '엔진 오일 및 필터 교체를 위한 표준 절차',
          category: '정기 정비',
          items: [
            { title: '엔진 오일 교체', priority: 'medium' },
            { title: '오일 필터 교체', priority: 'medium' },
            { title: '엔진 오일 레벨 확인', priority: 'high' }
          ]
        },
        {
          id: 'template-2',
          name: '타이어 로테이션',
          description: '타이어 교체 및 위치 조정 작업',
          category: '정기 정비',
          items: [
            { title: '타이어 공기압 점검', priority: 'medium' },
            { title: '타이어 위치 교환', priority: 'medium' },
            { title: '휠 밸런스 조정', priority: 'low' }
          ]
        },
        {
          id: 'template-3',
          name: '브레이크 점검',
          description: '브레이크 시스템 종합 점검',
          category: '안전 점검',
          items: [
            { title: '브레이크 패드 점검', priority: 'high' },
            { title: '브레이크 오일 점검', priority: 'high' },
            { title: '브레이크 디스크 점검', priority: 'medium' }
          ]
        }
      ];
      
      setTemplates(sampleTemplates);
    }
  }, [templates.length]);
  
  // 즐겨찾기 템플릿 로드
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('favorite-templates');
      if (savedFavorites) {
        setFavoriteTemplates(JSON.parse(savedFavorites));
      }
    } catch (error) {
      logger.error('즐겨찾기 템플릿 로드 오류:', error);
    }
  }, []);
  
  // 템플릿 즐겨찾기 토글
  const toggleFavorite = useCallback((templateId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    setFavoriteTemplates(prev => {
      const isCurrentlyFavorite = prev.includes(templateId);
      const newFavorites = isCurrentlyFavorite
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId];
      
      // 로컬 스토리지에 저장
      try {
        localStorage.setItem('favorite-templates', JSON.stringify(newFavorites));
      } catch (error) {
        logger.error('즐겨찾기 저장 오류:', error);
      }
      
      return newFavorites;
    });
  }, []);
  
  // 템플릿 선택 처리
  const handleSelectTemplate = useCallback((template: TodoTemplate) => {
    setSelectedTemplate(template);
    
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
    
    setSelectionDrawerVisible(false);
  }, [onTemplateSelect]);
  
  // 모든 카테고리 배열
  const categories = useMemo(() => {
    const categorySet = new Set(templates.map(template => template.category));
    return Array.from(categorySet).sort();
  }, [templates]);
  
  // 필터링된 템플릿 목록
  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];
    
    // 탭 필터링
    if (activeTab === 'favorites') {
      filtered = filtered.filter(template => favoriteTemplates.includes(template.id));
    }
    
    // 검색어 필터링
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(searchLower) ||
        template.description?.toLowerCase().includes(searchLower) ||
        template.category.toLowerCase().includes(searchLower)
      );
    }
    
    // 카테고리 필터링
    if (categoryFilter) {
      filtered = filtered.filter(template => template.category === categoryFilter);
    }
    
    // 정렬
    filtered.sort((a, b) => {
      // 먼저 즐겨찾기 항목을 위로
      const aFavorite = favoriteTemplates.includes(a.id);
      const bFavorite = favoriteTemplates.includes(b.id);
      
      if (aFavorite && !bFavorite) return -1;
      if (!aFavorite && bFavorite) return 1;
      
      // 이름 기준 정렬
      const comparison = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [templates, search, categoryFilter, activeTab, favoriteTemplates, sortOrder]);
  
  return (
    <div className={`todo-templates ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <Title level={4}>정비 작업 템플릿</Title>
        
        <div className="flex gap-2">
          <Button 
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setManageDrawerVisible(true)}
          >
            템플릿 관리
          </Button>
          
          <Button
            onClick={() => setSelectionDrawerVisible(true)}
          >
            템플릿 적용
          </Button>
        </div>
      </div>
      
      <div className="mb-4 flex flex-col md:flex-row gap-4">
        <Input.Search
          placeholder="템플릿 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
          allowClear
        />
        
        <div className="flex gap-2 items-center">
          <Select
            placeholder="카테고리 필터"
            style={{ width: 180 }}
            value={categoryFilter || undefined}
            onChange={setCategoryFilter}
            allowClear
          >
            {categories.map(category => (
              <Option key={category} value={category}>{category}</Option>
            ))}
          </Select>
          
          <Button
            icon={sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            size="middle"
          />
        </div>
      </div>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        className="mb-4"
      >
        <TabPane tab="모든 템플릿" key="all" />
        <TabPane 
          tab={
            <span>
              즐겨찾기 
              <Tag color="blue" className="ml-1">{favoriteTemplates.length}</Tag>
            </span>
          } 
          key="favorites" 
        />
      </Tabs>
      
      {filteredTemplates.length === 0 ? (
        <Empty description="표시할 템플릿이 없습니다" />
      ) : (
        <Row gutter={[16, 16]}>
          {filteredTemplates.map(template => (
            <Col xs={24} sm={12} md={8} lg={6} key={template.id}>
              <Card
                hoverable
                onClick={() => handleSelectTemplate(template)}
                className="h-full"
                title={
                  <div className="flex justify-between items-center">
                    <Tooltip title={template.name}>
                      <span className="truncate">{template.name}</span>
                    </Tooltip>
                    <Tooltip title={favoriteTemplates.includes(template.id) ? "즐겨찾기 제거" : "즐겨찾기 추가"}>
                      <Button
                        type="text"
                        size="small"
                        icon={
                          favoriteTemplates.includes(template.id) 
                            ? <StarFilled style={{ color: '#faad14' }} /> 
                            : <StarOutlined />
                        }
                        onClick={(e) => toggleFavorite(template.id, e)}
                      />
                    </Tooltip>
                  </div>
                }
                extra={
                  <Tag color="blue">{template.items.length}</Tag>
                }
              >
                <div className="mb-2">
                  <Text type="secondary" ellipsis={{ tooltip: template.description }}>
                    {template.description || '설명 없음'}
                  </Text>
                </div>
                
                <Divider className="my-2" />
                
                <div className="flex justify-between">
                  <Tag icon={<FolderOutlined />} color="cyan">
                    {template.category}
                  </Tag>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
      
      {/* 템플릿 관리 드로어 */}
      <TemplateManageDrawer
        visible={manageDrawerVisible}
        templateState={{
          templates: templates,
          selectedTemplate: null,
          editingTemplate: null,
          templateForm: {
            name: '',
            description: '',
            category: '일반',
            items: []
          },
          templateVisible: false,
          templateManageVisible: true
        }}
        onClose={() => setManageDrawerVisible(false)}
        onCancelEdit={() => {}}
        onSaveEdit={() => {}}
        onItemChange={() => {}}
        onRemoveItem={() => {}}
        onAddItem={() => {}}
        onAddTemplate={() => {}}
        onTemplateSelect={() => {}}
        onEditTemplate={() => {}}
        onDeleteTemplate={() => {}}
        templateSearch=""
        setTemplateSearch={() => {}}
        categories={categories}
        filteredTemplates={templates}
      />
      
      {/* 템플릿 선택 드로어 */}
      <TemplateSelectionDrawer
        visible={selectionDrawerVisible}
        templates={templates}
        selectedTemplate={selectedTemplate}
        onClose={() => setSelectionDrawerVisible(false)}
        onSelect={handleSelectTemplate}
        onConfirm={async () => {}}
        loading={false}
        templateSearch={search}
        setTemplateSearch={setSearch}
        templateCategoryFilter={categoryFilter}
        setTemplateCategoryFilter={setCategoryFilter}
        categories={categories}
        filteredTemplates={filteredTemplates}
      />
    </div>
  );
};

export default TodoTemplates; 