import React from 'react';

export interface DropdownDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const DropdownDivider: React.FC<DropdownDividerProps> = ({
  className = '',
  ...rest
}) => {
  return (
    <div 
      className={`h-0 my-2 border-t border-gray-200 ${className}`} 
      role="separator"
      {...rest}
    />
  );
}; 