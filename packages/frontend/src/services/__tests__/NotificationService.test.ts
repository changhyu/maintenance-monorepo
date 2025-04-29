import NotificationServiceImpl from '../NotificationService';
import { NotificationType, NotificationCategory, NotificationStatus } from '../../types/notification';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NotificationService', () => {
  let service: NotificationServiceImpl;

  beforeEach(() => {
    service = NotificationServiceImpl.getInstance();
    jest.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('알림 목록을 성공적으로 조회해야 합니다', async () => {
      const mockNotifications = [
        {
          id: '1',
          title: '차량 정비 알림',
          message: '차량 정기 점검이 예정되어 있습니다.',
          type: NotificationType.MAINTENANCE,
          category: NotificationCategory.VEHICLE,
          priority: 'high',
          status: NotificationStatus.UNREAD,
          isRead: false,
          createdAt: new Date().toISOString()
        }
      ];

      mockedAxios.get.mockResolvedValueOnce({ 
        data: { 
          notifications: mockNotifications,
          total: 1
        } 
      });

      const result = await service.getNotifications({});
      
      expect(result.notifications).toEqual(mockNotifications);
      expect(result.total).toBe(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/notifications'),
        expect.any(Object)
      );
    });

    it('알림 조회 실패 시 에러를 throw 해야 합니다', async () => {
      const error = new Error('Network error');
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(service.getNotifications({})).rejects.toThrow('Network error');
    });
  });

  describe('markAsRead', () => {
    it('알림을 읽음 처리해야 합니다', async () => {
      mockedAxios.put.mockResolvedValueOnce({ data: {} });

      await service.markAsRead('1');
      
      expect(mockedAxios.put).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/1/read')
      );
    });
  });

  describe('markAllAsRead', () => {
    it('모든 알림을 읽음 처리해야 합니다', async () => {
      mockedAxios.put.mockResolvedValueOnce({ data: {} });

      await service.markAllAsRead();
      
      expect(mockedAxios.put).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/read-all')
      );
    });
  });

  describe('deleteNotification', () => {
    it('알림을 삭제해야 합니다', async () => {
      mockedAxios.delete.mockResolvedValueOnce({ data: {} });

      await service.deleteNotification('1');
      
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/1')
      );
    });
  });

  describe('getMockNotifications', () => {
    it('목업 알림 데이터를 반환해야 합니다', () => {
      const mockData = service.getMockNotifications();

      expect(mockData).toHaveLength(2);
      expect(mockData[0]).toHaveProperty('title', '차량 정비 알림');
      expect(mockData[1]).toHaveProperty('title', '부품 재고 부족');
    });

    it('목업 데이터는 올바른 구조를 가져야 합니다', () => {
      const mockData = service.getMockNotifications();
      const firstItem = mockData[0];

      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('title');
      expect(firstItem).toHaveProperty('message');
      expect(firstItem).toHaveProperty('type');
      expect(firstItem).toHaveProperty('category');
      expect(firstItem).toHaveProperty('priority');
      expect(firstItem).toHaveProperty('status');
      expect(firstItem).toHaveProperty('isRead');
      expect(firstItem).toHaveProperty('createdAt');
    });
  });
}); 