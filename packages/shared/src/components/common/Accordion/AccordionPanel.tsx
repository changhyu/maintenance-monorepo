import React from 'react';
import { useAccordionItemContext } from './AccordionItem';

/**
 * 아코디언 패널 속성 인터페이스
 */
export interface AccordionPanelProps {
  /**
   * 패널 내용
   */
  children: React.ReactNode;
  
  /**
   * 추가 스타일 클래스
   */
  className?: string;
}

/**
 * 아코디언 패널 컴포넌트
 * 
 * 아코디언 아이템이 확장되었을 때 표시되는 내용을 담는 컴포넌트입니다.
 * 아코디언 아이템의 상태에 따라 표시 여부가 결정됩니다.
 */
export const AccordionPanel: React.FC<AccordionPanelProps> = ({
  children,
  className = '',
}) => {
  const { isExpanded, id } = useAccordionItemContext();
  
  return (
    <div
      id={`accordion-panel-${id}`}
      role="region"
      aria-labelledby={`accordion-button-${id}`}
      className={`overflow-hidden transition-all duration-300 ${className}`}
      style={{ 
        maxHeight: isExpanded ? '1000px' : '0',
        opacity: isExpanded ? 1 : 0,
      }}
    >
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

export default AccordionPanel; 