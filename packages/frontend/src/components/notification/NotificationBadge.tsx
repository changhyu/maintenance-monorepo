import React, { useState, useEffect } from 'react';
import { Badge, Popover, List, Typography, Button, Empty, Spin } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { NotificationService, NotificationStatus, Notification } from '../../services/notificationService';
import { formatRelativeTime } from '../../utils/date-utils';

const { Text, Title } = Typography;

interface NotificationBadgeProps {
  onViewAll?: () => void;
  maxItems?: number;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  onViewAll,
  maxItems = 5 
}) => {
  const [count, setCount] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 읽지 않은 알림 개수 조회
  const fetchUnreadCount = async () => {
    try {
      // 실제 API 연결 시 아래 코드 사용
      // const result = await NotificationService.getUnreadCount();
      // setCount(result.count);
      
      // 테스트용 코드
      setCount(notifications.filter(n => n.status === NotificationStatus.UNREAD).length);
    } catch (error) {
      console.error('알림 개수 조회 실패:', error);
    }
  };

  // 알림 목록 조회
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // 실제 API 연결 시 아래 코드 사용
      // const result = await NotificationService.getNotifications({ status: 'unread' });
      // setNotifications(result.slice(0, maxItems));
      
      // 테스트용 코드
      setTimeout(() => {
        setNotifications(mockNotifications.slice(0, maxItems));
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('알림 목록 조회 실패:', error);
      setLoading(false);
    }
  };

  // 초기 로드 및 주기적 업데이트
  useEffect(() => {
    fetchUnreadCount();
    
    // 30초마다 알림 개수 갱신
    const intervalId = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(intervalId);
  }, [notifications]);

  // 알림 팝오버가 열릴 때 알림 목록 조회
  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible, maxItems]);

  // 알림 읽음 처리
  const handleMarkAsRead = async (id: string) => {
    try {
      // 실제 API 연결 시 아래 코드 사용
      // await NotificationService.markAsRead(id);
      
      // 테스트용 코드
      setNotifications(prevNotifications => 
        prevNotifications.map(n => 
          n.id === id ? { ...n, status: NotificationStatus.READ } : n
        )
      );
      
      fetchUnreadCount();
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  };

  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = async () => {
    try {
      // 실제 API 연결 시 아래 코드 사용
      // await NotificationService.markAllAsRead();
      
      // 테스트용 코드
      setNotifications(prevNotifications => 
        prevNotifications.map(n => ({ ...n, status: NotificationStatus.READ }))
      );
      
      setCount(0);
    } catch (error) {
      console.error('모든 알림 읽음 처리 실패:', error);
    }
  };

  // 알림 항목 클릭 처리
  const handleItemClick = (notification: Notification) => {
    // 알림 읽음 처리
    handleMarkAsRead(notification.id);
    
    // 링크가 있으면 해당 페이지로 이동
    if (notification.link) {
      window.location.href = notification.link;
    }
    
    setVisible(false);
  };

  // 테스트용 목 데이터
  const mockNotifications: Notification[] = [
    {
      id: '1',
      title: '새 문의 접수',
      message: '김철수님이 새로운 문의를 등록했습니다: 차량 관리 시스템 도입 문의',
      type: 'info',
      priority: 'medium',
      category: 'inquiry',
      status: NotificationStatus.UNREAD,
      createdAt: new Date().toISOString(),
      link: '/inquiries?id=1'
    },
    {
      id: '2',
      title: '시스템 업데이트',
      message: '시스템 업데이트가 완료되었습니다. 변경 사항을 확인하세요.',
      type: 'info',
      priority: 'low',
      category: 'system',
      status: NotificationStatus.UNREAD,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2시간 전
    },
    {
      id: '3',
      title: '정비 일정 변경',
      message: '19일 예약된 정비 일정이 20일로 변경되었습니다.',
      type: 'warning',
      priority: 'high',
      category: 'maintenance',
      status: NotificationStatus.READ,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1일 전
    }
  ];

  // 알림 팝오버 콘텐츠
  const content = (
    <div style={{ width: 300 }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 12 
      }}>
        <Title level={5} style={{ margin: 0 }}>알림</Title>
        {count > 0 && (
          <Button 
            type="text" 
            size="small" 
            onClick={handleMarkAllAsRead}
            icon={<CheckOutlined />}
          >
            모두 읽음 표시
          </Button>
        )}
      </div>
      
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <Spin size="small" />
        </div>
      ) : notifications.length === 0 ? (
        <Empty 
          description="새 알림이 없습니다" 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          style={{ margin: '20px 0' }}
        />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item 
              onClick={() => handleItemClick(item)}
              style={{ 
                cursor: 'pointer', 
                backgroundColor: item.status === NotificationStatus.UNREAD ? '#f0f7ff' : 'transparent',
                transition: 'background-color 0.3s'
              }}
            >
              <List.Item.Meta
                title={<Text strong>{item.title}</Text>}
                description={
                  <div>
                    <div>{item.message}</div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {formatRelativeTime(item.createdAt)}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
      
      <div style={{ textAlign: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 8, marginTop: 8 }}>
        <Button type="link" onClick={() => {
          if (onViewAll) {
            onViewAll();
          }
          setVisible(false);
        }}>
          모든 알림 보기
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={visible}
      onOpenChange={setVisible}
      placement="bottomRight"
      arrow={false}
    >
      <Badge count={count} overflowCount={99}>
        <Button 
          type="text" 
          icon={<BellOutlined style={{ fontSize: 20 }} />}
          size="large"
        />
      </Badge>
    </Popover>
  );
};

export default NotificationBadge;