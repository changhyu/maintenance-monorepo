/**
 * 오프라인 상태 표시 컴포넌트
 * 
 * 오프라인 상태일 때 사용자에게 알림을 표시합니다.
 */

import React from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useOfflineSync } from '../../hooks/useOfflineSync';

// API 클라이언트 인터페이스 정의
export interface ApiClient {
  request: (url: string, options?: Record<string, unknown>) => Promise<unknown>;
  syncOfflineData?: () => Promise<unknown>;
  get: (url: string, config?: Record<string, unknown>) => Promise<unknown>;
  post: (url: string, data?: unknown, config?: Record<string, unknown>) => Promise<unknown>;
  put: (url: string, data?: unknown, config?: Record<string, unknown>) => Promise<unknown>;
  patch: (url: string, data?: unknown, config?: Record<string, unknown>) => Promise<unknown>;
  delete: (url: string, config?: Record<string, unknown>) => Promise<unknown>;
}

export interface OfflineIndicatorProps {
  /**
   * 오프라인 메시지
   */
  offlineMessage?: string;
  
  /**
   * 동기화 메시지
   */
  syncMessage?: string;
  
  /**
   * API 클라이언트 인스턴스
   */
  apiClient?: ApiClient;
  
  /**
   * 추가 스타일 클래스
   */
  className?: string;
  
  /**
   * 알림 위치
   */
  position?: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  /**
   * 자동으로 숨기기까지의 시간 (ms, 0이면 자동으로 숨기지 않음)
   */
  autoHideDelay?: number;
}

/**
 * 오프라인 상태 표시 컴포넌트
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  offlineMessage = '인터넷 연결이 끊겼습니다. 오프라인 모드로 전환됩니다.',
  syncMessage = '오프라인 데이터 동기화 중...',
  apiClient,
  className = '',
  position = 'top',
  autoHideDelay = 5000,
}) => {
  const { isOnline } = useNetworkStatus();
  const { isSyncing, pendingCount } = useOfflineSync({ apiClient });
  const [visible, setVisible] = React.useState(false);
  
  // 위치에 따른 스타일 클래스
  const positionClasses = {
    'top': 'top-0 left-0 right-0',
    'bottom': 'bottom-0 left-0 right-0',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };
  
  // 오프라인 상태 변경 시 표시
  React.useEffect(() => {
    if (!isOnline || isSyncing) {
      setVisible(true);
      
      // 자동 숨김 설정
      if (autoHideDelay > 0 && isOnline) {
        const timer = setTimeout(() => {
          setVisible(false);
        }, autoHideDelay);
        
        return () => clearTimeout(timer);
      }
    } else {
      // 온라인 상태로 변경되고 동기화가 완료되면 자동 숨김
      if (autoHideDelay > 0) {
        const timer = setTimeout(() => {
          setVisible(false);
        }, autoHideDelay);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isOnline, isSyncing, autoHideDelay]);
  
  // 아무것도 표시할 필요가 없으면 null 반환
  if (isOnline && !isSyncing && !visible) {
    return null;
  }
  
  // 표시할 메시지 결정
  const message = !isOnline 
    ? offlineMessage 
    : isSyncing 
      ? `${syncMessage} (${pendingCount}개 항목)`
      : '';
  
  return (
    <div 
      className={`
        fixed z-50 px-4 py-2 rounded-md shadow-lg transition-opacity duration-300
        ${positionClasses[position]}
        ${!isOnline ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}
        ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        ${className}
      `}
    >
      <div className="flex items-center">
        {!isOnline ? (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
        <span>{message}</span>
        <button 
          className="ml-auto pl-2 text-gray-600 hover:text-gray-800"
          onClick={() => setVisible(false)}
          aria-label="닫기"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default OfflineIndicator;