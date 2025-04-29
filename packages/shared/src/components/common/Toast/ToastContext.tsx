import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ToastContainer } from './ToastContainer';
import type { ToastProps, ToastPosition, ToastVariant } from './Toast';

type ToastOptions = Omit<ToastProps, 'id' | 'message'>;

interface ToastContextValue {
  addToast: (message: string, options?: ToastOptions) => string;
  removeToast: (id: string) => void;
  removeAllToasts: () => void;
  updateToast: (id: string, message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
  autoClose?: boolean;
  autoCloseTime?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'top-right',
  maxToasts = 5,
  autoClose = true,
  autoCloseTime = 5000,
}) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  // 지정된 시간 후 토스트 삭제
  useEffect(() => {
    if (!autoClose) return;

    const timeoutIds = toasts.map((toast) => {
      const duration = toast.duration || autoCloseTime;
      if (duration <= 0) return undefined;

      return setTimeout(() => {
        removeToast(toast.id);
      }, duration);
    });

    return () => {
      timeoutIds.forEach((id) => id && clearTimeout(id));
    };
  }, [toasts, autoClose, autoCloseTime]);

  // 토스트 추가
  const addToast = useCallback((message: string, options?: ToastOptions): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastProps = {
      id,
      message,
      ...options,
      isVisible: true,
    };

    setToasts((prevToasts) => {
      // 최대 개수 제한
      const updatedToasts = [...prevToasts, newToast];
      if (updatedToasts.length > maxToasts) {
        return updatedToasts.slice(updatedToasts.length - maxToasts);
      }
      return updatedToasts;
    });

    return id;
  }, [maxToasts]);

  // 토스트 삭제
  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  // 모든 토스트 삭제
  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // 토스트 업데이트
  const updateToast = useCallback((id: string, message: string, options?: ToastOptions) => {
    setToasts((prevToasts) =>
      prevToasts.map((toast) =>
        toast.id === id ? { ...toast, message, ...options } : toast
      )
    );
  }, []);

  const contextValue = {
    addToast,
    removeToast,
    removeAllToasts,
    updateToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} position={position} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

// 훅 사용을 위한 래퍼 함수
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const { addToast, removeToast, removeAllToasts, updateToast } = context;

  // 편의 함수
  const toast = (message: string, options?: ToastOptions) =>
    addToast(message, options);

  toast.info = (message: string, options?: Omit<ToastOptions, 'variant'>) =>
    addToast(message, { ...options, variant: 'info' });

  toast.success = (message: string, options?: Omit<ToastOptions, 'variant'>) =>
    addToast(message, { ...options, variant: 'success' });

  toast.warning = (message: string, options?: Omit<ToastOptions, 'variant'>) =>
    addToast(message, { ...options, variant: 'warning' });

  toast.error = (message: string, options?: Omit<ToastOptions, 'variant'>) =>
    addToast(message, { ...options, variant: 'error' });

  toast.remove = removeToast;
  toast.removeAll = removeAllToasts;
  toast.update = updateToast;

  return toast;
};