import React from 'react';

export interface DropdownHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const DropdownHeader: React.FC<DropdownHeaderProps> = ({
  children,
  className = '',
  ...rest
}) => {
  return (
    <div 
      className={`px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}; 