import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Box, 
  Drawer, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Typography, 
  Divider, 
  Avatar, 
  Menu, 
  MenuItem, 
  Container,
  Alert
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Home as HomeIcon, 
  DirectionsCar as CarIcon, 
  Build as MaintenanceIcon, 
  Assessment as ReportsIcon,
  Settings as SettingsIcon, 
  Notifications as NotificationsIcon, 
  ChevronLeft as ChevronLeftIcon,
  WifiOff as WifiOffIcon
} from '@mui/icons-material';

// 간단한 오프라인 상태 컴포넌트 인라인 구현
const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (!isOffline) return null;
  
  return (
    <Alert 
      severity="warning" 
      icon={<WifiOffIcon />}
      sx={{ mb: 2 }}
    >
      오프라인 상태입니다. 일부 기능이 제한됩니다.
    </Alert>
  );
};

// 사이드바 너비
const drawerWidth = 240;

/**
 * 메인 레이아웃 컴포넌트
 * 애플리케이션의 전체 레이아웃 구조를 정의합니다.
 */
const MainLayout = () => {
  // 사이드바 상태
  const [drawerOpen, setDrawerOpen] = useState(true);
  // 프로필 메뉴 앵커 엘리먼트
  const [anchorEl, setAnchorEl] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // 메뉴 항목 정의
  const menuItems = [
    { text: '대시보드', path: '/', icon: <HomeIcon /> },
    { text: '차량 관리', path: '/vehicles', icon: <CarIcon /> },
    { text: '정비 관리', path: '/maintenance', icon: <MaintenanceIcon /> },
    { text: '보고서', path: '/reports', icon: <ReportsIcon /> },
  ];
  
  // 사이드바 열기/닫기 토글
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  // 프로필 메뉴 열기
  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // 프로필 메뉴 닫기
  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };
  
  // 메뉴 항목 클릭 핸들러
  const handleMenuClick = (path) => {
    navigate(path);
    if (window.innerWidth < 960) { // md 브레이크포인트 아래에서 자동 닫기
      setDrawerOpen(false);
    }
  };
  
  // 현재 활성 메뉴 아이템 확인
  const isActive = (path) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };
  
  // 로그아웃 핸들러
  const handleLogout = () => {
    // 여기에 로그아웃 로직 구현
    localStorage.removeItem('authToken');
    navigate('/login');
    handleProfileMenuClose();
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* 앱 바 */}
      <AppBar 
        position="fixed" 
        sx={{
          width: { sm: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
          ml: { sm: `${drawerOpen ? drawerWidth : 0}px` },
          transition: theme => theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            차량 정비 관리 시스템
          </Typography>
          <IconButton color="inherit" sx={{ mr: 1 }}>
            <NotificationsIcon />
          </IconButton>
          <IconButton
            edge="end"
            aria-label="account of current user"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              A
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
          >
            <MenuItem onClick={handleProfileMenuClose}>프로필</MenuItem>
            <MenuItem onClick={() => {
              handleProfileMenuClose();
              navigate('/settings');
            }}>설정</MenuItem>
            <MenuItem onClick={handleLogout}>로그아웃</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* 사이드바 */}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="persistent"
        anchor="left"
        open={drawerOpen}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, pl: 1 }}>
            메뉴
          </Typography>
          <IconButton onClick={handleDrawerToggle}>
            <ChevronLeftIcon />
          </IconButton>
        </Box>
        <Divider />
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={isActive(item.path)}
                onClick={() => handleMenuClick(item.path)}
              >
                <ListItemIcon
                  sx={{
                    color: isActive(item.path) ? 'primary.main' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleMenuClick('/settings')}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="설정" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>

      {/* 메인 콘텐츠 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: { sm: `${drawerOpen ? drawerWidth : 0}px` },
          width: { xs: '100%', sm: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
          transition: theme => theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar /> {/* 앱바 높이 만큼 공간 확보 */}
        
        {/* 오프라인 알림 표시 */}
        <OfflineIndicator />
        
        {/* 페이지 콘텐츠 */}
        <Container maxWidth="xl" sx={{ mt: 2 }}>
          <Outlet /> {/* 중첩 라우트 렌더링 */}
        </Container>
      </Box>
    </Box>
  );
};

export default MainLayout;