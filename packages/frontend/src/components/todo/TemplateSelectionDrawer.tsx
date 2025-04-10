import React, { useState, useEffect } from 'react';
import { Drawer, List, Button, Input, Space, Tag, Empty, Select, Card, Tooltip, Badge, Typography } from 'antd';
import { SearchOutlined, FileTextOutlined, TagOutlined, FilterOutlined, StarOutlined, StarFilled, PlusOutlined } from '@ant-design/icons';
import { TodoTemplate } from '../../hooks/useTemplateState';

const { Title, Text } = Typography;
const { Option } = Select;

interface TemplateSelectionDrawerProps {
  visible: boolean;
  templates: TodoTemplate[];
  selectedTemplate: TodoTemplate | null;
  onClose: () => void;
  onSelect: (template: TodoTemplate) => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
  templateSearch: string;
  setTemplateSearch: (value: string) => void;
  templateCategoryFilter: string;
  setTemplateCategoryFilter: (value: string) => void;
  categories: string[];
  filteredTemplates: TodoTemplate[];
}

/**
 * 템플릿 선택 Drawer 컴포넌트
 */
const TemplateSelectionDrawer: React.FC<TemplateSelectionDrawerProps> = ({
  visible,
  templates,
  selectedTemplate,
  onClose,
  onSelect,
  onConfirm,
  loading,
  templateSearch,
  setTemplateSearch,
  templateCategoryFilter,
  setTemplateCategoryFilter,
  categories,
  filteredTemplates
}) => {
  const [favoriteTemplates, setFavoriteTemplates] = useState<string[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<TodoTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // 로컬 스토리지에서 즐겨찾기 템플릿 로드
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('favorite-templates');
      if (savedFavorites) {
        setFavoriteTemplates(JSON.parse(savedFavorites));
      }
    } catch (error) {
      console.error('즐겨찾기 템플릿 로드 오류:', error);
    }
  }, []);

  // 즐겨찾기 토글
  const toggleFavorite = (template: TodoTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    const templateId = template.id;
    let newFavorites: string[];
    
    if (favoriteTemplates.includes(templateId)) {
      newFavorites = favoriteTemplates.filter(id => id !== templateId);
    } else {
      newFavorites = [...favoriteTemplates, templateId];
    }
    
    setFavoriteTemplates(newFavorites);
    localStorage.setItem('favorite-templates', JSON.stringify(newFavorites));
  };

  // 템플릿 미리보기 표시
  const showTemplatePreview = (template: TodoTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  // 정렬된 템플릿 목록 (즐겨찾기 우선)
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    const aFavorite = favoriteTemplates.includes(a.id);
    const bFavorite = favoriteTemplates.includes(b.id);
    
    if (aFavorite && !bFavorite) return -1;
    if (!aFavorite && bFavorite) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <Drawer
        title="템플릿에서 작업 추가"
        placement="right"
        width={400}
        onClose={onClose}
        open={visible}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={onClose} style={{ marginRight: 8 }}>
              취소
            </Button>
            <Button
              type="primary"
              onClick={onConfirm}
              loading={loading}
              disabled={!selectedTemplate}
            >
              템플릿 적용
            </Button>
          </div>
        }
      >
        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
          <Input
            placeholder="템플릿 검색..."
            prefix={<SearchOutlined />}
            value={templateSearch}
            onChange={(e) => setTemplateSearch(e.target.value)}
            allowClear
          />
          
          <Space>
            <Select
              placeholder="카테고리 필터"
              style={{ width: 200 }}
              value={templateCategoryFilter || undefined}
              onChange={setTemplateCategoryFilter}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string).toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
              suffixIcon={<FilterOutlined />}
            >
              {categories.map((category) => (
                <Option key={category} value={category}>
                  {category}
                </Option>
              ))}
            </Select>
            
            <Badge count={favoriteTemplates.length} size="small" offset={[-5, 0]}>
              <Button
                type={favoriteTemplates.length > 0 ? "primary" : "default"}
                icon={<StarFilled />}
                onClick={() => setTemplateSearch('__favorite__')}
                title="즐겨찾기 템플릿 보기"
              >
                즐겨찾기
              </Button>
            </Badge>
          </Space>
        </Space>
        
        {filteredTemplates.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="검색 결과가 없습니다"
          />
        ) : (
          <List
            dataSource={sortedTemplates}
            renderItem={(template) => (
              <List.Item
                key={template.id}
                style={{
                  cursor: 'pointer',
                  background: selectedTemplate?.id === template.id ? '#f0f7ff' : 'transparent',
                  borderRadius: 6,
                  marginBottom: 8,
                  border: selectedTemplate?.id === template.id ? '1px solid #1890ff' : '1px solid #f0f0f0'
                }}
                onClick={() => onSelect(template)}
                actions={[
                  <Tooltip title="즐겨찾기" key="favorite">
                    <Button
                      type="text"
                      size="small"
                      icon={favoriteTemplates.includes(template.id) ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                      onClick={(e) => toggleFavorite(template, e)}
                    />
                  </Tooltip>,
                  <Tooltip title="미리보기" key="preview">
                    <Button
                      type="text"
                      size="small"
                      icon={<FileTextOutlined />}
                      onClick={(e) => showTemplatePreview(template, e)}
                    />
                  </Tooltip>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{template.name}</Text>
                      {favoriteTemplates.includes(template.id) && (
                        <StarFilled style={{ color: '#faad14', fontSize: '14px' }} />
                      )}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      <Text type="secondary" ellipsis={{ tooltip: template.description }}>
                        {template.description || '설명 없음'}
                      </Text>
                      <Space>
                        <Tag icon={<TagOutlined />} color="blue">
                          {template.category}
                        </Tag>
                        <Tag color="green">
                          {template.items.length}개 작업
                        </Tag>
                      </Space>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>
      
      {/* 템플릿 미리보기 드로어 */}
      <Drawer
        title={`템플릿 미리보기: ${previewTemplate?.name || ''}`}
        placement="right"
        width={500}
        onClose={() => setShowPreview(false)}
        open={showPreview && previewTemplate !== null}
      >
        {previewTemplate && (
          <div>
            <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
              <Card title="템플릿 정보" bordered={false}>
                <p><strong>이름:</strong> {previewTemplate.name}</p>
                <p><strong>카테고리:</strong> {previewTemplate.category}</p>
                <p><strong>설명:</strong> {previewTemplate.description || '설명 없음'}</p>
              </Card>
              
              <Title level={5} style={{ marginTop: 16 }}>포함된 작업 ({previewTemplate.items.length}개)</Title>
              
              <List
                dataSource={previewTemplate.items}
                renderItem={(item, index) => (
                  <List.Item>
                    <Card 
                      size="small" 
                      title={`${index + 1}. ${item.title}`} 
                      style={{ width: '100%' }}
                      extra={
                        item.priority && (
                          <Tag color={
                            item.priority === 'high' ? 'red' : 
                            item.priority === 'medium' ? 'orange' : 
                            'green'
                          }>
                            {item.priority === 'high' ? '높음' : 
                             item.priority === 'medium' ? '중간' : 
                             '낮음'}
                          </Tag>
                        )
                      }
                    >
                      {item.description && <p>{item.description}</p>}
                      <Space>
                        {item.dueDate && (
                          <Tag color="blue">마감일: {item.dueDate}</Tag>
                        )}
                        {item.assignedTo && (
                          <Tag color="purple">담당자: {item.assignedTo}</Tag>
                        )}
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />
            </Space>
            
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Button type="primary" onClick={() => {
                onSelect(previewTemplate);
                setShowPreview(false);
              }}>
                이 템플릿 선택
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
};

export default TemplateSelectionDrawer; 