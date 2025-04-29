import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;                      // 모달 표시 여부
  onClose: () => void;                  // 모달 닫기 함수
  children: React.ReactNode;            // 모달 내용
  size?: 'sm' | 'md' | 'lg';            // 모달 크기
  closeOnBackdropClick?: boolean;       // 백드롭 클릭 시 닫기 여부
  closeOnEsc?: boolean;                 // ESC 키 누를 때 닫기 여부
  centered?: boolean;                   // 세로 중앙 정렬 여부
  className?: string;                   // 추가 클래스
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEsc = true,
  centered = false,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // 모달 크기에 따른 클래스
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
  };
  
  // ESC 키 이벤트 핸들러
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEsc && event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOnEsc, isOpen, onClose]);
  
  // 모달 열릴 때 스크롤 잠금
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // 포커스 트랩 설정
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);
  
  // 백드롭 클릭 이벤트 핸들러
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;
  
  // Portal을 사용하여 모달을 body 직접 하위에 렌더링
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 transition-opacity duration-300"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      style={{ backdropFilter: 'blur(2px)' }}
    >
      <div
        ref={modalRef}
        className={`
          relative w-full ${sizeClasses[size]} m-4 bg-white rounded-lg shadow-xl transform transition-all
          ${centered ? 'mt-[20vh]' : 'mt-16'}
          ${className}
        `}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}; 