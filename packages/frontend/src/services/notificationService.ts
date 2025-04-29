import axios from 'axios';
import {
  Notification,
  NotificationService,
  NotificationFilter,
  NotificationCreate,
  NotificationUpdate,
  NotificationStats,
  NotificationPreferences
} from '../types/notification';

// API 기본 설정
const API_URL = '/api';

// 알림 타입 정의
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
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
  type: NotificationType;
  priority: NotificationPriority;
  category: NotificationCategory;
  status: NotificationStatus;
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

interface Notification {
  id: string;
  type: 'MAINTENANCE' | 'INVENTORY' | 'VEHICLE' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  status: 'UNREAD' | 'READ';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  link?: string;
}

interface NotificationSettings {
  maintenance: boolean;
  inventory: boolean;
  vehicle: boolean;
  system: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  lowStockAlert: number;
  maintenanceReminder: number;
}

class NotificationServiceImpl implements NotificationService {
  private static instance: NotificationServiceImpl;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
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

  // 테스트용 목업 데이터
  getMockNotifications(): Notification[] {
    return [
      {
        id: '1',
        title: '차량 정비 알림',
        message: '차량 정기 점검이 예정되어 있습니다.',
        type: 'maintenance',
        category: 'vehicle',
        priority: 'high',
        status: 'unread',
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
        type: 'warning',
        category: 'maintenance',
        priority: 'medium',
        status: 'unread',
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