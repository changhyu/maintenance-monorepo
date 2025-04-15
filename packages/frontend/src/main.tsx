import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import config from './config';

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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
