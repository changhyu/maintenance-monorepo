import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  CssBaseline,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  Breadcrumbs,
  Link,
  Container,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  DirectionsCar as CarIcon,
  Build as BuildIcon,
  Assessment as ReportIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

const drawerWidth = 240;

// 사이드바 메뉴 항목 정의
const menuItems = [
  { text: '대시보드', icon: <DashboardIcon />, path: '/' },
  { text: '차량 관리', icon: <CarIcon />, path: '/vehicles' },
  { text: '정비 관리', icon: <BuildIcon />, path: '/maintenance' },
  { text: '보고서', icon: <ReportIcon />, path: '/reports' },
  { text: '설정', icon: <SettingsIcon />, path: '/settings' },
];

// 네비게이션 라벨 매핑
const breadcrumbNameMap: { [key: string]: string } = {
  '/': '대시보드',
  '/vehicles': '차량 관리',
  '/vehicles/new': '새 차량 등록',
  '/maintenance': '정비 관리',
  '/maintenance/new': '새 정비 등록',
  '/reports': '보고서',
  '/settings': '설정',
};

const MainLayout: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // 상태 관리
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState<null | HTMLElement>(null);

  // 사용자 메뉴 관리
  const isMenuOpen = Boolean(anchorEl);
  const isNotificationsOpen = Boolean(notificationsAnchorEl);
  
  // 알림 카운트 (임시 데이터)
  const notificationCount = 3;
  
  // 임시 알림 데이터
  const notifications = [
    { id: 1, message: '정기 점검 일정 - 현대 소나타', date: '2023-05-15' },
    { id: 2, message: '타이어 교체 예정 - 기아 K5', date: '2023-05-22' },
    { id: 3, message: '보험 갱신 필요 - 테슬라 모델 3', date: '2023-06-01' },
  ];

  // 현재 사용자 정보 (임시)
  const currentUser = {
    name: '관리자',
    email: 'admin@example.com',
    avatar: '',
  };

  // 사이드바 토글
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // 프로필 메뉴 열기
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // 알림 메뉴 열기
  const handleNotificationsOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  // 메뉴 닫기
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // 알림 메뉴 닫기
  const handleNotificationsClose = () => {
    setNotificationsAnchorEl(null);
  };

  // 로그아웃 처리
  const handleLogout = () => {
    // 로그아웃 로직
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  // 현재 경로에 기반한 브레드크럼 생성
  const getBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    
    return (
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />} 
        aria-label="breadcrumb"
      >
        <Link
          underline="hover"
          color="inherit"
          onClick={() => navigate('/')}
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <DashboardIcon sx={{ mr: 0.5 }} fontSize="small" />
          홈
        </Link>
        
        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          
          // ID 인지 확인 (숫자 또는 UUID와 같은 형식)
          const isId = 
            value.match(/^[0-9]+$/) || 
            value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
          
          if (isId) {
            return (
              <Typography color="textPrimary" key={to}>
                상세 정보
              </Typography>
            );
          }
          
          // 'edit'과 같은 특별한 케이스 처리
          if (value === 'edit') {
            return (
              <Typography color="textPrimary" key={to}>
                수정
              </Typography>
            );
          }

          // 'new'와 같은 특별한 케이스 처리
          if (value === 'new') {
            const parentPath = `/${pathnames.slice(0, index).join('/')}`;
            const parentLabel = breadcrumbNameMap[parentPath];
            return (
              <Typography color="textPrimary" key={to}>
                {parentLabel ? parentLabel.replace('관리', '') + ' 등록' : '신규 등록'}
              </Typography>
            );
          }

          return last ? (
            <Typography color="textPrimary" key={to}>
              {breadcrumbNameMap[to] || value}
            </Typography>
          ) : (
            <Link
              underline="hover"
              color="inherit"
              key={to}
              onClick={() => navigate(to)}
              sx={{ cursor: 'pointer' }}
            >
              {breadcrumbNameMap[to] || value}
            </Link>
          );
        })}
      </Breadcrumbs>
    );
  };

  // 드로어 컴포넌트 (사이드바)
  const drawer = (
    <div>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: [1],
        }}
      >
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          차량정비관리
        </Typography>
        {isMobile && (
          <IconButton onClick={handleDrawerToggle}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              if (isMobile) {
                setMobileOpen(false);
              }
            }}
            selected={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
          >
            <ListItemIcon
              sx={{
                color: (location.pathname === item.path || location.pathname.startsWith(item.path + '/'))
                  ? 'primary.main'
                  : 'inherit',
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          &copy; 2023 차량정비관리시스템
        </Typography>
      </Box>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* 상단 앱바 */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }} />

          {/* 알림 아이콘 */}
          <Tooltip title="알림">
            <IconButton
              size="large"
              color="inherit"
              onClick={handleNotificationsOpen}
            >
              <Badge badgeContent={notificationCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          {/* 알림 메뉴 */}
          <Menu
            anchorEl={notificationsAnchorEl}
            id="notifications-menu"
            open={isNotificationsOpen}
            onClose={handleNotificationsClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                width: 320,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Typography variant="subtitle1" sx={{ p: 2, pb: 0 }}>알림</Typography>
            <Divider />
            {notifications.map((notification) => (
              <MenuItem 
                key={notification.id} 
                onClick={handleNotificationsClose}
                sx={{ py: 1 }}
              >
                <Box>
                  <Typography variant="body2">{notification.message}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {notification.date}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
            <Divider />
            <MenuItem onClick={handleNotificationsClose} sx={{ justifyContent: 'center' }}>
              <Typography variant="body2" color="primary">모든 알림 보기</Typography>
            </MenuItem>
          </Menu>

          {/* 프로필 메뉴 아이콘 */}
          <Tooltip title="계정 설정">
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
              sx={{ ml: 1 }}
            >
              {currentUser.avatar ? (
                <Avatar
                  alt={currentUser.name}
                  src={currentUser.avatar}
                  sx={{ width: 32, height: 32 }}
                />
              ) : (
                <Avatar sx={{ width: 32, height: 32 }}>
                  {currentUser.name.charAt(0)}
                </Avatar>
              )}
            </IconButton>
          </Tooltip>
          
          {/* 프로필 메뉴 */}
          <Menu
            anchorEl={anchorEl}
            id="account-menu"
            open={isMenuOpen}
            onClose={handleMenuClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleMenuClose}>
              <Avatar />
              <Box>
                <Typography variant="body1">{currentUser.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentUser.email}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => {
              handleMenuClose();
              navigate('/settings');
            }}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              내 계정
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              로그아웃
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      {/* 사이드바 (모바일용) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>
      
      {/* 사이드바 (데스크탑용) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        {drawer}
      </Drawer>
      
      {/* 메인 콘텐츠 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        
        {/* 브레드크럼 */}
        <Box sx={{ mb: 3 }}>
          {getBreadcrumbs()}
        </Box>
        
        {/* 페이지 컨텐츠 */}
        <Container maxWidth="xl">
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default MainLayout;