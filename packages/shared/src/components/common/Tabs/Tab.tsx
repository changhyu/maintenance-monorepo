import React from 'react';
import { useTabs } from './Tabs';

export interface TabProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'id'> {
  children: React.ReactNode;          // 탭 내용
  id: string;                         // 탭 ID
  disabled?: boolean;                 // 비활성화 여부
  variant?: 'default' | 'boxed' | 'pills'; // 탭 스타일
  size?: 'sm' | 'md' | 'lg';          // 탭 크기
  fullWidth?: boolean;                // 전체 너비 사용 여부
  icon?: React.ReactNode;             // 아이콘
  className?: string;                 // 추가 클래스
}

export const Tab: React.FC<TabProps> = ({
  children,
  id,
  disabled = false,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  icon,
  className = '',
  ...rest
}) => {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === id;
  
  // 클릭 핸들러
  const handleClick = () => {
    if (!disabled) {
      setActiveTab(id);
    }
  };
  
  // 크기에 따른 클래스
  const sizeClasses = {
    sm: 'px-3 py-1.5',
    md: 'px-4 py-2',
    lg: 'px-6 py-3',
  };
  
  // 변형에 따른 클래스
  const getVariantClasses = (variant: string, isActive: boolean) => {
    const baseClass = 'font-medium focus:outline-none transition-colors';
    
    if (disabled) {
      return `${baseClass} text-gray-400 cursor-not-allowed`;
    }
    
    switch (variant) {
      case 'default':
        return `${baseClass} ${
          isActive 
            ? 'text-blue-600 border-b-2 border-blue-600' 
            : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300'
        }`;
      case 'boxed':
        return `${baseClass} ${
          isActive 
            ? 'bg-white text-blue-600 shadow-sm rounded-md' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md'
        }`;
      case 'pills':
        return `${baseClass} rounded-full ${
          isActive 
            ? 'bg-blue-600 text-white' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`;
      default:
        return baseClass;
    }
  };
  
  return (
    <button
      role="tab"
      id={`tab-${id}`}
      aria-selected={isActive}
      aria-controls={`tabpanel-${id}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={handleClick}
      className={`
        ${getVariantClasses(variant, isActive)}
        ${sizeClasses[size]}
        ${fullWidth ? 'flex-1' : ''}
        ${isActive ? 'active' : ''}
        ${className}
      `}
      {...rest}
    >
      <div className="flex items-center justify-center gap-2">
        {icon && <span className="tab-icon">{icon}</span>}
        <span>{children}</span>
      </div>
    </button>
  );
}; 