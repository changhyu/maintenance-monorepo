import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { 
  ThemeProvider as MuiThemeProvider, 
  CssBaseline, 
  Box,
  CircularProgress
} from '@mui/material';
import { createAppTheme } from './theme';
import { useDarkMode } from './context/AppContext';

// 레이아웃
import MainLayout from './components/layout/MainLayout';

// 오프라인 알림 컴포넌트
import OfflineNotice from './components/OfflineNotice';
import NotificationCenter from './components/NotificationCenter';

// 라우팅 설정
import AppRoutes from './routes';

// 인증 상태 관리
import { isLoggedIn } from './services/api/auth-helpers';

// 전역 상태 관리
import { AppProvider } from './context/AppContext';

// 다국어 지원
import './i18n';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

// 메인 앱 컨텐츠 컴포넌트 (AppProvider 내부에서 사용)
const AppContent = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const { darkMode } = useDarkMode();
  
  // 테마 설정
  const theme = createAppTheme(darkMode ? 'dark' : 'light');

  // 사용자 인증 상태 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 토큰 기반 인증 확인
        const authenticated = isLoggedIn();
        setIsAuthenticated(authenticated);
        
        // 개발 모드에서는 항상 인증된 것으로 처리 (나중에 제거)
        if (process.env.NODE_ENV === 'development') {
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('인증 확인 중 오류 발생:', err);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // 온라인/오프라인 상태 감지
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 로그인 처리 핸들러
  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {!isOnline && <OfflineNotice />}
      <NotificationCenter />
      <BrowserRouter>
        <AppRoutes isAuthenticated={isAuthenticated} onLogin={handleLogin} />
      </BrowserRouter>
    </MuiThemeProvider>
  );
};

const App = () => {
  return (
    <I18nextProvider i18n={i18n}>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </I18nextProvider>
  );
};

export default App;
