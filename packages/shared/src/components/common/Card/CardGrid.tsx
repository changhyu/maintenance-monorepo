import React from 'react';

export interface CardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CardGrid: React.FC<CardGridProps> = ({
  children,
  columns = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 'md',
  className = '',
  ...rest
}) => {
  // 칼럼 수에 따른 클래스
  const createColumnsClass = (cols: number | undefined, prefix: string) => {
    if (cols === undefined) return '';
    return `${prefix}:grid-cols-${cols}`;
  };

  const columnsClasses = [
    columns.sm && `grid-cols-${columns.sm}`,
    createColumnsClass(columns.md, 'md'),
    createColumnsClass(columns.lg, 'lg'),
    createColumnsClass(columns.xl, 'xl'),
  ].filter(Boolean).join(' ');
  
  // 간격에 따른 클래스
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  };
  
  const gridClasses = `
    grid
    ${columnsClasses}
    ${gapClasses[gap]}
    ${className}
  `.trim();
  
  return (
    <div className={gridClasses} {...rest}>
      {children}
    </div>
  );
};

CardGrid.displayName = 'CardGrid'; 