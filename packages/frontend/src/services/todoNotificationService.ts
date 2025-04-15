import { Todo, TodoPriority } from './todoService';
import config from '../config';
import { isPastDate } from '../utils/dateUtils';
import logger from '../utils/logger';

/**
 * 날짜 형식화 함수
 */
function formatDate(dateString: string): string {
  if (!dateString) {
    return '';
  }
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString.split('T')[0]; // 기본 포맷
  }
}

/**
 * 알림 타입 열거형
 */
export enum NotificationType {
  UPCOMING_DUE = 'upcoming_due',
  OVERDUE = 'overdue',
  STATUS_CHANGE = 'status_change',
  PRIORITY_HIGH = 'priority_high',
  GENERAL = 'general'
}

/**
 * 알림 우선순위 매핑
 */
const NotificationPriority = {
  [NotificationType.OVERDUE]: 0,
  [NotificationType.PRIORITY_HIGH]: 1,
  [NotificationType.UPCOMING_DUE]: 2,
  [NotificationType.STATUS_CHANGE]: 3,
  [NotificationType.GENERAL]: 4
};

/**
 * Todo 알림 인터페이스
 */
export interface TodoNotification {
  id: string;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
  type: NotificationType;
  todoId: string;
  expiry?: number;
}

/**
 * 알림 인터페이스 (내부 사용)
 */
interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'due' | 'status' | 'priority' | 'general';
  todoId?: string;
  expiry?: number; // 만료 시간 (타임스탬프)
}

/**
 * 로컬 스토리지 키
 */
const NOTIFICATION_STORAGE_KEY = 'todo-notifications';
const PERMISSION_REQUESTED_KEY = 'notification-permission-requested';

/**
 * Todo 관련 알림 서비스 클래스
 */
class TodoNotificationService {
  private notifications: Notification[] = [];
  private hasPermission: boolean = false;
  private readonly sentNotifications: Set<string> = new Set();

  constructor() {
    this.loadNotifications();
    this.checkPermission();
  }

  /**
   * 알림 권한 확인
   */
  private checkPermission(): void {
    if (!('Notification' in window)) {
      logger.info('이 브라우저는 데스크톱 알림을 지원하지 않습니다.');
      return;
    }

    this.hasPermission = Notification.permission === 'granted';
  }

  /**
   * 알림 권한 요청
   */
  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    // 이미 권한이 있는 경우
    if (Notification.permission === 'granted') {
      this.hasPermission = true;
      return true;
    }

    // 이미 거부된 경우
    if (Notification.permission === 'denied') {
      this.hasPermission = false;
      return false;
    }

    // 로컬 스토리지 확인 (불필요한 중복 요청 방지)
    const permissionRequested = localStorage.getItem(PERMISSION_REQUESTED_KEY);
    if (permissionRequested) {
      return false;
    }

