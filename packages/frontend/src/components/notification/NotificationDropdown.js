import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef } from 'react';
import { Box, Typography, IconButton, Badge, Popover, List, ListItem, ListItemText, ListItemIcon, Button, Divider, CircularProgress, useTheme, Tooltip } from '@mui/material';
import { NotificationsNone as NotificationIcon, CheckCircleOutline as SuccessIcon, ErrorOutline as ErrorIcon, InfoOutlined as InfoIcon, WarningAmber as WarningIcon, VolumeUp as VolumeUpIcon, VolumeOff as VolumeOffIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationService } from '../../services/notificationService';
import { NotificationStatus, NotificationType } from '../../types/notification';
import { formatNotificationDate } from '../../utils/notificationUtils';
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
const NotificationDropdown = ({ userId, isOpen, onClose, maxItems = 5, onViewAllClick, soundEnabled: initialSoundEnabled = true }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
    const anchorRef = useRef(null);
    const audioRef = useRef(null);
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
    const playNotificationSound = (type = NotificationType.SYSTEM) => {
        if (!soundEnabled || !audioRef.current)
            return;
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
            const hasNewNotifications = data.some(notification => !notifications.find(n => n.id === notification.id));
            if (hasNewNotifications && isOpen) {
                playNotificationSound();
            }
            setNotifications(data);
        }
        catch (err) {
            setError('알림을 불러오는데 실패했습니다.');
            console.error('Failed to fetch notifications:', err);
        }
        finally {
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
        const handleNewNotification = (notification) => {
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
    const getStatusIcon = (status) => {
        switch (status) {
            case NotificationStatus.SUCCESS:
                return _jsx(SuccessIcon, { sx: { color: theme.palette.success.main } });
            case NotificationStatus.ERROR:
                return _jsx(ErrorIcon, { sx: { color: theme.palette.error.main } });
            case NotificationStatus.WARNING:
                return _jsx(WarningIcon, { sx: { color: theme.palette.warning.main } });
            case NotificationStatus.INFO:
            default:
                return _jsx(InfoIcon, { sx: { color: theme.palette.info.main } });
        }
    };
    const handleMarkAsRead = async (notificationId) => {
        try {
            await notificationService.markAsRead(notificationId);
            setNotifications(prevNotifications => prevNotifications.map(notification => notification.id === notificationId
                ? { ...notification, isRead: true }
                : notification));
        }
        catch (err) {
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
    return (_jsxs(_Fragment, { children: [_jsx(IconButton, { ref: anchorRef, onClick: () => !isOpen && onClose(), sx: { color: theme.palette.text.primary }, children: _jsx(Badge, { badgeContent: notifications.filter(n => !n.isRead).length, color: "error", overlap: "circular", children: _jsx(NotificationIcon, {}) }) }), _jsxs(Popover, { open: isOpen, anchorEl: anchorRef.current, onClose: onClose, anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'right',
                }, transformOrigin: {
                    vertical: 'top',
                    horizontal: 'right',
                }, PaperProps: {
                    sx: {
                        width: 360,
                        maxHeight: 480,
                        overflow: 'hidden',
                        borderRadius: 2,
                        boxShadow: theme.shadows[8]
                    }
                }, children: [_jsx(Box, { sx: { p: 2, borderBottom: 1, borderColor: 'divider' }, children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Typography, { variant: "h6", component: "h2", children: "\uC54C\uB9BC" }), _jsx(Tooltip, { title: soundEnabled ? '알림 소리 끄기' : '알림 소리 켜기', children: _jsx(IconButton, { size: "small", onClick: handleSoundToggle, children: soundEnabled ? _jsx(VolumeUpIcon, {}) : _jsx(VolumeOffIcon, {}) }) })] }) }), loading ? (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', p: 3 }, children: _jsx(CircularProgress, { size: 24 }) })) : error ? (_jsxs(Box, { sx: { p: 3, textAlign: 'center' }, children: [_jsx(Typography, { color: "error", children: error }), _jsx(Button, { onClick: fetchNotifications, sx: { mt: 1 }, children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] })) : notifications.length === 0 ? (_jsx(Box, { sx: { p: 3, textAlign: 'center' }, children: _jsx(Typography, { color: "textSecondary", children: "\uC0C8\uB85C\uC6B4 \uC54C\uB9BC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." }) })) : (_jsxs(_Fragment, { children: [_jsx(List, { sx: { p: 0, maxHeight: 360, overflowY: 'auto' }, children: _jsx(AnimatePresence, { children: notifications.map((notification, index) => (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, scale: 0.95 }, transition: { duration: 0.2, delay: index * 0.05 }, children: [_jsxs(ListItem, { button: true, onClick: () => handleMarkAsRead(notification.id), sx: {
                                                    bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                                                    '&:hover': {
                                                        bgcolor: 'action.selected'
                                                    }
                                                }, children: [_jsx(ListItemIcon, { children: getStatusIcon(notification.status) }), _jsx(ListItemText, { primary: notification.title, secondary: _jsxs(_Fragment, { children: [_jsx(Typography, { component: "span", variant: "body2", color: "textSecondary", sx: { display: 'block' }, children: notification.message }), _jsx(Typography, { component: "span", variant: "caption", color: "textSecondary", children: formatNotificationDate(notification.createdAt) })] }) })] }), index < notifications.length - 1 && (_jsx(Divider, { variant: "inset", component: "li" }))] }, notification.id))) }) }), onViewAllClick && (_jsx(Box, { sx: { p: 1, borderTop: 1, borderColor: 'divider' }, children: _jsx(Button, { fullWidth: true, onClick: onViewAllClick, sx: { textTransform: 'none' }, children: "\uBAA8\uB4E0 \uC54C\uB9BC \uBCF4\uAE30" }) }))] }))] })] }));
};
export default NotificationDropdown;
