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
  Switch,
  FormControlLabel,
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

import { notificationService } from '../../services/notificationService';
import { Notification, NotificationStatus, NotificationType } from '../../types/notification';
import {
  formatNotificationDate,
  getNotificationIcon,
  getNotificationColor
} from '../../utils/notificationUtils';

interface NotificationDropdownProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  maxItems?: number;
  onViewAllClick?: () => void;
  soundEnabled?: boolean;
}

const NotificationSounds = {
  [NotificationType.MAINTENANCE]: '/sounds/maintenance.mp3',
  [NotificationType.VEHICLE]: '/sounds/vehicle.mp3',
  [NotificationType.SYSTEM]: '/sounds/system.mp3',
  [NotificationType.APPOINTMENT]: '/sounds/appointment.mp3',
  [NotificationType.SERVICE]: '/sounds/service.mp3',
  [NotificationType.RECALL]: '/sounds/recall.mp3',
  [NotificationType.PAYMENT]: '/sounds/payment.mp3',
  [NotificationType.MESSAGE]: '/sounds/message.mp3',
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
  onViewAllClick,
  soundEnabled: initialSoundEnabled = true
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const theme = useTheme();

  useEffect(() => {
    // 오디오 엘리먼트 생성
    audioRef.current = new Audio(NotificationSounds.default);
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playNotificationSound = (type: NotificationType = NotificationType.SYSTEM) => {
    if (!soundEnabled || !audioRef.current) return;

    const soundUrl = NotificationSounds[type] || NotificationSounds.default;
    audioRef.current.src = soundUrl;
    audioRef.current.play().catch(error => {
      console.error('Failed to play notification sound:', error);
    });
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationService.getNotifications(userId, maxItems);
      
      // 새로운 알림이 있는지 확인
      const hasNewNotifications = data.some(
        notification => !notifications.find(n => n.id === notification.id)
      );
      
      if (hasNewNotifications && isOpen) {
        playNotificationSound();
      }
      
      setNotifications(data);
    } catch (err) {
      setError('알림을 불러오는데 실패했습니다.');
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, userId, maxItems]);

  // 실시간 알림 구독
  useEffect(() => {
    const handleNewNotification = (notification: Notification) => {
      setNotifications(prev => {
        const isNew = !prev.find(n => n.id === notification.id);
        if (isNew) {
          playNotificationSound(notification.type);
          return [notification, ...prev].slice(0, maxItems);
        }
        return prev;
      });
    };

    if (userId) {
      notificationService.subscribeToNotifications(userId, handleNewNotification);
    }

    return () => {
      notificationService.unsubscribeFromNotifications();
    };
  }, [userId, maxItems, soundEnabled]);

  const getStatusIcon = (status: NotificationStatus) => {
    switch (status) {
      case NotificationStatus.SUCCESS:
        return <SuccessIcon sx={{ color: theme.palette.success.main }} />;
      case NotificationStatus.ERROR:
        return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
      case NotificationStatus.WARNING:
        return <WarningIcon sx={{ color: theme.palette.warning.main }} />;
      case NotificationStatus.INFO:
      default:
        return <InfoIcon sx={{ color: theme.palette.info.main }} />;
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleSoundToggle = () => {
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled) {
      // 소리를 켤 때 테스트 사운드 재생
      playNotificationSound();
    }
  };

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
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 480,
            overflow: 'hidden',
            borderRadius: 2,
            boxShadow: theme.shadows[8]
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

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
            <Button onClick={fetchNotifications} sx={{ mt: 1 }}>
              다시 시도
            </Button>
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">
              새로운 알림이 없습니다.
            </Typography>
          </Box>
        ) : (
          <>
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
                      button
                      onClick={() => handleMarkAsRead(notification.id)}
                      sx={{
                        bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                        '&:hover': {
                          bgcolor: 'action.selected'
                        }
                      }}
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
