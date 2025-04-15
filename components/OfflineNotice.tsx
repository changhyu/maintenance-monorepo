import React, { useState, useEffect } from 'react';
import { Alert, Snackbar, Typography, Box, useTheme } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';

/**
 * 오프라인 상태를 감지하고 사용자에게 알리는 컴포넌트
 * 
 * 네트워크 연결이 끊어지면 알림을 표시하고, 오프라인 모드로 전환됨을 안내합니다.
 * 연결이 복구되면 자동으로 알림이 사라집니다.
 */
const OfflineNotice: React.FC = () => {
  const theme = useTheme();
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);
  
  useEffect(() => {
    // 오프라인/온라인 상태 변경 감지
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      
      // 3초 후에 재연결 메시지 숨기기
      setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return (
    <>
      {/* 오프라인 상태 알림 - 항상 표시 */}
      {isOffline && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            zIndex: theme.zIndex.appBar + 1,
            bgcolor: 'warning.main',
            color: 'warning.contrastText',
            p: 1,
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <WifiOffIcon />
          <Typography variant="body1">
            인터넷 연결이 끊겼습니다. 오프라인 모드로 작동 중입니다.
          </Typography>
        </Box>
      )}
      
      {/* 재연결 알림 - 일시적으로 표시 */}
      <Snackbar
        open={showReconnected}
        autoHideDuration={3000}
        onClose={() => setShowReconnected(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          인터넷 연결이 복구되었습니다.
        </Alert>
      </Snackbar>
    </>
  );
};

export default OfflineNotice;