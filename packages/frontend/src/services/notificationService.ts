import { api } from '../api';
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
let socket: any = null;

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
    const response = await api.get('/notifications', { params: filter });
    return response.data;
  },

  /**
   * 알림 수 가져오기
   */
  async getNotificationCount(): Promise<NotificationCount> {
    const response = await api.get('/notifications/count');
    return response.data;
  },

  /**
   * 특정 알림 조회
   * @param notificationId - 알림 ID
   * @returns 알림 정보
   */
  async getNotificationById(notificationId: string): Promise<Notification> {
    const response = await api.get(`/notifications/${notificationId}`);
    return response.data;
  },

  /**
   * 새 알림 생성
   * @param notificationData - 알림 데이터
   * @returns 생성된 알림 정보
   */
  async createNotification(notificationData: NotificationCreate): Promise<Notification> {
    const response = await api.post('/notifications', notificationData);
    return response.data;
  },

  /**
   * 알림 업데이트
   * @param notificationId - 알림 ID
   * @param updateData - 업데이트 데이터
   * @returns 업데이트된 알림 정보
   */
  async updateNotification(notificationId: string, updateData: NotificationUpdate): Promise<Notification> {
    const response = await api.patch(`/notifications/${notificationId}`, updateData);
    return response.data;
  },

  /**
   * 알림 삭제
   * @param notificationId - 알림 ID
   * @returns 삭제 성공 여부
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data.success;
  },

  /**
   * 해당 사용자의 모든 알림 삭제하기
   */
  async deleteAllNotifications(): Promise<boolean> {
    const response = await api.delete('/notifications/all');
    return response.data.success;
  },

  /**
   * 알림을 읽음으로 표시
   * @param notificationId - 알림 ID
   * @returns 업데이트된 알림 정보
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await api.post(`/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * 모든 알림을 읽음으로 표시
   * @param userId - 사용자 ID
   * @returns 성공 여부
   */
  async markAllAsRead(userId?: string): Promise<boolean> {
    const endpoint = userId ? `/users/${userId}/notifications/read-all` : '/notifications/read-all';
    const response = await api.post(endpoint);
    return response.data.success;
  },

  /**
   * 알림 보관 처리
   * @param notificationId - 알림 ID
   * @returns 업데이트된 알림 정보
   */
  async archiveNotification(notificationId: string): Promise<Notification> {
    const response = await api.post(`/notifications/${notificationId}/archive`);
    return response.data;
  },

  /**
   * 알림 통계 조회
   * @param userId - 사용자 ID
   * @returns 알림 통계 정보
   */
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    const response = await api.get(`/users/${userId}/notification-stats`);
    return response.data;
  },

  /**
   * 사용자 알림 환경설정 가져오기
   */
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    const response = await api.get('/notifications/preferences');
    return response.data;
  },

  /**
   * 사용자 알림 환경설정 업데이트하기
   */
  async updateNotificationPreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const response = await api.patch('/notifications/preferences', preferences);
    return response.data;
  },

  /**
   * 푸시 알림 구독하기
   */
  async subscribeToPushNotifications(subscription: Omit<NotificationSubscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<NotificationSubscription> {
    const response = await api.post('/notifications/subscribe', subscription);
    return response.data;
  },

  /**
   * 푸시 알림 구독 취소하기
   */
  async unsubscribeFromPushNotifications(endpoint: string): Promise<boolean> {
    const response = await api.post('/notifications/unsubscribe', { endpoint });
    return response.data.success;
  },

  /**
   * 실시간 알림 구독
   * @param userId - 사용자 ID
   * @param onNotification - 알림 수신 시 호출할 콜백 함수
   */
  subscribeToNotifications(userId: string, onNotification: Function): void {
    // 이미 연결된 소켓이 있는 경우 연결 해제
    if (socket) {
      this.unsubscribeFromNotifications();
    }

    // 소켓 서버 연결
    const socketUrl = process.env.REACT_APP_SOCKET_URL || '';
    socket = io(socketUrl);

    // 연결 이벤트 핸들링
    socket.on('connect', () => {
      console.log('Socket connected');
      // 사용자 ID로 알림 서버에 연결
      socket.emit('notification:connect', { userId });
    });

    // 연결 오류 핸들링
    socket.on('connect_error', (error: any) => {
      console.error('Socket connection error:', error);
    });

    // 새 알림 이벤트 리스닝
    socket.on('notification:new', (data: any) => {
      onNotification(data);
    });

    // 알림 업데이트 이벤트 리스닝
    socket.on('notification:update', (data: any) => {
      onNotification(data);
    });

    // 알림 삭제 이벤트 리스닝
    socket.on('notification:delete', (data: any) => {
      onNotification(data);
    });
  },

  /**
   * 실시간 알림 구독 해제
   */
  unsubscribeFromNotifications(): void {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  /**
   * 알림 템플릿 목록 가져오기 (관리자용)
   */
  async getNotificationTemplates(): Promise<NotificationTemplate[]> {
    const response = await api.get('/admin/notification-templates');
    return response.data;
  },

  /**
   * 알림 템플릿 상세 가져오기 (관리자용)
   */
  async getNotificationTemplate(templateId: string): Promise<NotificationTemplate> {
    const response = await api.get(`/admin/notification-templates/${templateId}`);
    return response.data;
  },

  /**
   * 알림 템플릿 생성하기 (관리자용)
   */
  async createNotificationTemplate(templateData: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
    const response = await api.post('/admin/notification-templates', templateData);
    return response.data;
  },

  /**
   * 알림 템플릿 업데이트하기 (관리자용)
   */
  async updateNotificationTemplate(
    templateId: string,
    updateData: Partial<Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<NotificationTemplate> {
    const response = await api.patch(`/admin/notification-templates/${templateId}`, updateData);
    return response.data;
  },

  /**
   * 알림 템플릿 삭제하기 (관리자용)
   */
  async deleteNotificationTemplate(templateId: string): Promise<boolean> {
    const response = await api.delete(`/admin/notification-templates/${templateId}`);
    return response.data.success;
  },

  /**
   * 알림 배치 생성하기 (관리자용)
   */
  async createNotificationBatch(batchData: Omit<NotificationBatch, 'id' | 'notificationCount' | 'status' | 'completedAt' | 'createdAt' | 'updatedAt'>): Promise<NotificationBatch> {
    const response = await api.post('/admin/notification-batches', batchData);
    return response.data;
  },

  /**
   * 알림 배치 목록 가져오기 (관리자용)
   */
  async getNotificationBatches(): Promise<NotificationBatch[]> {
    const response = await api.get('/admin/notification-batches');
    return response.data;
  },

  /**
   * 알림 배치 상세 가져오기 (관리자용)
   */
  async getNotificationBatch(batchId: string): Promise<NotificationBatch> {
    const response = await api.get(`/admin/notification-batches/${batchId}`);
    return response.data;
  },

  /**
   * 알림 배치 삭제하기 (관리자용)
   */
  async deleteNotificationBatch(batchId: string): Promise<boolean> {
    const response = await api.delete(`/admin/notification-batches/${batchId}`);
    return response.data.success;
  },

  /**
   * 알림 배치 실행하기 (관리자용)
   */
  async runNotificationBatch(batchId: string): Promise<NotificationBatch> {
    const response = await api.post(`/admin/notification-batches/${batchId}/run`);
    return response.data;
  },

  /**
   * 알림 배치 취소하기 (관리자용)
   */
  async cancelNotificationBatch(batchId: string): Promise<NotificationBatch> {
    const response = await api.post(`/admin/notification-batches/${batchId}/cancel`);
    return response.data;
  }
};

export default notificationService; 