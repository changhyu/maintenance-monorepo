import React from 'react';

import { Select, Tag } from 'antd';

import type { SelectProps } from 'antd/es/select';

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

export interface FilterSelectProps extends Omit<SelectProps<string | string[]>, 'onChange'> {
  options: FilterOption[];
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
}

/**
 * 다중 선택 필터 컴포넌트
 * 사용자 정의 태그 렌더링 지원
 */
const FilterSelect: React.FC<FilterSelectProps> = ({
  options,
  value,
  onChange,
  label,
  ...restProps
}) => {
  // 태그 렌더링 함수
  const tagRender = (props: any) => {
    const { label, value, closable, onClose } = props;
    const option = options.find(opt => opt.value === value);
    const color = option?.color || 'blue';

    return (
      <Tag color={color} closable={closable} onClose={onClose} style={{ marginRight: 3 }}>
        {label}
      </Tag>
    );
  };

  return (
    <div>
      {label && <div className="filter-label">{label}</div>}
      <Select
        mode="multiple"
        allowClear
        showArrow
        value={value}
        onChange={values => onChange(values as string[])}
        options={options}
        tagRender={tagRender}
        {...restProps}
      />
    </div>
  );
};

export default FilterSelect;
