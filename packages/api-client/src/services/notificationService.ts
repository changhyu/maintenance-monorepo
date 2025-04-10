import { ApiClient } from '../client';

// 알림 데이터를 위한 타입 정의
export type NotificationData = Record<string, unknown>;

export enum NotificationType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum NotificationCategory {
  SYSTEM = 'SYSTEM',
  MAINTENANCE = 'MAINTENANCE',
  VEHICLE = 'VEHICLE',
  USER = 'USER',
  SHOP = 'SHOP',
  PAYMENT = 'PAYMENT',
  REPORT = 'REPORT'
}

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  ARCHIVED = 'ARCHIVED'
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  category: NotificationCategory;
  status: NotificationStatus;
  createdAt: string;
  expiresAt?: string;
  readAt?: string;
  link?: string;
  data?: NotificationData;
}

export interface NotificationCreate {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  category: NotificationCategory;
  expiresAt?: string;
  link?: string;
  data?: NotificationData;
}

export interface NotificationUpdate {
  status?: NotificationStatus;
  readAt?: string;
}

export interface NotificationFilter {
  userId?: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  status?: NotificationStatus | NotificationStatus[];
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationStats {
  total: number;
  unread: number;
  byPriority: Record<NotificationPriority, number>;
  byCategory: Record<NotificationCategory, number>;
}

export interface NotificationCount {
  total: number;
  unread: number;
}

// 알림 콜백 함수 타입 정의
export type NotificationCallback = (notification: Notification) => void;

export class NotificationService {
  private client: ApiClient;
  private basePath = '/notifications';
  private socketConnection: unknown = null;
  private socketListeners: Map<string, NotificationCallback> = new Map();

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  // 알림 목록 조회
  async getNotifications(filter?: NotificationFilter): Promise<Notification[]> {
    return this.client.get<Notification[]>(this.basePath, { params: filter });
  }

  // 특정 알림 조회
  async getNotificationById(notificationId: string): Promise<Notification> {
    return this.client.get<Notification>(`${this.basePath}/${notificationId}`);
  }

  // 새 알림 생성
  async createNotification(notificationData: NotificationCreate): Promise<Notification> {
    return this.client.post<Notification>(this.basePath, notificationData);
  }

  // 알림 업데이트
  async updateNotification(notificationId: string, updateData: NotificationUpdate): Promise<Notification> {
    return this.client.put<Notification>(`${this.basePath}/${notificationId}`, updateData);
  }

  // 알림 삭제
  async deleteNotification(notificationId: string): Promise<boolean> {
    await this.client.delete(`${this.basePath}/${notificationId}`);
    return true;
  }

  // 알림을 읽음으로 표시
  async markAsRead(notificationId: string): Promise<Notification> {
    return this.client.put<Notification>(`${this.basePath}/${notificationId}/read`, {});
  }

  // 모든 알림을 읽음으로 표시
  async markAllAsRead(userId: string): Promise<boolean> {
    await this.client.put(`/users/${userId}/notifications/read-all`, {});
    return true;
  }

  // 알림 보관 처리
  async archiveNotification(notificationId: string): Promise<Notification> {
    return this.client.put<Notification>(`${this.basePath}/${notificationId}/archive`, {});
  }

  // 알림 통계 조회
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    return this.client.get<NotificationStats>(`/users/${userId}/notification-stats`);
  }

  // 읽지 않은 알림 개수 조회
  async getNotificationCount(userId?: string): Promise<NotificationCount> {
    const path = userId ? `/users/${userId}/notification-count` : '/notifications/count';
    return this.client.get<NotificationCount>(path);
  }

  // 실시간 알림 구독 (Socket.IO)
  // 참고: 실제 구현은 외부 라이브러리(Socket.IO)에 의존하므로 여기서는 인터페이스만 정의
  subscribeToNotifications(userId: string, callback: NotificationCallback): void {
    // 실제 Socket.IO 구현은 이 클래스를 사용하는 코드에서 처리해야 함
    console.log(`Socket.IO: Subscribing to notifications for user ${userId}`);
    this.socketListeners.set('notification:new', callback);
  }

  // 실시간 알림 구독 해제
  unsubscribeFromNotifications(): void {
    console.log('Socket.IO: Unsubscribing from notifications');
    this.socketListeners.clear();
    if (this.socketConnection) {
      // 소켓 연결 해제 코드
    }
  }
} 