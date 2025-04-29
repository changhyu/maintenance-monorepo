import React, { createContext, useContext, useState } from 'react';
import { useAccordion } from './Accordion';

/**
 * 아코디언 아이템 컨텍스트 인터페이스
 */
interface AccordionItemContextType {
  /**
   * 확장 상태 여부
   */
  isExpanded: boolean;
  
  /**
   * 상태 토글 함수
   */
  toggleExpanded: () => void;
  
  /**
   * 아이템의 고유 ID
   */
  id: string;

  /**
   * 비활성화 여부
   */
  isDisabled: boolean;
}

/**
 * 아코디언 아이템 컨텍스트
 */
export const AccordionItemContext = createContext<AccordionItemContextType | undefined>(undefined);

/**
 * 아코디언 아이템 컨텍스트 훅
 *
 * 자식 컴포넌트에서 아코디언 아이템 상태를 사용하기 위한 훅
 */
export const useAccordionItemContext = () => {
  const context = useContext(AccordionItemContext);
  if (!context) {
    throw new Error('useAccordionItemContext must be used within an AccordionItem');
  }
  return context;
};

/**
 * 아코디언 아이템 속성 인터페이스
 */
export interface AccordionItemProps {
  /**
   * 아이템의 고유 ID
   */
  id: string;
  
  /**
   * 아이템 내용 (AccordionButton과 AccordionPanel을 포함)
   */
  children: React.ReactNode;
  
  /**
   * 추가 스타일 클래스
   */
  className?: string;
  
  /**
   * 기본 확장 상태
   */
  _defaultIsExpanded?: boolean;

  /**
   * 비활성화 여부
   */
  isDisabled?: boolean;
}

/**
 * 아코디언 아이템 컴포넌트
 * 
 * 아코디언의 개별 아이템을 구현하는 컴포넌트입니다.
 * 확장/축소 상태를 관리하고 하위 컴포넌트에 컨텍스트를 제공합니다.
 */
export const AccordionItem: React.FC<AccordionItemProps> = ({
  id,
  children,
  className = '',
  _defaultIsExpanded = false,
  isDisabled = false,
}) => {
  const accordionContext = useAccordion();
  
  // 아코디언 컨텍스트를 통해 확장 상태 가져오기
  const isExpanded = accordionContext.isExpanded(id);
  
  // 아이템 토글 함수
  const toggleExpanded = () => {
    if (!isDisabled) {
      accordionContext.toggleItem(id);
    }
  };
  
  // 아이템 컨텍스트 값
  const itemContextValue: AccordionItemContextType = {
    isExpanded,
    toggleExpanded,
    id,
    isDisabled,
  };
  
  return (
    <AccordionItemContext.Provider value={itemContextValue}>
      <div 
        className={`border border-gray-200 rounded-md mb-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        data-accordion-item
        data-state={isExpanded ? 'expanded' : 'collapsed'}
        data-disabled={isDisabled}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
};

export default AccordionItem;