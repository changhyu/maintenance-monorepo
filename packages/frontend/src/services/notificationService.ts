import axios from 'axios';

// 알림 타입 정의
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
  VEHICLE = 'vehicle',
  SYSTEM = 'system',
  APPOINTMENT = 'appointment',
  SERVICE = 'service',
  RECALL = 'recall',
  PAYMENT = 'payment',
  MESSAGE = 'message'
}

// 알림 우선순위 정의
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

// 알림 카테고리 정의
export enum NotificationCategory {
  INQUIRY = 'inquiry',
  MAINTENANCE = 'maintenance',
  VEHICLE = 'vehicle',
  SYSTEM = 'system'
}

// 알림 상태 정의
export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived'
}

// 알림 데이터 인터페이스
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority?: string;
  category?: string;
  status: NotificationStatus;
  isRead?: boolean;
  createdAt: string;
  link?: string;
  metadata?: Record<string, any>;
}

// 알림 생성 인터페이스
export interface NotificationCreate {
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  category: NotificationCategory;
  link?: string;
  metadata?: Record<string, any>;
}

// 알림 업데이트 인터페이스
export interface NotificationUpdate {
  title?: string;
  message?: string;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  link?: string;
  metadata?: Record<string, any>;
}

// 알림 필터 인터페이스
export interface NotificationFilter {
  userId?: string;
  type?: string;
  status?: string;
  category?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

// 알림 통계 인터페이스
export interface NotificationStats {
  total: number;
  unread: number;
  today: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}

// 알림 기본 설정 인터페이스
export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  soundEnabled: boolean;
  categories: Record<string, boolean>;
}

// 알림 서비스 인터페이스
export interface NotificationService {
  getNotifications(filter: NotificationFilter): Promise<{ notifications: Notification[]; total: number }>;
  getNotificationById(id: string): Promise<Notification>;
  createNotification(notification: NotificationCreate): Promise<Notification>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  updateNotification(id: string, update: NotificationUpdate): Promise<Notification>;
  getNotificationStats(): Promise<NotificationStats>;
  getNotificationPreferences(): Promise<NotificationPreferences>;
  updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void): void;
  unsubscribeFromNotifications(): void;
}

class NotificationServiceImpl implements NotificationService {
  private static instance: NotificationServiceImpl;
  private baseUrl: string; 
  private subscriptionCallback: ((notification: Notification) => void) | null = null;
  private eventSource: EventSource | null = null;

