import React, { useState, useCallback, useMemo } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  useTheme,
  Switch,
  Box,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useThemeMode } from '../hooks/useThemeMode';

interface HeaderProps {
  onMenuClick: () => void;
}

interface Notification {
  id: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const theme = useTheme();

  const handleProfileMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleProfileMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleNotificationClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  }, []);

  const handleNotificationClose = useCallback(() => {
    setNotificationAnchor(null);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      handleProfileMenuClose();
      await logout();
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
    }
  }, [handleProfileMenuClose, logout]);

  const unreadNotificationsCount = useMemo(() => 
    notifications.filter(notification => !notification.read).length,
    [notifications]
  );

  const handleNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: theme.zIndex.drawer + 1,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
      }}
      role="banner"
    >
      <Toolbar>
        <Tooltip title="메뉴 열기">
          <IconButton
            color="inherit"
            aria-label="메뉴 열기"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>

        <Typography 
          variant="h6" 
          noWrap 
          component="div" 
          sx={{ flexGrow: 1 }}
          role="heading"
          aria-level={1}
        >
          차량 정비 관리 시스템
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title={mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}>
            <IconButton 
              color="inherit" 
              onClick={toggleTheme}
              aria-label={mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="알림">
            <IconButton 
              color="inherit" 
              onClick={handleNotificationClick}
              aria-label="알림"
            >
              <Badge badgeContent={unreadNotificationsCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="프로필 메뉴">
            <IconButton
              edge="end"
              aria-label="프로필 메뉴"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
              sx={{ ml: 1 }}
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: theme.palette.secondary.main 
                }}
                alt={user?.name || '사용자'}
              >
                {user?.name?.[0] || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={handleNotificationClose}
          PaperProps={{
            sx: { width: 320, maxHeight: 400 }
          }}
          role="menu"
          aria-label="알림 메뉴"
        >
          {notifications.length > 0 ? (
            notifications.map(notification => (
              <MenuItem 
                key={notification.id}
                onClick={() => {
                  handleNotificationRead(notification.id);
                  handleNotificationClose();
                }}
                sx={{ 
                  opacity: notification.read ? 0.7 : 1,
                  fontWeight: notification.read ? 'normal' : 'bold'
                }}
              >
                {notification.message}
                <Typography variant="caption" sx={{ ml: 1 }}>
                  {new Date(notification.timestamp).toLocaleString()}
                </Typography>
              </MenuItem>
            ))
          ) : (
            <MenuItem disabled>
              새로운 알림이 없습니다
            </MenuItem>
          )}
        </Menu>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileMenuClose}
          role="menu"
          aria-label="프로필 메뉴"
        >
          <MenuItem 
            onClick={handleProfileMenuClose}
            role="menuitem"
          >
            프로필
          </MenuItem>
          <MenuItem 
            onClick={handleProfileMenuClose}
            role="menuitem"
          >
            설정
          </MenuItem>
          <MenuItem 
            onClick={handleLogout}
            role="menuitem"
          >
            로그아웃
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
