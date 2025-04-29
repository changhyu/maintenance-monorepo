import React from 'react';
import { useAccordionItemContext } from './AccordionItem';

/**
 * 아코디언 콘텐츠 속성 인터페이스
 */
export interface AccordionContentProps {
  /**
   * 컴포넌트 내용
   */
  children: React.ReactNode;
  
  /**
   * 확장 상태 여부
   */
  isExpanded?: boolean;
  
  /**
   * 추가 스타일 클래스
   */
  className?: string;
  
  /**
   * 애니메이션 활성화 여부
   */
  animate?: boolean;
  
  /**
   * 애니메이션 속도 (ms)
   */
  animationDuration?: number;
}

/**
 * 아코디언 콘텐츠 컴포넌트
 * 
 * 아코디언 아이템의 내용을 표시하는 컴포넌트로, 확장 여부에 따라 내용을 표시하거나 숨깁니다.
 * 애니메이션을 적용할 수 있습니다.
 */
export const AccordionContent: React.FC<AccordionContentProps> = ({
  children,
  isExpanded: isExpandedProp,
  className = '',
  animate = true,
  animationDuration = 300,
}) => {
  const accordionContext = useAccordionItemContext();
  const isExpanded = isExpandedProp ?? accordionContext?.isExpanded ?? false;
  
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState<number | undefined>(
    isExpanded ? undefined : 0
  );

  React.useEffect(() => {
    if (!animate) return;
    
    if (isExpanded) {
      const contentHeight = contentRef.current?.scrollHeight;
      setHeight(contentHeight);
      
      // height가 설정된 후에 undefined로 재설정하여 높이 제한을 제거
      const timeout = setTimeout(() => {
        setHeight(undefined);
      }, animationDuration);
      
      return () => clearTimeout(timeout);
    } else {
      if (contentRef.current) {
        // 현재 높이 계산 후 0으로 설정
        const contentHeight = contentRef.current.scrollHeight;
        setHeight(contentHeight);
        
        // 레이아웃 리플로우를 강제하기 위한 지연
        setTimeout(() => {
          setHeight(0);
        }, 10);
      } else {
        setHeight(0);
      }
    }
  }, [isExpanded, animate, animationDuration]);

  const contentStyle: React.CSSProperties = !animate
    ? {
        display: isExpanded ? 'block' : 'none',
      }
    : {
        height: height !== undefined ? `${height}px` : 'auto',
        overflow: 'hidden',
        transition: `height ${animationDuration}ms ease-in-out`,
      };

  return (
    <div
      ref={contentRef}
      style={contentStyle}
      className={`accordion-content ${className}`}
      hidden={!isExpanded && !animate}
    >
      {children}
    </div>
  );
};

export default AccordionContent; 