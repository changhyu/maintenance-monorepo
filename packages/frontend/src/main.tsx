import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import config from './config';
import { validateRequiredEnv } from './utils/validateEnv';
import { QueryProvider } from './providers/QueryProvider';
import { ErrorBoundary } from './components/ErrorBoundary';

// 필수 환경 변수 검증
try {
  validateRequiredEnv();
} catch (error) {
  console.error('애플리케이션 시작 실패:', error);
  
  // 오류 화면 렌더링
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; max-width: 600px; margin: 100px auto; text-align: center; font-family: sans-serif;">
        <h1 style="color: #d32f2f;">환경 설정 오류</h1>
        <p>${error instanceof Error ? error.message : '필수 환경 변수가 누락되었습니다.'}</p>
        <p>관리자에게 문의하거나 환경 설정을 확인해주세요.</p>
      </div>
    `;
  }
  
  // 실행 중단
  throw error;
}

// 서비스 워커 등록
if (config.pwaSettings.enableServiceWorker && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('서비스 워커 등록 성공:', registration.scope);

        // 푸시 알림 구독 설정 (사용자가 이미 허용한 경우)
        if (config.pwaSettings.enablePushNotifications) {
          import('./services/pushNotificationService')
            .then(({ setupPushSubscription }) => {
              setupPushSubscription(registration);
            })
            .catch(error => console.error('푸시 알림 설정 중 오류:', error));
        }
      })
      .catch(error => {
        console.error('서비스 워커 등록 실패:', error);
      });
  });
}

// 개발 환경에서는 React 성능 측정 도구 설정
if (process.env.NODE_ENV === 'development') {
  import('./reportWebVitals')
    .then(({ reportWebVitals }) => {
      reportWebVitals(console.log);
    })
    .catch(error => {
      console.error('Web Vitals 로딩 실패:', error);
    });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryProvider>
          <App />
        </QueryProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
