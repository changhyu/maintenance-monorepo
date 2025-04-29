import React from 'react';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ 
  children, 
  className = '',
  ...rest
}) => {
  return (
    <div className={`mb-4 ${className}`} {...rest}>
      {children}
    </div>
  );
};

CardHeader.displayName = 'CardHeader'; 