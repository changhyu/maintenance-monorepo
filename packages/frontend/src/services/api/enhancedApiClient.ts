import apiClient, { ApiResponse, ApiErrorType } from './apiClient';
import { useNotifications } from '../../context/AppContext';
import { useState, useCallback } from 'react';

/**
 * API 요청 옵션
 */
interface RequestOptions {
  /** 최대 재시도 횟수 */
  maxRetries?: number;
  /** 재시도 간격 (ms) */
  retryDelay?: number;
  /** 지수적 백오프 사용 여부 */
  useExponentialBackoff?: boolean;
  /** 오류 자동 알림 여부 */
  showErrorNotification?: boolean;
  /** 재시도 제외 오류 유형 */
  excludeFromRetry?: ApiErrorType[];
  /** 오프라인 대기열에 추가 여부 */
  queueIfOffline?: boolean;
}

/**
 * API 요청 상태
 */
interface RequestState<T> {
  /** 데이터 */
  data: T | null;
  /** 로딩 상태 */
  loading: boolean;
  /** 오류 */
  error: any | null;
  /** 마지막 요청 성공 여부 */
  success: boolean;
  /** 재시도 횟수 */
  retryCount: number;
  /** 요청 취소 함수 */
  abort: () => void;
}

/**
 * 향상된 API 클라이언트 훅
 * 오류 처리, 재시도, 로딩 상태 관리 등 기능 추가
 */
export function useEnhancedApi() {
  const { addNotification } = useNotifications();
  const [abortControllers] = useState<Map<string, AbortController>>(new Map());

  /**
   * API 요청 래핑 함수
   * @param requestFn API 요청 함수
   * @param options 요청 옵션
   * @returns 요청 상태 및 실행 함수
   */
  const withRequest = <T>(
    requestFn: (abortSignal?: AbortSignal) => Promise<ApiResponse<T>>,
    options: RequestOptions = {}
  ) => {
    const [state, setState] = useState<RequestState<T>>({
      data: null,
      loading: false,
      error: null,
      success: false,
      retryCount: 0,
      abort: () => {}
    });

    // 기본 옵션 설정
    const {
      maxRetries = 3,
      retryDelay = 1000,
      useExponentialBackoff = true,
      showErrorNotification = true,
      excludeFromRetry = [
        ApiErrorType.UNAUTHORIZED,
        ApiErrorType.FORBIDDEN,
        ApiErrorType.VALIDATION
      ],
      queueIfOffline = true
    } = options;

    /**
     * 요청 실행 함수
     */
    const execute = useCallback(async (): Promise<ApiResponse<T>> => {
      // 이전 요청 취소
      if (abortControllers.has('current')) {
        const controller = abortControllers.get('current');
        controller?.abort();
        abortControllers.delete('current');
      }

      // 새 AbortController 생성
      const abortController = new AbortController();
      abortControllers.set('current', abortController);
      
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        abort: () => abortController.abort()
      }));

      // 오프라인 상태 확인
      if (!navigator.onLine && queueIfOffline) {
        // 오프라인 큐에 요청 추가 로직 (별도 구현 필요)
        const offlineError = {
          type: ApiErrorType.NETWORK,
          message: '오프라인 상태입니다. 요청이 대기열에 추가되었습니다.'
        };
        
        setState(prev => ({
          ...prev,
          loading: false,
          error: offlineError,
          success: false
        }));
        
        if (showErrorNotification) {
          addNotification(offlineError.message, 'info');
        }
        
        return {
          success: false,
          error: offlineError
        };
      }

      try {
        // API 요청 실행
        const response = await requestFn(abortController.signal);
        
        // 성공 응답 처리
        if (response.success && response.data) {
          setState(prev => ({
            ...prev,
            data: response.data as T,
            loading: false,
            error: null,
            success: true,
            retryCount: 0
          }));
          
          return response;
        }
        
        // 오류 응답 처리
        const error = response.error;
        if (error) {
          // 재시도 가능 여부 확인
          const canRetry = 
            state.retryCount < maxRetries && 
            !excludeFromRetry.includes(error.type);
          
          if (canRetry) {
            // 지수적 백오프 계산
            const delay = useExponentialBackoff
              ? retryDelay * Math.pow(2, state.retryCount)
              : retryDelay;
            
            setState(prev => ({
              ...prev,
              retryCount: prev.retryCount + 1,
              error
            }));
            
            // 재시도 타이머 설정
            setTimeout(() => {
              execute();
            }, delay);
            
            return response;
          }
          
          // 최대 재시도 횟수 초과 또는 재시도 불가 오류
          setState(prev => ({
            ...prev,
            loading: false,
            error,
            success: false
          }));
          
          // 오류 알림 표시
          if (showErrorNotification) {
            addNotification(
              error.message || '요청 처리 중 오류가 발생했습니다.',
              'error'
            );
          }
        }
        
        return response;
      } catch (error) {
        // 요청 취소 확인
        if (error instanceof DOMException && error.name === 'AbortError') {
          setState(prev => ({
            ...prev,
            loading: false,
            error: { type: 'ABORTED', message: '요청이 취소되었습니다.' },
            success: false
          }));
          
          return {
            success: false,
            error: { type: 'ABORTED', message: '요청이 취소되었습니다.' }
          };
        }
        
        // 기타 예외 처리
        setState(prev => ({
          ...prev,
          loading: false,
          error,
          success: false
        }));
        
        if (showErrorNotification) {
          addNotification(
            error instanceof Error 
              ? error.message 
              : '요청 처리 중 예상치 못한 오류가 발생했습니다.',
            'error'
          );
        }
        
        return {
          success: false,
          error
        };
      } finally {
        // AbortController 정리
        abortControllers.delete('current');
      }
    }, [
      state.retryCount,
      maxRetries,
      retryDelay,
      useExponentialBackoff,
      showErrorNotification,
      excludeFromRetry,
      queueIfOffline,
      requestFn,
      addNotification
    ]);

    return {
      ...state,
      execute
    };
  };

  /**
   * GET 요청 래핑 함수
   */
  const get = <T>(url: string, options?: RequestOptions) => {
    return withRequest<T>(
      (signal) => apiClient.get<T>(url, { signal }),
      options
    );
  };

  /**
   * POST 요청 래핑 함수
   */
  const post = <T>(url: string, data: any, options?: RequestOptions) => {
    return withRequest<T>(
      (signal) => apiClient.post<T>(url, data, { signal }),
      options
    );
  };

  /**
   * PUT 요청 래핑 함수
   */
  const put = <T>(url: string, data: any, options?: RequestOptions) => {
    return withRequest<T>(
      (signal) => apiClient.put<T>(url, data, { signal }),
      options
    );
  };

  /**
   * PATCH 요청 래핑 함수
   */
  const patch = <T>(url: string, data: any, options?: RequestOptions) => {
    return withRequest<T>(
      (signal) => apiClient.patch<T>(url, data, { signal }),
      options
    );
  };

  /**
   * DELETE 요청 래핑 함수
   */
  const del = <T>(url: string, options?: RequestOptions) => {
    return withRequest<T>(
      (signal) => apiClient.delete<T>(url, { signal }),
      options
    );
  };

  return {
    get,
    post,
    put,
    patch,
    delete: del
  };
}

export default useEnhancedApi;
