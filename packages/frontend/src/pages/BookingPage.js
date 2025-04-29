import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// @ts-nocheck
import { useState, useEffect } from 'react';
import { Tabs, Table, Button, Tag, Space, Modal, message, Typography, Row, Col, Card } from 'antd';
import BookingForm from '../components/booking/BookingForm';
import { useApi } from '../context/ApiContext';
import { useAuth } from '../context/AuthContext';
import { bookingService, BookingStatus, ServiceType } from '../services/bookingService';
const { TabPane } = Tabs;
const { Title, Text } = Typography;
// 임시 데이터 - 실제 구현 시 API 연동 필요
const dummyVehicles = [
    { id: 'v1', make: '현대', model: '아반떼', year: 2020, licensePlate: '서울12가3456' },
    { id: 'v2', make: '기아', model: 'K5', year: 2019, licensePlate: '경기34나5678' },
    { id: 'v3', make: '쌍용', model: '티볼리', year: 2021, licensePlate: '인천56다7890' }
];
const dummyShops = [
    {
        id: 's1',
        name: '현대 공식 서비스센터 강남점',
        address: '서울시 강남구',
        rating: 4.8,
        distance: 3.2
    },
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
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
// 가격 포맷팅 함수
const formatPrice = (price) => {
    return price.toLocaleString('ko-KR') + '원';
};
const BookingPage = () => {
    const { apiClient } = useApi();
    const { user } = useAuth();
    const userId = user?.id || '';
    const [activeTab, setActiveTab] = useState('upcoming');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showBookingForm, setShowBookingForm] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
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
            const filter = { customerId: userId };
            // 탭에 따라 필터 설정
            if (activeTab === 'upcoming') {
                filter.status = BookingStatus.CONFIRMED;
            }
            else if (activeTab === 'pending') {
                filter.status = BookingStatus.PENDING;
            }
            else if (activeTab === 'completed') {
                filter.status = BookingStatus.COMPLETED;
            }
            else if (activeTab === 'cancelled') {
                filter.status = BookingStatus.CANCELLED;
            }
            const result = await bookingService.getBookings(filter);
            setBookings(result.bookings);
        }
        catch (error) {
            console.error('예약 목록 로드 중 오류 발생:', error);
            message.error('예약 정보를 불러오는 데 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    // 예약 취소 처리
    const handleCancelBooking = async () => {
        if (!selectedBooking)
            return;
        try {
            setCancelLoading(true);
            await bookingService.cancelBooking(selectedBooking.id, cancelReason);
            message.success('예약이 취소되었습니다.');
            setShowCancelModal(false);
            setSelectedBooking(null);
            setCancelReason('');
            loadBookings(); // 목록 새로고침
        }
        catch (error) {
            console.error('예약 취소 중 오류 발생:', error);
            message.error('예약 취소에 실패했습니다.');
        }
        finally {
            setCancelLoading(false);
        }
    };
    // 예약 생성 성공 핸들러
    const handleBookingSuccess = (booking) => {
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
            render: (date, record) => (_jsxs("span", { children: [formatDate(date), " ", record.scheduledTime] }))
        },
        {
            title: '서비스 유형',
            dataIndex: 'serviceType',
            key: 'serviceType',
            render: (type) => serviceTypeLabels[type] || type
        },
        {
            title: '정비소',
            dataIndex: 'shopId',
            key: 'shopId',
            render: (shopId) => {
                // 실제 구현 시 정비소 정보 연동 필요
                const shop = dummyShops.find(s => s.id === shopId);
                return shop ? shop.name : shopId;
            }
        },
        {
            title: '차량',
            dataIndex: 'vehicleId',
            key: 'vehicleId',
            render: (vehicleId) => {
                // 실제 구현 시 차량 정보 연동 필요
                const vehicle = dummyVehicles.find(v => v.id === vehicleId);
                return vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : vehicleId;
            }
        },
        {
            title: '예상 비용',
            dataIndex: 'estimatedCost',
            key: 'estimatedCost',
            render: (cost) => formatPrice(cost)
        },
        {
            title: '상태',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (_jsxs(Tag, { color: statusColors[status] || 'default', children: [status === BookingStatus.PENDING && '대기 중', status === BookingStatus.CONFIRMED && '확인됨', status === BookingStatus.COMPLETED && '완료됨', status === BookingStatus.CANCELLED && '취소됨', status === BookingStatus.RESCHEDULED && '일정 변경됨'] }))
        },
        {
            title: '액션',
            key: 'action',
            render: (text, record) => (_jsxs(Space, { size: "middle", children: [_jsx(Button, { type: "link", onClick: () => viewBookingDetails(record), children: "\uC0C1\uC138 \uBCF4\uAE30" }), record.status === BookingStatus.PENDING || record.status === BookingStatus.CONFIRMED ? (_jsx(Button, { type: "link", danger: true, onClick: () => openCancelModal(record), children: "\uCDE8\uC18C" })) : null, record.status === BookingStatus.CONFIRMED && _jsx(Button, { type: "link", children: "\uC77C\uC815 \uBCC0\uACBD" })] }))
        }
    ];
    // 예약 상세 보기
    const viewBookingDetails = (booking) => {
        setSelectedBooking(booking);
        // 여기에 상세 보기 모달 또는 페이지로 이동하는 로직 추가
    };
    // 취소 모달 열기
    const openCancelModal = (booking) => {
        setSelectedBooking(booking);
        setShowCancelModal(true);
    };
    return (_jsxs("div", { className: "booking-page", children: [_jsx(Row, { gutter: [0, 24], children: _jsx(Col, { span: 24, children: _jsxs(Card, { children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx(Title, { level: 2, children: "\uB0B4 \uC608\uC57D \uAD00\uB9AC" }), _jsx(Button, { type: "primary", onClick: () => setShowBookingForm(true), children: "\uC0C8 \uC608\uC57D \uB9CC\uB4E4\uAE30" })] }), _jsxs(Tabs, { activeKey: activeTab, onChange: setActiveTab, children: [_jsx(TabPane, { tab: "\uC608\uC815\uB41C \uC608\uC57D", children: _jsx(Table, { columns: columns, dataSource: bookings, rowKey: "id", loading: loading, pagination: { pageSize: 10 } }) }, "upcoming"), _jsx(TabPane, { tab: "\uB300\uAE30 \uC911", children: _jsx(Table, { columns: columns, dataSource: bookings, rowKey: "id", loading: loading, pagination: { pageSize: 10 } }) }, "pending"), _jsx(TabPane, { tab: "\uC644\uB8CC\uB41C \uC608\uC57D", children: _jsx(Table, { columns: columns, dataSource: bookings, rowKey: "id", loading: loading, pagination: { pageSize: 10 } }) }, "completed"), _jsx(TabPane, { tab: "\uCDE8\uC18C\uB41C \uC608\uC57D", children: _jsx(Table, { columns: columns, dataSource: bookings, rowKey: "id", loading: loading, pagination: { pageSize: 10 } }) }, "cancelled")] })] }) }) }), _jsx(Modal, { title: "\uC0C8 \uC815\uBE44 \uC608\uC57D", open: showBookingForm, onCancel: () => setShowBookingForm(false), footer: null, width: 800, children: _jsx(BookingForm, { apiClient: apiClient, customerId: userId, vehicles: dummyVehicles, availableShops: dummyShops, onSuccess: handleBookingSuccess, onCancel: () => setShowBookingForm(false) }) }), _jsxs(Modal, { title: "\uC608\uC57D \uCDE8\uC18C", open: showCancelModal, onCancel: () => setShowCancelModal(false), onOk: handleCancelBooking, okText: "\uC608\uC57D \uCDE8\uC18C", cancelText: "\uB3CC\uC544\uAC00\uAE30", okButtonProps: { danger: true, loading: cancelLoading }, children: [_jsx("p", { children: "\uC815\uB9D0\uB85C \uC608\uC57D\uC744 \uCDE8\uC18C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?" }), _jsx("p", { children: "\uCDE8\uC18C \uC0AC\uC720 (\uC120\uD0DD\uC0AC\uD56D):" }), _jsx("input", { value: cancelReason, onChange: e => setCancelReason(e.target.value), className: "w-full p-2 border rounded", placeholder: "\uCDE8\uC18C \uC0AC\uC720\uB97C \uC785\uB825\uD558\uC138\uC694" })] })] }));
};
export default BookingPage;
