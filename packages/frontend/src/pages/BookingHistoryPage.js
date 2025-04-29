import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { CarOutlined, CalendarOutlined, SearchOutlined, ExclamationCircleOutlined, CheckCircleOutlined, FilterOutlined, CloseOutlined, MoreOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import { Table, Card, Tag, Button, Space, Tabs, Typography, Dropdown, Menu, Modal, Badge, Empty, message, Row, Col, Input, DatePicker, Select } from 'antd';
import dayjs from 'dayjs';
import { BookingButton } from '../components/booking';
const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
// 예약 상태 정의
export var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING"] = "\uB300\uAE30 \uC911";
    BookingStatus["CONFIRMED"] = "\uD655\uC815";
    BookingStatus["COMPLETED"] = "\uC644\uB8CC";
    BookingStatus["CANCELLED"] = "\uCDE8\uC18C";
})(BookingStatus || (BookingStatus = {}));
/**
 * 예약 현황 페이지 컴포넌트
 */
const BookingHistoryPage = () => {
    const [bookings, setBookings] = useState([]);
    const [filteredBookings, setFilteredBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [filters, setFilters] = useState({
        search: '',
        dateRange: null
    });
    const [showFilters, setShowFilters] = useState(false);
    const [vehicles, setVehicles] = useState([]);
    const [shops, setShops] = useState([]);
    const [maintenanceTypes, setMaintenanceTypes] = useState([]);
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
            const mockBookings = generateMockBookings();
            setBookings(mockBookings);
        }
        catch (error) {
            console.error('예약 데이터 조회 실패:', error);
            message.error('예약 데이터를 불러오는데 실패했습니다.');
        }
        finally {
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
        }
        catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
            console.error('정비 유형 조회 실패:', error);
        }
    };
    // 샘플 예약 데이터 생성
    const generateMockBookings = () => {
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
        const urgencyLevels = ['low', 'medium', 'high'];
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
        }
        else if (activeTab === 'confirmed') {
            result = result.filter(booking => booking.status === BookingStatus.CONFIRMED);
        }
        else if (activeTab === 'completed') {
            result = result.filter(booking => booking.status === BookingStatus.COMPLETED);
        }
        else if (activeTab === 'cancelled') {
            result = result.filter(booking => booking.status === BookingStatus.CANCELLED);
        }
        // 검색어 필터링
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(booking => booking.vehicleName.toLowerCase().includes(searchLower) ||
                booking.maintenanceTypeName.toLowerCase().includes(searchLower) ||
                booking.shopName.toLowerCase().includes(searchLower) ||
                booking.id.toLowerCase().includes(searchLower));
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
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };
    // 예약 취소 확인
    const showCancelConfirm = (booking) => {
        Modal.confirm({
            title: '예약 취소',
            icon: _jsx(ExclamationCircleOutlined, {}),
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
    const handleCancelBooking = async (bookingId) => {
        try {
            // 실제 구현 시 API 호출
            // await apiClient.put(`/bookings/${bookingId}/cancel`);
            // 테스트용 처리
            await new Promise(resolve => setTimeout(resolve, 500));
            // 상태 업데이트
            setBookings(prev => prev.map(booking => booking.id === bookingId
                ? { ...booking, status: BookingStatus.CANCELLED, updatedAt: new Date().toISOString() }
                : booking));
            message.success('예약이 성공적으로 취소되었습니다.');
        }
        catch (error) {
            console.error('예약 취소 실패:', error);
            message.error('예약 취소에 실패했습니다.');
        }
    };
    // 예약 완료 확인
    const showCompleteConfirm = (booking) => {
        Modal.confirm({
            title: '정비 완료 처리',
            icon: _jsx(CheckCircleOutlined, {}),
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
    const handleCompleteBooking = async (bookingId) => {
        try {
            // 실제 구현 시 API 호출
            // await apiClient.put(`/bookings/${bookingId}/complete`);
            // 테스트용 처리
            await new Promise(resolve => setTimeout(resolve, 500));
            // 임의의 정비 비용 생성
            const cost = Math.floor(Math.random() * 500000) + 50000;
            // 상태 업데이트
            setBookings(prev => prev.map(booking => booking.id === bookingId
                ? {
                    ...booking,
                    status: BookingStatus.COMPLETED,
                    updatedAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                    cost
                }
                : booking));
            message.success('정비가 완료 처리되었습니다.');
        }
        catch (error) {
            console.error('정비 완료 처리 실패:', error);
            message.error('정비 완료 처리에 실패했습니다.');
        }
    };
    // 상태에 따른 뱃지 색상
    const getStatusBadge = (status) => {
        switch (status) {
            case BookingStatus.PENDING:
                return _jsx(Badge, { status: "warning", text: "\uB300\uAE30 \uC911" });
            case BookingStatus.CONFIRMED:
                return _jsx(Badge, { status: "processing", text: "\uD655\uC815" });
            case BookingStatus.COMPLETED:
                return _jsx(Badge, { status: "success", text: "\uC644\uB8CC" });
            case BookingStatus.CANCELLED:
                return _jsx(Badge, { status: "error", text: "\uCDE8\uC18C" });
            default:
                return _jsx(Badge, { status: "default", text: status });
        }
    };
    // 긴급도에 따른 태그 색상
    const getUrgencyTag = (level) => {
        switch (level) {
            case 'high':
                return _jsx(Tag, { color: "red", children: "\uB192\uC74C" });
            case 'medium':
                return _jsx(Tag, { color: "orange", children: "\uC911\uAC04" });
            case 'low':
                return _jsx(Tag, { color: "green", children: "\uB0AE\uC74C" });
            default:
                return _jsx(Tag, { children: level });
        }
    };
    const handleSearch = (e) => {
        setFilters(prev => ({ ...prev, search: e.target.value }));
    };
    const handleDateRangeChange = (dates, dateStrings) => {
        setFilters(prev => ({ ...prev, dateRange: dates }));
    };
    const handleVehicleChange = (value) => {
        setFilters(prev => ({ ...prev, vehicleId: value }));
    };
    const handleShopChange = (value) => {
        setFilters(prev => ({ ...prev, shopId: value }));
    };
    const handleMaintenanceTypeChange = (value) => {
        setFilters(prev => ({ ...prev, maintenanceTypeId: value }));
    };
    const handleUrgencyChange = (value) => {
        setFilters(prev => ({ ...prev, urgencyLevel: value }));
    };
    const handleMenuClick = (info) => {
        // ... 기존 코드 ...
    };
    const handleTableChange = (pagination, filters, sorter, extra) => {
        // ... 기존 코드 ...
    };
    const renderBookingActions = (record) => {
        // ... 기존 코드 ...
    };
    // 테이블 컬럼 정의
    const columns = [
        {
            title: '예약 ID',
            dataIndex: 'id',
            key: 'id',
            width: 120
        },
        {
            title: '차량',
            dataIndex: 'vehicleName',
            key: 'vehicleName',
            width: 120,
            render: (text, record) => (_jsxs(Space, { children: [_jsx(CarOutlined, {}), text, " (", record.vehicleType, ")"] }))
        },
        {
            title: '정비 유형',
            dataIndex: 'maintenanceTypeName',
            key: 'maintenanceTypeName',
            width: 150
        },
        {
            title: '정비소',
            dataIndex: 'shopName',
            key: 'shopName',
            width: 150
        },
        {
            title: '예약일',
            key: 'datetime',
            width: 180,
            render: (_, record) => (_jsxs(Space, { children: [_jsx(CalendarOutlined, {}), record.date, " ", record.time] }))
        },
        {
            title: '상태',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status) => getStatusBadge(status)
        },
        {
            title: '긴급도',
            dataIndex: 'urgencyLevel',
            key: 'urgencyLevel',
            width: 100,
            render: (level) => getUrgencyTag(level)
        },
        {
            title: '비용',
            dataIndex: 'cost',
            key: 'cost',
            width: 120,
            render: (cost) => cost ? (_jsxs(Text, { strong: true, children: [cost.toLocaleString('ko-KR'), "\uC6D0"] })) : (_jsx(Text, { type: "secondary", children: "-" }))
        },
        {
            title: '액션',
            key: 'action',
            width: 100,
            render: (_, record) => {
                // 상태에 따라 가능한 액션 결정
                const isActionable = record.status === BookingStatus.PENDING || record.status === BookingStatus.CONFIRMED;
                const isCompletable = record.status === BookingStatus.CONFIRMED;
                if (!isActionable) {
                    return _jsx(Text, { type: "secondary", children: "-" });
                }
                return (_jsx(Dropdown, { overlay: _jsxs(Menu, { children: [record.status === BookingStatus.PENDING && (_jsx(Menu.Item, { icon: _jsx(EditOutlined, {}), children: _jsx(BookingButton, { vehicleId: record.vehicleId, buttonText: "\uC608\uC57D \uBCC0\uACBD", buttonType: "link", onBookingCreated: () => {
                                        message.success(`예약이 성공적으로 변경되었습니다.`);
                                        handleCancelBooking(record.id);
                                    } }) }, "edit")), isCompletable && (_jsx(Menu.Item, { onClick: () => showCompleteConfirm(record), icon: _jsx(CheckCircleOutlined, {}), children: "\uC815\uBE44 \uC644\uB8CC \uCC98\uB9AC" }, "complete")), _jsx(Menu.Item, { onClick: () => showCancelConfirm(record), icon: _jsx(CloseOutlined, {}), danger: true, children: "\uC608\uC57D \uCDE8\uC18C" }, "cancel")] }), children: _jsx(Button, { type: "text", icon: _jsx(MoreOutlined, {}) }) }));
            }
        }
    ];
    return (_jsxs("div", { className: "booking-history-page", style: { padding: '20px' }, children: [_jsx("div", { className: "page-header", style: { marginBottom: '20px' }, children: _jsxs(Row, { justify: "space-between", align: "middle", children: [_jsxs(Col, { children: [_jsx(Title, { level: 2, children: "\uC815\uBE44 \uC608\uC57D \uB0B4\uC5ED" }), _jsx(Text, { type: "secondary", children: "\uBAA8\uB4E0 \uC815\uBE44 \uC608\uC57D \uB0B4\uC5ED\uC744 \uC870\uD68C\uD558\uACE0 \uAD00\uB9AC\uD569\uB2C8\uB2E4." })] }), _jsx(Col, { children: _jsxs(Space, { children: [_jsx(BookingButton, { buttonText: "\uC0C8 \uC608\uC57D \uB4F1\uB85D", buttonType: "primary", onBookingCreated: bookingId => {
                                            message.success(`예약이 성공적으로 등록되었습니다. (예약 ID: ${bookingId})`);
                                            fetchBookings();
                                        } }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: fetchBookings, loading: loading, children: "\uC0C8\uB85C\uACE0\uCE68" })] }) })] }) }), _jsxs(Card, { style: { marginBottom: '20px' }, children: [_jsxs(Row, { gutter: 16, align: "middle", children: [_jsx(Col, { flex: "auto", children: _jsx(Input, { placeholder: "\uCC28\uB7C9, \uC815\uBE44 \uC720\uD615, \uC815\uBE44\uC18C \uB4F1 \uAC80\uC0C9", prefix: _jsx(SearchOutlined, {}), value: filters.search, onChange: handleSearch, style: { width: '100%' }, allowClear: true }) }), _jsx(Col, { children: _jsx(Button, { icon: _jsx(FilterOutlined, {}), onClick: () => setShowFilters(!showFilters), type: showFilters ? 'primary' : 'default', children: "\uD544\uD130" }) })] }), showFilters && (_jsx("div", { style: { marginTop: '16px' }, children: _jsxs(Row, { gutter: [16, 16], children: [_jsxs(Col, { span: 6, children: [_jsx("div", { style: { marginBottom: '8px' }, children: _jsx(Text, { strong: true, children: "\uCC28\uB7C9" }) }), _jsx(Select, { placeholder: "\uCC28\uB7C9 \uC120\uD0DD", style: { width: '100%' }, allowClear: true, value: filters.vehicleId, onChange: handleVehicleChange, children: vehicles.map(vehicle => (_jsx(Option, { value: vehicle.id, children: vehicle.name }, vehicle.id))) })] }), _jsxs(Col, { span: 6, children: [_jsx("div", { style: { marginBottom: '8px' }, children: _jsx(Text, { strong: true, children: "\uC815\uBE44\uC18C" }) }), _jsx(Select, { placeholder: "\uC815\uBE44\uC18C \uC120\uD0DD", style: { width: '100%' }, allowClear: true, value: filters.shopId, onChange: handleShopChange, children: shops.map(shop => (_jsx(Option, { value: shop.id, children: shop.name }, shop.id))) })] }), _jsxs(Col, { span: 6, children: [_jsx("div", { style: { marginBottom: '8px' }, children: _jsx(Text, { strong: true, children: "\uC815\uBE44 \uC720\uD615" }) }), _jsx(Select, { placeholder: "\uC815\uBE44 \uC720\uD615 \uC120\uD0DD", style: { width: '100%' }, allowClear: true, value: filters.maintenanceTypeId, onChange: handleMaintenanceTypeChange, children: maintenanceTypes.map(type => (_jsx(Option, { value: type.id, children: type.name }, type.id))) })] }), _jsxs(Col, { span: 6, children: [_jsx("div", { style: { marginBottom: '8px' }, children: _jsx(Text, { strong: true, children: "\uAE34\uAE09\uB3C4" }) }), _jsxs(Select, { placeholder: "\uAE34\uAE09\uB3C4 \uC120\uD0DD", style: { width: '100%' }, allowClear: true, value: filters.urgencyLevel, onChange: handleUrgencyChange, children: [_jsx(Option, { value: "low", children: "\uB0AE\uC74C" }), _jsx(Option, { value: "medium", children: "\uC911\uAC04" }), _jsx(Option, { value: "high", children: "\uB192\uC74C" })] })] }), _jsxs(Col, { span: 12, children: [_jsx("div", { style: { marginBottom: '8px' }, children: _jsx(Text, { strong: true, children: "\uC608\uC57D \uAE30\uAC04" }) }), _jsx(RangePicker, { style: { width: '100%' }, value: filters.dateRange, onChange: handleDateRangeChange })] }), _jsxs(Col, { span: 12, style: { textAlign: 'right' }, children: [_jsx(Button, { onClick: resetFilters, style: { marginRight: '8px' }, children: "\uD544\uD130 \uCD08\uAE30\uD654" }), _jsx(Button, { type: "primary", onClick: applyFilters, children: "\uD544\uD130 \uC801\uC6A9" })] })] }) }))] }), _jsxs(Card, { children: [_jsxs(Tabs, { activeKey: activeTab, onChange: setActiveTab, tabBarExtraContent: _jsxs(Text, { type: "secondary", children: ["\uCD1D ", filteredBookings.length, "\uAC74\uC758 \uC608\uC57D"] }), children: [_jsx(TabPane, { tab: "\uC804\uCCB4" }, "all"), _jsx(TabPane, { tab: _jsxs("span", { children: ["\uB300\uAE30 \uC911", _jsx(Tag, { color: "gold", style: { marginLeft: '4px' }, children: bookings.filter(b => b.status === BookingStatus.PENDING).length })] }) }, "pending"), _jsx(TabPane, { tab: _jsxs("span", { children: ["\uD655\uC815", _jsx(Tag, { color: "blue", style: { marginLeft: '4px' }, children: bookings.filter(b => b.status === BookingStatus.CONFIRMED).length })] }) }, "confirmed"), _jsx(TabPane, { tab: _jsxs("span", { children: ["\uC644\uB8CC", _jsx(Tag, { color: "green", style: { marginLeft: '4px' }, children: bookings.filter(b => b.status === BookingStatus.COMPLETED).length })] }) }, "completed"), _jsx(TabPane, { tab: _jsxs("span", { children: ["\uCDE8\uC18C", _jsx(Tag, { color: "red", style: { marginLeft: '4px' }, children: bookings.filter(b => b.status === BookingStatus.CANCELLED).length })] }) }, "cancelled")] }), _jsx(Table, { dataSource: filteredBookings, columns: columns, rowKey: "id", pagination: { pageSize: 10 }, loading: loading, locale: { emptyText: _jsx(Empty, { description: "\uC608\uC57D \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }) }, expandable: {
                            expandedRowRender: (record) => (_jsx("div", { style: { padding: '0 16px' }, children: _jsxs(Row, { gutter: [24, 16], children: [_jsxs(Col, { span: 12, children: [_jsxs("div", { children: [_jsx(Text, { type: "secondary", children: "\uB2F4\uB2F9\uC790:" }), " ", _jsx(Text, { strong: true, children: record.contactName })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", children: "\uC5F0\uB77D\uCC98:" }), " ", _jsx(Text, { children: record.contactPhone })] }), record.requiresPickup && (_jsx("div", { children: _jsx(Tag, { color: "cyan", children: "\uD53D\uC5C5 \uC11C\uBE44\uC2A4 \uC694\uCCAD" }) }))] }), _jsxs(Col, { span: 12, children: [record.description && (_jsxs("div", { children: [_jsx(Text, { type: "secondary", children: "\uC694\uCCAD \uC0AC\uD56D:" }), " ", _jsx(Text, { children: record.description })] })), _jsxs("div", { children: [_jsx(Text, { type: "secondary", children: "\uC608\uC57D \uB4F1\uB85D\uC77C:" }), ' ', _jsx(Text, { children: new Date(record.createdAt).toLocaleString('ko-KR') })] }), record.completedAt && (_jsxs("div", { children: [_jsx(Text, { type: "secondary", children: "\uC815\uBE44 \uC644\uB8CC\uC77C:" }), ' ', _jsx(Text, { children: new Date(record.completedAt).toLocaleString('ko-KR') })] }))] })] }) }))
                        } })] })] }));
};
export default BookingHistoryPage;
