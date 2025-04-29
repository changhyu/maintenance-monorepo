import React from 'react';
import { Avatar, AvatarProps, AvatarSize } from './Avatar';

export interface AvatarGroupProps {
  /**
   * 아바타 목록 (Avatar 컴포넌트에 전달되는 props 배열)
   */
  avatars: (Omit<AvatarProps, 'size'> & { id: string | number })[];
  
  /**
   * 한 번에 보여줄 최대 아바타 수
   */
  max?: number;
  
  /**
   * 아바타 크기
   * @default 'md'
   */
  size?: AvatarSize;
  
  /**
   * 추가 CSS 클래스
   */
  className?: string;
  
  /**
   * 아바타 간 겹침 정도
   * @default 'md'
   */
  spacing?: 'sm' | 'md' | 'lg';
  
  /**
   * 더보기(+N) 아바타 배경색
   * @default 'gray'
   */
  moreAvatarBgColor?: 'gray' | 'blue' | 'indigo';
  
  /**
   * 아바타 클릭 시 핸들러
   */
  onAvatarClick?: (id: string | number) => void;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  max = 5,
  size = 'md',
  className = '',
  spacing = 'md',
  moreAvatarBgColor = 'gray',
  onAvatarClick,
}) => {
  // 겹침 정도에 따른 마진 클래스
  const spacingClasses = {
    sm: '-ml-1',
    md: '-ml-2',
    lg: '-ml-3',
  };
  
  // 더보기 배경색 클래스
  const moreAvatarBgColorClasses = {
    gray: 'bg-gray-200 text-gray-600',
    blue: 'bg-blue-100 text-blue-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };
  
  // 보여줄 아바타 목록
  const visibleAvatars = avatars.slice(0, max);
  
  // 숨겨진 아바타 수
  const hiddenCount = Math.max(0, avatars.length - max);

  return (
    <div className={`flex items-center ${className}`}>
      {visibleAvatars.map((avatar, index) => {
        const { id, ...avatarProps } = avatar;
        return (
          <div
            key={id}
            className={`${index !== 0 ? spacingClasses[spacing] : ''} relative z-${10 - index} transition-transform hover:-translate-y-1`}
          >
            <Avatar
              {...avatarProps}
              size={size}
              onClick={onAvatarClick ? () => onAvatarClick(id) : undefined}
              hasBorder
            />
          </div>
        );
      })}

      {hiddenCount > 0 && (
        <div className={`${spacingClasses[spacing]} relative z-0 transition-transform hover:-translate-y-1`}>
          <div
            className={`inline-flex items-center justify-center ${Avatar.getAvatarSizeClass(size)} rounded-full ${
              moreAvatarBgColorClasses[moreAvatarBgColor]
            } border-2 border-white font-medium`}
          >
            +{hiddenCount}
          </div>
        </div>
      )}
    </div>
  );
};

// Avatar 컴포넌트에 정적 메서드 추가
Avatar.getAvatarSizeClass = (size: AvatarSize) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
  };
  return sizeClasses[size];
}; 