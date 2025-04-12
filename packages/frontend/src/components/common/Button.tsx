import React from 'react';

/**
 * 버튼 크기 타입 정의
 */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * 버튼 변형 타입 정의
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

/**
 * 버튼 색상 스키마 타입 정의
 */
export type ButtonColorScheme =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'warning'
  | 'success'
  | 'info'
  | 'gray';

/**
 * 버튼 컴포넌트 속성 인터페이스
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  colorScheme?: ButtonColorScheme;
  size?: ButtonSize;
  isFullWidth?: boolean;
  isLoading?: boolean;
  isDisabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * 버튼 컴포넌트
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isFullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  isDisabled = false,
  className = '',
  type = 'button',
  ...rest
}) => {
  // 버튼 변형에 따른 스타일
  const variantStyles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
    outline: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };

  // 버튼 크기에 따른 스타일
  const sizeStyles = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };

  // 넓이 클래스
  const widthClass = isFullWidth ? 'w-full' : 'w-auto';

  // 비활성화 클래스
  const disabledClass =
    isDisabled || isLoading ? 'opacity-60 cursor-not-allowed pointer-events-none' : '';

  // 아이콘 크기
  const iconSizeClass = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  };

  // 아이콘 스페이싱
  const iconSpacing = {
    xs: 'mr-1',
    sm: 'mr-1.5',
    md: 'mr-2',
    lg: 'mr-2',
    xl: 'mr-3'
  };

  // 기본 버튼 스타일
  const baseStyle =
    'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';

  // 최종 버튼 클래스
  const buttonClasses = `
    ${baseStyle}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${widthClass}
    ${disabledClass}
    ${className}
  `;

  return (
    <button type={type} disabled={isDisabled || isLoading} className={buttonClasses} {...rest}>
      {isLoading && (
        <svg
          className={`animate-spin -ml-1 mr-2 ${iconSizeClass[size]}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {!isLoading && leftIcon && (
        <span className={`${iconSizeClass[size]} ${iconSpacing[size]}`}>{leftIcon}</span>
      )}

      <span>{children}</span>

      {!isLoading && rightIcon && (
        <span className={`${iconSizeClass[size]} ml-${size === 'xs' ? '1' : '2'}`}>
          {rightIcon}
        </span>
      )}
    </button>
  );
};
