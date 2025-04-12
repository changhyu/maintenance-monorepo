import React from 'react';

import { PlusOutlined } from '@ant-design/icons';
import { Drawer, Input, Button, List, Space, Typography, Form, Select, Divider } from 'antd';

import { TemplateState, TodoTemplate } from '../../hooks/useTemplateState';

// 템플릿 항목 폼 컴포넌트
const TemplateItemForm: React.FC<{
  item: TodoTemplate['items'][0];
  index: number;
  onChange: (index: number, field: string, value: string) => void;
  onRemove: (index: number) => void;
}> = ({ item, index, onChange, onRemove }) => (
  <List.Item
    className="border p-2 rounded mb-2"
    actions={[
      <Button key="delete" type="text" danger onClick={() => onRemove(index)}>
        삭제
      </Button>
    ]}
  >
    <div className="w-full">
      <Input
        value={item.title}
        onChange={e => onChange(index, 'title', e.target.value)}
        placeholder="작업 항목 제목"
        className="mb-2"
      />
      <div className="flex gap-2">
        <Select
          value={item.priority || 'medium'}
          onChange={value => onChange(index, 'priority', value)}
          style={{ width: 120 }}
        >
          <Select.Option value="low">낮음</Select.Option>
          <Select.Option value="medium">중간</Select.Option>
          <Select.Option value="high">높음</Select.Option>
        </Select>
        <Input
          value={item.description || ''}
          onChange={e => onChange(index, 'description', e.target.value)}
          placeholder="설명 (선택사항)"
          style={{ flex: 1 }}
        />
      </div>
    </div>
  </List.Item>
);

// 템플릿 목록 아이템 컴포넌트
const TemplateListItem: React.FC<{
  template: TodoTemplate;
  onSelect: (template: TodoTemplate) => void;
  onEdit: (template: TodoTemplate) => void;
  onDelete: (templateId: string) => void;
}> = ({ template, onSelect, onEdit, onDelete }) => (
  <List.Item
    className="border p-3 rounded mb-2"
    actions={[
      <Button key="edit" type="text" onClick={() => onEdit(template)}>
        편집
      </Button>,
      <Button key="delete" type="text" danger onClick={() => onDelete(template.id)}>
        삭제
      </Button>
    ]}
  >
    <div className="cursor-pointer" onClick={() => onSelect(template)}>
      <div className="font-semibold">{template.name}</div>
      <div className="text-xs text-gray-500">{template.description}</div>
      <div className="mt-1">
        <span className="text-xs bg-blue-100 text-blue-800 rounded px-2 py-1">
          {template.category}
        </span>
        <span className="text-xs text-gray-500 ml-2">{template.items.length}개 작업</span>
      </div>
    </div>
  </List.Item>
);

interface TemplateManageDrawerProps {
  visible: boolean;
  templateState: TemplateState;
  onClose: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onItemChange: (index: number, field: string, value: string) => void;
  onRemoveItem: (index: number) => void;
  onAddItem: () => void;
  onAddTemplate: () => void;
  onTemplateSelect: (template: TodoTemplate) => void;
  onEditTemplate: (template: TodoTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  templateSearch: string;
  setTemplateSearch: (value: string) => void;
  categories: string[];
  filteredTemplates: TodoTemplate[];
}

export const TemplateManageDrawer: React.FC<TemplateManageDrawerProps> = ({
  visible,
  templateState,
  onClose,
  onCancelEdit,
  onSaveEdit,
  onItemChange,
  onRemoveItem,
  onAddItem,
  onAddTemplate,
  onTemplateSelect,
  onEditTemplate,
  onDeleteTemplate,
  templateSearch,
  setTemplateSearch,
  categories,
  filteredTemplates
}) => {
  return (
    <Drawer
      title={templateState.editingTemplate ? '템플릿 편집' : '템플릿 관리'}
      placement="right"
      onClose={() => {
        onClose();
        if (templateState.editingTemplate) {
          onCancelEdit();
        }
      }}
      open={visible}
      width={600}
      extra={
        templateState.editingTemplate ? (
          <Space>
            <Button onClick={onCancelEdit}>취소</Button>
            <Button onClick={onSaveEdit} type="primary">
              저장
            </Button>
          </Space>
        ) : null
      }
    >
      <Typography.Title level={4}>
        {templateState.editingTemplate ? '템플릿 수정' : '새 템플릿 추가'}
      </Typography.Title>

      <Form layout="vertical">
        <Form.Item label="템플릿 이름" required>
          <Input
            value={templateState.templateForm.name}
            onChange={e => onItemChange(-1, 'name', e.target.value)}
            placeholder="템플릿 이름을 입력하세요"
          />
        </Form.Item>

        <Form.Item label="설명">
          <Input.TextArea
            value={templateState.templateForm.description}
            onChange={e => onItemChange(-1, 'description', e.target.value)}
            placeholder="템플릿에 대한 설명을 입력하세요"
            rows={2}
          />
        </Form.Item>

        <Form.Item label="카테고리">
          <Select
            value={templateState.templateForm.category}
            onChange={value => onItemChange(-1, 'category', value)}
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
            dataSource={templateState.templateForm.items}
            renderItem={(item, index) => (
              <TemplateItemForm
                item={item}
                index={index}
                onChange={onItemChange}
                onRemove={onRemoveItem}
              />
            )}
            locale={{ emptyText: '항목이 없습니다. 항목을 추가해주세요.' }}
          />
          <Button onClick={onAddItem} type="dashed" block icon={<PlusOutlined />}>
            항목 추가
          </Button>
        </Form.Item>

        {!templateState.editingTemplate && (
          <Form.Item>
            <Button type="primary" onClick={onAddTemplate} block>
              템플릿 저장
            </Button>
          </Form.Item>
        )}
      </Form>

      {!templateState.editingTemplate && (
        <>
          <Divider />
          <Typography.Title level={4}>기존 템플릿</Typography.Title>

          <div className="mb-4">
            <Input.Search
              placeholder="템플릿 검색"
              onChange={e => setTemplateSearch(e.target.value)}
              value={templateSearch}
            />
          </div>

          <List
            dataSource={filteredTemplates}
            renderItem={template => (
              <TemplateListItem
                template={template}
                onSelect={onTemplateSelect}
                onEdit={onEditTemplate}
                onDelete={onDeleteTemplate}
              />
            )}
            locale={{ emptyText: '템플릿이 없습니다.' }}
          />
        </>
      )}
    </Drawer>
  );
};

export default TemplateManageDrawer;
