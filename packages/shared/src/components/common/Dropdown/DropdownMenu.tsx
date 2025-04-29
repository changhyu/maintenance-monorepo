import React, { useRef, useEffect } from 'react';
import { useDropdown } from './Dropdown';

export interface DropdownMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;          // 메뉴 내용
  className?: string;                 // 추가 클래스
  minWidth?: string | number;         // 최소 너비
  maxHeight?: string | number;        // 최대 높이
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  children,
  className = '',
  minWidth = '10rem',
  maxHeight,
  ...rest
}) => {
  const { isOpen, placement } = useDropdown();
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 위치에 따른 클래스
  const placementClasses = {
    'bottom-start': 'top-full left-0 mt-1',
    'bottom-end': 'top-full right-0 mt-1',
    'bottom': 'top-full left-1/2 transform -translate-x-1/2 mt-1',
    'top-start': 'bottom-full left-0 mb-1',
    'top-end': 'bottom-full right-0 mb-1',
    'top': 'bottom-full left-1/2 transform -translate-x-1/2 mb-1',
    'right': 'left-full top-0 ml-1',
    'left': 'right-full top-0 mr-1'
  };
  
  // 메뉴 보이기/숨기기 애니메이션
  useEffect(() => {
    const menuElement = menuRef.current;
    if (!menuElement) return;
    
    if (isOpen) {
      menuElement.classList.remove('opacity-0', 'invisible');
      menuElement.classList.add('opacity-100', 'visible');
    } else {
      menuElement.classList.remove('opacity-100', 'visible');
      menuElement.classList.add('opacity-0', 'invisible');
    }
  }, [isOpen]);
  
  const style: React.CSSProperties = {
    minWidth: minWidth,
    ...(maxHeight ? { maxHeight, overflowY: 'auto' } : {}),
    ...rest.style,
  };
  
  return (
    <div
      ref={menuRef}
      className={`
        absolute z-10 bg-white rounded-md shadow-lg border border-gray-200
        transition-opacity duration-150 ease-in-out opacity-0 invisible
        ${placementClasses[placement || 'bottom-start']}
        ${className}
      `}
      style={style}
      role="menu"
      aria-orientation="vertical"
      {...rest}
    >
      <div className="py-1">{children}</div>
    </div>
  );
}; 