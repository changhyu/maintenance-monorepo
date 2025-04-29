import React, { forwardRef } from 'react';
import { Input, InputProps } from './Input';

export interface TextFieldProps extends Omit<InputProps, 'error'> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(({
  label,
  helperText,
  error,
  id,
  required = false,
  ...rest
}, ref) => {
  const inputId = id || `field-${Math.random().toString(36).substring(2, 9)}`;
  const helperTextId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = helperTextId || errorId;

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <Input
        ref={ref}
        id={inputId}
        aria-describedby={describedBy}
        error={!!error}
        aria-invalid={!!error}
        required={required}
        {...rest}
      />
      
      {error ? (
        <p id={errorId} className="mt-1 text-sm text-red-500">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperTextId} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

TextField.displayName = 'TextField'; 