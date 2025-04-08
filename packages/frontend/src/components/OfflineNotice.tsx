import React, { useState, useEffect } from 'react';

/**
 * 오프라인 상태 알림 컴포넌트 프롭스
 */
interface OfflineNoticeProps {
  className?: string;
  message?: string;
  retryInterval?: number; // 연결 재시도 간격(밀리초)
}

/**
 * 오프라인 상태를 감지하고 표시하는 컴포넌트
 */
const OfflineNotice: React.FC<OfflineNoticeProps> = ({
  className = '',
  message = '인터넷 연결이 끊겼습니다. 연결 상태를 확인해 주세요.',
  retryInterval = 10000,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastRetry, setLastRetry] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  // 온라인 상태 변경 감지
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setRetryCount(0);
      setLastRetry(null);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 주기적으로 연결 상태 확인
  useEffect(() => {
    if (isOnline) return;

    const intervalId = setInterval(() => {
      // 서버 연결 상태 확인 (예: 간단한 핑 요청)
      checkConnection();
    }, retryInterval);

    return () => clearInterval(intervalId);
  }, [isOnline, retryInterval]);

  // 서버 연결 상태 확인 함수
  const checkConnection = async () => {
    try {
      // 간단한 핑 요청을 보내 연결 확인 (실제 구현 시 API 엔드포인트 사용)
      // 예시: const response = await fetch('/api/ping');
      
      // 연결 성공 시 
      // if (response.ok) setIsOnline(true);
      
      console.log('연결 확인 중...');
      setLastRetry(new Date());
      setRetryCount(prev => prev + 1);
    } catch (error) {
      console.error('연결 확인 실패:', error);
    }
  };

  // 수동 연결 재시도
  const handleRetry = () => {
    checkConnection();
  };

  // 온라인 상태이면 아무것도 표시하지 않음
  if (isOnline) return null;

  return (
    <div className={`offline-notice bg-yellow-100 text-yellow-800 p-3 rounded-md shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
          <p>{message}</p>
        </div>
        <button 
          onClick={handleRetry}
          className="ml-3 px-2 py-1 bg-yellow-200 hover:bg-yellow-300 rounded text-sm transition"
        >
          재연결
        </button>
      </div>
      
      {lastRetry && (
        <p className="text-xs mt-1">
          마지막 시도: {lastRetry.toLocaleTimeString()} ({retryCount}회 시도)
        </p>
      )}
    </div>
  );
};

export default OfflineNotice; 