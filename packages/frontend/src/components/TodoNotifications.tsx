import React, { useState, useEffect } from 'react';
import todoNotificationService, { TodoNotification, NotificationType } from '../services/todoNotificationService';

interface TodoNotificationsProps {
  className?: string;
  onTodoClick?: (todoId: string) => void;
}

/**
 * Todo 알림 컴포넌트
 */
const TodoNotifications: React.FC<TodoNotificationsProps> = ({ className = '', onTodoClick }) => {
  const [notifications, setNotifications] = useState<TodoNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  
  // 알림 변경사항 구독
  useEffect(() => {
    const unsubscribe = todoNotificationService.subscribeToNotifications(
      (updatedNotifications) => {
        setNotifications(updatedNotifications);
        setUnreadCount(todoNotificationService.getUnreadCount());
      }
    );
    
    return unsubscribe;
  }, []);
  
  // 알림 토글
  const toggleNotifications = () => {
    setIsOpen(!isOpen);
  };
  
  // 알림 클릭 처리
  const handleNotificationClick = (notification: TodoNotification) => {
    todoNotificationService.markAsRead(notification.id);
    
    if (onTodoClick) {
      onTodoClick(notification.todoId);
    }
  };
  
  // 모든 알림 읽음 표시
  const markAllAsRead = () => {
    todoNotificationService.markAllAsRead();
  };
  
  // 모든 알림 삭제
  const clearAllNotifications = () => {
    todoNotificationService.clearAllNotifications();
  };
  
  // 알림 삭제 처리
  const handleDeleteNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    todoNotificationService.deleteNotification(notificationId);
  };
  
  // 알림 유형에 따른 아이콘 반환
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.UPCOMING_DUE:
        return '⏰';
      case NotificationType.OVERDUE:
        return '⚠️';
      case NotificationType.STATUS_CHANGE:
        return '🔄';
      case NotificationType.PRIORITY_HIGH:
        return '🔥';
      default:
        return '📋';
    }
  };
  
  // 알림 유형에 따른 색상 클래스 반환
  const getNotificationColorClass = (type: NotificationType) => {
    switch (type) {
      case NotificationType.UPCOMING_DUE:
        return 'bg-yellow-50 border-yellow-200';
      case NotificationType.OVERDUE:
        return 'bg-red-50 border-red-200';
      case NotificationType.STATUS_CHANGE:
        return 'bg-blue-50 border-blue-200';
      case NotificationType.PRIORITY_HIGH:
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };
  
  return (
    <div className={`todo-notifications relative ${className}`}>
      {/* 알림 버튼 */}
      <button
        onClick={toggleNotifications}
        className="relative p-2 rounded-full bg-white hover:bg-gray-100"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {/* 알림 드롭다운 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-lg z-10 border border-gray-200">
          <div className="sticky top-0 flex justify-between items-center p-3 border-b bg-white">
            <h3 className="font-medium">알림</h3>
            <div className="flex space-x-2">
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                모두 읽음 표시
              </button>
              <button
                onClick={clearAllNotifications}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                모두 삭제
              </button>
            </div>
          </div>
          
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              알림이 없습니다.
            </div>
          ) : (
            <div>
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 border-b ${getNotificationColorClass(notification.type)} ${
                    notification.read ? 'opacity-70' : ''
                  } hover:bg-gray-50 cursor-pointer`}
                >
                  <div className="flex items-start">
                    <div className="mr-2 text-xl">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <button
                          onClick={(e) => handleDeleteNotification(e, notification.id)}
                          className="text-gray-400 hover:text-gray-600 ml-2"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TodoNotifications; 