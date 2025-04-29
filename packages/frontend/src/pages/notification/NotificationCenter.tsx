import React, { useState, useEffect } from 'react';
import { Layout, Breadcrumb, Card, Tabs, Table, Tag, Button, Empty, Spin, Space, Input, Select } from 'antd';
import { HomeOutlined, BellOutlined, CheckOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { NotificationService, NotificationStatus, NotificationType, NotificationCategory, Notification } from '../../types/notification';
import { formatDateTime } from '../../utils/date-utils';
import { Helmet } from 'react-helmet';

// 알림 상태 타입
export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived'
}

// 알림 유형 타입
export enum NotificationType {
  ERROR = 'error',
  WARNING = 'warning',
  SUCCESS = 'success',
  INFO = 'info'
}

// 알림 카테고리 타입
export enum NotificationCategory {
  MAINTENANCE = 'maintenance',
  VEHICLE = 'vehicle',
  DRIVER = 'driver',
  SYSTEM = 'system',
  OTHER = 'other'
}

// 알림 인터페이스
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: 'high' | 'medium' | 'low';
  status: NotificationStatus;
  createdAt: string;
  link?: string;
}

// 알림 서비스 인터페이스
export interface NotificationService {
  getNotifications: (params: any) => Promise<Notification[]>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const { Content } = Layout;
const { Search } = Input;
const { Option } = Select;

const notificationService = NotificationService.getInstance();

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | 'all'>('all');

  // 알림 목록 로드
  useEffect(() => {
    fetchNotifications();
  }, []);

  // 필터링 처리
  useEffect(() => {
    filterNotifications();
  }, [notifications, activeTab, searchText, categoryFilter]);

  // 알림 목록 조회
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      if (searchText) {
        params.search = searchText;
      }
      
