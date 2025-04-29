import React from 'react';

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ 
  children, 
  className = '',
  ...rest
}) => {
  return (
    <div className={`flex-1 ${className}`} {...rest}>
      {children}
    </div>
  );
};

CardBody.displayName = 'CardBody'; 