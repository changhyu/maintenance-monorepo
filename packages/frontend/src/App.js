import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useTransition } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { createAppTheme } from './theme';
import { useDarkMode } from './context/AppContext';
// 오프라인 알림 컴포넌트
import OfflineNotice from './components/OfflineNotice';
import NotificationCenter from './components/NotificationCenter';
// 라우팅 설정
import AppRoutes from './routes';
// 인증 상태 관리
import { isLoggedIn } from './services/api/auth-helpers';
// 전역 상태 관리
import { AppProvider } from './context/AppContext';
// 환경 변수 검증
import { validateRequiredEnv } from './utils/validateEnv';
// WebSocket 서비스 초기화
import { webSocketService } from './services/websocket';
// 다국어 지원
import './i18n';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
// 메인 앱 컨텐츠 컴포넌트 (AppProvider 내부에서 사용)
const AppContent = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const { darkMode } = useDarkMode();
    // 테마 설정
    const theme = createAppTheme(darkMode ? 'dark' : 'light');
    // 환경 변수 검증
    useEffect(() => {
        try {
            // 필수 환경 변수 검증
            validateRequiredEnv();
        }
        catch (error) {
            console.error('환경 변수 검증 오류:', error);
        }
    }, []);
    // 사용자 인증 상태 확인
    useEffect(() => {
        const checkAuth = async () => {
            try {
                // 토큰 기반 인증 확인
                const authenticated = isLoggedIn();
                // React 19 useTransition을 사용하여 인증 상태 업데이트
                startTransition(() => {
                    setIsAuthenticated(authenticated);
                    // 개발 모드에서는 항상 인증된 것으로 처리 (나중에 제거)
                    if (process.env.NODE_ENV === 'development') {
                        setIsAuthenticated(true);
                    }
                });
            }
            catch (err) {
                console.error('인증 확인 중 오류 발생:', err);
                setIsAuthenticated(false);
            }
            finally {
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
    // WebSocket 초기화
    useEffect(() => {
        // 인증 상태가 확인된 후 WebSocket 초기화
        if (isAuthenticated) {
            // 인증 토큰 가져오기
            const token = localStorage.getItem('authToken');
            // 웹소켓 연결 시도
            try {
                webSocketService.initialize(token || undefined);
            }
            catch (error) {
                console.error('WebSocket 초기화 오류:', error);
            }
        }
    }, [isAuthenticated]);
    // 로그인 처리 핸들러
    const handleLogin = () => {
        // React 19 useTransition을 사용하여 인증 상태 업데이트
        startTransition(() => {
            setIsAuthenticated(true);
        });
    };
    if (isLoading || isPending) {
        return (_jsx(Box, { sx: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }, children: _jsx(CircularProgress, {}) }));
    }
    return (_jsxs(MuiThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), !isOnline && _jsx(OfflineNotice, {}), _jsx(NotificationCenter, {}), _jsx(BrowserRouter, { children: _jsx(AppRoutes, { isAuthenticated: isAuthenticated, onLogin: handleLogin }) })] }));
};
const App = () => {
    return (_jsx(I18nextProvider, { i18n: i18n, children: _jsx(AppProvider, { children: _jsx(AppContent, {}) }) }));
};
export default App;
