// 서비스 워커 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('서비스 워커가 등록되었습니다:', registration.scope);
        
        // 푸시 알림 구독
        initializePushNotifications(registration);
      })
      .catch(error => {
        console.error('서비스 워커 등록 중 오류 발생:', error);
      });
  });
}

// VAPID 공개 키를 서버에서 가져오는 함수
async function getVapidPublicKey() {
  try {
    // API에서 VAPID 공개 키 가져오기
    const response = await fetch('/api/notifications/vapid-public-key');
    
    if (!response.ok) {
      throw new Error('VAPID 키를 가져오는데 실패했습니다: ' + response.statusText);
    }
    
    const data = await response.json();
    return data.public_key;
  } catch (error) {
    console.error('VAPID 키를 가져오는 중 오류 발생:', error);
    return null;
  }
}

// 푸시 알림 초기화
async function initializePushNotifications(registration) {
  try {
    // 알림 권한 요청
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.log('알림 권한이 거부되었습니다.');
      return;
    }
    
    // 기존 구독 확인
    const existingSubscription = await registration.pushManager.getSubscription();
    
    if (existingSubscription) {
      console.log('이미 푸시 알림에 구독되어 있습니다.');
      return;
    }
    
    // 서버에서 VAPID 공개 키 가져오기
    const publicVapidKey = await getVapidPublicKey();
    
    if (!publicVapidKey) {
      console.error('VAPID 공개 키를 가져올 수 없습니다. 푸시 알림 구독을 진행할 수 없습니다.');
      return;
    }
    
    // 구독 생성 시도
    try {
      // 구독 생성
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });
      
      // 서버에 구독 정보 전송
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      });
      
      if (!response.ok) {
        throw new Error('구독 등록에 실패했습니다: ' + response.statusText);
      }
      
      console.log('푸시 알림 구독이 완료되었습니다.');
    } catch (subscriptionError) {
      console.error('구독 처리 중 오류 발생:', subscriptionError);
      
      if (Notification.permission === 'denied') {
        console.error('알림 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
      }
    }
  } catch (error) {
    console.error('푸시 알림 초기화 중 오류 발생:', error);
  }
}

// 오프라인 상태 감지
window.addEventListener('online', handleNetworkChange);
window.addEventListener('offline', handleNetworkChange);

function handleNetworkChange() {
  const isOnline = navigator.onLine;
  
  if (isOnline) {
    console.log('온라인 상태로 전환되었습니다.');
    
    // 온라인 상태가 되면 백그라운드 동기화 시작
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        // 정비 데이터 동기화
        registration.sync.register('sync-maintenance');
        
        // 차량 데이터 동기화
        registration.sync.register('sync-vehicles');
      });
    }
  } else {
    console.log('오프라인 상태로 전환되었습니다.');
    
    // 오프라인 상태 UI 업데이트 (선택 사항)
    const offlineIndicator = document.getElementById('offline-indicator');
    if (offlineIndicator) {
      offlineIndicator.style.display = 'block';
    }
  }
}

// Base64 URL을 Uint8Array로 변환하는 유틸리티 함수
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}