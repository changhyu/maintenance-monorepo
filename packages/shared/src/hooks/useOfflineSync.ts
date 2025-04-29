/**
 * 오프라인 동기화 훅
 * 
 * 오프라인 모드에서 저장된 요청을 온라인 상태가 되면 서버와 동기화하는 기능을 제공합니다.
 */

import { useState, useEffect, useCallback } from 'react';
import offlineStorage, { OfflineRequest } from '../utils/offlineStorage';
import { ApiClient } from '../components/common/OfflineIndicator';

/**
 * 확장된 API 클라이언트 인터페이스
 * 여기서는 ApiClient 타입을 직접 만족시키지 않고, 필요한 HTTP 메서드가 있는 객체로 재정의합니다.
 */
interface ExtendedApiClient {
  get: (url: string, config?: Record<string, unknown>) => Promise<unknown>;
  post: (url: string, data?: unknown, config?: Record<string, unknown>) => Promise<unknown>;
  put: (url: string, data?: unknown, config?: Record<string, unknown>) => Promise<unknown>;
  patch: (url: string, data?: unknown, config?: Record<string, unknown>) => Promise<unknown>;
  delete: (url: string, config?: Record<string, unknown>) => Promise<unknown>;
  request?: (url: string, options?: Record<string, unknown>) => Promise<unknown>; // 원래 ApiClient의 메서드
  syncOfflineData?: () => Promise<unknown>; // 원래 ApiClient의 메서드
}

export interface UseOfflineSyncOptions {
  /**
   * 자동 동기화 활성화 여부
   */
  autoSync?: boolean;
  
  /**
   * 네트워크 상태 확인 간격 (ms)
   */
  checkInterval?: number;
  
  /**
   * API 클라이언트 인스턴스
   */
  apiClient?: ExtendedApiClient;
  
  /**
   * 동기화 성공 시 콜백
   */
  onSyncSuccess?: (results: SyncResult) => void;
  
  /**
   * 동기화 실패 시 콜백
   */
  onSyncError?: (error: Error) => void;
}

export interface SyncResult {
  /**
   * 성공 여부
   */
  success: boolean;
  
  /**
   * 처리된 요청 수
   */
  processed: number;
  
  /**
   * 실패한 요청 수
   */
  failed: number;
  
  /**
   * 동기화 시간
   */
  syncTime: number;
}

/**
 * 오프라인 동기화 훅
 */
export function useOfflineSync(options: UseOfflineSyncOptions = {}) {
  const {
    autoSync = true,
    checkInterval = 10000, // 10초
    apiClient,
    onSyncSuccess,
    onSyncError,
  } = options;
  
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncResults, setSyncResults] = useState<SyncResult | null>(null);
  
  /**
   * 보류 중인 요청 수 업데이트
   */
  const updatePendingCount = useCallback(async () => {
    const pendingRequests = await offlineStorage.getPendingRequests();
    setPendingCount(pendingRequests.length);
  }, []);
  
  /**
   * 오프라인 요청 동기화
   */
  const syncOfflineRequests = useCallback(async () => {
    if (!apiClient || !isOnline || isSyncing) {
      return;
    }
    
    setIsSyncing(true);
    
    try {
      const startTime = Date.now();
      const pendingRequests = await offlineStorage.getPendingRequests();
      
      // 동기화할 요청이 없으면 종료
      if (pendingRequests.length === 0) {
        setIsSyncing(false);
        return;
      }
      
      let processed = 0;
      let failed = 0;
      
      // 요청 순서대로 처리 (병렬 처리가 필요하면 Promise.all 사용)
      for (const request of pendingRequests) {
        try {
          // 요청 처리
          await processRequest(request, apiClient);
          
          // 요청 삭제
          await offlineStorage.removeRequest(request.id);
          processed++;
        } catch (error) {
          console.error('오프라인 요청 동기화 오류:', error);
          failed++;
          
          // 재시도 횟수 초과 시 요청 삭제
          if (request.retryCount >= request.maxRetries) {
            await offlineStorage.removeRequest(request.id);
          } else {
            // 재시도 횟수 증가
            request.retryCount += 1;
            await offlineStorage.saveRequest(request);
          }
        }
      }
      
      const endTime = Date.now();
      const syncTime = endTime - startTime;
      
      const result: SyncResult = {
        success: failed === 0,
        processed,
        failed,
        syncTime,
      };
      
      setSyncResults(result);
      setLastSyncTime(endTime);
      
      // 콜백 호출
      onSyncSuccess?.(result);
      
      // 보류 중인 요청 수 업데이트
      await updatePendingCount();
    } catch (error) {
      console.error('동기화 프로세스 오류:', error);
      onSyncError?.(error as Error);
    } finally {
      setIsSyncing(false);
    }
  }, [apiClient, isOnline, isSyncing, onSyncError, onSyncSuccess, updatePendingCount]);
  
  /**
   * 오프라인 요청 처리
   */
  const processRequest = async (request: OfflineRequest, apiClient: ExtendedApiClient): Promise<unknown> => {
    const { url, method, data, headers } = request;
    
    const config = {
      headers,
    };
    
    switch (method.toLowerCase()) {
      case 'get':
        return apiClient.get(url, config);
      case 'post':
        return apiClient.post(url, data, config);
      case 'put':
        return apiClient.put(url, data, config);
      case 'patch':
        return apiClient.patch(url, data, config);
      case 'delete':
        return apiClient.delete(url, config);
      default:
        throw new Error(`지원하지 않는 HTTP 메소드: ${method}`);
    }
  };
  
  /**
   * 네트워크 상태 변경 이벤트 핸들러
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (autoSync) {
        syncOfflineRequests();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    // 이벤트 리스너 등록
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // 초기 보류 중인 요청 수 확인
    updatePendingCount();
    
    // 주기적인 온라인 상태 확인 및 동기화
    let intervalId: number;
    
    if (autoSync) {
      intervalId = window.setInterval(() => {
        if (navigator.onLine && !isSyncing) {
          syncOfflineRequests();
        }
      }, checkInterval);
    }
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoSync, checkInterval, isSyncing, syncOfflineRequests, updatePendingCount]);
  
  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncResults,
    syncOfflineRequests,
    updatePendingCount,
  };
}

export default useOfflineSync;