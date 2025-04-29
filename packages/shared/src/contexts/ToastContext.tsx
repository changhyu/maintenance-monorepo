import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastContainer, ToastType } from '../components/common/Toast';

/**
 * Toast 아이템 인터페이스
 */
interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

/**
 * Toast 컨텍스트 인터페이스
 */
interface ToastContextType {
  /**
   * 정보 Toast 표시
   * @param message 메시지
   * @param duration 지속 시간 (ms)
   */
  showInfo: (message: string, duration?: number) => void;
  
  /**
   * 성공 Toast 표시
   * @param message 메시지
   * @param duration 지속 시간 (ms)
   */
  showSuccess: (message: string, duration?: number) => void;
  
  /**
   * 경고 Toast 표시
   * @param message 메시지
   * @param duration 지속 시간 (ms)
   */
  showWarning: (message: string, duration?: number) => void;
  
  /**
   * 오류 Toast 표시
   * @param message 메시지
   * @param duration 지속 시간 (ms)
   */
  showError: (message: string, duration?: number) => void;
  
  /**
   * Toast 제거
   * @param id 제거할 Toast ID
   */
  removeToast: (id: string) => void;
}

/**
 * Toast 프로바이더 속성 인터페이스
 */
interface ToastProviderProps {
  children: ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

// 컨텍스트 생성
const ToastContext = createContext<ToastContextType | null>(null);

/**
 * Toast 컨텍스트 훅
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast는 ToastProvider 내부에서 사용해야 합니다');
  }
  
  return context;
};

/**
 * Toast 프로바이더 컴포넌트
 * 애플리케이션에 Toast 알림 시스템을 제공합니다.
 */
export function ToastProvider({
  children,
  position = 'top-right',
  maxToasts = 5
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  
  /**
   * Toast 추가
   */
  const addToast = useCallback((message: string, type: ToastType, duration = 3000) => {
    const id = Date.now().toString();
    
    setToasts(prevToasts => {
      // 최대 Toast 수를 초과하면 가장 오래된 Toast 제거
      const newToasts = [...prevToasts];
      if (newToasts.length >= maxToasts) {
        newToasts.shift();
      }
      
      return [...newToasts, { id, message, type, duration }];
    });
    
    return id;
  }, [maxToasts]);
  
  /**
   * Toast 제거
   */
  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);
  
  /**
   * 정보 Toast 표시
   */
  const showInfo = useCallback((message: string, duration?: number) => {
    return addToast(message, 'info', duration);
  }, [addToast]);
  
  /**
   * 성공 Toast 표시
   */
  const showSuccess = useCallback((message: string, duration?: number) => {
    return addToast(message, 'success', duration);
  }, [addToast]);
  
  /**
   * 경고 Toast 표시
   */
  const showWarning = useCallback((message: string, duration?: number) => {
    return addToast(message, 'warning', duration);
  }, [addToast]);
  
  /**
   * 오류 Toast 표시
   */
  const showError = useCallback((message: string, duration?: number) => {
    return addToast(message, 'error', duration);
  }, [addToast]);
  
  const contextValue: ToastContextType = {
    showInfo,
    showSuccess,
    showWarning,
    showError,
    removeToast
  };
  
  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer position={position}>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
} 