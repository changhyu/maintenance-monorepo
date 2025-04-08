import React from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelectProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  multiple?: boolean;
}

/**
 * 필터 선택 컴포넌트
 */
const FilterSelect: React.FC<FilterSelectProps> = ({
  options,
  value,
  onChange,
  label,
  placeholder = '선택하세요',
  className = '',
  multiple = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select
        value={value}
        onChange={handleChange}
        multiple={multiple}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FilterSelect; 