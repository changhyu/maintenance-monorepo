/**
 * 네트워크 상태 관리 훅
 * 
 * 네트워크 연결 상태를 추적하고 오프라인/온라인 상태 변경을 감지합니다.
 */

import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatusOptions {
  /**
   * 네트워크 상태 확인 URL
   */
  pingUrl?: string;
  
  /**
   * 핑 간격 (ms)
   */
  pingInterval?: number;
  
  /**
   * 핑 타임아웃 (ms)
   */
  pingTimeout?: number;
  
  /**
   * 온라인 상태 변경 콜백
   */
  onOnline?: () => void;
  
  /**
   * 오프라인 상태 변경 콜백
   */
  onOffline?: () => void;
}

export interface NetworkStatus {
  /**
   * 네트워크 연결 상태
   */
  isOnline: boolean;
  
  /**
   * 핑 측정 중 여부
   */
  isPinging: boolean;
  
  /**
   * 마지막 핑 시간 (ms)
   */
  lastPingTime: number | null;
  
  /**
   * 마지막 네트워크 상태 변경 시간
   */
  lastStatusChangeTime: number | null;
  
  /**
   * 네트워크 상태 수동 확인 함수
   */
  checkNetworkStatus: () => Promise<boolean>;
}

/**
 * 네트워크 상태 관리 훅
 */
export function useNetworkStatus(options: NetworkStatusOptions = {}): NetworkStatus {
  const {
    pingUrl = '/api/ping',
    pingInterval = 30000, // 30초
    pingTimeout = 5000, // 5초
    onOnline,
    onOffline,
  } = options;
  
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [lastPingTime, setLastPingTime] = useState<number | null>(null);
  const [lastStatusChangeTime, setLastStatusChangeTime] = useState<number | null>(null);
  
  /**
   * 네트워크 연결 상태 확인
   */
  const checkNetworkStatus = useCallback(async (): Promise<boolean> => {
    // navigator.onLine은 실제 인터넷 연결보다는 네트워크 인터페이스 상태를 반영합니다.
    // 따라서 실제 서버 연결을 확인하기 위해 HTTP 요청을 수행합니다.
    if (!navigator.onLine) {
      return false;
    }
    
    setIsPinging(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), pingTimeout);
      
      // 서버에 핑 요청
      const response = await fetch(pingUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      clearTimeout(timeoutId);
      
      setLastPingTime(Date.now());
      return response.ok;
    } catch (error) {
      console.warn('네트워크 상태 확인 오류:', error);
      return false;
    } finally {
      setIsPinging(false);
    }
  }, [pingTimeout, pingUrl]);
  
  // 네트워크 이벤트 핸들러
  useEffect(() => {
    /**
     * 온라인 상태 변경 핸들러
     */
    const handleOnline = async () => {
      const isReallyOnline = await checkNetworkStatus();
      
      if (isReallyOnline && !isOnline) {
        setIsOnline(true);
        setLastStatusChangeTime(Date.now());
        onOnline?.();
      }
    };
    
    /**
     * 오프라인 상태 변경 핸들러
     */
    const handleOffline = () => {
      if (isOnline) {
        setIsOnline(false);
        setLastStatusChangeTime(Date.now());
        onOffline?.();
      }
    };
    
    // 이벤트 리스너 등록
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // 초기 네트워크 상태 확인
    checkNetworkStatus().then(online => {
      if (online !== isOnline) {
        setIsOnline(online);
        setLastStatusChangeTime(Date.now());
        
        if (online) {
          onOnline?.();
        } else {
          onOffline?.();
        }
      }
    });
    
    // 주기적인 네트워크 상태 확인
    const intervalId = setInterval(async () => {
      const online = await checkNetworkStatus();
      
      if (online !== isOnline) {
        setIsOnline(online);
        setLastStatusChangeTime(Date.now());
        
        if (online) {
          onOnline?.();
        } else {
          onOffline?.();
        }
      }
    }, pingInterval);
    
    // 정리
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [checkNetworkStatus, isOnline, onOffline, onOnline, pingInterval]);
  
  return {
    isOnline,
    isPinging,
    lastPingTime,
    lastStatusChangeTime,
    checkNetworkStatus,
  };
}

export default useNetworkStatus; 