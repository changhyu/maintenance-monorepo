import React from 'react';
import { ToastProvider, useToast } from '../contexts/ToastContext';

/**
 * Toast 버튼 속성 인터페이스
 */
interface ToastButtonProps {
  type: 'info' | 'success' | 'warning' | 'error';
  label: string;
  duration?: number;
}

/**
 * Toast 버튼 컴포넌트
 */
function ToastButton({ type, label, duration }: ToastButtonProps) {
  const toast = useToast();
  
  const handleClick = () => {
    const message = `${type} 알림: ${label} (${duration ? duration/1000 : 3}초)`;
    
    switch (type) {
      case 'info':
        toast.showInfo(message, duration);
        break;
      case 'success':
        toast.showSuccess(message, duration);
        break;
      case 'warning':
        toast.showWarning(message, duration);
        break;
      case 'error':
        toast.showError(message, duration);
        break;
    }
  };
  
  const buttonClasses = {
    info: 'bg-blue-500 hover:bg-blue-600',
    success: 'bg-green-500 hover:bg-green-600',
    warning: 'bg-yellow-500 hover:bg-yellow-600',
    error: 'bg-red-500 hover:bg-red-600',
  };
  
  return (
    <button
      className={`px-4 py-2 rounded text-white ${buttonClasses[type]}`}
      onClick={handleClick}
    >
      {label}
    </button>
  );
}

/**
 * Toast 컨트롤 패널 컴포넌트
 */
function ToastControls() {
  return (
    <div className="toast-controls">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <ToastButton type="info" label="정보 알림" />
        <ToastButton type="success" label="성공 알림" />
        <ToastButton type="warning" label="경고 알림" />
        <ToastButton type="error" label="오류 알림" />
        
        <ToastButton type="info" label="짧은 알림" duration={1500} />
        <ToastButton type="success" label="긴 알림" duration={6000} />
        <ToastButton type="warning" label="매우 긴 알림" duration={10000} />
        <ToastButton type="error" label="영구 알림" duration={0} />
      </div>
    </div>
  );
}

/**
 * Toast 예제 컴포넌트
 */
export function ToastExample() {
  return (
    <ToastProvider position="top-right" maxToasts={5}>
      <div className="toast-example-page">
        <h1 className="text-2xl font-bold mb-4">Toast 알림 예제</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">알림 표시하기</h2>
          <p className="mb-4">
            아래 버튼을 클릭하여 다양한 유형의 Toast 알림을 표시해 보세요.
            표시된 알림은 설정된 시간이 지나면 자동으로 사라집니다.
          </p>
          
          <ToastControls />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">사용 방법</h2>
          <p className="mb-2">1. ToastProvider를 애플리케이션 루트에 추가합니다:</p>
          <pre className="bg-gray-100 p-3 rounded mb-4 overflow-x-auto">
            {`<ToastProvider position="top-right" maxToasts={5}>
  <App />
</ToastProvider>`}
          </pre>
          
          <p className="mb-2">2. useToast 훅을 사용하여 컴포넌트에서 Toast를 표시합니다:</p>
          <pre className="bg-gray-100 p-3 rounded mb-4 overflow-x-auto">
            {`import { useToast } from '../contexts/ToastContext';

function MyComponent() {
  const toast = useToast();
  
  const handleSuccess = () => {
    toast.showSuccess('작업이 성공적으로 완료되었습니다');
  };
  
  const handleError = () => {
    toast.showError('오류가 발생했습니다');
  };
  
  // ...
}`}
          </pre>
          
          <p className="mb-2">사용 가능한 메서드:</p>
          <ul className="list-disc list-inside mb-4">
            <li>toast.showInfo(message, duration) - 정보 알림</li>
            <li>toast.showSuccess(message, duration) - 성공 알림</li>
            <li>toast.showWarning(message, duration) - 경고 알림</li>
            <li>toast.showError(message, duration) - 오류 알림</li>
          </ul>
        </div>
      </div>
    </ToastProvider>
  );
}

export default ToastExample; 