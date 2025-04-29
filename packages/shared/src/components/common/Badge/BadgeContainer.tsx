import React from 'react';

export type BadgePosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface BadgeContainerProps {
  children: React.ReactNode;
  badge: React.ReactNode;
  position?: BadgePosition;
  className?: string;
  overlap?: boolean;
}

export const BadgeContainer: React.FC<BadgeContainerProps> = ({
  children,
  badge,
  position = 'top-right',
  className = '',
  overlap = false,
}) => {
  // 위치에 따른 스타일
  const positionClasses = {
    'top-right': 'top-0 right-0 translate-x-1/2 -translate-y-1/2',
    'top-left': 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
    'bottom-right': 'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
    'bottom-left': 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      {children}
      <div
        className={`absolute ${positionClasses[position]} ${
          overlap ? 'z-10' : ''
        }`}
      >
        {badge}
      </div>
    </div>
  );
}; 