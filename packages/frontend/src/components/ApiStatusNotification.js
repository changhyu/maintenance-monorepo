import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Alert, Snackbar, IconButton } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import SyncIcon from '@mui/icons-material/Sync';
import CloseIcon from '@mui/icons-material/Close';
import apiClient from '../api-client';
/**
 * API 연결 상태를 표시하는 알림 컴포넌트
 */
const ApiStatusNotification = ({ autoHideDuration = 5000, alwaysShowOffline = true, position = { vertical: 'bottom', horizontal: 'left' } }) => {
    // 연결 상태
    const [connectionStatus, setConnectionStatus] = useState(apiClient.getConnectionStatus());
    // 알림 표시 여부
    const [open, setOpen] = useState(false);
    // 메시지
    const [message, setMessage] = useState('');
    // 동기화 진행 상태
    const [syncState, setSyncState] = useState({
        inProgress: false
    });
    // 연결 상태 변경 감지
    useEffect(() => {
        const handleOfflineModeChanged = (event) => {
            const customEvent = event;
            const isOffline = customEvent.detail.offline;
            setConnectionStatus(isOffline ? 'disconnected' : 'connected');
            setMessage(isOffline
                ? '오프라인 모드로 전환되었습니다. 일부 기능이 제한됩니다.'
                : '온라인 모드로 복원되었습니다.');
            setOpen(true);
        };
        // API 알림 이벤트 핸들러
        const handleApiNotification = (event) => {
            const customEvent = event;
            setMessage(customEvent.detail.message);
            setOpen(true);
        };
        // 동기화 완료 이벤트 핸들러
        const handleSyncCompleted = (event) => {
            const customEvent = event;
            const { success, failed, remaining } = customEvent.detail;
            setSyncState({
                inProgress: false,
                success,
                failed,
                remaining
            });
            if (success > 0 || failed > 0) {
                setMessage(`동기화 완료: ${success}개 성공, ${failed}개 실패, ${remaining}개 남음`);
                setOpen(true);
            }
        };
        // 동기화 시작 시 상태 업데이트
        const handleSyncStarted = () => {
            setSyncState({
                inProgress: true
            });
            setMessage('오프라인 작업 동기화 중...');
            setOpen(true);
        };
        // WebSocket 연결 이벤트 핸들러
        const handleSocketConnected = () => {
            setConnectionStatus('connected');
            setMessage('실시간 알림 서버에 연결되었습니다.');
            setOpen(true);
        };
        const handleSocketDisconnected = (event) => {
            const customEvent = event;
            setConnectionStatus('disconnected');
            setMessage(`실시간 알림 서버와 연결이 끊어졌습니다: ${customEvent.detail.reason}`);
            setOpen(true);
        };
        const handleSocketReconnecting = (event) => {
            const customEvent = event;
            setConnectionStatus('reconnecting');
            setMessage(`실시간 알림 서버에 재연결 중... (${customEvent.detail.attempt}/${customEvent.detail.max})`);
            setOpen(true);
        };
        const handleSocketReconnectFailed = () => {
            setConnectionStatus('disconnected');
            setMessage('실시간 알림 서버 재연결에 실패했습니다. 페이지를 새로고침해 주세요.');
            setOpen(true);
        };
        // 이벤트 리스너 등록
        window.addEventListener('api:offline-mode-changed', handleOfflineModeChanged);
        window.addEventListener('api:notification', handleApiNotification);
        window.addEventListener('api:sync-completed', handleSyncCompleted);
        window.addEventListener('api:sync-started', handleSyncStarted);
        // WebSocket 이벤트 리스너 등록
        window.addEventListener('notification:connected', handleSocketConnected);
        window.addEventListener('notification:disconnected', handleSocketDisconnected);
        window.addEventListener('notification:reconnecting', handleSocketReconnecting);
        window.addEventListener('notification:reconnect_failed', handleSocketReconnectFailed);
        // 초기 상태 설정
        setConnectionStatus(apiClient.getConnectionStatus());
        setOpen(apiClient.isOffline() && alwaysShowOffline);
        if (apiClient.isOffline()) {
            setMessage('오프라인 모드에서 작업 중입니다. 일부 기능이 제한됩니다.');
        }
        // 이벤트 리스너 정리
        return () => {
            window.removeEventListener('api:offline-mode-changed', handleOfflineModeChanged);
            window.removeEventListener('api:notification', handleApiNotification);
            window.removeEventListener('api:sync-completed', handleSyncCompleted);
            window.removeEventListener('api:sync-started', handleSyncStarted);
            // WebSocket 이벤트 리스너 제거
            window.removeEventListener('notification:connected', handleSocketConnected);
            window.removeEventListener('notification:disconnected', handleSocketDisconnected);
            window.removeEventListener('notification:reconnecting', handleSocketReconnecting);
            window.removeEventListener('notification:reconnect_failed', handleSocketReconnectFailed);
        };
    }, [alwaysShowOffline]);
    // 알림 닫기
    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        // 오프라인 상태에서 항상 표시 옵션이 켜져 있으면 닫지 않음
        if (connectionStatus === 'disconnected' && alwaysShowOffline) {
            return;
        }
        setOpen(false);
    };
    // 동기화 시작
    const handleSync = async () => {
        if (connectionStatus === 'connected') {
            setSyncState({
                inProgress: true
            });
            try {
                const result = await apiClient.syncOfflineOperations();
                setSyncState({
                    inProgress: false,
                    ...result
                });
                setMessage(`동기화 완료: ${result.success}개 성공, ${result.failed}개 실패`);
            }
            catch (error) {
                setSyncState({
                    inProgress: false
                });
                setMessage('동기화 중 오류가 발생했습니다.');
            }
        }
    };
    // 연결 상태에 따른 색상과 아이콘 설정
    const severity = connectionStatus === 'connected' ? 'success' :
        connectionStatus === 'disconnected' ? 'warning' :
            connectionStatus === 'reconnecting' ? 'info' :
                'info';
    const icon = connectionStatus === 'connected' ? _jsx(CloudDoneIcon, {}) :
        connectionStatus === 'disconnected' ? _jsx(WifiOffIcon, {}) :
            null;
    // 동기화 버튼 표시 조건 - 연결됨 상태이고 동기화할 항목이 있을 때만 표시
    const showSyncButton = connectionStatus === 'connected' &&
        syncState.remaining !== undefined &&
        syncState.remaining > 0;
    return (_jsx(Snackbar, { anchorOrigin: {
            vertical: position.vertical,
            horizontal: position.horizontal
        }, open: open, autoHideDuration: (connectionStatus === 'disconnected' || connectionStatus === 'reconnecting') && alwaysShowOffline
            ? null
            : autoHideDuration, onClose: handleClose, children: _jsx(Alert, { severity: severity, icon: syncState.inProgress || connectionStatus === 'reconnecting' ? _jsx(SyncIcon, { className: "spin" }) : icon, action: _jsxs(_Fragment, { children: [showSyncButton && (_jsx(IconButton, { size: "small", color: "inherit", onClick: handleSync, disabled: syncState.inProgress || connectionStatus === 'reconnecting', children: _jsx(SyncIcon, {}) })), _jsx(IconButton, { size: "small", "aria-label": "close", color: "inherit", onClick: handleClose, children: _jsx(CloseIcon, { fontSize: "small" }) })] }), sx: {
                width: '100%',
                '& .spin': {
                    animation: 'spin 2s linear infinite',
                    '@keyframes spin': {
                        '0%': {
                            transform: 'rotate(0deg)',
                        },
                        '100%': {
                            transform: 'rotate(360deg)',
                        },
                    },
                }
            }, children: message }) }));
};
export default ApiStatusNotification;
