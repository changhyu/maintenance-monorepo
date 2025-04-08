import React from 'react';

/**
 * 입력 필드 크기 타입 정의
 */
export type InputSize = 'sm' | 'md' | 'lg';

/**
 * 입력 필드 변형 타입 정의
 */
export type InputVariant = 'outline' | 'filled' | 'flushed';

/**
 * 입력 필드 컴포넌트 속성 인터페이스
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  errorText?: string;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isFullWidth?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  className?: string;
}

/**
 * 입력 필드 컴포넌트
 */
export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  errorText,
  size = 'md',
  leftIcon,
  rightIcon,
  isFullWidth = false,
  isDisabled = false,
  isReadOnly = false,
  isRequired = false,
  isInvalid = false,
  className = '',
  id,
  ...rest
}) => {
  const uniqueId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
  
  const baseStyles = 'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 border-gray-300 rounded-md';
  
  const sizeStyles = {
    sm: 'py-1.5 text-xs',
    md: 'py-2 text-sm',
    lg: 'py-2.5 text-base'
  };
  
  const paddingStyles = {
    sm: leftIcon ? 'pl-7' : 'pl-3',
    md: leftIcon ? 'pl-9' : 'pl-3',
    lg: leftIcon ? 'pl-10' : 'pl-4'
  };
  
  const paddingRightStyles = {
    sm: rightIcon ? 'pr-7' : 'pr-3',
    md: rightIcon ? 'pr-9' : 'pr-3',
    lg: rightIcon ? 'pr-10' : 'pr-4'
  };
  
  const widthClass = isFullWidth ? 'w-full' : 'w-auto';
  const invalidClass = isInvalid ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';
  const disabledClass = isDisabled ? 'bg-gray-100 cursor-not-allowed' : '';
  
  const inputClasses = `
    ${baseStyles}
    ${sizeStyles[size]}
    ${paddingStyles[size]}
    ${paddingRightStyles[size]}
    ${widthClass}
    ${invalidClass}
    ${disabledClass}
    ${className}
  `;
  
  const iconSizeClass = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  const iconPositionLeft = {
    sm: 'left-2',
    md: 'left-3',
    lg: 'left-3'
  };
  
  const iconPositionRight = {
    sm: 'right-2',
    md: 'right-3',
    lg: 'right-3'
  };
  
  return (
    <div className={`${isFullWidth ? 'w-full' : 'w-auto'}`}>
      {label && (
        <label
          htmlFor={uniqueId}
          className={`block text-sm font-medium text-gray-700 mb-1 ${
            isRequired ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''
          }`}
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className={`absolute ${iconPositionLeft[size]} top-1/2 transform -translate-y-1/2 text-gray-400`}>
            <span className={iconSizeClass[size]}>{leftIcon}</span>
          </div>
        )}
        
        <input
          id={uniqueId}
          className={inputClasses}
          disabled={isDisabled}
          readOnly={isReadOnly}
          required={isRequired}
          aria-invalid={isInvalid}
          aria-describedby={helperText ? `${uniqueId}-helper` : undefined}
          {...rest}
        />
        
        {rightIcon && (
          <div className={`absolute ${iconPositionRight[size]} top-1/2 transform -translate-y-1/2 text-gray-400`}>
            <span className={iconSizeClass[size]}>{rightIcon}</span>
          </div>
        )}
      </div>
      
      {helperText && !isInvalid && (
        <p id={`${uniqueId}-helper`} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
      
      {errorText && isInvalid && (
        <p id={`${uniqueId}-error`} className="mt-1 text-sm text-red-600">
          {errorText}
        </p>
      )}
    </div>
  );
}; 