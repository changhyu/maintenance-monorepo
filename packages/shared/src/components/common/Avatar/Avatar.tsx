import React, { KeyboardEvent } from 'react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface AvatarProps {
  /**
   * 아바타 이미지 URL
   */
  src?: string;
  
  /**
   * 사용자 이름 (대체 텍스트 및 이니셜 표시용)
   */
  name?: string;
  
  /**
   * 아바타 크기
   * @default 'md'
   */
  size?: AvatarSize;
  
  /**
   * 배경색 (이미지가 없을 때)
   * @default 'gray'
   */
  bgColor?: 'gray' | 'red' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'pink';
  
  /**
   * 둥근 정도 (모양)
   * @default 'full'
   */
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  
  /**
   * 테두리 표시 여부
   * @default false
   */
  hasBorder?: boolean;
  
  /**
   * 상태 표시 (온라인, 오프라인, 자리비움 등)
   */
  status?: 'online' | 'offline' | 'away' | 'busy' | 'none';
  
  /**
   * 추가 CSS 클래스
   */
  className?: string;
  
  /**
   * 클릭 이벤트 핸들러
   */
  onClick?: () => void;
}

// 크기별 클래스를 정의하는 상수
const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-20 h-20 text-2xl',
};

export const Avatar: React.FC<AvatarProps> & {
  getAvatarSizeClass: (size: AvatarSize) => string;
} = ({
  src,
  name = '',
  size = 'md',
  bgColor = 'gray',
  borderRadius = 'full',
  hasBorder = false,
  status = 'none',
  className = '',
  onClick,
}) => {
  // 배경색 클래스
  const bgColorClasses = {
    gray: 'bg-gray-200 text-gray-600',
    red: 'bg-red-200 text-red-600',
    yellow: 'bg-yellow-200 text-yellow-600',
    green: 'bg-green-200 text-green-600',
    blue: 'bg-blue-200 text-blue-600',
    indigo: 'bg-indigo-200 text-indigo-600',
    purple: 'bg-purple-200 text-purple-600',
    pink: 'bg-pink-200 text-pink-600',
  };
  
  // 테두리 클래스
  const borderClasses = hasBorder ? 'border-2 border-white dark:border-gray-800' : '';
  
  // 모서리 둥근 정도 클래스
  const radiusClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };
  
  // 상태 표시 클래스 및 색상
  const statusClasses = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    none: 'hidden',
  };
  
  // 상태 표시 위치 클래스 (크기에 따라 조정)
  const statusSizeClasses = {
    xs: 'w-1.5 h-1.5 right-0 bottom-0',
    sm: 'w-2 h-2 right-0 bottom-0',
    md: 'w-2.5 h-2.5 right-0 bottom-0',
    lg: 'w-3 h-3 right-0 bottom-0',
    xl: 'w-3.5 h-3.5 right-0 bottom-0',
    '2xl': 'w-4 h-4 right-0 bottom-0',
  };
  
  // 이름에서 이니셜 추출
  const getInitials = (name: string) => {
    if (!name) return '';
    
    const nameArray = name.split(' ');
    if (nameArray.length === 1) {
      return nameArray[0].charAt(0).toUpperCase();
    }
    
    return (
      nameArray[0].charAt(0).toUpperCase() + 
      nameArray[nameArray.length - 1].charAt(0).toUpperCase()
    );
  };

  // 키보드 이벤트 핸들러 추가
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };
  
  const interactiveProps = onClick ? {
    onClick,
    onKeyDown: handleKeyDown,
    role: 'button',
    tabIndex: 0,
    'aria-label': `${name || '사용자'} 아바타`
  } : {};
  
  return (
    <div 
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${
        sizeClasses[size]} ${radiusClasses[borderRadius]} ${
        src ? '' : bgColorClasses[bgColor]} ${borderClasses} ${
        onClick ? 'cursor-pointer' : ''} ${className}`}
      {...interactiveProps}
    >
      {src ? (
        <img
          src={src}
          alt={name || 'avatar'}
          className={`object-cover w-full h-full ${radiusClasses[borderRadius]}`}
        />
      ) : (
        <span className="font-medium">{getInitials(name)}</span>
      )}
      
      {status !== 'none' && (
        <span 
          className={`absolute block ${statusClasses[status]} ${
            statusSizeClasses[size]} ${radiusClasses.full} ring-2 ring-white`}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

// 정적 메서드 추가
Avatar.getAvatarSizeClass = (size: AvatarSize) => {
  return sizeClasses[size];
}; 