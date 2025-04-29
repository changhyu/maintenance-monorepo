import React from 'react';

export interface TabListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;       // 탭 버튼들
  variant?: 'default' | 'boxed' | 'pills'; // 탭 스타일
  size?: 'sm' | 'md' | 'lg';       // 탭 크기
  align?: 'start' | 'center' | 'end'; // 정렬
  fullWidth?: boolean;             // 전체 너비 사용 여부
  className?: string;              // 추가 클래스
}

export const TabList: React.FC<TabListProps> = ({
  children,
  variant = 'default',
  size = 'md',
  align = 'start',
  fullWidth = false,
  className = '',
  ...rest
}) => {
  // 변형에 따른 클래스
  const variantClasses = {
    default: 'border-b border-gray-200',
    boxed: 'bg-gray-100 p-1 rounded-lg',
    pills: 'space-x-1',
  };
  
  // 크기에 따른 클래스
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };
  
  // 정렬에 따른 클래스
  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
  };
  
  return (
    <div
      role="tablist"
      className={`
        flex ${alignClasses[align]} ${variantClasses[variant]} ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
}; 