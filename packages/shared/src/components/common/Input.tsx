import React, { forwardRef, InputHTMLAttributes } from 'react';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  inputSize?: InputSize;
  error?: string | boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  isFullWidth?: boolean;
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  inputSize = 'md',
  error,
  leftElement,
  rightElement,
  isFullWidth = true,
  className = '',
  disabled,
  ...rest
}, ref) => {
  const sizeClasses = {
    sm: 'h-8 text-sm px-3',
    md: 'h-10 text-base px-4',
    lg: 'h-12 text-lg px-5'
  };

  const inputClasses = `
    rounded-md
    border
    ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}
    ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'}
    ${isFullWidth ? 'w-full' : ''}
    ${leftElement ? 'pl-10' : ''}
    ${rightElement ? 'pr-10' : ''}
    ${sizeClasses[inputSize]}
    shadow-sm
    focus:outline-none focus:ring-1
    transition duration-150 ease-in-out
    ${className}
  `.trim();

  if (leftElement || rightElement) {
    return (
      <div className="relative">
        {leftElement && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
            {leftElement}
          </div>
        )}
        
        <input
          ref={ref}
          className={inputClasses}
          disabled={disabled}
          {...rest}
        />
        
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
            {rightElement}
          </div>
        )}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      className={inputClasses}
      disabled={disabled}
      {...rest}
    />
  );
});

Input.displayName = 'Input'; 