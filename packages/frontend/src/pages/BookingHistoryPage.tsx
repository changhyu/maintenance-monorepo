import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Tag, Button, Space, Tabs, Typography, 
  Dropdown, Menu, Modal, Badge, Empty, message,
  Row, Col, Input, DatePicker, Select
} from 'antd';
import { 
  CalendarOutlined, CarOutlined, FilterOutlined, 
  SearchOutlined, MoreOutlined, ExclamationCircleOutlined, 
  EditOutlined, DeleteOutlined, CheckCircleOutlined, 
  CloseCircleOutlined, ReloadOutlined
} from '@ant-design/icons';
import { BookingButton } from '../components/booking';
import apiClient from '../services/api';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { confirm } = Modal;

// 예약 상태 정의
export enum BookingStatus {
  PENDING = '대기 중',
  CONFIRMED = '확정',
  COMPLETED = '완료',
  CANCELLED = '취소'
}

// 예약 정보 인터페이스
interface Booking {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  maintenanceTypeId: string;
  maintenanceTypeName: string;
  shopId: string;
  shopName: string;
  date: string;
  time: string;
  status: BookingStatus;
  contactName: string;
  contactPhone: string;
  description?: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  requiresPickup: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cost?: number;
}

// 필터 인터페이스
interface BookingFilters {
  search: string;
  vehicleId?: string;
  shopId?: string;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs] | null;
  maintenanceTypeId?: string;
  urgencyLevel?: 'low' | 'medium' | 'high';
}

/**
 * 예약 현황 페이지 컴포넌트
 */
const BookingHistoryPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [filters, setFilters] = useState<BookingFilters>({
    search: '',
    dateRange: null
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [vehicles, setVehicles] = useState<{id: string; name: string}[]>([]);
  const [shops, setShops] = useState<{id: string; name: string}[]>([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState<{id: string; name: string}[]>([]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchBookings();
    fetchVehicles();
    fetchShops();
    fetchMaintenanceTypes();
  }, []);

  // 필터 변경 또는 탭 변경 시 필터링 적용
  useEffect(() => {
    applyFilters();
  }, [bookings, filters, activeTab]);

  // 예약 데이터 조회
  const fetchBookings = async () => {
    setLoading(true);
    try {
      // 실제 구현 시 API 호출
      // const response = await apiClient.get('/bookings');
      // setBookings(response.data);
      
      // 샘플 데이터
      const mockBookings: Booking[] = generateMockBookings();
      setBookings(mockBookings);
    } catch (error) {
      console.error('예약 데이터 조회 실패:', error);
      message.error('예약 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 차량 데이터 조회
  const fetchVehicles = async () => {
    try {
      // const response = await apiClient.get('/vehicles');
      // setVehicles(response.data);
      
      // 샘플 데이터
      setVehicles([
        { id: 'v001', name: '차량 1001' },
        { id: 'v002', name: '차량 1002' },
        { id: 'v003', name: '차량 1003' },
        { id: 'v004', name: '차량 1004' },
        { id: 'v005', name: '차량 1005' }
      ]);
    } catch (error) {
      console.error('차량 데이터 조회 실패:', error);
    }
  };

  // 정비소 데이터 조회
  const fetchShops = async () => {
    try {
      // const response = await apiClient.get('/shops');
      // setShops(response.data);
      
      // 샘플 데이터
      setShops([
        { id: 's001', name: '서울 중앙 정비소' },
        { id: 's002', name: '부산 정비 센터' },
        { id: 's003', name: '대구 종합 정비' }
      ]);
    } catch (error) {
      console.error('정비소 데이터 조회 실패:', error);
    }
  };

  // 정비 유형 조회
  const fetchMaintenanceTypes = async () => {
    try {
      // const response = await apiClient.get('/maintenance-types');
      // setMaintenanceTypes(response.data);
      
      // 샘플 데이터
      setMaintenanceTypes([
        { id: 'mt001', name: '정기 점검' },
        { id: 'mt002', name: '엔진 오일 교체' },
        { id: 'mt003', name: '타이어 교체' },
        { id: 'mt004', name: '브레이크 패드 교체' },
        { id: 'mt005', name: '에어컨 필터 교체' },
        { id: 'mt006', name: '배터리 교체' },
        { id: 'mt007', name: '종합 검사' }
      ]);
    } catch (error) {
      console.error('정비 유형 조회 실패:', error);
    }
  };

  // 샘플 예약 데이터 생성
  const generateMockBookings = (): Booking[] => {
    const vehicleTypes = ['승용차', 'SUV', '화물차', '버스'];
    const maintenanceTypes = [
      { id: 'mt001', name: '정기 점검' },
      { id: 'mt002', name: '엔진 오일 교체' },
      { id: 'mt003', name: '타이어 교체' },
      { id: 'mt004', name: '브레이크 패드 교체' },
      { id: 'mt005', name: '에어컨 필터 교체' },
      { id: 'mt006', name: '배터리 교체' },
      { id: 'mt007', name: '종합 검사' }
    ];
    const shops = [
      { id: 's001', name: '서울 중앙 정비소' },
      { id: 's002', name: '부산 정비 센터' },
      { id: 's003', name: '대구 종합 정비' }
    ];
    const statuses = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.COMPLETED,
      BookingStatus.CANCELLED
    ];
    const urgencyLevels = ['low', 'medium', 'high'] as const;
    
    return Array.from({ length: 30 }).map((_, idx) => {
      const vehicleId = `v00${(idx % 5) + 1}`;
      const maintenanceType = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
      const shop = shops[Math.floor(Math.random() * shops.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const isCompleted = status === BookingStatus.COMPLETED;
      const isCancelled = status === BookingStatus.CANCELLED;
      
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30));
      
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + (isCancelled ? -5 : Math.floor(Math.random() * 30) - 10));
      
      return {
        id: `booking-${1000 + idx}`,
        vehicleId,
        vehicleName: `차량 ${1000 + (idx % 5) + 1}`,
        vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
        maintenanceTypeId: maintenanceType.id,
        maintenanceTypeName: maintenanceType.name,
        shopId: shop.id,
        shopName: shop.name,
        date: bookingDate.toISOString().split('T')[0],
        time: `${Math.floor(Math.random() * 8) + 9}:00`,
        status,
        contactName: '홍길동',
        contactPhone: '010-1234-5678',
        description: Math.random() > 0.5 ? '정기 점검 요청' : undefined,
        urgencyLevel: urgencyLevels[Math.floor(Math.random() * urgencyLevels.length)],
        requiresPickup: Math.random() > 0.7,
        createdAt: createdDate.toISOString(),
        updatedAt: createdDate.toISOString(),
        completedAt: isCompleted ? new Date().toISOString() : undefined,
        cost: isCompleted ? Math.floor(Math.random() * 500000) + 50000 : undefined
      };
    });
  };

  // 필터 적용
  const applyFilters = () => {
    let result = [...bookings];
    
    // 탭에 따른 필터링
    if (activeTab === 'pending') {
      result = result.filter(booking => booking.status === BookingStatus.PENDING);
    } else if (activeTab === 'confirmed') {
      result = result.filter(booking => booking.status === BookingStatus.CONFIRMED);
    } else if (activeTab === 'completed') {
      result = result.filter(booking => booking.status === BookingStatus.COMPLETED);
    } else if (activeTab === 'cancelled') {
      result = result.filter(booking => booking.status === BookingStatus.CANCELLED);
    }
    
    // 검색어 필터링
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(booking =>
        booking.vehicleName.toLowerCase().includes(searchLower) ||
        booking.maintenanceTypeName.toLowerCase().includes(searchLower) ||
        booking.shopName.toLowerCase().includes(searchLower) ||
        booking.id.toLowerCase().includes(searchLower)
      );
    }
    
    // 차량 필터링
    if (filters.vehicleId) {
      result = result.filter(booking => booking.vehicleId === filters.vehicleId);
    }
    
    // 정비소 필터링
    if (filters.shopId) {
      result = result.filter(booking => booking.shopId === filters.shopId);
    }
    
    // 날짜 범위 필터링
    if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
      const startDate = filters.dateRange[0].startOf('day');
      const endDate = filters.dateRange[1].endOf('day');
      
      result = result.filter(booking => {
        const bookingDate = dayjs(booking.date);
        return bookingDate.isAfter(startDate) && bookingDate.isBefore(endDate);
      });
    }
    
    // 정비 유형 필터링
    if (filters.maintenanceTypeId) {
      result = result.filter(booking => booking.maintenanceTypeId === filters.maintenanceTypeId);
    }
    
    // 긴급도 필터링
    if (filters.urgencyLevel) {
      result = result.filter(booking => booking.urgencyLevel === filters.urgencyLevel);
    }
    
    setFilteredBookings(result);
  };

  // 필터 초기화
  const resetFilters = () => {
    setFilters({
      search: '',
      dateRange: null
    });
    setShowFilters(false);
  };

  // 필터 변경 처리
  const handleFilterChange = (key: keyof BookingFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 예약 취소 확인
  const showCancelConfirm = (booking: Booking) => {
    confirm({
      title: '예약 취소',
      icon: <ExclamationCircleOutlined />,
      content: `${booking.vehicleName}의 ${booking.date} ${booking.time} 예약을 취소하시겠습니까?`,
      okText: '예약 취소',
      okType: 'danger',
      cancelText: '닫기',
      onOk() {
        handleCancelBooking(booking.id);
      }
    });
  };

  // 예약 취소 처리
  const handleCancelBooking = async (bookingId: string) => {
    try {
      // 실제 구현 시 API 호출
      // await apiClient.put(`/bookings/${bookingId}/cancel`);
      
      // 테스트용 처리
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 상태 업데이트
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: BookingStatus.CANCELLED, updatedAt: new Date().toISOString() } 
            : booking
        )
      );
      
      message.success('예약이 성공적으로 취소되었습니다.');
    } catch (error) {
      console.error('예약 취소 실패:', error);
      message.error('예약 취소에 실패했습니다.');
    }
  };

  // 예약 완료 확인
  const showCompleteConfirm = (booking: Booking) => {
    confirm({
      title: '정비 완료 처리',
      icon: <CheckCircleOutlined />,
      content: `${booking.vehicleName}의 정비가 완료되었습니까?`,
      okText: '완료 처리',
      okType: 'primary',
      cancelText: '닫기',
      onOk() {
        handleCompleteBooking(booking.id);
      }
    });
  };

  // 예약 완료 처리
  const handleCompleteBooking = async (bookingId: string) => {
    try {
      // 실제 구현 시 API 호출
      // await apiClient.put(`/bookings/${bookingId}/complete`);
      
      // 테스트용 처리
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 임의의 정비 비용 생성
      const cost = Math.floor(Math.random() * 500000) + 50000;
      
      // 상태 업데이트
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId 
            ? { 
                ...booking, 
                status: BookingStatus.COMPLETED, 
                updatedAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                cost
              } 
            : booking
        )
      );
      
      message.success('정비가 완료 처리되었습니다.');
    } catch (error) {
      console.error('정비 완료 처리 실패:', error);
      message.error('정비 완료 처리에 실패했습니다.');
    }
  };

  // 상태에 따른 뱃지 색상 
  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.PENDING:
        return <Badge status="warning" text="대기 중" />;
      case BookingStatus.CONFIRMED:
        return <Badge status="processing" text="확정" />;
      case BookingStatus.COMPLETED:
        return <Badge status="success" text="완료" />;
      case BookingStatus.CANCELLED:
        return <Badge status="error" text="취소" />;
      default:
        return <Badge status="default" text={status} />;
    }
  };

  // 긴급도에 따른 태그 색상
  const getUrgencyTag = (level: string) => {
    switch (level) {
      case 'high':
        return <Tag color="red">높음</Tag>;
      case 'medium':
        return <Tag color="orange">중간</Tag>;
      case 'low':
        return <Tag color="green">낮음</Tag>;
      default:
        return <Tag>{level}</Tag>;
    }
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: '예약 ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
    },
    {
      title: '차량',
      dataIndex: 'vehicleName',
      key: 'vehicleName',
      width: 120,
      render: (text: string, record: Booking) => (
        <Space>
          <CarOutlined />
          {text} ({record.vehicleType})
        </Space>
      ),
    },
    {
      title: '정비 유형',
      dataIndex: 'maintenanceTypeName',
      key: 'maintenanceTypeName',
      width: 150,
    },
    {
      title: '정비소',
      dataIndex: 'shopName',
      key: 'shopName',
      width: 150,
    },
    {
      title: '예약일',
      key: 'datetime',
      width: 180,
      render: (_: any, record: Booking) => (
        <Space>
          <CalendarOutlined />
          {record.date} {record.time}
        </Space>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: BookingStatus) => getStatusBadge(status),
    },
    {
      title: '긴급도',
      dataIndex: 'urgencyLevel',
      key: 'urgencyLevel',
      width: 100,
      render: (level: string) => getUrgencyTag(level),
    },
    {
      title: '비용',
      dataIndex: 'cost',
      key: 'cost',
      width: 120,
      render: (cost?: number) => cost 
        ? <Text strong>{cost.toLocaleString('ko-KR')}원</Text> 
        : <Text type="secondary">-</Text>,
    },
    {
      title: '액션',
      key: 'action',
      width: 100,
      render: (_: any, record: Booking) => {
        // 상태에 따라 가능한 액션 결정
        const isActionable = record.status === BookingStatus.PENDING || record.status === BookingStatus.CONFIRMED;
        const isCompletable = record.status === BookingStatus.CONFIRMED;
        
        if (!isActionable) {
          return <Text type="secondary">-</Text>;
        }
        
        return (
          <Dropdown overlay={
            <Menu>
              {record.status === BookingStatus.PENDING && (
                <Menu.Item key="edit" icon={<EditOutlined />}>
                  <BookingButton 
                    vehicleId={record.vehicleId}
                    buttonText="예약 변경"
                    buttonType="link"
                    onBookingCreated={(bookingId) => {
                      message.success(`예약이 성공적으로 변경되었습니다.`);
                      handleCancelBooking(record.id);
                    }}
                  />
                </Menu.Item>
              )}
              {isCompletable && (
                <Menu.Item key="complete" onClick={() => showCompleteConfirm(record)} icon={<CheckCircleOutlined />}>
                  정비 완료 처리
                </Menu.Item>
              )}
              <Menu.Item key="cancel" onClick={() => showCancelConfirm(record)} icon={<CloseCircleOutlined />} danger>
                예약 취소
              </Menu.Item>
            </Menu>
          }>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div className="booking-history-page" style={{ padding: '20px' }}>
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>정비 예약 내역</Title>
            <Text type="secondary">모든 정비 예약 내역을 조회하고 관리합니다.</Text>
          </Col>
          <Col>
            <Space>
              <BookingButton 
                buttonText="새 예약 등록" 
                buttonType="primary" 
                onBookingCreated={(bookingId) => {
                  message.success(`예약이 성공적으로 등록되었습니다. (예약 ID: ${bookingId})`);
                  fetchBookings();
                }}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchBookings}
                loading={loading}
              >
                새로고침
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 검색 및 필터 영역 */}
      <Card style={{ marginBottom: '20px' }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Input
              placeholder="차량, 정비 유형, 정비소 등 검색"
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
          <Col>
            <Button 
              icon={<FilterOutlined />} 
              onClick={() => setShowFilters(!showFilters)}
              type={showFilters ? 'primary' : 'default'}
            >
              필터
            </Button>
          </Col>
        </Row>

        {showFilters && (
          <div style={{ marginTop: '16px' }}>
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <div style={{ marginBottom: '8px' }}>
                  <Text strong>차량</Text>
                </div>
                <Select
                  placeholder="차량 선택"
                  style={{ width: '100%' }}
                  allowClear
                  value={filters.vehicleId}
                  onChange={value => handleFilterChange('vehicleId', value)}
                >
                  {vehicles.map(vehicle => (
                    <Option key={vehicle.id} value={vehicle.id}>{vehicle.name}</Option>
                  ))}
                </Select>
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: '8px' }}>
                  <Text strong>정비소</Text>
                </div>
                <Select
                  placeholder="정비소 선택"
                  style={{ width: '100%' }}
                  allowClear
                  value={filters.shopId}
                  onChange={value => handleFilterChange('shopId', value)}
                >
                  {shops.map(shop => (
                    <Option key={shop.id} value={shop.id}>{shop.name}</Option>
                  ))}
                </Select>
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: '8px' }}>
                  <Text strong>정비 유형</Text>
                </div>
                <Select
                  placeholder="정비 유형 선택"
                  style={{ width: '100%' }}
                  allowClear
                  value={filters.maintenanceTypeId}
                  onChange={value => handleFilterChange('maintenanceTypeId', value)}
                >
                  {maintenanceTypes.map(type => (
                    <Option key={type.id} value={type.id}>{type.name}</Option>
                  ))}
                </Select>
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: '8px' }}>
                  <Text strong>긴급도</Text>
                </div>
                <Select
                  placeholder="긴급도 선택"
                  style={{ width: '100%' }}
                  allowClear
                  value={filters.urgencyLevel}
                  onChange={value => handleFilterChange('urgencyLevel', value)}
                >
                  <Option value="low">낮음</Option>
                  <Option value="medium">중간</Option>
                  <Option value="high">높음</Option>
                </Select>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: '8px' }}>
                  <Text strong>예약 기간</Text>
                </div>
                <RangePicker 
                  style={{ width: '100%' }}
                  value={filters.dateRange as any}
                  onChange={value => handleFilterChange('dateRange', value)}
                />
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <Button onClick={resetFilters} style={{ marginRight: '8px' }}>
                  필터 초기화
                </Button>
                <Button type="primary" onClick={applyFilters}>
                  필터 적용
                </Button>
              </Col>
            </Row>
          </div>
        )}
      </Card>

      {/* 탭 및 테이블 영역 */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          tabBarExtraContent={
            <Text type="secondary">
              총 {filteredBookings.length}건의 예약
            </Text>
          }
        >
          <TabPane tab="전체" key="all" />
          <TabPane 
            tab={
              <span>
                대기 중 
                <Tag color="gold" style={{ marginLeft: '4px' }}>
                  {bookings.filter(b => b.status === BookingStatus.PENDING).length}
                </Tag>
              </span>
            } 
            key="pending" 
          />
          <TabPane 
            tab={
              <span>
                확정 
                <Tag color="blue" style={{ marginLeft: '4px' }}>
                  {bookings.filter(b => b.status === BookingStatus.CONFIRMED).length}
                </Tag>
              </span>
            } 
            key="confirmed" 
          />
          <TabPane 
            tab={
              <span>
                완료 
                <Tag color="green" style={{ marginLeft: '4px' }}>
                  {bookings.filter(b => b.status === BookingStatus.COMPLETED).length}
                </Tag>
              </span>
            } 
            key="completed" 
          />
          <TabPane 
            tab={
              <span>
                취소 
                <Tag color="red" style={{ marginLeft: '4px' }}>
                  {bookings.filter(b => b.status === BookingStatus.CANCELLED).length}
                </Tag>
              </span>
            } 
            key="cancelled" 
          />
        </Tabs>

        <Table
          dataSource={filteredBookings}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
          locale={{ emptyText: <Empty description="예약 내역이 없습니다" /> }}
          expandable={{
            expandedRowRender: record => (
              <div style={{ padding: '0 16px' }}>
                <Row gutter={[24, 16]}>
                  <Col span={12}>
                    <div>
                      <Text type="secondary">담당자:</Text>{' '}
                      <Text strong>{record.contactName}</Text>
                    </div>
                    <div>
                      <Text type="secondary">연락처:</Text>{' '}
                      <Text>{record.contactPhone}</Text>
                    </div>
                    {record.requiresPickup && (
                      <div>
                        <Tag color="cyan">픽업 서비스 요청</Tag>
                      </div>
                    )}
                  </Col>
                  <Col span={12}>
                    {record.description && (
                      <div>
                        <Text type="secondary">요청 사항:</Text>{' '}
                        <Text>{record.description}</Text>
                      </div>
                    )}
                    <div>
                      <Text type="secondary">예약 등록일:</Text>{' '}
                      <Text>{new Date(record.createdAt).toLocaleString('ko-KR')}</Text>
                    </div>
                    {record.completedAt && (
                      <div>
                        <Text type="secondary">정비 완료일:</Text>{' '}
                        <Text>{new Date(record.completedAt).toLocaleString('ko-KR')}</Text>
                      </div>
                    )}
                  </Col>
                </Row>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default BookingHistoryPage; 