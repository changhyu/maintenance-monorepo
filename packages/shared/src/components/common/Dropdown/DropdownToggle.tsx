import React from 'react';
import { useDropdown } from './Dropdown';

export interface DropdownToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;          // 토글 버튼 내용
  as?: 'button' | 'div' | 'span';     // 렌더링할 HTML 요소
  icon?: React.ReactNode;             // 아이콘
  showCaret?: boolean;                // 화살표 표시 여부
  className?: string;                 // 추가 클래스
}

type HTMLElementProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'onClick'>;

export const DropdownToggle: React.FC<DropdownToggleProps> = ({
  children,
  as = 'button',
  icon,
  showCaret = true,
  className = '',
  ...rest
}) => {
  const { toggle, isOpen } = useDropdown();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toggle();
    rest.onClick?.(e as React.MouseEvent<HTMLButtonElement>);
  };
  
  const baseClassName = `
    inline-flex items-center justify-center gap-2 
    py-2 px-4 font-medium rounded-md
    bg-white border border-gray-300 
    hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    ${isOpen ? 'text-blue-600' : 'text-gray-700'} 
    ${className}
  `;
  
  const ariaProps = {
    'aria-expanded': isOpen,
    'aria-haspopup': true,
  };
  
  const renderCaret = () => {
    if (!showCaret) return null;
    
    return (
      <svg 
        className={`w-4 h-4 ml-1 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };
  
  const content = (
    <>
      {icon && <span className="dropdown-icon">{icon}</span>}
      <span>{children}</span>
      {renderCaret()}
    </>
  );
  
  // 버튼 전용 속성들만 추출
  const buttonSpecificProps: HTMLElementProps = as === 'button' ? rest : {};
  
  switch (as) {
    case 'div':
      return (
        <div 
          className={baseClassName}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          {...ariaProps}
        >
          {content}
        </div>
      );
    case 'span':
      return (
        <span 
          className={baseClassName}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          {...ariaProps}
        >
          {content}
        </span>
      );
    default:
      return (
        <button 
          type="button" 
          className={baseClassName}
          onClick={handleClick}
          {...ariaProps}
          {...buttonSpecificProps}
        >
          {content}
        </button>
      );
  }
}; 