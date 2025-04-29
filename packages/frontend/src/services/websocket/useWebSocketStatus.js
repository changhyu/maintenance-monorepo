import { useState, useEffect, useCallback } from 'react';
import { webSocketService, SocketStatus } from './WebSocketService';
import { useNotifications } from '../../context/AppContext';
/**
 * WebSocket 연결 상태 및 통계를 제공하는 훅
 * @returns WebSocket 상태 정보 및 통계
 */
export function useWebSocketStatus() {
    const [status, setStatus] = useState(webSocketService.getStatus());
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [stats, setStats] = useState({
        reconnectCount: 0,
        lastConnected: null,
        lastDisconnected: null,
        uptime: 0,
        isStable: true
    });
    const { addNotification } = useNotifications();
    // 연결 상태 변경 시 처리
    const handleStatusChange = useCallback((newStatus) => {
        setStatus(newStatus);
        // 상태에 따른 통계 업데이트
        setStats(prev => {
            const now = new Date();
            const newStats = { ...prev };
            if (newStatus === SocketStatus.CONNECTED) {
                // 연결 시
                newStats.lastConnected = now;
                if (prev.lastDisconnected !== null) {
                    newStats.reconnectCount += 1;
                }
            }
            else if ((newStatus === SocketStatus.DISCONNECTED || newStatus === SocketStatus.ERROR) &&
                prev.lastConnected !== null) {
                // 연결 해제 시
                newStats.lastDisconnected = now;
                if (prev.lastConnected) {
                    const connectionDuration = now.getTime() - prev.lastConnected.getTime();
                    newStats.uptime += connectionDuration;
                }
            }
            // 5분 내 3회 이상 재연결 시도가 있으면 불안정한 것으로 간주
            const isFrequentReconnect = newStats.reconnectCount >= 3 &&
                prev.lastDisconnected &&
                (now.getTime() - prev.lastDisconnected.getTime() < 5 * 60 * 1000);
            newStats.isStable = !isFrequentReconnect;
            return newStats;
        });
        // 불안정한 연결 상태 알림
        if (status === SocketStatus.CONNECTED && newStatus !== SocketStatus.CONNECTED) {
            addNotification('실시간 연결이 끊어졌습니다. 재연결을 시도합니다.', 'warning');
        }
        else if (stats.reconnectCount > 5 && !stats.isStable) {
            addNotification('네트워크 연결이 불안정합니다. 인터넷 연결을 확인해주세요.', 'error');
        }
    }, [status, stats, addNotification]);
    // 모니터링 시작
    const startMonitoring = useCallback(() => {
        setIsMonitoring(true);
    }, []);
    // 모니터링 중지
    const stopMonitoring = useCallback(() => {
        setIsMonitoring(false);
    }, []);
    // 상태 초기화
    const resetStats = useCallback(() => {
        setStats({
            reconnectCount: 0,
            lastConnected: null,
            lastDisconnected: null,
            uptime: 0,
            isStable: true
        });
    }, []);
    // WebSocket 서비스 상태 구독
    useEffect(() => {
        const unsubscribe = webSocketService.subscribeToStatus(handleStatusChange);
        return unsubscribe;
    }, [handleStatusChange]);
    // 모니터링 로직
    useEffect(() => {
        if (!isMonitoring)
            return;
        const intervalId = setInterval(() => {
            // 현재 연결 중이라면 업타임 업데이트
            if (status === SocketStatus.CONNECTED && stats.lastConnected) {
                setStats(prev => ({
                    ...prev,
                    uptime: prev.uptime + (new Date().getTime() - (prev.lastConnected?.getTime() || 0))
                }));
            }
            // 연결이 끊겼다가 30초 이상 지나면 자동 재연결 시도
            if ((status === SocketStatus.DISCONNECTED || status === SocketStatus.ERROR) &&
                stats.lastDisconnected &&
                (new Date().getTime() - stats.lastDisconnected.getTime() > 30000)) {
                webSocketService.initialize();
            }
        }, 5000); // 5초마다 체크
        return () => clearInterval(intervalId);
    }, [isMonitoring, status, stats]);
    return {
        status,
        isConnected: status === SocketStatus.CONNECTED,
        isConnecting: status === SocketStatus.CONNECTING,
        isDisconnected: status === SocketStatus.DISCONNECTED || status === SocketStatus.ERROR,
        stats,
        startMonitoring,
        stopMonitoring,
        resetStats,
        // 연결 조작 함수도 추가로 제공
        connect: webSocketService.initialize.bind(webSocketService),
        disconnect: webSocketService.disconnect.bind(webSocketService)
    };
}
export default useWebSocketStatus;
