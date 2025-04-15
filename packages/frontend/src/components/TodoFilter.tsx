import React, { useState, useEffect } from 'react';

import { FilterOutlined, ClearOutlined } from '@ant-design/icons';
import { Form, Input, Select, Space, Collapse, Button } from 'antd';

import { TodoFilterType } from '../context/TodoContext';
import { TodoPriority } from '../services/todoService';

interface TodoFilterProps {
  onFilterChange: (filter: TodoFilterType) => void;
  className?: string;
  initialFilter?: TodoFilterType;
}

/**
 * 할 일 목록 필터 컴포넌트
 */
const TodoFilter: React.FC<TodoFilterProps> = ({
  onFilterChange,
  className = '',
  initialFilter = {}
}) => {
  const [form] = Form.useForm();
  const [isOpen, setIsOpen] = useState(false);

  // 필터 변경 시 콜백 호출
  const handleFilterChange = (values: any) => {
    const filter: TodoFilterType = {};

    if (values.search?.trim()) {
      filter.search = values.search.trim();
    }

    if (values.priority && values.priority !== 'all') {
      filter.priority = values.priority;
    }

    if (values.completed !== undefined && values.completed !== null && values.completed !== 'all') {
      filter.completed = values.completed === 'completed' ? 'completed' : 'pending';
    }

    if (values.dueDate && values.dueDate !== 'all') {
      filter.dueDate = values.dueDate;
    }

    if (values.vehicleId) {
      filter.vehicleId = values.vehicleId;
    }

    onFilterChange(filter);
  };

  // 필터 초기화
  const handleReset = () => {
    form.resetFields();
    onFilterChange({});
  };

  // 초기 필터 적용
  useEffect(() => {
    if (initialFilter && Object.keys(initialFilter).length > 0) {
      // 초기 필터 있으면 폼 초기값 설정
      const formValues: any = {};

      if (initialFilter.search) {
        formValues.search = initialFilter.search;
      }

      if (initialFilter.priority) {
        formValues.priority = initialFilter.priority;
      }

      if (initialFilter.completed) {
        formValues.completed = initialFilter.completed;
      }

      if (initialFilter.dueDate) {
        formValues.dueDate = initialFilter.dueDate;
      }

      if (initialFilter.vehicleId) {
        formValues.vehicleId = initialFilter.vehicleId;
      }

      form.setFieldsValue(formValues);

      // 필터가 있으면 패널 펼치기
      if (Object.keys(formValues).length > 0) {
        setIsOpen(true);
      }
    }
  }, [initialFilter, form]);

  return (
    <div className={`todo-filter ${className}`}>
      <Collapse activeKey={isOpen ? ['1'] : []} onChange={() => setIsOpen(!isOpen)} ghost>
        <Collapse.Panel
          header={
            <div className="flex items-center">
              <FilterOutlined />
              <span className="ml-2">필터링 옵션</span>
            </div>
          }
          key="1"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFilterChange}
            onValuesChange={(_: any, allValues: any) => handleFilterChange(allValues)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Form.Item name="search" label="검색어">
                <Input placeholder="제목이나 설명으로 검색" allowClear />
              </Form.Item>

              <Form.Item name="priority" label="우선순위">
                <Select placeholder="우선순위 선택" allowClear>
                  <Select.Option value="all">모든 우선순위</Select.Option>
                  <Select.Option value={TodoPriority.HIGH}>높음</Select.Option>
                  <Select.Option value={TodoPriority.MEDIUM}>중간</Select.Option>
                  <Select.Option value={TodoPriority.LOW}>낮음</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="completed" label="완료 여부">
                <Select placeholder="완료 여부 선택" allowClear>
                  <Select.Option value="all">모두 보기</Select.Option>
                  <Select.Option value="pending">진행 중</Select.Option>
                  <Select.Option value="completed">완료됨</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="dueDate" label="마감일">
                <Select placeholder="마감일 선택" allowClear>
                  <Select.Option value="all">모든 마감일</Select.Option>
                  <Select.Option value="today">오늘</Select.Option>
                  <Select.Option value="overdue">기한 초과</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="vehicleId" label="차량">
                <Select placeholder="차량 선택" allowClear>
                  <Select.Option value="">모든 차량</Select.Option>
                  <Select.Option value="v1">차량 1</Select.Option>
                  <Select.Option value="v2">차량 2</Select.Option>
                </Select>
              </Form.Item>
            </div>

            <div className="flex justify-end mt-4">
              <Space>
                <Button onClick={handleReset} icon={<ClearOutlined />}>
                  초기화
                </Button>
              </Space>
            </div>
          </Form>
        </Collapse.Panel>
      </Collapse>
    </div>
  );
};

export default TodoFilter;
