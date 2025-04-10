import { api } from './api';
import {
  Notification,
  NotificationCreate,
  NotificationFilter,
  NotificationStats,
  NotificationUpdate,
  NotificationPreferences,
  NotificationCount,
  NotificationBatch,
  NotificationTemplate,
  NotificationSubscription
} from '../types/notification';
import io from 'socket.io-client';

/**
 * 소켓 연결 인스턴스
 */
let socket: ReturnType<typeof io> | null = null;

/**
 * 알림 관련 API 서비스
 */
export const notificationService = {
  /**
   * 사용자 알림 목록 조회
   * @param filter - 필터링 옵션
   * @returns 알림 목록
   */
  async getNotifications(filter?: NotificationFilter): Promise<Notification[]> {
    try {
      const response = await api.get('/notifications', { params: filter });
      return response.data;
    } catch (error) {
      console.error('알림 목록 조회 실패:', error);
      return [];
    }
  },

  /**
   * 기본 카운트 객체 반환
   */
  getDefaultCounts(): Partial<NotificationCount> {
    return {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      read: 0,
      unread: 0,
      severity: {
        high: 0,
        medium: 0,
        low: 0
      }
    };
  },

  /**
   * 알림 개수 조회
   */
  async getNotificationCount(): Promise<NotificationCount> {
    try {
      // API 호출하는 실제 구현으로 대체 필요
      // const response = await this.apiClient.get(`${this.basePath}/count`);
      // return response.data;
      
      // 임시 하드코딩 데이터
      return {
        total: 15,
        pending: 5,
        inProgress: 3,
        completed: 7,
        read: 10,
        unread: 5,
        severity: {
          high: 3,
          medium: 7,
          low: 5
        }
      };
    } catch (error) {
      console.error('[notificationService] 알림 개수 조회 실패:', error);
      
      // 오류 발생 시 기본값 반환
      return {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        read: 0,
        unread: 0,
        severity: {
          high: 0,
          medium: 0,
          low: 0
        }
      };
    }
  },

  /**
   * 특정 알림 조회
   * @param notificationId - 알림 ID
   * @returns 알림 정보
   */
  async getNotificationById(notificationId: string): Promise<Notification | null> {
    try {
      const response = await api.get(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error(`알림 ID ${notificationId} 조회 실패:`, error);
      return null;
    }
  },

  /**
   * 새 알림 생성
   * @param notificationData - 알림 데이터
   * @returns 생성된 알림 정보
   */
  async createNotification(notificationData: NotificationCreate): Promise<Notification | null> {
    try {
      const response = await api.post('/notifications', notificationData);
      return response.data;
    } catch (error) {
      console.error('알림 생성 실패:', error);
      return null;
    }
  },

  /**
   * 알림 업데이트
   * @param notificationId - 알림 ID
   * @param updateData - 업데이트 데이터
   * @returns 업데이트된 알림 정보
   */
  async updateNotification(notificationId: string, updateData: NotificationUpdate): Promise<Notification | null> {
    try {
      const response = await api.patch(`/notifications/${notificationId}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`알림 ID ${notificationId} 업데이트 실패:`, error);
      return null;
    }
  },

  /**
   * 알림 삭제
   * @param notificationId - 알림 ID
   * @returns 삭제 성공 여부
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data.success;
    } catch (error) {
      console.error(`알림 ID ${notificationId} 삭제 실패:`, error);
      return false;
    }
  },

  /**
   * 해당 사용자의 모든 알림 삭제하기
   */
  async deleteAllNotifications(): Promise<boolean> {
    try {
      const response = await api.delete('/notifications/all');
      return response.data.success;
    } catch (error) {
      console.error('모든 알림 삭제 실패:', error);
      return false;
    }
  },

  /**
   * 알림을 읽음으로 표시
   * @param notificationId - 알림 ID
   * @returns 업데이트된 알림 정보
   */
  async markAsRead(notificationId: string): Promise<Notification | null> {
    try {
      const response = await api.post(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error(`알림 ID ${notificationId} 읽음 표시 실패:`, error);
      return null;
    }
  },

  /**
   * 모든 알림을 읽음으로 표시
   * @param userId - 사용자 ID
   * @returns 성공 여부
   */
  async markAllAsRead(userId?: string): Promise<boolean> {
    try {
      const endpoint = userId ? `/users/${userId}/notifications/read-all` : '/notifications/read-all';
      const response = await api.post(endpoint);
      return response.data.success;
    } catch (error) {
      console.error('모든 알림 읽음 표시 실패:', error);
      return false;
    }
  },

  /**
   * 알림 보관 처리
   * @param notificationId - 알림 ID
   * @returns 업데이트된 알림 정보
   */
  async archiveNotification(notificationId: string): Promise<Notification | null> {
    try {
      const response = await api.post(`/notifications/${notificationId}/archive`);
      return response.data;
    } catch (error) {
      console.error(`알림 ID ${notificationId} 보관 처리 실패:`, error);
      return null;
    }
  },

  /**
   * 알림 통계 조회
   * @param userId - 사용자 ID
   * @returns 알림 통계 정보
   */
  async getNotificationStats(userId: string): Promise<NotificationStats | null> {
    try {
      const response = await api.get(`/users/${userId}/notification-stats`);
      return response.data;
    } catch (error) {
      console.error(`사용자 ID ${userId}의 알림 통계 조회 실패:`, error);
      return null;
    }
  },

  /**
   * 사용자 알림 환경설정 가져오기
   */
  async getNotificationPreferences(): Promise<NotificationPreferences | null> {
    try {
      const response = await api.get('/notifications/preferences');
      return response.data;
    } catch (error) {
      console.error('알림 환경설정 조회 실패:', error);
      return null;
    }
  },

  /**
   * 사용자 알림 환경설정 업데이트하기
   */
  async updateNotificationPreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences | null> {
    try {
      const response = await api.patch('/notifications/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('알림 환경설정 업데이트 실패:', error);
      return null;
    }
  },

  /**
   * 푸시 알림 구독하기
   */
  async subscribeToPushNotifications(subscription: Omit<NotificationSubscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<NotificationSubscription | null> {
    try {
      const response = await api.post('/notifications/subscribe', subscription);
      return response.data;
    } catch (error) {
      console.error('푸시 알림 구독 실패:', error);
      return null;
    }
  },

  /**
   * 푸시 알림 구독 취소하기
   */
  async unsubscribeFromPushNotifications(endpoint: string): Promise<boolean> {
    try {
      const response = await api.post('/notifications/unsubscribe', { endpoint });
      return response.data.success;
    } catch (error) {
      console.error('푸시 알림 구독 취소 실패:', error);
      return false;
    }
  },

  /**
   * 실시간 알림 구독
   * @param userId - 사용자 ID
   * @param onNotification - 알림 수신 콜백 함수
   */
  subscribeToNotifications(userId: string, onNotification: (notification: Notification) => void): void {
    if (!userId) {
      console.error('사용자 ID 없이 알림을 구독할 수 없습니다.');
      return;
    }

    if (socket) {
      // 기존 연결이 있으면 연결 해제
      this.unsubscribeFromNotifications();
    }

    // 소켓 서버에 연결
    socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001', {
      query: { userId },
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('authToken') || ''
      }
    });

    // 연결 성공 이벤트
    socket.on('connect', () => {
      console.log('알림 서버에 연결됨:', socket?.id);
    });

    // 연결 실패 이벤트
    socket.on('connect_error', (error: Error) => {
      console.error('알림 서버 연결 실패:', error);
    });

    // 알림 수신 이벤트
    socket.on('notification:new', (data: Notification) => {
      onNotification(data);
    });

    // 알림 업데이트 이벤트
    socket.on('notification:update', (data: Notification) => {
      console.log('알림 업데이트:', data);
    });

    // 알림 삭제 이벤트
    socket.on('notification:delete', (data: { id: string }) => {
      console.log('알림 삭제:', data);
    });
  },

  /**
   * 알림 구독 해제
   */
  unsubscribeFromNotifications(): void {
    if (socket) {
      socket.disconnect();
      socket = null;
      console.log('알림 서버 연결 해제됨');
    }
  },

  /**
   * 알림 템플릿 목록 가져오기 (관리자용)
   */
  async getNotificationTemplates(): Promise<NotificationTemplate[]> {
    try {
      const response = await api.get('/admin/notification-templates');
      return response.data;
    } catch (error) {
      console.error('알림 템플릿 목록 조회 실패:', error);
      return [];
    }
  },

  /**
   * 알림 템플릿 상세 가져오기 (관리자용)
   */
  async getNotificationTemplate(templateId: string): Promise<NotificationTemplate | null> {
    try {
      const response = await api.get(`/admin/notification-templates/${templateId}`);
      return response.data;
    } catch (error) {
      console.error(`알림 템플릿 ID ${templateId} 조회 실패:`, error);
      return null;
    }
  },

  /**
   * 알림 템플릿 생성하기 (관리자용)
   */
  async createNotificationTemplate(templateData: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate | null> {
    try {
      const response = await api.post('/admin/notification-templates', templateData);
      return response.data;
    } catch (error) {
      console.error('알림 템플릿 생성 실패:', error);
      return null;
    }
  },

  /**
   * 알림 템플릿 업데이트하기 (관리자용)
   */
  async updateNotificationTemplate(
    templateId: string,
    updateData: Partial<Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<NotificationTemplate | null> {
    try {
      const response = await api.patch(`/admin/notification-templates/${templateId}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`알림 템플릿 ID ${templateId} 업데이트 실패:`, error);
      return null;
    }
  },

  /**
   * 알림 템플릿 삭제하기 (관리자용)
   */
  async deleteNotificationTemplate(templateId: string): Promise<boolean> {
    try {
      const response = await api.delete(`/admin/notification-templates/${templateId}`);
      return response.data.success;
    } catch (error) {
      console.error(`알림 템플릿 ID ${templateId} 삭제 실패:`, error);
      return false;
    }
  },

  /**
   * 알림 배치 생성하기 (관리자용)
   */
  async createNotificationBatch(batchData: Omit<NotificationBatch, 'id' | 'notificationCount' | 'status' | 'completedAt' | 'createdAt' | 'updatedAt'>): Promise<NotificationBatch | null> {
    try {
      const response = await api.post('/admin/notification-batches', batchData);
      return response.data;
    } catch (error) {
      console.error('알림 배치 생성 실패:', error);
      return null;
    }
  },

  /**
   * 알림 배치 목록 가져오기 (관리자용)
   */
  async getNotificationBatches(): Promise<NotificationBatch[]> {
    try {
      const response = await api.get('/admin/notification-batches');
      return response.data;
    } catch (error) {
      console.error('알림 배치 목록 조회 실패:', error);
      return [];
    }
  },

  /**
   * 알림 배치 상세 가져오기 (관리자용)
   */
  async getNotificationBatch(batchId: string): Promise<NotificationBatch | null> {
    try {
      const response = await api.get(`/admin/notification-batches/${batchId}`);
      return response.data;
    } catch (error) {
      console.error(`알림 배치 ID ${batchId} 조회 실패:`, error);
      return null;
    }
  },

  /**
   * 알림 배치 삭제하기 (관리자용)
   */
  async deleteNotificationBatch(batchId: string): Promise<boolean> {
    try {
      const response = await api.delete(`/admin/notification-batches/${batchId}`);
      return response.data.success;
    } catch (error) {
      console.error(`알림 배치 ID ${batchId} 삭제 실패:`, error);
      return false;
    }
  },

  /**
   * 알림 배치 실행하기 (관리자용)
   */
  async runNotificationBatch(batchId: string): Promise<NotificationBatch | null> {
    try {
      const response = await api.post(`/admin/notification-batches/${batchId}/run`);
      return response.data;
    } catch (error) {
      console.error(`알림 배치 ID ${batchId} 실행 실패:`, error);
      return null;
    }
  },

  /**
   * 알림 배치 취소하기 (관리자용)
   */
  async cancelNotificationBatch(batchId: string): Promise<NotificationBatch | null> {
    try {
      const response = await api.post(`/admin/notification-batches/${batchId}/cancel`);
      return response.data;
    } catch (error) {
      console.error(`알림 배치 ID ${batchId} 취소 실패:`, error);
      return null;
    }
  }
};

export default notificationService; 