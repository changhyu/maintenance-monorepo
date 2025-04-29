import React from 'react';

export interface AccordionHeaderProps {
  /**
   * 헤더 내용
   */
  children: React.ReactNode;
  
  /**
   * 아코디언 아이템 ID (AccordionItem에서 자동으로 전달됨)
   */
  id?: string;
  
  /**
   * 확장 상태 (AccordionItem에서 자동으로 전달됨)
   */
  isExpanded?: boolean;
  
  /**
   * 비활성화 여부 (AccordionItem에서 자동으로 전달됨)
   */
  isDisabled?: boolean;
  
  /**
   * 추가 CSS 클래스
   */
  className?: string;
  
  /**
   * 클릭 이벤트 핸들러 (기본적으로 토글)
   */
  onClick?: () => void;
}

export const AccordionHeader: React.FC<AccordionHeaderProps> = ({
  children,
  id,
  isExpanded = false,
  isDisabled = false,
  className = '',
  onClick,
}) => {
  // 접근성을 위한 ID 생성
  const headerId = `accordion-header-${id}`;
  const panelId = `accordion-panel-${id}`;
  
  return (
    <div
      id={headerId}
      className={`p-4 flex justify-between items-center cursor-pointer select-none ${className} ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
      }`}
      onClick={isDisabled ? undefined : onClick}
      aria-expanded={isExpanded}
      aria-controls={panelId}
      aria-disabled={isDisabled}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
    >
      <div className="flex-1">{children}</div>
      <div className={`ml-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-gray-400"
        >
          <path
            d="M19 9L12 16L5 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}; 