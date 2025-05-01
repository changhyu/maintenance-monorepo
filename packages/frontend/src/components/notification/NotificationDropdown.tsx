import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Divider,
  CircularProgress,
  useTheme,
  Tooltip
} from '@mui/material';
import {
  NotificationsNone as NotificationIcon,
  CheckCircleOutline as SuccessIcon,
  ErrorOutline as ErrorIcon,
  InfoOutlined as InfoIcon,
  WarningAmber as WarningIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationServiceImpl from '../../services/notificationService';
import type { Notification, NotificationStatus } from '../../types/notification';
import { formatNotificationDate } from '../../utils/notificationUtils';
import ClientOnly from '../utils/ClientOnly';

// NotificationFilter 타입 정의 추가
interface NotificationFilter {
  userId?: string;
  limit?: number;
  status?: string;
}

interface NotificationDropdownProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  maxItems?: number;
  onViewAllClick?: () => void;
  soundEnabled?: boolean;
}

// 알림음 정의 
const NotificationSounds: Record<string, string> = {
  maintenance: '/sounds/maintenance.mp3',
  vehicle: '/sounds/vehicle.mp3',
  system: '/sounds/system.mp3',
  appointment: '/sounds/appointment.mp3',
  service: '/sounds/service.mp3',
  recall: '/sounds/recall.mp3',
  payment: '/sounds/payment.mp3',
  message: '/sounds/message.mp3',
  default: '/sounds/notification.mp3'
};

/**
 * 알림 목록을 표시하는 드롭다운 컴포넌트
 */