  private constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
  }

  public static getInstance(): NotificationServiceImpl {
    if (!NotificationServiceImpl.instance) {
      NotificationServiceImpl.instance = new NotificationServiceImpl();
    }
    return NotificationServiceImpl.instance;
  }

  async getNotifications(filter: NotificationFilter): Promise<{ notifications: Notification[]; total: number }> {
    try {
      const response = await axios.get(`${this.baseUrl}/notifications`, { params: filter });
      return response.data;
    } catch (error) {
      console.error('알림 목록 조회 실패:', error);
      
      // 에러 발생시 목업 데이터 반환 (개발용)
      if (process.env.NODE_ENV === 'development') {
        return {
          notifications: this.getMockNotifications(),
          total: this.getMockNotifications().length
        };
      }
      throw error;
    }
  }

  async getNotificationById(id: string): Promise<Notification> {
    try {
      const response = await axios.get(`${this.baseUrl}/notifications/${id}`);
      return response.data;
    } catch (error) {
      console.error('알림 상세 조회 실패:', error);
      throw error;
    }
  }

  async createNotification(notification: NotificationCreate): Promise<Notification> {
    try {
      const response = await axios.post(`${this.baseUrl}/notifications`, notification);
      return response.data;
    } catch (error) {
      console.error('알림 생성 실패:', error);
      throw error;
    }
  }

  async markAsRead(id: string): Promise<void> {
    try {
      await axios.put(`${this.baseUrl}/notifications/${id}/read`);
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
      throw error;
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await axios.put(`${this.baseUrl}/notifications/read-all`);
    } catch (error) {
      console.error('전체 알림 읽음 처리 실패:', error);
      throw error;
    }
  }

  async deleteNotification(id: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/notifications/${id}`);
    } catch (error) {
      console.error('알림 삭제 실패:', error);
      throw error;
    }
  }

  async updateNotification(id: string, update: NotificationUpdate): Promise<Notification> {
    try {
      const response = await axios.put(`${this.baseUrl}/notifications/${id}`, update);
      return response.data;
    } catch (error) {
      console.error('알림 업데이트 실패:', error);
      throw error;
    }
  }

  async getNotificationStats(): Promise<NotificationStats> {
    try {
      const response = await axios.get(`${this.baseUrl}/notifications/stats`);
      return response.data;
    } catch (error) {
      console.error('알림 통계 조회 실패:', error);
      throw error;
    }
  }

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    try {
      const response = await axios.get(`${this.baseUrl}/notifications/preferences`);
      return response.data;
    } catch (error) {
      console.error('알림 설정 조회 실패:', error);
      throw error;
    }
  }

  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    try {
      const response = await axios.put(`${this.baseUrl}/notifications/preferences`, preferences);
      return response.data;
    } catch (error) {
      console.error('알림 설정 업데이트 실패:', error);
      throw error;
    }
  }

  // 실시간 알림 구독 (Server-Sent Events)
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void): void {
    // 기존 구독이 있으면 해제
    this.unsubscribeFromNotifications();
    
    // 콜백 저장
    this.subscriptionCallback = callback;
    
    try {
      // SSE 연결 설정 (실제 API가 없는 경우 개발용 목업 데이터 처리로 대체)
      if (process.env.NODE_ENV === 'development') {
        // 개발 환경에서는 5초마다 목업 알림 전송
        const interval = setInterval(() => {
          if (this.subscriptionCallback) {
            const mockNotifications = this.getMockNotifications();
            const randomIndex = Math.floor(Math.random() * mockNotifications.length);
            const randomNotification = {
              ...mockNotifications[randomIndex],
              id: `mock-${Date.now()}`  // 고유 ID 생성
            };
            this.subscriptionCallback(randomNotification);
          }
        }, 60000); // 1분마다 테스트 알림
        
        // interval ID를 저장하기 위한 임시 EventSource 객체 생성
        this.eventSource = { 
          close: () => clearInterval(interval) 
        } as unknown as EventSource;
      } else {
        // 프로덕션: 실제 SSE 연결
        const eventSource = new EventSource(`${this.baseUrl}/notifications/subscribe/${userId}`);
        
        eventSource.onmessage = (event) => {
          const notification = JSON.parse(event.data) as Notification;
          if (this.subscriptionCallback) {
            this.subscriptionCallback(notification);
          }
        };
        
        eventSource.onerror = (error) => {
          console.error('알림 구독 오류:', error);
          this.eventSource?.close();
          this.eventSource = null;
        };
        
        this.eventSource = eventSource;
      }
    } catch (error) {
      console.error('알림 구독 설정 실패:', error);
    }
  }

  // 알림 구독 해제
  unsubscribeFromNotifications(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.subscriptionCallback = null;
  }

  // 테스트용 목업 데이터
  getMockNotifications(): Notification[] {
    return [
      {
        id: '1',
        title: '차량 정비 알림',
        message: '차량 정기 점검이 예정되어 있습니다.',
        type: NotificationType.MAINTENANCE,
        category: NotificationCategory.VEHICLE,
        priority: NotificationPriority.HIGH,
        status: NotificationStatus.UNREAD,
        isRead: false,
        createdAt: new Date().toISOString(),
        link: '/maintenance/schedule/1',
        metadata: {
          vehicleId: 'VH001',
          maintenanceType: 'regular'
        }
      },
      {
        id: '2',
        title: '부품 재고 부족',
        message: '엔진 오일 필터 재고가 부족합니다.',
        type: NotificationType.WARNING,
        category: NotificationCategory.MAINTENANCE,
        priority: NotificationPriority.MEDIUM,
        status: NotificationStatus.UNREAD,
        isRead: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        link: '/inventory/parts/EF001',
        metadata: {
          partId: 'EF001',
          currentStock: 5,
          minStock: 10
        }
      }
    ];
  }
}

export default NotificationServiceImpl;

// 새 문의 접수 알림 생성 헬퍼 함수
export const createNewInquiryNotification = async (inquiry: any) => {
  try {
    const notification: NotificationCreate = {
      title: '새 문의 접수',
      message: `${inquiry.customerName}님이 새로운 문의를 등록했습니다: ${inquiry.title}`,
      type: NotificationType.INFO,
      priority: NotificationPriority.MEDIUM,
      category: NotificationCategory.INQUIRY,
      link: `/inquiries?id=${inquiry.id}`,
      metadata: {
        inquiryId: inquiry.id,
        customerName: inquiry.customerName,
        customerEmail: inquiry.customerEmail
      }
    };
    
    return await NotificationServiceImpl.getInstance().createNotification(notification);
  } catch (error) {
    console.error('새 문의 알림 생성 중 오류 발생:', error);
    return null;
  }
};