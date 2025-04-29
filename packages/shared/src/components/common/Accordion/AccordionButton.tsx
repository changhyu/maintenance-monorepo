import React from 'react';
import { useAccordionItemContext } from './AccordionItem';

/**
 * 아코디언 버튼 속성 인터페이스
 */
export interface AccordionButtonProps {
  /**
   * 버튼 내용
   */
  children: React.ReactNode;
  
  /**
   * 비활성화 여부
   */
  isDisabled?: boolean;
  
  /**
   * 추가 스타일 클래스
   */
  className?: string;
  
  /**
   * 클릭 이벤트 핸들러
   */
  onClick?: () => void;
}

/**
 * 아코디언 버튼 컴포넌트
 * 
 * 아코디언 아이템을 접거나 펼칠 수 있는 버튼 컴포넌트입니다.
 */
export const AccordionButton: React.FC<AccordionButtonProps> = ({
  children,
  isDisabled = false,
  className = '',
  onClick,
}) => {
  const { id, isExpanded, toggleExpanded } = useAccordionItemContext();
  
  const handleClick = (_e: React.MouseEvent) => {
    if (isDisabled) return;
    
    if (onClick) {
      onClick();
    } else {
      toggleExpanded();
    }
  };
  
  return (
    <button
      id={`accordion-button-${id}`}
      className={`w-full p-4 flex justify-between items-center text-left ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'
      } ${className}`}
      onClick={handleClick}
      aria-expanded={isExpanded}
      aria-controls={`accordion-panel-${id}`}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      type="button"
    >
      <div className="flex-1">{children}</div>
      <svg
        className={`w-5 h-5 text-gray-500 transform transition-transform duration-200 ${
          isExpanded ? 'rotate-180' : ''
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );
};

export default AccordionButton; 