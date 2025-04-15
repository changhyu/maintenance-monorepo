// 캐시 이름 설정
const CACHE_NAME = 'car-goro-cache-v1';

// 오프라인에서 사용할 리소스들
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/static/js/main.js',
  '/static/css/main.css',
  '/offline.html',
  '/icons/add.png',
  '/icons/car.png'
];

// 서비스 워커 설치 이벤트
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('캐시 생성됨');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// 서비스 워커 활성화 이벤트
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 네트워크 요청 처리
self.addEventListener('fetch', event => {
  // API 요청은 네트워크 우선 전략 사용
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/offline-api.json');
        })
    );
    return;
  }
  
  // HTML 요청은 네트워크 우선 전략 사용
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/offline.html');
        })
    );
    return;
  }
  
  // 다른 요청은 캐시 우선 전략 사용
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에서 찾으면 반환
        if (response) {
          return response;
        }
        
        // 캐시에 없으면 네트워크에서 가져오기
        return fetch(event.request)
          .then(networkResponse => {
            // 가져온 응답 복제
            const responseToCache = networkResponse.clone();
            
            // 캐시에 저장 (이미지, CSS, JS 파일만)
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg|css|js)$/)) {
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            
            return networkResponse;
          })
          .catch(() => {
            // 이미지일 경우 기본 이미지 반환
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return caches.match('/icons/placeholder.png');
            }
            
            return new Response('네트워크 연결이 끊겼습니다.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// 백그라운드 동기화
self.addEventListener('sync', event => {
  if (event.tag === 'sync-maintenance') {
    event.waitUntil(syncMaintenanceData());
  } else if (event.tag === 'sync-vehicles') {
    event.waitUntil(syncVehicleData());
  }
});

// 푸시 알림
self.addEventListener('push', event => {
  const data = event.data.json();
  
  const options = {
    body: data.body || '새로운 알림이 있습니다',
    icon: '/logo192.png',
    badge: '/notification-badge.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || '차량 정비 관리', options)
  );
});

// 알림 클릭
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // 이미 열린 창이 있는지 확인
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // 열린 창이 없으면 새 창 열기
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});

// 오프라인 데이터 동기화 함수
async function syncMaintenanceData() {
  try {
    const offlineData = await getOfflineData('maintenance-queue');
    
    for (const item of offlineData) {
      await fetch('/api/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(item)
      });
      
      await removeFromOfflineQueue('maintenance-queue', item.id);
    }
  } catch (error) {
    console.error('정비 데이터 동기화 실패:', error);
  }
}

async function syncVehicleData() {
  try {
    const offlineData = await getOfflineData('vehicle-queue');
    
    for (const item of offlineData) {
      await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(item)
      });
      
      await removeFromOfflineQueue('vehicle-queue', item.id);
    }
  } catch (error) {
    console.error('차량 데이터 동기화 실패:', error);
  }
}

// IndexedDB 관련 유틸리티 함수들
async function getOfflineData(storeName) {
  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open('offline-storage', 1);
    
    dbRequest.onerror = () => reject(new Error('오프라인 저장소 접근 실패'));
    
    dbRequest.onsuccess = () => {
      const db = dbRequest.result;
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const items = [];
      
      store.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor) {
          items.push(cursor.value);
          cursor.continue();
        } else {
          resolve(items);
        }
      };
    };
  });
}

async function removeFromOfflineQueue(storeName, id) {
  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open('offline-storage', 1);
    
    dbRequest.onerror = () => reject(new Error('오프라인 저장소 접근 실패'));
    
    dbRequest.onsuccess = () => {
      const db = dbRequest.result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('항목 삭제 실패'));
    };
  });
} 