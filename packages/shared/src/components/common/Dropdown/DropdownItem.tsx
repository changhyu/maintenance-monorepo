import React from 'react';
import { useDropdown } from './Dropdown';

export interface DropdownItemProps extends React.HTMLAttributes<HTMLAnchorElement | HTMLButtonElement | HTMLDivElement> {
  children: React.ReactNode;                      // 항목 내용
  as?: 'button' | 'a' | 'div';                    // 렌더링할 HTML 요소
  icon?: React.ReactNode;                         // 아이콘 (선택 사항)
  href?: string;                                  // 'a' 태그를 사용할 경우 링크 주소
  onClick?: (e: React.MouseEvent) => void;        // 클릭 핸들러
  disabled?: boolean;                             // 비활성화 여부
  active?: boolean;                               // 활성화 상태 (선택됨)
  divider?: boolean;                              // 구분선 표시 여부
  className?: string;                             // 추가 클래스
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  children,
  as = 'button',
  icon,
  href,
  onClick,
  disabled = false,
  active = false,
  divider = false,
  className = '',
  ...rest
}) => {
  const { close, closeOnItemClick } = useDropdown();
  
  // 항목 클릭 처리
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    
    onClick?.(e);
    
    if (closeOnItemClick) {
      close();
    }
  };
  
  // 구분선
  if (divider) {
    return <div className="h-0 my-2 border-t border-gray-200" role="separator" />;
  }
  
  // 공통 props
  const commonProps = {
    className: `
      w-full text-left px-4 py-2 text-sm
      ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}
      flex items-center gap-2
      ${className}
    `,
    onClick: handleClick,
    role: 'menuitem',
    'aria-disabled': disabled,
    ...rest
  };
  
  const content = (
    <>
      {icon && <span className="inline-flex">{icon}</span>}
      {children}
    </>
  );
  
  // 컴포넌트 렌더링
  switch (as) {
    case 'a':
      if (!href && process.env.NODE_ENV !== 'production') {
        console.warn('DropdownItem 컴포넌트가 "a" 태그로 렌더링되지만 href 속성이 없습니다.');
      }
      return <a href={disabled ? undefined : href} {...commonProps}>{content}</a>;
    case 'div':
      return <div {...commonProps}>{content}</div>;
    default:
      return <button type="button" disabled={disabled} {...commonProps}>{content}</button>;
  }
}; 