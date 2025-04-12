import React, { useEffect, useState } from 'react';

import { notificationService } from '../../services/notificationService';
import { Notification, NotificationStatus, NotificationType } from '../../types/notification';
import {
  formatNotificationDate,
  getNotificationIcon,
  getNotificationColor,
  getNotificationPriorityLabel,
  groupNotificationsByDate
} from '../../utils/notificationUtils';

interface NotificationCenterProps {
  userId: string;
  onClose?: () => void;
}

/**
 * 알림 관리 센터 컴포넌트
 */
const NotificationCenter: React.FC<NotificationCenterProps> = ({ userId, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [groupedNotifications, setGroupedNotifications] = useState<Record<string, Notification[]>>(
    {}
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all');
  const [filter, setFilter] = useState<{
    type?: NotificationType;
    searchTerm?: string;
  }>({});

  // 알림 데이터 로드
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const result = await notificationService.getNotifications({ userId });
        setNotifications(result);
      } catch (error) {
        console.error('알림 목록 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // 실시간 알림 업데이트
    const handleNotificationUpdate = (_: any) => {
      fetchNotifications();
    };

    notificationService.subscribeToNotifications(userId, handleNotificationUpdate);

    return () => {
      notificationService.unsubscribeFromNotifications();
    };
  }, [userId]);

  // 필터링 적용
  useEffect(() => {
    let filtered = [...notifications];

    // 탭 필터 적용
    if (activeTab === 'unread') {
      filtered = filtered.filter(notification => notification.status === NotificationStatus.UNREAD);
    } else if (activeTab === 'archived') {
      filtered = filtered.filter(
        notification => notification.status === NotificationStatus.ARCHIVED
      );
    }

    // 타입 필터 적용
    if (filter.type) {
      filtered = filtered.filter(notification => notification.type === filter.type);
    }

    // 검색어 필터 적용
    if (filter.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(
        notification =>
          notification.title.toLowerCase().includes(searchLower) ||
          notification.message.toLowerCase().includes(searchLower)
      );
    }

    setFilteredNotifications(filtered);

    // 날짜별 그룹화
    const grouped = groupNotificationsByDate(filtered);
    setGroupedNotifications(grouped);
  }, [notifications, activeTab, filter]);

  // 알림 읽음 표시
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);

      // 상태 업데이트
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, status: NotificationStatus.READ }
            : notification
        )
      );
    } catch (error) {
      console.error('알림 읽음 표시 실패:', error);
    }
  };

  // 알림 보관 처리
  const handleArchive = async (notificationId: string) => {
    try {
      await notificationService.archiveNotification(notificationId);

      // 상태 업데이트
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, status: NotificationStatus.ARCHIVED }
            : notification
        )
      );
    } catch (error) {
      console.error('알림 보관 처리 실패:', error);
    }
  };

  // 모든 알림 읽음 표시
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(userId);

      // 상태 업데이트
      setNotifications(prev =>
        prev.map(notification =>
          notification.status === NotificationStatus.UNREAD
            ? { ...notification, status: NotificationStatus.READ }
            : notification
        )
      );
    } catch (error) {
      console.error('모든 알림 읽음 표시 실패:', error);
    }
  };

  // 검색어 필터 업데이트
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(prev => ({ ...prev, searchTerm: e.target.value }));
  };

  // 타입 필터 업데이트
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as NotificationType | undefined;
    setFilter(prev => ({ ...prev, type: value || undefined }));
  };

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-4xl w-full max-h-[80vh] flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <h2 className="text-xl font-semibold">알림 센터</h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      {/* 필터 영역 */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="알림 검색..."
              className="w-full px-3 py-2 border rounded-md"
              value={filter.searchTerm || ''}
              onChange={handleSearchChange}
            />
          </div>
          <div className="w-48">
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={filter.type || ''}
              onChange={handleTypeChange}
            >
              <option value="">모든 유형</option>
              {Object.values(NotificationType).map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            disabled={loading}
          >
            모두 읽음 표시
          </button>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-3 font-medium text-center ${
            activeTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('all')}
        >
          전체
        </button>
        <button
          className={`flex-1 py-3 font-medium text-center ${
            activeTab === 'unread' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('unread')}
        >
          읽지 않음
        </button>
        <button
          className={`flex-1 py-3 font-medium text-center ${
            activeTab === 'archived' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('archived')}
        >
          보관됨
        </button>
      </div>

      {/* 알림 목록 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">로딩 중...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">알림이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedNotifications).map(([date, notifications]) => (
              <div key={date} className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 sticky top-0 bg-white py-2">
                  {new Date(date).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <div className="space-y-2">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`border rounded-lg overflow-hidden transition-colors duration-200 ${
                        notification.status === NotificationStatus.UNREAD
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mr-4"
                            style={{ backgroundColor: getNotificationColor(notification.type) }}
                          >
                            <i
                              className={`fas fa-${getNotificationIcon(notification.type)} text-white`}
                            ></i>
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                              <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                                {formatNotificationDate(notification.createdAt)}
                              </span>
                            </div>
                            <p className="text-gray-700 mt-1">{notification.message}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                {notification.type}
                              </span>
                              <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                {getNotificationPriorityLabel(notification.priority)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end mt-3 space-x-2">
                          {notification.status === NotificationStatus.UNREAD && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                            >
                              읽음 표시
                            </button>
                          )}
                          {notification.status !== NotificationStatus.ARCHIVED && (
                            <button
                              onClick={() => handleArchive(notification.id)}
                              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                            >
                              보관
                            </button>
                          )}
                          {notification.link && (
                            <a
                              href={notification.link}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                              target="_blank"
                              rel="noreferrer"
                            >
                              자세히 보기
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