      const data = await notificationService.getNotifications(params);
      setNotifications(data);
    } catch (error) {
      console.error('알림 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 알림 필터링
  const filterNotifications = () => {
    let filtered = [...notifications];
    
    // 탭 필터
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => n.status === NotificationStatus.UNREAD);
    } else if (activeTab === 'read') {
      filtered = filtered.filter(n => n.status === NotificationStatus.READ);
    } else if (activeTab === 'archived') {
      filtered = filtered.filter(n => n.status === NotificationStatus.ARCHIVED);
    }
    
    // 카테고리 필터
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(n => n.category === categoryFilter);
    }
    
    // 검색어 필터
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        n => n.title.toLowerCase().includes(searchLower) || 
             n.message.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredNotifications(filtered);
  };

  // 알림 읽음 처리
  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      await fetchNotifications();
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  };

  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await fetchNotifications();
    } catch (error) {
      console.error('모든 알림 읽음 처리 실패:', error);
    }
  };

  // 알림 삭제
  const handleDelete = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      await fetchNotifications();
    } catch (error) {
      console.error('알림 삭제 실패:', error);
    }
  };

  // 우선순위에 따른 색상 반환
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'green';
      default:
        return 'blue';
    }
  };

  // 타입에 따른 색상 반환
  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.ERROR:
        return 'red';
      case NotificationType.WARNING:
        return 'orange';
      case NotificationType.SUCCESS:
        return 'green';
      case NotificationType.INFO:
        return 'blue';
      default:
        return 'default';
    }
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Notification) => (
        <a 
          href={record.link || '#'} 
          onClick={(e) => {
            if (!record.link) {
              e.preventDefault();
              handleMarkAsRead(record.id);
            }
          }}
          style={{ 
            fontWeight: record.status === NotificationStatus.UNREAD ? 'bold' : 'normal' 
          }}
        >
          {text}
        </a>
      )
    },
    {
      title: '내용',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true
    },
    {
      title: '유형',
      dataIndex: 'type',
      key: 'type',
      render: (type: NotificationType) => (
        <Tag color={getTypeColor(type)}>
          {type}
        </Tag>
      )
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      render: (category: NotificationCategory) => (
        <Tag color="blue">
          {category}
        </Tag>
      )
    },
    {
      title: '우선순위',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>
          {priority}
        </Tag>
      )
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: NotificationStatus) => (
        <Tag color={status === NotificationStatus.UNREAD ? 'blue' : 'default'}>
          {status}
        </Tag>
      ),
    },
    {
      title: '날짜',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date)
    },
    {
      title: '작업',
      key: 'action',
      render: (_: any, record: Notification) => (
        <Space size="small">
          {record.status === NotificationStatus.UNREAD && (
            <Button 
              type="text" 
              size="small" 
              icon={<CheckOutlined />} 
              onClick={() => handleMarkAsRead(record.id)}
            />
          )}
          <Button 
            type="text" 
            danger 
            size="small" 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      )
    }
  ];

  // 모의 알림 데이터
  const mockNotifications: Notification[] = [
    {
      id: '1',
      title: '정기 점검 알림',
      message: '차량 정기 점검 예정일이 다가옵니다.',
      type: NotificationType.WARNING,
      category: NotificationCategory.MAINTENANCE,
      priority: 'high',
      status: NotificationStatus.UNREAD,
      createdAt: '2024-03-20T10:00:00Z',
      link: '/maintenance/schedule'
    },
    {
      id: '2',
      title: '차량 상태 이상',
      message: '차량 엔진 상태가 비정상입니다.',
      type: NotificationType.ERROR,
      category: NotificationCategory.VEHICLE,
      priority: 'high',
      status: NotificationStatus.UNREAD,
      createdAt: '2024-03-20T09:30:00Z',
      link: '/vehicles/status'
    },
    {
      id: '3',
      title: '운전자 근무 시간 초과',
      message: '운전자 A의 근무 시간이 초과되었습니다.',
      type: NotificationType.WARNING,
      category: NotificationCategory.DRIVER,
      priority: 'medium',
      status: NotificationStatus.READ,
      createdAt: '2024-03-20T08:00:00Z',
      link: '/drivers/schedule'
    },
    {
      id: '4',
      title: '시스템 업데이트 완료',
      message: '시스템 업데이트가 성공적으로 완료되었습니다.',
      type: NotificationType.SUCCESS,
      category: NotificationCategory.SYSTEM,
      priority: 'low',
      status: NotificationStatus.READ,
      createdAt: '2024-03-19T15:00:00Z'
    }
  ];

  // 탭 변경 처리
  const handleTabChange = (activeKey: string) => {
    setActiveTab(activeKey);
  };

  return (
    <>
      <Helmet>
        <title>알림 센터 - 차량 정비 관리 시스템</title>
      </Helmet>
      
      <Layout style={{ padding: '0 24px 24px' }}>
        <Breadcrumb style={{ margin: '16px 0' }}>
          <Breadcrumb.Item>
            <Link to="/">
              <HomeOutlined /> 홈
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <BellOutlined /> 알림 센터
          </Breadcrumb.Item>
        </Breadcrumb>
        
        <Content
          style={{
            background: '#fff',
            padding: 24,
            margin: 0,
            minHeight: 280,
            borderRadius: 4
          }}
        >
          <Card title="알림 센터">
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <Space style={{ flexWrap: 'wrap', marginBottom: '10px' }}>
                <Search
                  placeholder="검색어를 입력하세요..."
                  allowClear
                  onSearch={(value) => setSearchText(value)}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 250 }}
                />
                <Select
                  placeholder="카테고리 필터"
                  style={{ width: 150 }}
                  value={categoryFilter}
                  onChange={(value) => setCategoryFilter(value)}
                >
                  <Option value="all">모든 카테고리</Option>
                  <Option value="inquiry">문의</Option>
                  <Option value="system">시스템</Option>
                  <Option value="maintenance">정비</Option>
                  <Option value="vehicle">차량</Option>
                </Select>
              </Space>

              <Button 
                type="primary" 
                icon={<CheckOutlined />} 
                onClick={handleMarkAllAsRead}
                disabled={!notifications.some(n => n.status === NotificationStatus.UNREAD)}
              >
                모두 읽음으로 표시
              </Button>
            </div>

            <Tabs 
              activeKey={activeTab}
              onChange={handleTabChange}
              items={[
                {
                  key: 'all',
                  label: '전체',
                },
                {
                  key: 'unread',
                  label: `읽지 않음 (${notifications.filter(n => n.status === NotificationStatus.UNREAD).length})`,
                },
                {
                  key: 'read',
                  label: '읽음',
                },
                {
                  key: 'archived',
                  label: '보관됨',
                }
              ]}
            />

            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px 0' }}>
                <Spin tip="로딩 중..." />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <Empty description="표시할 알림이 없습니다" />
            ) : (
              <Table 
                columns={columns}
                dataSource={filteredNotifications}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                rowClassName={(record) => record.status === NotificationStatus.UNREAD ? 'unread-row' : ''}
              />
            )}
          </Card>
        </Content>
      </Layout>
    </>
  );
};

export default NotificationCenter;