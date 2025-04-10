import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Tag, Space, Modal, message, Typography, Row, Col, Card } from 'antd';
import { 
  bookingService, 
  Booking, 
  BookingStatus, 
  ServiceType,
  BookingFilter
} from '../services/bookingService';
import BookingForm from '../components/booking/BookingForm';
import { useApi } from '../context/ApiContext';
import { useAuth } from '../context/AuthContext';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

// 임시 데이터 - 실제 구현 시 API 연동 필요
const dummyVehicles = [
  { id: 'v1', make: '현대', model: '아반떼', year: 2020, licensePlate: '서울12가3456' },
  { id: 'v2', make: '기아', model: 'K5', year: 2019, licensePlate: '경기34나5678' },
  { id: 'v3', make: '쌍용', model: '티볼리', year: 2021, licensePlate: '인천56다7890' }
];

const dummyShops = [
  { id: 's1', name: '현대 공식 서비스센터 강남점', address: '서울시 강남구', rating: 4.8, distance: 3.2 },
  { id: 's2', name: '기아 오토큐 서초점', address: '서울시 서초구', rating: 4.5, distance: 5.1 },
  { id: 's3', name: '스피드메이트 송파점', address: '서울시 송파구', rating: 4.2, distance: 7.6 }
];

// 예약 상태별 태그 색상
const statusColors = {
  [BookingStatus.PENDING]: 'blue',
  [BookingStatus.CONFIRMED]: 'green',
  [BookingStatus.COMPLETED]: 'gray',
  [BookingStatus.CANCELLED]: 'red',
  [BookingStatus.RESCHEDULED]: 'orange'
};

// 서비스 유형 한글 표시
const serviceTypeLabels = {
  [ServiceType.REGULAR_MAINTENANCE]: '정기 유지보수',
  [ServiceType.REPAIR]: '수리',
  [ServiceType.INSPECTION]: '검사',
  [ServiceType.TIRE_CHANGE]: '타이어 교체',
  [ServiceType.OIL_CHANGE]: '오일 교체',
  [ServiceType.CUSTOM]: '기타 서비스'
};

// 날짜 포맷팅 함수
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// 가격 포맷팅 함수
const formatPrice = (price: number): string => {
  return price.toLocaleString('ko-KR') + '원';
};

