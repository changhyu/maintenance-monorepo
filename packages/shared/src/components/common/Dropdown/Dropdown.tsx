import React, { useState, useRef, useEffect, createContext, useContext } from 'react';

export interface DropdownProps {
  children: React.ReactNode;   // 드롭다운 내용
  isOpen?: boolean;            // 외부에서 제어할 경우 드롭다운 열림 상태
  onToggle?: (isOpen: boolean) => void; // 외부 제어용 토글 콜백
  placement?: 'bottom-start' | 'bottom-end' | 'bottom' | 'top-start' | 'top-end' | 'top' | 'right' | 'left'; // 드롭다운 메뉴 위치
  closeOnItemClick?: boolean;  // 항목 클릭 시 드롭다운 닫기 여부
  className?: string;          // 추가 클래스
}

interface DropdownContextType {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  placement: DropdownProps['placement'];
  closeOnItemClick: boolean;
}

// Dropdown 컨텍스트 생성
export const DropdownContext = createContext<DropdownContextType | null>(null);

// 컨텍스트 사용을 위한 훅
export const useDropdown = () => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('useDropdown은 Dropdown 컴포넌트 내부에서만 사용할 수 있습니다.');
  }
  return context;
};

export const Dropdown: React.FC<DropdownProps> = ({
  children,
  isOpen: controlledIsOpen,
  onToggle,
  placement = 'bottom-start',
  closeOnItemClick = true,
  className = '',
}) => {
  // 내부적으로 상태 관리 (외부에서 제어되지 않는 경우)
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  
  // 외부 제어 여부 확인
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen;
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // 토글 함수
  const toggle = () => {
    if (isControlled) {
      onToggle?.(!isOpen);
    } else {
      setUncontrolledIsOpen(!isOpen);
    }
  };
  
  // 닫기 함수
  const close = () => {
    if (isControlled) {
      onToggle?.(false);
    } else {
      setUncontrolledIsOpen(false);
    }
  };
  
  // 외부 클릭 감지
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) && 
        isOpen
      ) {
        close();
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);
  
  return (
    <DropdownContext.Provider value={{ isOpen, toggle, close, placement, closeOnItemClick }}>
      <div ref={dropdownRef} className={`relative inline-block ${className}`}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}; 