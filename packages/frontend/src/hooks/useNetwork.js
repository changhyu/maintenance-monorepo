import { useCallback, useMemo, useSyncExternalStore } from 'react';
/**
 * 네트워크 상태를 관리하는 훅 (React 19 최적화)
 *
 * @returns NetworkState
 */
const useNetwork = () => {
    // 네트워크 정보 업데이트 함수
    const getNetworkInfo = useCallback(() => {
        // 연결 API 가져오기
        const nav = navigator;
        const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
        const state = {
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
    const subscribe = useCallback((callback) => {
        const handleOnline = () => callback();
        const handleOffline = () => callback();
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        // 연결 API 가져오기
        const nav = navigator;
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
