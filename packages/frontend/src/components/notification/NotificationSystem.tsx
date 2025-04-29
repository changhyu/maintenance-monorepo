import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Divider,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Build as BuildIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  Inventory as InventoryIcon,
  DirectionsCar as CarIcon,
} from '@mui/icons-material';
import { NotificationService } from '../../services/notificationService';

interface Notification {
  id: string;
  type: 'MAINTENANCE' | 'INVENTORY' | 'VEHICLE' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  status: 'UNREAD' | 'READ';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  link?: string;
}

interface NotificationSettings {
  maintenance: boolean;
  inventory: boolean;
  vehicle: boolean;
  system: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  lowStockAlert: number;
  maintenanceReminder: number;
}

const NotificationSystem: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    maintenance: true,
    inventory: true,
    vehicle: true,
    system: true,
    emailNotifications: true,
    pushNotifications: true,
    lowStockAlert: 10,
    maintenanceReminder: 7,
  });

  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    loadNotifications();
    loadSettings();
    // 실시간 알림을 위한 웹소켓 연결 설정
    const ws = new WebSocket('ws://your-websocket-url');
    ws.onmessage = handleWebSocketMessage;
    return () => ws.close();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => n.status === 'UNREAD').length);
    } catch (error) {
      console.error('알림 로딩 실패:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await notificationService.getNotificationSettings();
      setSettings(data);
    } catch (error) {
      console.error('알림 설정 로딩 실패:', error);
    }
  };

  const handleWebSocketMessage = (event: MessageEvent) => {
    const newNotification = JSON.parse(event.data);
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, status: 'READ' } : n
        )
      );
      setUnreadCount(prev => prev - 1);
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  };

  const handleSettingsSave = async () => {
    try {
      await notificationService.updateNotificationSettings(settings);
      setSettingsOpen(false);
    } catch (error) {
      console.error('알림 설정 저장 실패:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'MAINTENANCE':
        return <BuildIcon />;
      case 'INVENTORY':
        return <InventoryIcon />;
      case 'VEHICLE':
        return <CarIcon />;
      case 'SYSTEM':
        return <WarningIcon />;
      default:
        return <NotificationsIcon />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'error';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <>
      <IconButton
        size="large"
        color="inherit"
        onClick={handleNotificationClick}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 500,
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">알림</Typography>
          <IconButton size="small" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </IconButton>
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">
              새로운 알림이 없습니다.
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                onClick={() => handleNotificationRead(notification.id)}
                sx={{
                  bgcolor: notification.status === 'UNREAD' ? 'action.hover' : 'inherit',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                <ListItemIcon>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" noWrap>
                        {notification.title}
                      </Typography>
                      <Chip
                        label={notification.priority}
                        color={getPriorityColor(notification.priority)}
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(notification.timestamp).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
        <Divider />
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
          <Button size="small" onClick={() => setAnchorEl(null)}>
            모두 읽음으로 표시
          </Button>
        </Box>
      </Menu>

      {/* 알림 설정 다이얼로그 */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>알림 설정</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              알림 유형
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.maintenance}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      maintenance: e.target.checked,
                    }))
                  }
                />
              }
              label="정비 알림"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.inventory}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      inventory: e.target.checked,
                    }))
                  }
                />
              }
              label="재고 알림"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.vehicle}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      vehicle: e.target.checked,
                    }))
                  }
                />
              }
              label="차량 알림"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.system}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      system: e.target.checked,
                    }))
                  }
                />
              }
              label="시스템 알림"
            />

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              알림 방법
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.emailNotifications}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      emailNotifications: e.target.checked,
                    }))
                  }
                />
              }
              label="이메일 알림"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.pushNotifications}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      pushNotifications: e.target.checked,
                    }))
                  }
                />
              }
              label="푸시 알림"
            />

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              알림 기준
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <TextField
                type="number"
                label="재고 부족 기준"
                value={settings.lowStockAlert}
                onChange={(e) =>
                  setSettings(prev => ({
                    ...prev,
                    lowStockAlert: Number(e.target.value),
                  }))
                }
                size="small"
                InputProps={{
                  endAdornment: <Typography>개</Typography>,
                }}
              />
              <TextField
                type="number"
                label="정비 알림 기준"
                value={settings.maintenanceReminder}
                onChange={(e) =>
                  setSettings(prev => ({
                    ...prev,
                    maintenanceReminder: Number(e.target.value),
                  }))
                }
                size="small"
                InputProps={{
                  endAdornment: <Typography>일</Typography>,
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>취소</Button>
          <Button variant="contained" onClick={handleSettingsSave}>
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NotificationSystem; 