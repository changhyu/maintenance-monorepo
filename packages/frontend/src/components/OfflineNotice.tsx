import React from 'react';
import { Alert, Snackbar } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useTranslation } from 'react-i18next';

/**
 * 오프라인 상태를 알리는 알림 컴포넌트
 * 네트워크 연결이 끊어졌을 때 사용자에게 알려줍니다.
 */
const OfflineNotice: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <Snackbar
      open={true}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ position: 'fixed', top: '0px', width: '100%' }}
    >
      <Alert 
        icon={<WifiOffIcon />}
        severity="warning" 
        variant="filled"
        sx={{ 
          width: '100%', 
          borderRadius: 0,
          justifyContent: 'center'
        }}
      >
        {t('notifications.offline')}
      </Alert>
    </Snackbar>
  );
};

export default OfflineNotice;
