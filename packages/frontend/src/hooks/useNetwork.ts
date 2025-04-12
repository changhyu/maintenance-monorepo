import { useState, useEffect } from 'react';

interface NetworkState {
  isOnline: boolean;
  offlineSince: Date | null;
  connectionType: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
}

/**
 * 네트워크 상태를 관리하는 훅
 * 
 * @returns NetworkState 
 */
const useNetwork = (): NetworkState => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: navigator.onLine,
    offlineSince: navigator.onLine ? null : new Date(),
    connectionType: null,
    effectiveType: null,
    downlink: null,
    rtt: null
  });
  
  useEffect(() => {
    // 네트워크 정보 업데이트 함수
    const updateNetworkInfo = () => {
      // @ts-ignore - Navigator Connection API는 TypeScript 기본 타입에 없음
      const connection = navigator.connection || 
                        // @ts-ignore
                        navigator.mozConnection || 
                        // @ts-ignore
                        navigator.webkitConnection;
      
      if (connection) {
        setNetworkState(prev => ({
          ...prev,
          connectionType: connection.type || null,
          effectiveType: connection.effectiveType || null,
          downlink: connection.downlink || null,
          rtt: connection.rtt || null
        }));
      }
    };
    
    // 온라인/오프라인 상태 변경 이벤트 핸들러
    const handleOnline = () => {
      setNetworkState(prev => ({
        ...prev,
        isOnline: true,
        offlineSince: null
      }));
      updateNetworkInfo();
    };
    
    const handleOffline = () => {
      setNetworkState(prev => ({
        ...prev,
        isOnline: false,
        offlineSince: new Date()
      }));
    };
    
    // 초기 네트워크 정보 설정
    updateNetworkInfo();
    
    // 이벤트 리스너 등록
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // @ts-ignore
    const connection = navigator.connection || 
                     // @ts-ignore
                     navigator.mozConnection || 
                     // @ts-ignore
                     navigator.webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }
    
    // 클린업
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, []);
  
  return networkState;
};

export default useNetwork; 