import React, { useState } from 'react';

import { PlusOutlined } from '@ant-design/icons';
import { Form, Input, Select, DatePicker, Button, Space } from 'antd';

import { TodoCreateRequest } from '../../hooks/useTodoService';
import { TodoPriority } from '../../services/todoService';

interface AddTodoFormProps {
  onCreateTodo: (todoData: TodoCreateRequest) => Promise<any>;
  templateState: any;
  templateDispatch: any;
}

export const AddTodoForm: React.FC<AddTodoFormProps> = ({
  onCreateTodo,
  templateState,
  templateDispatch
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      const todoData: TodoCreateRequest = {
        title: values.title,
        description: values.description,
        priority: values.priority || TodoPriority.MEDIUM,
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
        category: values.category
      };

      await onCreateTodo(todoData);
      form.resetFields();
    } catch (error) {
      console.error('Todo 생성 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = () => {
    templateDispatch({ type: 'SET_TEMPLATE_VISIBLE', payload: true });
  };

  return (
    <div className="add-todo-form">
      <h3 className="mb-4 text-lg font-medium">새 정비 작업 추가</h3>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="title"
            label="제목"
            rules={[{ required: true, message: '제목을 입력해주세요' }]}
          >
            <Input placeholder="정비 작업 제목" />
          </Form.Item>

          <Form.Item name="category" label="카테고리">
            <Select placeholder="카테고리 선택">
              <Select.Option value="정기 점검">정기 점검</Select.Option>
              <Select.Option value="일상 점검">일상 점검</Select.Option>
              <Select.Option value="부품 교체">부품 교체</Select.Option>
              <Select.Option value="사고 수리">사고 수리</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="설명">
            <Input.TextArea placeholder="정비 작업에 대한 상세 설명" rows={4} />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="priority" label="우선순위">
              <Select placeholder="우선순위 선택" defaultValue={TodoPriority.MEDIUM}>
                <Select.Option value={TodoPriority.HIGH}>높음</Select.Option>
                <Select.Option value={TodoPriority.MEDIUM}>중간</Select.Option>
                <Select.Option value={TodoPriority.LOW}>낮음</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="dueDate" label="마감일">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </div>

        <div className="flex justify-between mt-4">
          <Button type="primary" htmlType="submit" loading={loading} icon={<PlusOutlined />}>
            작업 추가
          </Button>

          <Button onClick={handleTemplateSelect}>템플릿에서 추가</Button>
        </div>
      </Form>
    </div>
  );
};

export default AddTodoForm;
