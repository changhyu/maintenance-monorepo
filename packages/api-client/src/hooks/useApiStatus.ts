import { useState, useEffect, useCallback } from 'react';
import { ApiClient, ConnectionStatus, OfflineRequest } from '../client';

// API 상태 인터페이스
export interface ApiStatus {
  connectionStatus: ConnectionStatus;
  isOffline: boolean;
  pendingRequests: ReadonlyArray<OfflineRequest>;
  pendingRequestsCount: number;
  lastSyncTime: Date | null;
  syncInProgress: boolean;
}

// API 상태 Hook의 반환 타입
export interface UseApiStatusReturn {
  status: ApiStatus;
  checkConnection: () => Promise<boolean>;
  setOfflineMode: (value: boolean) => void;
  syncOfflineRequests: () => Promise<{ success: number, failed: number }>;
  clearPendingRequests: () => void;
}

/**
 * API 상태 관련 React Hook
 * @param apiClient API 클라이언트 인스턴스
 * @param checkInterval 연결 상태 확인 간격 (ms)
 */
export const useApiStatus = (
  apiClient: ApiClient,
  checkInterval: number = 30000
): UseApiStatusReturn => {
  // API 상태
  const [status, setStatus] = useState<ApiStatus>({
    connectionStatus: apiClient.getConnectionStatus(),
    isOffline: apiClient.isOffline(),
    pendingRequests: [...apiClient.getPendingRequests()],
    pendingRequestsCount: apiClient.getPendingRequestsCount(),
    lastSyncTime: null,
    syncInProgress: false
  });

  // 상태 업데이트 함수
  const updateStatus = useCallback(() => {
    setStatus({
      connectionStatus: apiClient.getConnectionStatus(),
      isOffline: apiClient.isOffline(),
      pendingRequests: [...apiClient.getPendingRequests()],
      pendingRequestsCount: apiClient.getPendingRequestsCount(),
      lastSyncTime: status.lastSyncTime,
      syncInProgress: status.syncInProgress
    });
  }, [apiClient, status.lastSyncTime, status.syncInProgress]);

  // 연결 상태 확인 함수
  const checkConnection = useCallback(async (): Promise<boolean> => {
    const isConnected = await apiClient.checkConnection();
    updateStatus();
    return isConnected;
  }, [apiClient, updateStatus]);

  // 오프라인 모드 설정 함수
  const setOfflineMode = useCallback((value: boolean): void => {
    apiClient.setOfflineMode(value);
    updateStatus();
  }, [apiClient, updateStatus]);

  // 오프라인 요청 동기화 함수
  const syncOfflineRequests = useCallback(async (): Promise<{ success: number, failed: number }> => {
    if (status.syncInProgress) {
      return { success: 0, failed: 0 };
    }
    
    setStatus(prev => ({ ...prev, syncInProgress: true }));
    
    try {
      // 실제 동기화 작업 구현 (여기서는 processPendingRequests 메서드 사용 가정)
      const result = await apiClient.processPendingRequests();
      
      // 동기화 완료 후 상태 업데이트
      setStatus(prev => ({
        ...prev,
        lastSyncTime: new Date(),
        syncInProgress: false,
        pendingRequests: [...apiClient.getPendingRequests()],
        pendingRequestsCount: apiClient.getPendingRequestsCount()
      }));
      
      return result;
    } catch (error) {
      // 동기화 실패 시 상태 업데이트
      setStatus(prev => ({
        ...prev,
        syncInProgress: false,
        pendingRequests: [...apiClient.getPendingRequests()],
        pendingRequestsCount: apiClient.getPendingRequestsCount()
      }));
      
      return { success: 0, failed: 0 };
    }
  }, [apiClient, status.syncInProgress]);

  // 대기 중인 요청 지우기 함수
  const clearPendingRequests = useCallback((): void => {
    apiClient.clearPendingRequests();
    updateStatus();
  }, [apiClient, updateStatus]);

  // 네트워크 상태 변경 이벤트 리스너 등록
  useEffect(() => {
    const handleOnline = () => {
      checkConnection();
    };
    
    const handleOffline = () => {
      setOfflineMode(true);
    };
    
    // 오프라인 모드 변경 이벤트 핸들러
    const handleOfflineModeChanged = (event: CustomEvent) => {
      updateStatus();
    };
    
    // 오프라인 요청 큐 변경 이벤트 핸들러
    const handleOfflineRequestQueued = () => {
      updateStatus();
    };
    
    // 오프라인 동기화 완료 이벤트 핸들러
    const handleOfflineSyncCompleted = (event: CustomEvent) => {
      setStatus(prev => ({
        ...prev,
        lastSyncTime: new Date(),
        syncInProgress: false,
        pendingRequests: [...apiClient.getPendingRequests()],
        pendingRequestsCount: apiClient.getPendingRequestsCount()
      }));
    };
    
    // 이벤트 리스너 등록
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('api:offline-mode-changed', handleOfflineModeChanged as EventListener);
    window.addEventListener('api:offline-request-queued', handleOfflineRequestQueued);
    window.addEventListener('api:offline-sync-completed', handleOfflineSyncCompleted as EventListener);
    
    // 초기 연결 상태 확인
    checkConnection();
    
    // 주기적인 연결 상태 확인 설정
    const intervalId = setInterval(checkConnection, checkInterval);
    
    // 클린업 함수
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('api:offline-mode-changed', handleOfflineModeChanged as EventListener);
      window.removeEventListener('api:offline-request-queued', handleOfflineRequestQueued);
      window.removeEventListener('api:offline-sync-completed', handleOfflineSyncCompleted as EventListener);
    };
  }, [checkConnection, checkInterval, setOfflineMode, updateStatus, apiClient]);

  return {
    status,
    checkConnection,
    setOfflineMode,
    syncOfflineRequests,
    clearPendingRequests
  };
}; 