const BookingPage: React.FC = () => {
  const { apiClient } = useApi();
  const { user } = useAuth();
  const userId = user?.id || '';
  
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // 예약 목록 로드
  useEffect(() => {
    loadBookings();
  }, [activeTab, userId]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      
      let filter: BookingFilter = { customerId: userId };
      
      // 탭에 따라 필터 설정
      if (activeTab === 'upcoming') {
        filter.status = BookingStatus.CONFIRMED;
      } else if (activeTab === 'pending') {
        filter.status = BookingStatus.PENDING;
      } else if (activeTab === 'completed') {
        filter.status = BookingStatus.COMPLETED;
      } else if (activeTab === 'cancelled') {
        filter.status = BookingStatus.CANCELLED;
      }
      
      const result = await bookingService.getBookings(filter);
      setBookings(result.bookings);
    } catch (error) {
      console.error('예약 목록 로드 중 오류 발생:', error);
      message.error('예약 정보를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 예약 취소 처리
  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    
    try {
      setCancelLoading(true);
      await bookingService.cancelBooking(selectedBooking.id, cancelReason);
      message.success('예약이 취소되었습니다.');
      setShowCancelModal(false);
      setSelectedBooking(null);
      setCancelReason('');
      loadBookings(); // 목록 새로고침
    } catch (error) {
      console.error('예약 취소 중 오류 발생:', error);
      message.error('예약 취소에 실패했습니다.');
    } finally {
      setCancelLoading(false);
    }
  };

  // 예약 생성 성공 핸들러
  const handleBookingSuccess = (booking: Booking) => {
    message.success('예약이 생성되었습니다.');
    setShowBookingForm(false);
    loadBookings(); // 목록 새로고침
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: '예약 일시',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      render: (date: string, record: Booking) => (
        <span>{formatDate(date)} {record.scheduledTime}</span>
      ),
    },
    {
      title: '서비스 유형',
      dataIndex: 'serviceType',
      key: 'serviceType',
      render: (type: ServiceType) => serviceTypeLabels[type] || type,
    },
    {
      title: '정비소',
      dataIndex: 'shopId',
      key: 'shopId',
      render: (shopId: string) => {
        // 실제 구현 시 정비소 정보 연동 필요
        const shop = dummyShops.find(s => s.id === shopId);
        return shop ? shop.name : shopId;
      },
    },
    {
      title: '차량',
      dataIndex: 'vehicleId',
      key: 'vehicleId',
      render: (vehicleId: string) => {
        // 실제 구현 시 차량 정보 연동 필요
        const vehicle = dummyVehicles.find(v => v.id === vehicleId);
        return vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : vehicleId;
      },
    },
    {
      title: '예상 비용',
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      render: (cost: number) => formatPrice(cost),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: BookingStatus) => (
        <Tag color={statusColors[status] || 'default'}>
          {status === BookingStatus.PENDING && '대기 중'}
          {status === BookingStatus.CONFIRMED && '확인됨'}
          {status === BookingStatus.COMPLETED && '완료됨'}
          {status === BookingStatus.CANCELLED && '취소됨'}
          {status === BookingStatus.RESCHEDULED && '일정 변경됨'}
        </Tag>
      ),
    },
    {
      title: '액션',
      key: 'action',
      render: (text: string, record: Booking) => (
        <Space size="middle">
          <Button type="link" onClick={() => viewBookingDetails(record)}>상세 보기</Button>
          
          {record.status === BookingStatus.PENDING || record.status === BookingStatus.CONFIRMED ? (
            <Button type="link" danger onClick={() => openCancelModal(record)}>
              취소
            </Button>
          ) : null}
          
          {record.status === BookingStatus.CONFIRMED && (
            <Button type="link">일정 변경</Button>
          )}
        </Space>
      ),
    },
  ];

  // 예약 상세 보기
  const viewBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    // 여기에 상세 보기 모달 또는 페이지로 이동하는 로직 추가
  };

  // 취소 모달 열기
  const openCancelModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
  };

  return (
    <div className="booking-page">
      <Row gutter={[0, 24]}>
        <Col span={24}>
          <Card>
            <div className="flex justify-between items-center mb-4">
              <Title level={2}>내 예약 관리</Title>
              <Button type="primary" onClick={() => setShowBookingForm(true)}>
                새 예약 만들기
              </Button>
            </div>
            
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane tab="예정된 예약" key="upcoming">
                <Table
                  columns={columns}
                  dataSource={bookings}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </TabPane>
              <TabPane tab="대기 중" key="pending">
                <Table
                  columns={columns}
                  dataSource={bookings}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </TabPane>
              <TabPane tab="완료된 예약" key="completed">
                <Table
                  columns={columns}
                  dataSource={bookings}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </TabPane>
              <TabPane tab="취소된 예약" key="cancelled">
                <Table
                  columns={columns}
                  dataSource={bookings}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      {/* 예약 생성 모달 */}
      <Modal
        title="새 정비 예약"
        open={showBookingForm}
        onCancel={() => setShowBookingForm(false)}
        footer={null}
        width={800}
      >
        <BookingForm
          apiClient={apiClient}
          customerId={userId}
          vehicles={dummyVehicles}
          availableShops={dummyShops}
          onSuccess={handleBookingSuccess}
          onCancel={() => setShowBookingForm(false)}
        />
      </Modal>

      {/* 예약 취소 모달 */}
      <Modal
        title="예약 취소"
        open={showCancelModal}
        onCancel={() => setShowCancelModal(false)}
        onOk={handleCancelBooking}
        okText="예약 취소"
        cancelText="돌아가기"
        okButtonProps={{ danger: true, loading: cancelLoading }}
      >
        <p>정말로 예약을 취소하시겠습니까?</p>
        <p>취소 사유 (선택사항):</p>
        <input
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="취소 사유를 입력하세요"
        />
      </Modal>
    </div>
  );
};

export default BookingPage; 