import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * 아코디언 아이템 상태 정보
 */
export interface AccordionItemState {
  id: string;
  isExpanded: boolean;
}

/**
 * 아코디언 컨텍스트 타입
 */
export interface AccordionContextType {
  /**
   * 현재 확장된 아이템 상태 목록
   */
  expandedItems: string[];
  
  /**
   * 아이템 토글 함수
   */
  toggleItem: (id: string) => void;
  
  /**
   * 아이템 확장 상태 확인 함수
   */
  isExpanded: (id: string) => boolean;
}

/**
 * 아코디언 컨텍스트
 */
export const AccordionContext = createContext<AccordionContextType | undefined>(undefined);

/**
 * 아코디언 컨텍스트 훅
 */
export const useAccordion = () => {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('useAccordion must be used within an Accordion component');
  }
  return context;
};

/**
 * 아코디언 속성 인터페이스
 */
export interface AccordionProps {
  /**
   * 아코디언 내용 (AccordionItem들)
   */
  children: React.ReactNode;
  
  /**
   * 여러 아이템이 동시에 열릴 수 있는지 여부
   */
  allowMultiple?: boolean;
  
  /**
   * 초기에 확장된 아이템 ID 목록
   */
  defaultExpandedItems?: string[];
  
  /**
   * 추가 스타일 클래스
   */
  className?: string;

  /**
   * 제어 컴포넌트를 위한 확장된 아이템 ID 목록
   */
  expandedItems?: string[];

  /**
   * 확장된 아이템이 변경될 때 호출되는 콜백
   */
  onChange?: (expandedItems: string[]) => void;
}

/**
 * 아코디언 컴포넌트
 * 
 * 접었다 펼칠 수 있는 컨텐츠 섹션을 제공하는 컴포넌트입니다.
 */
export const Accordion: React.FC<AccordionProps> = ({
  children,
  allowMultiple = false,
  defaultExpandedItems = [],
  className = '',
  expandedItems: controlledExpandedItems,
  onChange,
}) => {
  const isControlled = controlledExpandedItems !== undefined;
  const [internalExpandedItems, setInternalExpandedItems] = useState<string[]>(defaultExpandedItems);
  
  // 실제 사용할 expandedItems 결정
  const expandedItems = isControlled ? controlledExpandedItems : internalExpandedItems;

  // 제어 컴포넌트일 경우 외부 상태 변화에 대응
  useEffect(() => {
    if (isControlled) {
      // 제어 컴포넌트일 경우에는 내부 상태를 업데이트하지 않음
    }
  }, [isControlled, controlledExpandedItems]);

  /**
   * 아이템 토글 함수
   */
  const toggleItem = (id: string) => {
    const isItemExpanded = expandedItems.includes(id);
    let newExpandedItems: string[];
    
    if (isItemExpanded) {
      // 이미 확장된 아이템이면 목록에서 제거
      newExpandedItems = expandedItems.filter(itemId => itemId !== id);
    } else {
      // 확장되지 않은 아이템이면 목록에 추가
      // allowMultiple이 false이면 기존 목록 대체
      newExpandedItems = allowMultiple ? [...expandedItems, id] : [id];
    }

    if (!isControlled) {
      setInternalExpandedItems(newExpandedItems);
    }
    
    // 콜백 호출
    if (onChange) {
      onChange(newExpandedItems);
    }
  };

  /**
   * 아이템 확장 상태 확인 함수
   */
  const isExpanded = (id: string) => {
    return expandedItems.includes(id);
  };

  const contextValue: AccordionContextType = {
    expandedItems,
    toggleItem,
    isExpanded,
  };

  return (
    <AccordionContext.Provider value={contextValue}>
      <div className={`w-full ${className}`} data-accordion>
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

export default Accordion;