    try {
      // 권한 요청
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';

      // 요청 기록 저장
      localStorage.setItem(PERMISSION_REQUESTED_KEY, 'true');

      return this.hasPermission;
    } catch (error) {
      logger.error('알림 권한 요청 중 오류 발생:', error);
      return false;
    }
  }

  /**
   * 로컬 스토리지에서 알림 로드
   */
  private loadNotifications(): void {
    try {
      const storedNotifications = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (storedNotifications) {
        this.notifications = JSON.parse(storedNotifications);

        // 오래된 알림 자동 정리
        this.cleanOldNotifications();
      }
    } catch (error) {
      logger.error('알림 로드 중 오류 발생:', error);
      this.notifications = [];
    }
  }

  /**
   * 로컬 스토리지에 알림 저장
   */
  private saveNotifications(): void {
    try {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(this.notifications));
    } catch (error) {
      logger.error('알림 저장 중 오류 발생:', error);
    }
  }

  /**
   * 오래된 알림 정리
   */
  private cleanOldNotifications(): void {
    const now = Date.now();
    const maxNotifications = config.notificationSettings.storageQuota;

    // 만료된 알림 제거
    let unexpiredNotifications = this.notifications.filter(
      notification => !notification.expiry || notification.expiry > now
    );

    // 최대 개수 초과 시 가장 오래된 알림부터 제거
    if (unexpiredNotifications.length > maxNotifications) {
      unexpiredNotifications.sort((a, b) => a.timestamp - b.timestamp);
      const removeCount = unexpiredNotifications.length - maxNotifications;
      unexpiredNotifications = unexpiredNotifications.slice(removeCount);

      logger.info(`스토리지 공간 확보를 위해 ${removeCount}개의 오래된 알림을 자동 정리했습니다.`);
    }

    this.notifications = unexpiredNotifications;
    this.saveNotifications();
  }

  /**
   * 새 알림 추가
   */
  private addNotification(
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ): Notification {
    // 중복 방지를 위한 ID 생성
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      read: false
    };

    this.notifications.unshift(newNotification);
    this.saveNotifications();

    // 저장 후 자동 정리 (최대 개수 초과 방지)
    this.cleanOldNotifications();

    return newNotification;
  }

  /**
   * 데스크톱 알림 표시
   */
  private showDesktopNotification(title: string, message: string): void {
    if (!this.hasPermission) {
      return;
    }

    try {
      const notification = new Notification(title, {
        body: message,
        icon: '/logo192.png'
      });

      // 10초 후 자동 닫기
      setTimeout(() => {
        notification.close();
      }, 10000);

      // 클릭 시 앱으로 포커스
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      logger.error('데스크톱 알림 표시 중 오류 발생:', error);
    }
  }

  /**
   * 높은 우선순위 Todo에 대한 알림
   */
  public notifyHighPriorityTodo(todo: Todo): void {
    if (todo.priority !== TodoPriority.HIGH) {
      return;
    }

    const notification = this.addNotification({
      title: '높은 우선순위 작업',
      message: `새 작업이 추가되었습니다: ${todo.title}`,
      type: 'priority',
      todoId: todo.id,
      expiry: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7일 후 만료
    });

    if (this.hasPermission) {
      this.showDesktopNotification(notification.title, notification.message);
    }
  }

  /**
   * Todo 상태 변경 알림
   */
  public notifyStatusChange(todo: Todo, previousCompleted: boolean): void {
    // 완료 상태가 변경된 경우에만 알림 생성
    if (todo.completed === previousCompleted) {
      return;
    }

    const statusText = todo.completed ? '완료됨' : '진행 중';

    const notification = this.addNotification({
      title: '작업 상태 변경',
      message: `작업 '${todo.title}'이(가) ${statusText}(으)로 변경되었습니다.`,
      type: 'status',
      todoId: todo.id,
      expiry: Date.now() + 3 * 24 * 60 * 60 * 1000 // 3일 후 만료
    });

    if (this.hasPermission) {
      this.showDesktopNotification(notification.title, notification.message);
    }
  }

  /**
   * 마감일 임박 알림 확인
   */
  public checkAndNotifyUpcomingDue(todos: Todo[]): void {
    try {
      if (!Array.isArray(todos) || todos.length === 0) {
        return;
      }

      const today = new Date();
      const upcoming = todos.filter(todo => {
        if (!todo.dueDate || todo.completed) {
          return false;
        }

        // ISO 문자열에서 날짜 부분만 추출
        const dueDateStr = todo.dueDate.split('T')[0];
        const dueDate = new Date(dueDateStr);

        // 오늘로부터 3일 이내인지 확인 (오늘 포함)
        const timeDiff = dueDate.getTime() - today.getTime();
        const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        return dayDiff >= 0 && dayDiff <= 3;
      });

      upcoming.forEach(todo => {
        // 이미 알림을 보냈는지 확인 (당일에 한번만 알림)
        const notificationKey = `upcoming-${todo.id}-${new Date().toISOString().split('T')[0]}`;
        const notificationSent = this.sentNotifications.has(notificationKey);

        if (!notificationSent) {
          this.addNotification({
            title: '마감일 임박',
            message: `작업 "${todo.title}"의 마감일이 ${formatDate(todo.dueDate ?? '')}로 임박했습니다.`,
            type: 'due',
            todoId: todo.id,
            expiry: Date.now() + 2 * 24 * 60 * 60 * 1000 // 2일 후 만료
          });

          // 당일에는 다시 알림을 보내지 않도록 설정
          this.sentNotifications.add(notificationKey);

          // 데스크톱 알림 표시
          this.showDesktopNotification(
            '마감일 임박',
            `작업 "${todo.title}"의 마감일이 ${formatDate(todo.dueDate ?? '')}로 임박했습니다.`
          );
        }
      });
    } catch (error) {
      logger.error('기한 임박 할 일 알림 실패:', error);
    }
  }

  /**
   * 기한이 지난 할 일 확인 및 알림
   * @param todos 할 일 목록
   */
  public checkAndNotifyOverdue(todos: Todo[]): void {
    try {
      if (!Array.isArray(todos) || todos.length === 0) {
        return;
      }

      const overdue = todos.filter(todo => {
        if (!todo.dueDate || todo.completed || todo.status === 'completed') {
          return false;
        }
        return isPastDate(todo.dueDate);
      });

      overdue.forEach(todo => {
        // 이미 알림을 보냈는지 확인 (당일에 한번만 알림)
        const notificationKey = `overdue-${todo.id}-${new Date().toISOString().split('T')[0]}`;
        const notificationSent = this.sentNotifications.has(notificationKey);

        if (!notificationSent) {
          this.addNotification({
            title: '마감일 초과',
            message: `작업 "${todo.title}"의 마감일(${formatDate(todo.dueDate ?? '')})이 지났습니다.`,
            type: 'due',
            todoId: todo.id,
            expiry: Date.now() + 5 * 24 * 60 * 60 * 1000 // 5일 후 만료
          });

          // 당일에는 다시 알림을 보내지 않도록 설정
          this.sentNotifications.add(notificationKey);

          // 데스크톱 알림 표시
          this.showDesktopNotification(
            '마감일 초과',
            `작업 "${todo.title}"의 마감일(${formatDate(todo.dueDate ?? '')})이 지났습니다.`
          );
        }
      });
    } catch (error) {
      logger.error('기한 초과 할 일 알림 실패:', error);
    }
  }

  /**
   * 모든 알림 목록 조회
   */
  public getAllNotifications(): TodoNotification[] {
    return this.mapNotificationsArray(this.notifications);
  }

  /**
   * 알림 타입별 필터링
   */
  public getNotificationsByType(type: NotificationType): TodoNotification[] {
    const mappedNotifications = this.mapNotificationsArray(this.notifications);
    return mappedNotifications.filter(notification => notification.type === type);
  }

  /**
   * 우선순위별로 정렬된 알림 목록 조회
   */
  public getSortedNotifications(): TodoNotification[] {
    const mappedNotifications = this.mapNotificationsArray(this.notifications);
    return mappedNotifications.sort((a, b) => {
      // 먼저 우선순위로 정렬
      const priorityA = NotificationPriority[a.type] ?? 999;
      const priorityB = NotificationPriority[b.type] ?? 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB; // 우선순위 오름차순
      }

      // 우선순위가 같으면 읽지 않은 알림이 먼저 표시
      if (a.read !== b.read) {
        return a.read ? 1 : -1;
      }

      // 둘 다 같으면 최신 알림이 먼저 표시
      return b.createdAt - a.createdAt;
    });
  }

  /**
   * 알림 읽음 처리
   */
  public markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
    }
  }

  /**
   * 모든 알림 읽음 처리
   */
  public markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    this.saveNotifications();
  }

  /**
   * 특정 알림 삭제
   */
  public deleteNotification(notificationId: string): void {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      this.saveNotifications();
    }
  }

  /**
   * 모든 알림 삭제
   */
  public clearAllNotifications(): void {
    this.notifications = [];
    this.saveNotifications();
  }

  /**
   * 특정 타입의 알림 모두 삭제
   */
  public clearNotificationsByType(type: NotificationType): void {
    const mappedNotifications = this.mapNotificationsArray(this.notifications);
    const idsToDelete = mappedNotifications
      .filter(n => n.type === type)
      .map(n => n.id);

    this.notifications = this.notifications.filter(n => !idsToDelete.includes(n.id));
    this.saveNotifications();
  }

  /**
   * 읽지 않은 알림 개수 조회
   */
  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * 특정 타입의 알림 모두 삭제
   */
  public getUnreadCountByType(type: NotificationType): number {
    const mappedNotifications = this.mapNotificationsArray(this.notifications);
    return mappedNotifications.filter(n => n.type === type && !n.read).length;
  }

  /**
   * 알림 변경 구독 함수
   */
  public subscribeToNotifications(callback: (notifications: TodoNotification[]) => void) {
    // 초기 알림 목록 제공
    const mappedNotifications = this.mapNotificationsArray(this.notifications);
    callback(mappedNotifications);

    // 1초마다 알림 목록 확인하여 변경 시 콜백 호출 (실제로는 이벤트 기반으로 구현하는 것이 좋음)
    const interval = setInterval(() => {
      const currentNotifications = this.mapNotificationsArray(this.notifications);
      callback(currentNotifications);
    }, 1000);

    // 구독 해제 함수 반환
    return () => clearInterval(interval);
  }

  /**
   * 내부 Notification을 외부 TodoNotification으로 변환
   */
  private mapNotification(notification: Notification): TodoNotification {
    // 알림 타입 결정
    let type = this.mapNotificationType(notification.type);
    if (type === NotificationType.UPCOMING_DUE && notification.message.includes('지났습니다')) {
      type = NotificationType.OVERDUE;
    }

    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      createdAt: notification.timestamp,
      read: notification.read,
      type,
      todoId: notification.todoId ?? '',
      expiry: notification.expiry
    };
  }

  /**
   * Notification 배열을 TodoNotification 배열로 변환
   */
  private mapNotificationsArray(notifications: Notification[]): TodoNotification[] {
    return notifications.map(notification => this.mapNotification(notification));
  }

  /**
   * 에러 알림 표시
   */
  public notifyError(message: string): void {
    const notification = this.addNotification({
      title: '오류 발생',
      message,
      type: 'general',
      expiry: Date.now() + 24 * 60 * 60 * 1000 // 1일 후 만료
    });

    if (this.hasPermission) {
      this.showDesktopNotification(notification.title, notification.message);
    }
  }

  private mapNotificationType(type: 'due' | 'status' | 'priority' | 'general'): NotificationType {
    switch (type) {
      case 'due':
        // 메시지 내용으로 임박/초과 구분은 호출하는 쪽에서 처리
        return NotificationType.UPCOMING_DUE;
      case 'status':
        return NotificationType.STATUS_CHANGE;
      case 'priority':
        return NotificationType.PRIORITY_HIGH;
      case 'general':
        return NotificationType.GENERAL;
      default:
        return NotificationType.GENERAL;
    }
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const todoNotificationService = new TodoNotificationService();
export default todoNotificationService;
