import apiClient, { ApiErrorType } from './apiClient';
import { useNotifications } from '../../context/AppContext';
import { useState, useCallback } from 'react';
/**
 * 향상된 API 클라이언트 훅
 * 오류 처리, 재시도, 로딩 상태 관리 등 기능 추가
 */
export function useEnhancedApi() {
    const { addNotification } = useNotifications();
    const [abortControllers] = useState(new Map());
    /**
     * API 요청 래핑 함수
     * @param requestFn API 요청 함수
     * @param options 요청 옵션
     * @returns 요청 상태 및 실행 함수
     */
    const withRequest = (requestFn, options = {}) => {
        const [state, setState] = useState({
            data: null,
            loading: false,
            error: null,
            success: false,
            retryCount: 0,
            abort: () => { }
        });
        // 기본 옵션 설정
        const { maxRetries = 3, retryDelay = 1000, useExponentialBackoff = true, showErrorNotification = true, excludeFromRetry = [
            ApiErrorType.UNAUTHORIZED,
            ApiErrorType.FORBIDDEN,
            ApiErrorType.VALIDATION
        ], queueIfOffline = true } = options;
        /**
         * 요청 실행 함수
         */
        const execute = useCallback(async () => {
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
                        data: response.data,
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
                    const canRetry = state.retryCount < maxRetries &&
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
                        addNotification(error.message || '요청 처리 중 오류가 발생했습니다.', 'error');
                    }
                }
                return response;
            }
            catch (error) {
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
                    addNotification(error instanceof Error
                        ? error.message
                        : '요청 처리 중 예상치 못한 오류가 발생했습니다.', 'error');
                }
                return {
                    success: false,
                    error
                };
            }
            finally {
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
    const get = (url, options) => {
        return withRequest((signal) => apiClient.get(url, { signal }), options);
    };
    /**
     * POST 요청 래핑 함수
     */
    const post = (url, data, options) => {
        return withRequest((signal) => apiClient.post(url, data, { signal }), options);
    };
    /**
     * PUT 요청 래핑 함수
     */
    const put = (url, data, options) => {
        return withRequest((signal) => apiClient.put(url, data, { signal }), options);
    };
    /**
     * PATCH 요청 래핑 함수
     */
    const patch = (url, data, options) => {
        return withRequest((signal) => apiClient.patch(url, data, { signal }), options);
    };
    /**
     * DELETE 요청 래핑 함수
     */
    const del = (url, options) => {
        return withRequest((signal) => apiClient.delete(url, { signal }), options);
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
