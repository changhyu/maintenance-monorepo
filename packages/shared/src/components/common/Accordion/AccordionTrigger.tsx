import React from 'react';
import { useAccordionItemContext } from './AccordionItem';

/**
 * 아코디언 트리거 속성 인터페이스
 */
export interface AccordionTriggerProps {
  /**
   * 컴포넌트 내용
   */
  children: React.ReactNode;
  
  /**
   * 추가 스타일 클래스
   */
  className?: string;
  
  /**
   * 확장 상태 여부
   */
  isExpanded?: boolean;
  
  /**
   * 클릭 핸들러
   */
  onClick?: (event: React.MouseEvent) => void;
  
  /**
   * 아이콘 표시 여부
   */
  showIcon?: boolean;
  
  /**
   * 비활성화 여부
   */
  disabled?: boolean;
}

/**
 * 아코디언 트리거 컴포넌트
 * 
 * 아코디언 아이템을 열고 닫는 트리거 역할을 하는 컴포넌트입니다.
 * AccordionItem 컨텍스트를 사용하여 아이템의 열림/닫힘 상태를 제어합니다.
 */
export const AccordionTrigger: React.FC<AccordionTriggerProps> = ({
  children,
  className = '',
  isExpanded: isExpandedProp,
  onClick,
  showIcon = true,
  disabled = false,
}) => {
  const accordionContext = useAccordionItemContext();
  
  const isExpanded = isExpandedProp ?? accordionContext?.isExpanded ?? false;
  
  const handleClick = (event: React.MouseEvent) => {
    if (disabled) return;
    
    onClick?.(event);
    
    if (!event.defaultPrevented && accordionContext) {
      accordionContext.toggleExpanded();
    }
  };
  
  return (
    <button
      type="button"
      className={`
        flex items-center justify-between w-full p-4 text-left
        ${isExpanded ? 'font-medium' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      onClick={handleClick}
      aria-expanded={isExpanded}
      disabled={disabled}
    >
      <span>{children}</span>
      {showIcon && (
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${
            isExpanded ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      )}
    </button>
  );
};

export default AccordionTrigger; 