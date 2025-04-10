import React, { useEffect, useState, useRef } from 'react';
import { notificationService } from '../../services/notificationService';
import { Notification, NotificationStatus } from '../../types/notification';
import { formatNotificationDate, getNotificationIcon, getNotificationColor } from '../../utils/notificationUtils';

interface NotificationDropdownProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  maxItems?: number;
  onViewAllClick?: () => void;
}

/**
 * 알림 목록을 표시하는 드롭다운 컴포넌트
 */
const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  userId,
  isOpen,
  onClose,
  maxItems = 5,
  onViewAllClick
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 알림 데이터 로드
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isOpen) return;
      
      try {
        setLoading(true);
        const result = await notificationService.getNotifications({
          userId,
          status: [NotificationStatus.UNREAD],
          limit: maxItems + 1, // 추가로 하나 더 로드하여 "더 보기" 표시 여부 결정
          order: 'desc'
        });
        setNotifications(result.slice(0, maxItems));
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

    if (isOpen && userId) {
      notificationService.subscribeToNotifications(userId, handleNotificationUpdate);
    }

    return () => {
      if (userId) {
        notificationService.unsubscribeFromNotifications();
      }
    };
  }, [isOpen, userId, maxItems]);

  // 알림 읽음 표시 처리
  const handleNotificationClick = async (notification: Notification) => {
    try {
      await notificationService.markAsRead(notification.id);
      
      // 링크가 있는 경우 이동
      if (notification.link) {
        window.location.href = notification.link;
      }
    } catch (error) {
      console.error('알림 읽음 표시 실패:', error);
    }
  };

  // 모든 알림 읽음 표시
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(userId);
      
      // 알림 목록 다시 로드
      const result = await notificationService.getNotifications({
        userId,
        status: [NotificationStatus.UNREAD],
        limit: maxItems,
        order: 'desc'
      });
      setNotifications(result);
    } catch (error) {
      console.error('모든 알림 읽음 표시 실패:', error);
    }
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 overflow-hidden"
    >
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium">알림</h3>
        <button
          onClick={handleMarkAllAsRead}
          className="text-sm text-blue-600 hover:text-blue-800"
          disabled={notifications.length === 0}
        >
          모두 읽음 표시
        </button>
      </div>

      {loading ? (
        <div className="p-4 text-center">
          <p>로딩 중...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <p>새로운 알림이 없습니다</p>
        </div>
      ) : (
        <div>
          <ul className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <li key={notification.id} className="border-b last:border-0">
                <button
                  className="w-full text-left p-4 hover:bg-gray-50 transition duration-150 flex items-start"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div
                    className="mr-3 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: getNotificationColor(notification.type) }}
                  >
                    <i className={`fas fa-${getNotificationIcon(notification.type)} text-white`}></i>
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-medium text-gray-900 truncate">{notification.title}</p>
                    <p className="text-sm text-gray-600 truncate">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatNotificationDate(notification.createdAt)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {notifications.length >= maxItems && (
            <div className="p-2 text-center border-t">
              <button
                onClick={onViewAllClick}
                className="w-full p-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                모든 알림 보기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown; 