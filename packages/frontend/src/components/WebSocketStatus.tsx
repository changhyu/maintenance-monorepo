import React, { useState, useEffect, useTransition } from 'react';
import { 
  Box, 
  Typography, 
  Chip, 
  Button, 
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  WifiOff as WifiOffIcon,
  Wifi as WifiIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useWebSocket, SocketStatus } from '../services/websocket';

interface WebSocketStatusProps {
  showControls?: boolean;
  onStatusChange?: (connected: boolean) => void;
}

/**
 * WebSocket 연결 상태를 표시하고 제어하는 컴포넌트
 */
const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ 
  showControls = true,
  onStatusChange 
}) => {
  const [alert, setAlert] = useState<{open: boolean, message: string, severity: 'success' | 'error' | 'info'}>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [isPending, startTransition] = useTransition();
  
  // React 19의 useTransition을 활용한 상태 업데이트 최적화
  const { status, isConnected, connect, disconnect } = useWebSocket({
    autoConnect: true,
    onStatusChange: (newStatus) => {
      // 상태 변경 시 비동기 작업을 부드럽게 처리
      startTransition(() => {
        if (newStatus === SocketStatus.CONNECTED) {
          setAlert({
            open: true,
            message: '실시간 서비스에 연결되었습니다.',
            severity: 'success'
          });
          onStatusChange?.(true);
        } else if (newStatus === SocketStatus.DISCONNECTED || newStatus === SocketStatus.ERROR) {
          setAlert({
            open: true,
            message: '실시간 서비스 연결이 종료되었습니다.',
            severity: 'error'
          });
          onStatusChange?.(false);
        }
      });
    }
  });
  
  const handleReconnect = () => {
    connect();
    setAlert({
      open: true,
      message: '실시간 서비스에 재연결 중입니다...',
      severity: 'info'
    });
  };
  
  const handleDisconnect = () => {
    disconnect();
  };
  
  const handleCloseAlert = () => {
    setAlert(prev => ({ ...prev, open: false }));
  };
  
  // 상태에 따른 색상 및 아이콘 결정
  const getStatusInfo = () => {
    switch (status) {
      case SocketStatus.CONNECTED:
        return { color: 'success', icon: <WifiIcon />, text: '연결됨' };
      case SocketStatus.CONNECTING:
        return { color: 'warning', icon: <CircularProgress size={20} />, text: '연결 중' };
      case SocketStatus.ERROR:
        return { color: 'error', icon: <WifiOffIcon />, text: '오류' };
      case SocketStatus.DISCONNECTED:
      default:
        return { color: 'default', icon: <WifiOffIcon />, text: '연결 끊김' };
    }
  };
  
  const statusInfo = getStatusInfo();
  
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip
          icon={statusInfo.icon}
          label={`실시간: ${statusInfo.text}`}
          color={statusInfo.color as any}
          size="small"
          variant="outlined"
        />
        
        {showControls && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {status !== SocketStatus.CONNECTED && (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={handleReconnect}
                disabled={status === SocketStatus.CONNECTING || isPending}
              >
                {status === SocketStatus.CONNECTING || isPending ? (
                  <CircularProgress size={20} />
                ) : (
                  '재연결'
                )}
              </Button>
            )}
            
            {status === SocketStatus.CONNECTED && (
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={handleDisconnect}
                disabled={isPending}
              >
                연결 해제
              </Button>
            )}
          </Box>
        )}
      </Box>
      
      <Snackbar 
        open={alert.open} 
        autoHideDuration={4000} 
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseAlert} 
          severity={alert.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default WebSocketStatus;
