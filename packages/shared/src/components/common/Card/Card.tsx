import React, { forwardRef } from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;         // 카드 내용
  variant?: 'elevated' | 'outlined' | 'filled'; // 카드 스타일 변형
  size?: 'sm' | 'md' | 'lg';         // 카드 크기
  direction?: 'row' | 'column';      // 카드 방향
  isHoverable?: boolean;             // 호버 효과 여부
  isClickable?: boolean;             // 클릭 가능 여부
  className?: string;                // 추가 클래스
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  children,
  variant = 'elevated',
  size = 'md',
  direction = 'column',
  isHoverable = false,
  isClickable = false,
  className = '',
  onClick,
  ...rest
}, ref) => {
  // 변형에 따른 클래스
  const variantClasses = {
    elevated: 'bg-white shadow-md',
    outlined: 'bg-white border border-gray-200',
    filled: 'bg-gray-50'
  };
  
  // 크기에 따른 클래스
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };
  
  // 방향에 따른 클래스
  const directionClasses = {
    row: 'flex flex-row',
    column: 'flex flex-col'
  };
  
  const cardClasses = `
    rounded-lg
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${directionClasses[direction]}
    ${isHoverable ? 'transition-transform duration-200 hover:scale-105 hover:shadow-lg' : ''}
    ${isClickable || onClick ? 'cursor-pointer' : ''}
    ${className}
  `.trim();
  
  return (
    <div
      ref={ref}
      className={cardClasses}
      onClick={onClick}
      role={isClickable || onClick ? 'button' : undefined}
      tabIndex={isClickable || onClick ? 0 : undefined}
      {...rest}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card'; 