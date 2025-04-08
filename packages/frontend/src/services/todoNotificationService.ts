import { Todo } from '../hooks/useTodoService';

/**
 * 알림 유형
 */
export enum NotificationType {
  UPCOMING_DUE = 'UPCOMING_DUE',
  OVERDUE = 'OVERDUE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  PRIORITY_HIGH = 'PRIORITY_HIGH',
}

/**
 * 알림 데이터 인터페이스
 */
export interface TodoNotification {
  id: string;
  todoId: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: Date;
  read: boolean;
}

/**
 * Todo 알림 서비스 클래스
 */
class TodoNotificationService {
  private notifications: TodoNotification[] = [];
  private notificationCounter = 0;
  private listeners: ((notifications: TodoNotification[]) => void)[] = [];
  private permissionGranted = false;

  constructor() {
    // 브라우저 알림 권한 요청
    this.requestNotificationPermission();
    
    // 로컬 스토리지에서 알림 복원
    this.loadNotificationsFromStorage();
  }

  /**
   * 브라우저 알림 권한 요청
   */
  public async requestNotificationPermission(): Promise<void> {
    if (!('Notification' in window)) {
      console.log('이 브라우저는 데스크톱 알림을 지원하지 않습니다.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
    } catch (error) {
      console.error('알림 권한 요청 중 오류가 발생했습니다:', error);
    }
  }

  /**
   * 로컬 스토리지에서 알림 불러오기
   */
  private loadNotificationsFromStorage(): void {
    try {
      const storedNotifications = localStorage.getItem('todoNotifications');
      if (storedNotifications) {
        const parsed = JSON.parse(storedNotifications);
        this.notifications = parsed.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        }));
        this.notificationCounter = this.notifications.length > 0 
          ? Math.max(...this.notifications.map(n => parseInt(n.id.split('-')[1], 10))) + 1
          : 0;
      }
    } catch (error) {
      console.error('알림을 로컬 스토리지에서 불러오는 중 오류가 발생했습니다:', error);
    }
  }

  /**
   * 알림을 로컬 스토리지에 저장
   */
  private saveNotificationsToStorage(): void {
    try {
      localStorage.setItem('todoNotifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('알림을 로컬 스토리지에 저장하는 중 오류가 발생했습니다:', error);
    }
  }

  /**
   * 알림 리스너 등록
   */
  public subscribeToNotifications(listener: (notifications: TodoNotification[]) => void): () => void {
    this.listeners.push(listener);
    
    // 현재 알림 목록으로 초기 콜백
    listener([...this.notifications]);
    
    // 구독 해제 함수 반환
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * 리스너들에게 알림 변경 사항 알림
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener([...this.notifications]);
    });
  }

  /**
   * 새 알림 생성
   */
  public createNotification(
    todoId: string,
    title: string,
    message: string,
    type: NotificationType
  ): TodoNotification {
    const notification: TodoNotification = {
      id: `notification-${this.notificationCounter++}`,
      todoId,
      title,
      message,
      type,
      createdAt: new Date(),
      read: false
    };

    this.notifications.push(notification);
    this.saveNotificationsToStorage();
    this.notifyListeners();
    
    // 브라우저 알림 표시
    this.showBrowserNotification(notification);
    
    return notification;
  }

  /**
   * 브라우저 알림 표시
   */
  private showBrowserNotification(notification: TodoNotification): void {
    if (!this.permissionGranted) return;
    
    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
      
      // 알림 클릭 시 처리
      browserNotification.onclick = () => {
        window.focus();
        this.markAsRead(notification.id);
      };
    } catch (error) {
      console.error('브라우저 알림을 표시하는 중 오류가 발생했습니다:', error);
    }
  }

  /**
   * 모든 Todo 목록에서 마감일 임박 항목 확인 및 알림 생성
   */
  public checkAndNotifyUpcomingDue(todos: Todo[]): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    todos.forEach(todo => {
      if (todo.completed || !todo.dueDate) return;
      
      const dueDate = new Date(todo.dueDate);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // 마감일 1일 전 알림
      if (diffDays === 1) {
        // 이미 알림이 있는지 확인
        const hasNotification = this.notifications.some(
          n => n.todoId === todo.id && n.type === NotificationType.UPCOMING_DUE
        );
        
        if (!hasNotification) {
          this.createNotification(
            todo.id,
            '마감일 임박',
            `'${todo.title}' 정비 작업의 마감일이 내일입니다.`,
            NotificationType.UPCOMING_DUE
          );
        }
      }
      
      // 기한 초과 알림
      if (diffDays < 0) {
        // 이미 알림이 있는지 확인
        const hasNotification = this.notifications.some(
          n => n.todoId === todo.id && n.type === NotificationType.OVERDUE
        );
        
        if (!hasNotification) {
          this.createNotification(
            todo.id,
            '마감일 초과',
            `'${todo.title}' 정비 작업의 마감일이 ${Math.abs(diffDays)}일 지났습니다.`,
            NotificationType.OVERDUE
          );
        }
      }
    });
  }

  /**
   * 우선순위가 높은 작업 알림
   */
  public notifyHighPriorityTodo(todo: Todo): void {
    if (todo.priority !== 'high') return;
    
    this.createNotification(
      todo.id,
      '중요 정비 작업',
      `'${todo.title}' 정비 작업이 높은 우선순위로 등록되었습니다.`,
      NotificationType.PRIORITY_HIGH
    );
  }

  /**
   * 작업 상태 변경 알림
   */
  public notifyStatusChange(todo: Todo, wasCompleted: boolean): void {
    const statusText = todo.completed ? '완료됨' : '진행 중';
    const prevStatusText = wasCompleted ? '완료됨' : '진행 중';
    
    this.createNotification(
      todo.id,
      '상태 변경',
      `'${todo.title}' 정비 작업이 ${prevStatusText}에서 ${statusText}(으)로 변경되었습니다.`,
      NotificationType.STATUS_CHANGE
    );
  }

  /**
   * 알림을 읽음으로 표시
   */
  public markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotificationsToStorage();
      this.notifyListeners();
    }
  }

  /**
   * 모든 알림을 읽음으로 표시
   */
  public markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    this.saveNotificationsToStorage();
    this.notifyListeners();
  }

  /**
   * 특정 알림 삭제
   */
  public deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotificationsToStorage();
    this.notifyListeners();
  }

  /**
   * 모든 알림 삭제
   */
  public clearAllNotifications(): void {
    this.notifications = [];
    this.saveNotificationsToStorage();
    this.notifyListeners();
  }

  /**
   * 읽지 않은 알림 수 반환
   */
  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * 모든 알림 반환
   */
  public getAllNotifications(): TodoNotification[] {
    return [...this.notifications].sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }
}

// 싱글톤 인스턴스 생성
export const todoNotificationService = new TodoNotificationService();

export default todoNotificationService; 