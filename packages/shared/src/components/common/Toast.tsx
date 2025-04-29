import React, { useState, useEffect, ReactNode } from 'react';

/**
 * Toast 타입 정의
 */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

/**
 * Toast 속성 인터페이스
 */
export interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
  icon?: ReactNode;
  className?: string;
}

/**
 * Toast 컴포넌트
 * 사용자에게 임시 알림을 표시하는 컴포넌트입니다.
 */
export function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  icon,
  className = ''
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  // Toast 아이콘 설정
  const getIcon = (): ReactNode => {
    if (icon) return icon;
    
    // 기본 아이콘
    switch (type) {
      case 'success':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="toast-icon">
            <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z" />
          </svg>
        );
      case 'error':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="toast-icon">
            <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-1.5 5h3v10h-3V5zm0 12h3v2h-3v-2z" />
          </svg>
        );
      case 'warning':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="toast-icon">
            <path d="M12 1l-12 22h24L12 1zm-1 8h2v7h-2v-7zm1 11.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="toast-icon">
            <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-.001 5.75c.69 0 1.251.56 1.251 1.25s-.561 1.25-1.251 1.25-1.249-.56-1.249-1.25.559-1.25 1.249-1.25zm2.001 12.25h-4v-1c.484-.179 1-.201 1-.735v-4.467c0-.534-.516-.618-1-.797v-1h3v6.265c0 .535.517.558 1 .735v.999z" />
          </svg>
        );
    }
  };
  
  // 자동 닫기 타이머 설정
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        
        // 약간의 지연 후 onClose 콜백 호출 (애니메이션을 위해)
        setTimeout(() => {
          if (onClose) onClose();
        }, 300);
      }, duration);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [duration, onClose]);
  
  // 닫기 버튼 클릭 핸들러
  const handleClose = () => {
    setIsVisible(false);
    
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };
  
  return (
    <div 
      className={`toast ${type} ${isVisible ? 'visible' : 'hidden'} ${className}`}
      role="alert"
    >
      <div className="toast-icon-container">{getIcon()}</div>
      <div className="toast-content">{message}</div>
      <button type="button" className="toast-close" onClick={handleClose} aria-label="닫기">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Toast 컨테이너 속성 인터페이스
 */
export interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  className?: string;
  children: ReactNode;
}

/**
 * Toast 컨테이너 컴포넌트
 * 여러 Toast 알림을 모아서 표시하는 컨테이너입니다.
 */
export function ToastContainer({
  position = 'top-right',
  className = '',
  children
}: ToastContainerProps) {
  return (
    <div className={`toast-container ${position} ${className}`}>
      {children}
    </div>
  );
} 