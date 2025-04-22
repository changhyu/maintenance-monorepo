import { NotificationMessage, NotificationType } from './types';

// 알림 핸들러 타입 정의
type NotificationHandler = (notification: NotificationMessage) => void;

// 알림 핸들러 배열
const notificationHandlers: NotificationHandler[] = [];

/**
 * 알림 핸들러 등록
 * @param handler 알림을 처리할 콜백 함수
 * @returns 핸들러 제거 함수
 */
export function registerNotificationHandler(handler: NotificationHandler): () => void {
  notificationHandlers.push(handler);
  
  // 제거 함수 반환
  return () => {
    const index = notificationHandlers.indexOf(handler);
    if (index !== -1) {
      notificationHandlers.splice(index, 1);
    }
  };
}

/**
 * 알림 발송
 * @param notification 알림 메시지
 */
export function sendNotification(notification: NotificationMessage): void {
  // 모든 등록된 핸들러에게 알림 전달
  notificationHandlers.forEach(handler => handler(notification));
}

/**
 * 오프라인 모드 알림 표시
 */
export function notifyOfflineMode(): void {
  sendNotification({
    type: 'warning',
    title: '오프라인 모드',
    message: '인터넷 연결이 불안정합니다. 오프라인 모드로 전환되었습니다.',
    duration: 5000
  });
}

/**
 * 서버 오류 알림 표시
 * @param status HTTP 상태 코드
 * @param data 오류 응답 데이터
 */
export function notifyServerError(status: number, data: any): void {
  let message = '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  
  // 응답 데이터에서 메시지 추출
  if (data && typeof data === 'object') {
    if (data.message) {
      message = data.message;
    } else if (data.error) {
      message = data.error;
    }
  }
  
  sendNotification({
    type: 'error',
    title: `서버 오류 (${status})`,
    message,
    duration: 8000
  });
}

/**
 * 성공 알림 표시
 * @param title 알림 제목
 * @param message 알림 메시지
 */
export function notifySuccess(title: string, message: string): void {
  sendNotification({
    type: 'success',
    title,
    message,
    duration: 3000
  });
}

/**
 * 오류 알림 표시
 * @param title 알림 제목
 * @param message 알림 메시지
 */
export function notifyError(title: string, message: string): void {
  sendNotification({
    type: 'error',
    title,
    message,
    duration: 5000
  });
}

/**
 * 경고 알림 표시
 * @param title 알림 제목
 * @param message 알림 메시지
 */
export function notifyWarning(title: string, message: string): void {
  sendNotification({
    type: 'warning',
    title,
    message,
    duration: 4000
  });
}

/**
 * 정보 알림 표시
 * @param title 알림 제목
 * @param message 알림 메시지
 */
export function notifyInfo(title: string, message: string): void {
  sendNotification({
    type: 'info',
    title,
    message,
    duration: 3000
  });
}