import React from 'react';
import { Alert, Snackbar, Stack, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNotifications } from '../context/AppContext';
import { useTranslation } from 'react-i18next';

/**
 * 전역 알림 센터 컴포넌트
 * AppContext의 notifications 상태를 활용하여 알림을 표시합니다.
 */
const NotificationCenter: React.FC = () => {
  const { notifications, clearNotification } = useNotifications();
  const { t } = useTranslation();

  // 알림 종료 핸들러
  const handleClose = (id: string) => {
    clearNotification(id);
  };

  // 액션 버튼
  const action = (id: string) => (
    <IconButton
      size="small"
      aria-label={t('common.close')}
      color="inherit"
      onClick={() => handleClose(id)}
    >
      <CloseIcon fontSize="small" />
    </IconButton>
  );

  // 알림이 없으면 렌더링하지 않음
  if (notifications.length === 0) {
    return null;
  }

  return (
    <Stack spacing={2} sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 2000 }}>
      {notifications.map(notification => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={6000}
          onClose={() => handleClose(notification.id)}
          action={action(notification.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ position: 'static' }}
        >
          <Alert
            elevation={6}
            variant="filled"
            onClose={() => handleClose(notification.id)}
            severity={notification.type}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  );
};

export default NotificationCenter; 