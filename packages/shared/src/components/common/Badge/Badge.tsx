import React from 'react';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';
export type BadgeShape = 'rounded' | 'pill' | 'circle';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  shape?: BadgeShape;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void;
  removable?: boolean;
  onRemove?: () => void;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  shape = 'rounded',
  icon,
  iconPosition = 'left',
  className = '',
  onClick,
  removable = false,
  onRemove,
}) => {
  // 각 변형에 따른 색상 스타일
  const variantClasses = {
    primary: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-indigo-100 text-indigo-800',
    light: 'bg-gray-50 text-gray-800 border border-gray-200',
    dark: 'bg-gray-700 text-white',
  };

  // 크기에 따른 스타일
  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  // 모양에 따른 스타일
  const shapeClasses = {
    rounded: 'rounded',
    pill: 'rounded-full',
    circle: 'rounded-full aspect-square flex items-center justify-center',
  };

  // 클릭 가능 여부에 따른 스타일
  const clickableClass = onClick ? 'cursor-pointer hover:opacity-80' : '';

  // 이벤트 핸들러
  const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (onClick) onClick(e);
  };

  const handleRemoveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onRemove) onRemove();
  };

  // children이 없고 shape이 circle이 아니고 icon도 없는 경우 기본 내용 표시
  const showContent = () => {
    if (children) {
      return <span className={shape === 'circle' && icon ? 'sr-only' : ''}>{children}</span>;
    }
    return shape !== 'circle' && !icon ? <span>Badge</span> : null;
  };

  return (
    <span
      className={`inline-flex items-center ${variantClasses[variant]} ${sizeClasses[size]} ${shapeClasses[shape]} ${clickableClass} select-none transition-colors ${className}`}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {icon && iconPosition === 'left' && (
        <span className="mr-1 flex-shrink-0">{icon}</span>
      )}
      
      {showContent()}
      
      {icon && iconPosition === 'right' && (
        <span className="ml-1 flex-shrink-0">{icon}</span>
      )}
      
      {removable && (
        <button
          type="button"
          className="ml-1 -mr-1 h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-gray-200 hover:text-gray-500 focus:outline-none"
          onClick={handleRemoveClick}
          aria-label="배지 제거"
        >
          <svg className="h-2 w-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}; 