const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  userId,
  isOpen,
  onClose,
  maxItems = 5,
  onViewAllClick = () => {}, // 기본값 제공하여 필수 속성이 아니게 함
  soundEnabled: initialSoundEnabled = true
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const theme = useTheme();
  const notificationService = NotificationServiceImpl.getInstance();

  // 오디오 엘리먼트 생성
  useEffect(() => {
    audioRef.current = new Audio(NotificationSounds.default);
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 알림음 재생 함수
  const playNotificationSound = (type = 'system') => {
    if (!soundEnabled || !audioRef.current) {
      return;
    }

    // 소문자로 변환하여 일치 확인
    const soundType = type.toLowerCase();
    const soundUrl = NotificationSounds[soundType] ?? NotificationSounds.default;
    
    audioRef.current.src = soundUrl;
    audioRef.current.play().catch(error => {
      console.error('Failed to play notification sound:', error);
    });
  };

  // 알림 데이터 가져오기
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // notificationService의 올바른 메소드 호출
      const filter: NotificationFilter = { userId, limit: maxItems };
      const response = await notificationService.getNotifications(filter);
      
      // 타입 변환 작업 수행 (types/notification.ts에서 정의한 타입으로 변환)
      const notifications = (response.notifications || []).map((notif: any) => ({
        ...notif,
        // 필요한 경우 추가 필드 변환
        isRead: notif.status === 'read' || notif.isRead
      })) as Notification[];
      
      // 새로운 알림이 있는지 확인
      const hasNewNotifications = notifications.some(
        notification => !notifications.find(n => n.id === notification.id)
      );
      
      if (hasNewNotifications && isOpen) {
        playNotificationSound();
      }
      
      setNotifications(notifications);
    } catch (err) {
      setError('알림을 불러오는데 실패했습니다.');
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // 알림 데이터 불러오기 (dropdown이 열릴 때만)
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, userId, maxItems]);

  // 읽음 표시 처리 
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true, status: 'read' as NotificationStatus }
            : notification
        )
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // 알림 소리 설정 토글
  const handleSoundToggle = () => {
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled) {
      // 소리를 켤 때 테스트 사운드 재생
      playNotificationSound();
    }
  };

  // 알림 상태에 따른 아이콘 표시
  const getStatusIcon = (status: NotificationStatus) => {
    switch (status) {
      case 'success':
        return <SuccessIcon sx={{ color: theme.palette.success.main }} />;
      case 'error':
        return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
      case 'warning':
        return <WarningIcon sx={{ color: theme.palette.warning.main }} />;
      case 'info':
      default:
        return <InfoIcon sx={{ color: theme.palette.info.main }} />;
    }
  };

  // 정적 알림 목록 렌더링 (SSG 용)
  const renderStaticNotificationList = () => (
    <List sx={{ p: 0, maxHeight: 360, overflowY: 'auto' }}>
      {notifications.map((notification, index) => (
        <React.Fragment key={`static-${notification.id}`}>
          <ListItem
            sx={{
              bgcolor: notification.isRead ? 'transparent' : 'action.hover',
              '&:hover': {
                bgcolor: 'action.selected'
              }
            }}
            onClick={() => handleMarkAsRead(notification.id)}
          >
            <ListItemIcon>
              {getStatusIcon(notification.status)}
            </ListItemIcon>
            <ListItemText
              primary={notification.title}
              secondary={
                <>
                  <Typography
                    component="span"
                    variant="body2"
                    color="textSecondary"
                    sx={{ display: 'block' }}
                  >
                    {notification.message}
                  </Typography>
                  <Typography
                    component="span"
                    variant="caption"
                    color="textSecondary"
                  >
                    {formatNotificationDate(notification.createdAt)}
                  </Typography>
                </>
              }
            />
          </ListItem>
          {index < notifications.length - 1 && (
            <Divider variant="inset" component="li" />
          )}
        </React.Fragment>
      ))}
    </List>
  );

  // 조건부 렌더링을 위한 상태 변수들
  const showLoading = loading;
  const showError = !loading && error;
  const showEmpty = !loading && !error && notifications.length === 0;
  const showNotifications = !loading && !error && notifications.length > 0;

  return (
    <>
      <IconButton
        ref={anchorRef}
        onClick={() => !isOpen && onClose()}
        sx={{ color: theme.palette.text.primary }}
      >
        <Badge
          badgeContent={notifications.filter(n => !n.isRead).length}
          color="error"
          overlap="circular"
        >
          <NotificationIcon />
        </Badge>
      </IconButton>

      <Popover
        open={isOpen}
        anchorEl={anchorRef.current}
        onClose={onClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxHeight: 480,
              overflow: 'hidden',
              borderRadius: 2,
              boxShadow: theme.shadows[8]
            }
          }
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="h2">
              알림
            </Typography>
            <Tooltip title={soundEnabled ? '알림 소리 끄기' : '알림 소리 켜기'}>
              <IconButton size="small" onClick={handleSoundToggle}>
                {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {showLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        
        {showError && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
            <Button onClick={fetchNotifications} sx={{ mt: 1 }}>
              다시 시도
            </Button>
          </Box>
        )}
        
        {showEmpty && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">
              새로운 알림이 없습니다.
            </Typography>
          </Box>
        )}
        
        {showNotifications && (
          <>
            <ClientOnly fallback={renderStaticNotificationList()}>
              <List sx={{ p: 0, maxHeight: 360, overflowY: 'auto' }}>
                <AnimatePresence>
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <ListItem
                        sx={{
                          bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                          '&:hover': {
                            bgcolor: 'action.selected'
                          }
                        }}
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <ListItemIcon>
                          {getStatusIcon(notification.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={notification.title}
                          secondary={
                            <>
                              <Typography
                                component="span"
                                variant="body2"
                                color="textSecondary"
                                sx={{ display: 'block' }}
                              >
                                {notification.message}
                              </Typography>
                              <Typography
                                component="span"
                                variant="caption"
                                color="textSecondary"
                              >
                                {formatNotificationDate(notification.createdAt)}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                      {index < notifications.length - 1 && (
                        <Divider variant="inset" component="li" />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </List>
            </ClientOnly>

            {onViewAllClick && (
              <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
                <Button
                  fullWidth
                  onClick={onViewAllClick}
                  sx={{ textTransform: 'none' }}
                >
                  모든 알림 보기
                </Button>
              </Box>
            )}
          </>
        )}
      </Popover>
    </>
  );
};

export default NotificationDropdown;
