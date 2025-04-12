/**
 * 알림 관련 유틸리티 함수
 */

import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import relativeTime from 'dayjs/plugin/relativeTime';

import { Notification, NotificationType, NotificationPriority } from '../types/notification';

// dayjs 설정
dayjs.locale('ko');
dayjs.extend(relativeTime);

/**
 * 알림 날짜 포맷
 * @param dateString - 알림 날짜 문자열
 * @returns 포맷된 날짜 문자열
 */
export const formatNotificationDate = (dateString: string): string => {
  const date = dayjs(dateString);
  const now = dayjs();
  const diffInHours = now.diff(date, 'hour');

  if (diffInHours < 24) {
    return date.fromNow(); // '3시간 전', '방금 전' 등으로 표시
  } else if (diffInHours < 48) {
    return '어제';
  } else {
    return date.format('YYYY년 MM월 DD일');
  }
};

/**
 * 알림 유형별 아이콘 반환
 * @param type - 알림 유형
 * @returns 아이콘 이름
 */
export const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.MAINTENANCE:
      return 'tools';
    case NotificationType.VEHICLE:
      return 'car';
    case NotificationType.SYSTEM:
      return 'laptop';
    case NotificationType.APPOINTMENT:
      return 'calendar';
    case NotificationType.SERVICE:
      return 'wrench';
    case NotificationType.RECALL:
      return 'exclamation-triangle';
    case NotificationType.PAYMENT:
      return 'credit-card';
    case NotificationType.MESSAGE:
      return 'envelope';
    case NotificationType.ACCOUNT:
      return 'user';
    case NotificationType.OTHER:
    default:
      return 'bell';
  }
};

/**
 * 알림 유형별 색상 반환
 * @param type - 알림 유형
 * @returns 색상 코드
 */
export const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.MAINTENANCE:
      return '#4299e1'; // 파란색
    case NotificationType.VEHICLE:
      return '#48bb78'; // 초록색
    case NotificationType.SYSTEM:
      return '#805ad5'; // 보라색
    case NotificationType.APPOINTMENT:
      return '#f6ad55'; // 주황색
    case NotificationType.SERVICE:
      return '#38b2ac'; // 청록색
    case NotificationType.RECALL:
      return '#e53e3e'; // 빨간색
    case NotificationType.PAYMENT:
      return '#718096'; // 회색
    case NotificationType.MESSAGE:
      return '#63b3ed'; // 하늘색
    case NotificationType.ACCOUNT:
      return '#9f7aea'; // 연보라색
    case NotificationType.OTHER:
    default:
      return '#a0aec0'; // 기본 회색
  }
};

/**
 * 알림 우선순위 라벨 반환
 * @param priority - 알림 우선순위
 * @returns 우선순위 라벨
 */
export const getNotificationPriorityLabel = (priority: NotificationPriority): string => {
  switch (priority) {
    case NotificationPriority.LOW:
      return '낮음';
    case NotificationPriority.MEDIUM:
      return '보통';
    case NotificationPriority.HIGH:
      return '높음';
    case NotificationPriority.URGENT:
      return '긴급';
    default:
      return '보통';
  }
};

/**
 * 알림 우선순위별 색상 반환
 * @param priority - 알림 우선순위
 * @returns 색상 코드
 */
export const getNotificationPriorityColor = (priority: NotificationPriority): string => {
  switch (priority) {
    case NotificationPriority.LOW:
      return '#718096'; // 회색
    case NotificationPriority.MEDIUM:
      return '#4299e1'; // 파란색
    case NotificationPriority.HIGH:
      return '#f6ad55'; // 주황색
    case NotificationPriority.URGENT:
      return '#e53e3e'; // 빨간색
    default:
      return '#4299e1'; // 기본 파란색
  }
};

/**
 * 알림 요약 정보 생성
 * @param notification - 알림 객체
 * @returns 요약된 알림 텍스트
 */
export const getNotificationSummary = (notification: Notification): string => {
  // 알림 제목은 최대 50자, 내용은 100자로 제한
  const title =
    notification.title.length > 50
      ? `${notification.title.substring(0, 47)}...`
      : notification.title;

  const message =
    notification.message.length > 100
      ? `${notification.message.substring(0, 97)}...`
      : notification.message;

  return `${title} - ${message}`;
};

/**
 * 알림 메시지를 타입에 따라 그룹화
 * @param notifications - 알림 배열
 * @returns 타입별로 그룹화된 알림 객체
 */
export const groupNotificationsByType = (
  notifications: Notification[]
): Record<NotificationType, Notification[]> => {
  const result: Record<string, Notification[]> = {};

  // 모든 타입에 대해 빈 배열로 초기화
  Object.values(NotificationType).forEach(type => {
    result[type] = [];
  });

  // 각 알림을 타입에 따라 그룹화
  notifications.forEach(notification => {
    result[notification.type].push(notification);
  });

  return result as Record<NotificationType, Notification[]>;
};

/**
 * 알림 메시지를 날짜별로 그룹화
 * @param notifications - 알림 배열
 * @returns 날짜별로 그룹화된 알림 객체
 */
export const groupNotificationsByDate = (
  notifications: Notification[]
): Record<string, Notification[]> => {
  const result: Record<string, Notification[]> = {};

  notifications.forEach(notification => {
    const date = dayjs(notification.createdAt).format('YYYY-MM-DD');

    if (!result[date]) {
      result[date] = [];
    }

    result[date].push(notification);
  });

  return result;
};
