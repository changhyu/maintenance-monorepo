import React, { useState, useEffect } from 'react';
import todoNotificationService, { TodoNotification, NotificationType } from '../services/todoNotificationService';
import { formatRelativeTime } from '../utils/dateUtils';
import { Badge, Dropdown, Button, List, Space, Typography, Tag, Tabs, Empty } from 'antd';
import { BellOutlined, CheckOutlined, DeleteOutlined, FilterOutlined } from '@ant-design/icons';

interface TodoNotificationsProps {
  className?: string;
  onTodoClick?: (todoId: string) => void;
}

/**
 * 알림 타입에 따른 태그 색상 매핑
 */
const typeColorMap = {
  [NotificationType.UPCOMING_DUE]: 'blue',
  [NotificationType.OVERDUE]: 'red',
  [NotificationType.STATUS_CHANGE]: 'green',
  [NotificationType.PRIORITY_HIGH]: 'orange',
  [NotificationType.GENERAL]: 'default'
};

/**
 * 알림 타입 한글 이름 매핑
 */
const typeNameMap = {
  [NotificationType.UPCOMING_DUE]: '마감 임박',
  [NotificationType.OVERDUE]: '기한 초과',
  [NotificationType.STATUS_CHANGE]: '상태 변경',
  [NotificationType.PRIORITY_HIGH]: '높은 우선순위',
  [NotificationType.GENERAL]: '일반'
};

/**
 * Todo 알림 컴포넌트
 */
const TodoNotifications: React.FC<TodoNotificationsProps> = ({ className = '', onTodoClick }) => {
  const [notifications, setNotifications] = useState<TodoNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(false);
  const [activeTabKey, setActiveTabKey] = useState<string>('all');
  const [sortByPriority, setSortByPriority] = useState<boolean>(true);

  // 알림 구독
  useEffect(() => {
    const unsubscribe = todoNotificationService.subscribeToNotifications((newNotifications) => {
      if (sortByPriority) {
        setNotifications(todoNotificationService.getSortedNotifications());
      } else {
        setNotifications(newNotifications);
      }
      setUnreadCount(todoNotificationService.getUnreadCount());
    });
    
    return () => unsubscribe();
  }, [sortByPriority]);

  // 알림 권한 요청
  useEffect(() => {
    const requestPermission = async () => {
      await todoNotificationService.requestNotificationPermission();
    };
    
    requestPermission();
  }, []);

  // 알림 드롭다운 토글
  const toggleNotifications = () => {
    setVisible(!visible);
    if (!visible) {
      // 드롭다운 열 때 자동으로 읽음 처리
      todoNotificationService.markAllAsRead();
      setUnreadCount(0);
    }
  };

  // 알림 삭제
  const handleDelete = (notification: TodoNotification, e: React.MouseEvent) => {
    e.stopPropagation();
    todoNotificationService.deleteNotification(notification.id);
  };

  // 모든 알림 삭제
  const handleClearAll = () => {
    todoNotificationService.clearAllNotifications();
  };

  // 특정 타입의 알림만 삭제
  const handleClearByType = (type: string) => {
    if (type === 'all') {
      todoNotificationService.clearAllNotifications();
    } else {
      todoNotificationService.clearNotificationsByType(type as NotificationType);
    }
  };

  // 알림 클릭 처리
  const handleNotificationClick = (notification: TodoNotification) => {
    if (onTodoClick && notification.todoId) {
      onTodoClick(notification.todoId);
    }
    setVisible(false);
  };

  // 정렬 토글
  const toggleSort = () => {
    setSortByPriority(!sortByPriority);
  };

  // 탭 변경 처리
  const handleTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  // 현재 탭에 맞는 알림 필터링
  const getFilteredNotifications = () => {
    if (activeTabKey === 'all') {
      return notifications;
    }
    return notifications.filter(notification => notification.type === activeTabKey);
  };

  // 탭 아이템 생성
  const tabItems = [
    {
      key: 'all',
      label: (
        <span>
          전체
          <Badge 
            count={notifications.length} 
            size="small" 
            style={{ marginLeft: 5 }} 
            overflowCount={99} 
          />
        </span>
      )
    },
    ...Object.values(NotificationType).map(type => {
      const count = todoNotificationService.getUnreadCountByType(type);
      return {
        key: type,
        label: (
          <span>
            {typeNameMap[type]}
            <Badge 
              count={count} 
              size="small" 
              style={{ marginLeft: 5 }} 
              overflowCount={99} 
            />
          </span>
        )
      };
    })
  ];

  // 알림 드롭다운 내용
  const notificationDropdownContent = (
    <div className="notification-dropdown" style={{ width: 350, maxHeight: 400, overflow: 'auto' }}>
      <div className="notification-header" style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
        <Typography.Title level={5} style={{ margin: 0 }}>알림</Typography.Title>
        <Space>
          <Button 
            type="text" 
            size="small" 
            icon={<FilterOutlined />} 
            onClick={toggleSort}
            title={sortByPriority ? "시간순 정렬" : "우선순위순 정렬"}
          />
          <Button 
            type="text" 
            size="small" 
            icon={<DeleteOutlined />} 
            onClick={handleClearAll}
            title="모든 알림 삭제"
          />
        </Space>
      </div>
      
      <Tabs 
        activeKey={activeTabKey}
        onChange={handleTabChange}
        tabBarStyle={{ padding: '0 10px' }}
        tabBarExtraContent={
          <Button 
            type="text" 
            size="small" 
            onClick={() => handleClearByType(activeTabKey)}
            title="현재 탭의 알림 삭제"
          >
            지우기
          </Button>
        }
        items={tabItems}
      />
      
      <List
        dataSource={getFilteredNotifications()}
        renderItem={(notification) => (
          <List.Item
            className={notification.read ? 'read' : 'unread'}
            style={{ 
              padding: '10px 15px', 
              borderBottom: '1px solid #f0f0f0',
              backgroundColor: notification.read ? 'transparent' : '#f6f6f6',
              cursor: 'pointer'
            }}
            onClick={() => handleNotificationClick(notification)}
            actions={[
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={(e) => handleDelete(notification, e)}
              />
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <span>{notification.title}</span>
                  <Tag color={typeColorMap[notification.type]}>
                    {typeNameMap[notification.type]}
                  </Tag>
                </Space>
              }
              description={
                <div>
                  <div>{notification.message}</div>
                  <div style={{ fontSize: '0.8em', color: '#999', marginTop: 5 }}>
                    {formatRelativeTime(notification.createdAt)}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="알림이 없습니다"
              style={{ margin: '20px 0' }}
            />
          )
        }}
      />
    </div>
  );

  return (
    <div className={`todo-notifications ${className}`}>
      <Dropdown
        open={visible}
        onOpenChange={setVisible}
        arrow
        trigger={['click']}
        placement="bottomRight"
        dropdownRender={() => notificationDropdownContent}
      >
        <Badge count={unreadCount} overflowCount={99}>
          <Button
            type="text"
            icon={<BellOutlined />}
            onClick={toggleNotifications}
            size="large"
            className="notification-bell-button"
          />
        </Badge>
      </Dropdown>
    </div>
  );
};

export default TodoNotifications; 