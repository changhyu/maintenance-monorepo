import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { OfflineManager } from './src/components/OfflineManager';
import AppStateManager from './src/utils/AppStateManager';
import MemoryWatcher from './src/utils/MemoryWatcher';
import GlobalErrorHandler from './src/utils/GlobalErrorHandler';
import ErrorBoundary from './src/utils/ErrorBoundary';

export default function App() {
  // 앱 라이프사이클 및 오류 처리 초기화
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // 앱 상태 매니저 초기화
        AppStateManager.initialize();
        
        // 메모리 모니터링 시작
        MemoryWatcher.startMonitoring();
        
        // 높은 메모리 사용량 감지 시 처리
        MemoryWatcher.addMemoryListener((memoryInfo) => {
          if (memoryInfo.isHighUsage) {
            console.warn(`높은 메모리 사용량 감지됨: ${memoryInfo.usagePercentage.toFixed(2)}%`);
            // 메모리 정리 시도
            MemoryWatcher.attemptMemoryCleanup();
          }
        });
        
        // 전역 오류 핸들러 초기화
        await GlobalErrorHandler.initialize();
      } catch (error) {
        console.error('앱 서비스 초기화 오류:', error);
      }
    };
    
    initializeServices();
    
    // 정리 함수
    return () => {
      AppStateManager.dispose();
      MemoryWatcher.dispose();
      GlobalErrorHandler.dispose();
    };
  }, []);

  // 오류 처리 핸들러 함수
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // 전역 오류 핸들러를 통해 오류 로깅
    GlobalErrorHandler.handleError(error, errorInfo.componentStack);
  };

  // 오류 리셋 함수
  const handleReset = () => {
    // 필요한 상태 재설정 또는 앱 새로고침 로직
    console.log('오류 상태에서 앱 복구 시도');
  };

  return (
    <ErrorBoundary 
      onError={handleError}
      onReset={handleReset}
    >
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <NavigationContainer>
              <OfflineManager />
              <AppNavigator />
              <StatusBar style="auto" />
            </NavigationContainer>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}