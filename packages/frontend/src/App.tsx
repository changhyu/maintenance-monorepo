import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { 
  ThemeProvider as MuiThemeProvider, 
  CssBaseline, 
  Box,
  CircularProgress
} from '@mui/material';
import { createAppTheme } from './theme';

// 컴포넌트
import OfflineNotice from './components/OfflineNotice';
import NotificationCenter from './components/NotificationCenter';
import AppRoutes from './routes';

// 커스텀 훅
import { useDarkMode } from './context/AppContext';
import { useAuth } from './context/AuthContext';

// 유틸리티
import { validateRequiredEnv } from './utils/validateEnv';
import { webSocketService } from './services/websocket';

// Context Provider
import { RootProvider } from './context/RootProvider';

// 메인 앱 컨텐츠 컴포넌트
const AppContent = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { darkMode } = useDarkMode();
  const { state: authState, login } = useAuth();
  
  // 테마 설정
  const theme = createAppTheme(darkMode ? 'dark' : 'light');

  // 환경 변수 검증
  useEffect(() => {
    try {
      validateRequiredEnv();
      setIsLoading(false);
    } catch (error) {
      console.error('환경 변수 검증 오류:', error);
      setIsLoading(false);
    }
  }, []);

  // 온라인/오프라인 상태 감지
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // WebSocket 초기화
  useEffect(() => {
    if (authState.status === 'authenticated') {
      const token = localStorage.getItem('auth_token');
      
      try {
        webSocketService.initialize(token || undefined);
      } catch (error) {
        console.error('WebSocket 초기화 오류:', error);
      }
    }
  }, [authState.status]);

  // 로그인 처리 핸들러
  const handleLogin = useCallback(async (email: string, password: string) => {
    return await login(email, password);
  }, [login]);

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
        <AppRoutes 
          isAuthenticated={authState.status === 'authenticated'} 
          isLoading={authState.status === 'loading'}
          onLogin={handleLogin} 
        />
      </BrowserRouter>
    </MuiThemeProvider>
  );
};

const App = () => {
  return (
    <RootProvider>
      <AppContent />
    </RootProvider>
  );
};

export default App;
