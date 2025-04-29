import React from 'react';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  divider?: boolean;
}

export const CardFooter: React.FC<CardFooterProps> = ({ 
  children, 
  className = '',
  divider = true,
  ...rest
}) => {
  return (
    <div 
      className={`mt-4 ${divider ? 'pt-4 border-t border-gray-200' : ''} ${className}`} 
      {...rest}
    >
      {children}
    </div>
  );
};

CardFooter.displayName = 'CardFooter'; 