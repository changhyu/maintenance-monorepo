import { useCallback, useMemo, useSyncExternalStore } from 'react';

export interface NetworkState {
  isOnline: boolean;
  offlineSince: Date | null;
  connectionType: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
}

/**
 * 네트워크 상태를 관리하는 훅 (React 19 최적화)
 * 
 * @returns NetworkState 
 */
const useNetwork = (): NetworkState => {
  // 네트워크 정보 업데이트 함수
  const getNetworkInfo = useCallback(() => {
    // Navigator Connection API 타입 정의
    interface ConnectionAPI {
      type?: string;
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      addEventListener: (event: string, listener: () => void) => void;
      removeEventListener: (event: string, listener: () => void) => void;
    }
    
    // Navigator 확장 인터페이스
    interface NavigatorWithConnection extends Navigator {
      connection?: ConnectionAPI;
      mozConnection?: ConnectionAPI;
      webkitConnection?: ConnectionAPI;
    }
    
    // 연결 API 가져오기
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    
    const state: NetworkState = {
      isOnline: navigator.onLine,
      offlineSince: navigator.onLine ? null : new Date(),
      connectionType: connection?.type || null,
      effectiveType: connection?.effectiveType || null,
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null
    };
    
    return state;
  }, []);
  
  // 네트워크 변경 이벤트 구독 함수
  const subscribe = useCallback((callback: () => void) => {
    const handleOnline = () => callback();
    const handleOffline = () => callback();
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Navigator Connection API 타입 정의
    interface ConnectionAPI {
      addEventListener: (event: string, listener: () => void) => void;
      removeEventListener: (event: string, listener: () => void) => void;
    }
    
    // Navigator 확장 인터페이스
    interface NavigatorWithConnection extends Navigator {
      connection?: ConnectionAPI;
      mozConnection?: ConnectionAPI;
      webkitConnection?: ConnectionAPI;
    }
    
    // 연결 API 가져오기
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    
    const handleConnectionChange = () => callback();
    
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }
    
    // 클린업 함수
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);
  
  // React 19의 useSyncExternalStore를 사용하여 네트워크 상태 구독
  const networkState = useSyncExternalStore(subscribe, getNetworkInfo);
  
  // 메모이제이션된 네트워크 상태
  const memoizedNetworkState = useMemo(() => networkState, [
    networkState.isOnline,
    networkState.effectiveType,
    networkState.downlink,
    networkState.rtt
  ]);
  
  return memoizedNetworkState;
};

export default useNetwork; 