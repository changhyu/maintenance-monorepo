import axios from 'axios';
import config from '../config';

/**
 * 푸시 알림 서비스
 * 웹 푸시 알림 기능을 처리하는 서비스
 */

// 구독 정보 저장 로컬 스토리지 키
const PUSH_SUBSCRIPTION_KEY = 'push_subscription';

// 알림 액션 인터페이스
interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// 알림 옵션 확장 인터페이스
interface ExtendedNotificationOptions extends NotificationOptions {
  actions?: NotificationAction[];
}

/**
 * VAPID 키를 가져오는 함수
 * 환경 변수에서만 가져옵니다
 */
async function getVAPIDPublicKey(): Promise<string | null> {
  // 환경 변수에서 VAPID 키를 가져오기
  const vapidPublicKey: string | undefined = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  return vapidPublicKey || null;
}

/**
 * 푸시 알림 구독 설정
 * @param registration 서비스 워커 등록 객체
 */
export async function setupPushSubscription(registration: ServiceWorkerRegistration): Promise<void> {
  try {
    // 이미 구독 중인지 확인
    let subscription = await registration.pushManager.getSubscription();
    
    // 구독이 없으면 새로 생성
    if (!subscription) {
      // VAPID 키 가져오기
      const vapidPublicKey = await getVAPIDPublicKey();
      
      if (!vapidPublicKey) {
        console.error('VAPID 공개 키를 가져올 수 없습니다. 푸시 알림 설정을 진행할 수 없습니다.');
        throw new Error('VAPID 키를 가져올 수 없습니다');
      }
      
      // base64 문자열을 Uint8Array로 변환
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      
      try {
        // 새 구독 생성
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
        
        console.log('푸시 알림 구독이 생성되었습니다.');
        
        // 구독 정보를 로컬 스토리지에 저장
        localStorage.setItem(PUSH_SUBSCRIPTION_KEY, JSON.stringify(subscription));
        
        // 서버에 구독 정보 전송
        await sendSubscriptionToServer(subscription);
      } catch (subscribeError: any) {
        console.error('푸시 알림 구독 생성 중 오류 발생:', subscribeError);
        
        if (Notification.permission === 'denied') {
          console.error('알림 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
        } else if (subscribeError.name === 'NotAllowedError') {
          console.error('푸시 알림 구독이 허용되지 않았습니다.');
        } else {
          console.error('푸시 알림 구독 중 알 수 없는 오류가 발생했습니다:', subscribeError.message);
        }
        throw subscribeError;
      }
    } else {
      console.log('이미 푸시 알림에 구독되어 있습니다.');
    }
  } catch (error) {
    console.error('푸시 알림 구독 설정 중 오류 발생:', error);
    throw error; // 오류를 상위로 전파하여 적절한 처리를 할 수 있도록 함
  }
}

/**
 * 구독 정보를 서버에 전송
 * @param subscription 푸시 구독 정보
 */
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  try {
    await axios.post('/api/notifications/subscribe', subscription);
    console.log('구독 정보가 서버에 전송되었습니다.');
  } catch (error) {
    console.error('구독 정보 서버 전송 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 푸시 알림 전송
 * @param title 알림 제목
 * @param options 알림 옵션
 */
export async function sendNotification(title: string, options: ExtendedNotificationOptions = {}): Promise<void> {
  try {
    const payload = {
      title,
      body: options.body || '',
      // 기본 아이콘 경로를 상대 경로에서 절대 경로로 변경
      icon: options.icon || '/icons/notification-icon.png',
      badge: options.badge || '/icons/notification-badge.png',
      url: options.data?.url || '/',
      tag: options.tag,
      actions: options.actions
    };
    
    await axios.post('/api/notifications/send', payload);
    console.log('알림이 전송되었습니다.');
  } catch (error) {
    console.error('알림 전송 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 알림 권한 요청
 * @returns 권한 상태 (granted, denied, default)
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('이 브라우저는 알림을 지원하지 않습니다.');
    return 'denied';
  }
  
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('알림 권한이 허용되었습니다.');
    } else if (permission === 'denied') {
      console.log('알림 권한이 거부되었습니다.');
    } else {
      console.log('알림 권한 설정이 보류 중입니다.');
    }
    
    return permission;
  } catch (error) {
    console.error('알림 권한 요청 중 오류 발생:', error);
    return 'default';
  }
}

/**
 * 구독 해제
 */
export async function unsubscribe(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) {
      return false;
    }
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      const result = await subscription.unsubscribe();
      
      if (result) {
        // 로컬 스토리지에서 구독 정보 제거
        localStorage.removeItem(PUSH_SUBSCRIPTION_KEY);
        console.log('푸시 알림 구독이 해제되었습니다.');
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('구독 해제 중 오류 발생:', error);
    return false;
  }
}

/**
 * base64 문자열을 Uint8Array로 변환
 * @param base64String base64 문자열
 * @returns Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
    
  try {
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  } catch (error) {
    console.error('VAPID 키 변환 중 오류 발생:', error);
    throw new Error('VAPID 키 형식이 올바르지 않습니다');
  }
}