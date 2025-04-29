import React from 'react';

/**
 * 아코디언 바디 속성 인터페이스
 */
export interface AccordionBodyProps {
  /**
   * 컴포넌트 내용
   */
  children: React.ReactNode;
  
  /**
   * 추가 스타일 클래스
   */
  className?: string;
}

/**
 * 아코디언 바디 컴포넌트
 * 아코디언 항목의 본문 내용을 담당하는 컴포넌트입니다.
 */
export const AccordionBody: React.FC<AccordionBodyProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`accordion-body p-4 ${className}`}>
      {children}
    </div>
  );
}; 