import React from 'react';
import { Toast } from './Toast';
import type { ToastPosition, ToastProps } from './Toast';

export interface ToastContainerProps {
  toasts: ToastProps[];
  position?: ToastPosition;
  onClose?: (id: string) => void;
  className?: string;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  position = 'top-right',
  onClose,
  className = '',
}) => {
  // 위치에 따른 스타일 클래스
  const positionClasses = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0',
    'top-center': 'top-0 left-1/2 transform -translate-x-1/2',
    'bottom-left': 'bottom-0 left-0',
    'bottom-right': 'bottom-0 right-0',
    'bottom-center': 'bottom-0 left-1/2 transform -translate-x-1/2',
  };

  // 위치에 따른 애니메이션 클래스
  const getAnimationClass = (pos: ToastPosition) => {
    if (pos.startsWith('top')) {
      return 'animate-toast-slide-down';
    } else {
      return 'animate-toast-slide-up';
    }
  };

  if (!toasts.length) return null;

  return (
    <div
      className={`toast-container fixed p-4 z-50 max-h-screen overflow-hidden pointer-events-none ${
        positionClasses[position]
      } ${className}`}
      role="region"
      aria-label="알림"
    >
      <div className="flex flex-col space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${getAnimationClass(position)} pointer-events-auto`}
          >
            <Toast
              {...toast}
              onClose={onClose ? () => onClose(toast.id) : toast.onClose}
            />
          </div>
        ))}
      </div>
    </div>
  );
}; 