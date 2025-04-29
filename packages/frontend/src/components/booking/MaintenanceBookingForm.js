import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { CarOutlined, ToolOutlined, CalendarOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { Form, Input, Select, DatePicker, Button, Row, Col, Checkbox, Card, message, Typography, Divider, Radio } from 'antd';
import dayjs from 'dayjs';
const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
/**
 * 정비 예약 폼 컴포넌트
 */
const MaintenanceBookingForm = ({ vehicleId, onSuccess, onCancel }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [vehicles, setVehicles] = useState([]);
    const [shops, setShops] = useState([]);
    const [selectedShop, setSelectedShop] = useState(null);
    const [maintenanceTypes, setMaintenanceTypes] = useState([]);
    const [urgencyLevel, setUrgencyLevel] = useState('medium');
    const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
    // 컴포넌트 마운트 시 필요한 데이터 로드
    useEffect(() => {
        fetchVehicles();
        fetchShops();
        fetchMaintenanceTypes();
        // 초기 차량 ID가 있으면 폼에 설정
        if (vehicleId) {
            form.setFieldsValue({ vehicleId });
        }
    }, [vehicleId, form]);
    // 차량 데이터 조회
    const fetchVehicles = async () => {
        try {
            // const response = await apiClient.get('/vehicles');
            // setVehicles(response.data);
            // 샘플 데이터
            setVehicles([
                { id: 'v001', name: '차량 1001', type: '승용차', status: '운행 중' },
                { id: 'v002', name: '차량 1002', type: 'SUV', status: '운행 중' },
                { id: 'v003', name: '차량 1003', type: '화물차', status: '정비 중' },
                { id: 'v004', name: '차량 1004', type: '버스', status: '대기 중' },
                { id: 'v005', name: '차량 1005', type: '승용차', status: '점검 필요' }
            ]);
        }
        catch (error) {
            console.error('차량 데이터 조회 실패:', error);
            message.error('차량 데이터를 불러오는데 실패했습니다.');
        }
    };
    // 정비소 데이터 조회
    const fetchShops = async () => {
        try {
            // const response = await apiClient.get('/shops');
            // setShops(response.data);
            // 샘플 데이터
            setShops([
                {
                    id: 's001',
                    name: '서울 중앙 정비소',
                    address: '서울시 강남구 테헤란로 123',
                    rating: 4.8,
                    services: ['정기 점검', '엔진 수리', '타이어 교체', '오일 교체']
                },
                {
                    id: 's002',
                    name: '부산 정비 센터',
                    address: '부산시 해운대구 센텀로 456',
                    rating: 4.5,
                    services: ['정기 점검', '브레이크 수리', '배터리 교체', '에어컨 수리']
                },
                {
                    id: 's003',
                    name: '대구 종합 정비',
                    address: '대구시 수성구 대구로 789',
                    rating: 4.2,
                    services: ['엔진 오일 교체', '타이어 교체', '배터리 교체', '종합 점검']
                }
            ]);
        }
        catch (error) {
            console.error('정비소 데이터 조회 실패:', error);
            message.error('정비소 데이터를 불러오는데 실패했습니다.');
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
            message.error('정비 유형 데이터를 불러오는데 실패했습니다.');
        }
    };
    // 정비소 선택 시 가용 시간대 조회
    const handleShopChange = (shopId) => {
        setSelectedShop(shopId);
        fetchAvailableTimeSlots(shopId, form.getFieldValue('date'));
    };
    // 날짜 선택 시 가용 시간대 조회
    const handleDateChange = (date) => {
        if (selectedShop && date) {
            fetchAvailableTimeSlots(selectedShop, date);
        }
    };
    // 가용 시간대 조회
    const fetchAvailableTimeSlots = async (shopId, date) => {
        try {
            // 실제 구현 시 API 호출
            // const response = await apiClient.get(`/shops/${shopId}/available-slots?date=${date.format('YYYY-MM-DD')}`);
            // setAvailableTimeSlots(response.data);
            // 샘플 데이터
            const slots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
            setAvailableTimeSlots(slots);
        }
        catch (error) {
            console.error('가용 시간대 조회 실패:', error);
            message.error('가용 시간대를 불러오는데 실패했습니다.');
        }
    };
    // 폼 제출 처리
    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // 예약 데이터 생성
            const bookingData = {
                ...values,
                date: values.date.format('YYYY-MM-DD'),
                time: values.time.format('HH:mm'),
                urgencyLevel,
                status: '대기 중'
            };
            // 실제 구현 시 API 호출
            // const response = await apiClient.post('/bookings', bookingData);
            // 테스트용 타임아웃
            await new Promise(resolve => setTimeout(resolve, 1000));
            message.success('정비 예약이 성공적으로 등록되었습니다.');
            // 성공 콜백 호출
            if (onSuccess) {
                onSuccess('booking-' + Date.now());
            }
            // 폼 초기화
            form.resetFields();
        }
        catch (error) {
            console.error('예약 등록 실패:', error);
            message.error('예약 등록에 실패했습니다. 다시 시도해주세요.');
        }
        finally {
            setLoading(false);
        }
    };
    // 긴급도 변경 처리
    const handleUrgencyChange = (e) => {
        setUrgencyLevel(e.target.value);
    };
    return (_jsx(Card, { title: "\uC815\uBE44 \uC608\uC57D", className: "maintenance-booking-form", children: _jsxs(Form, { form: form, layout: "vertical", onFinish: handleSubmit, initialValues: {
                urgencyLevel: 'medium',
                requiresPickup: false,
                date: dayjs().add(1, 'day')
            }, children: [_jsx(Title, { level: 5, children: "1. \uCC28\uB7C9 \uC120\uD0DD" }), _jsx(Form.Item, { name: "vehicleId", label: "\uCC28\uB7C9", rules: [{ required: true, message: '차량을 선택해주세요' }], children: _jsx(Select, { placeholder: "\uCC28\uB7C9 \uC120\uD0DD", suffixIcon: _jsx(CarOutlined, {}), disabled: !!vehicleId, children: vehicles.map(vehicle => (_jsxs(Option, { value: vehicle.id, children: [vehicle.name, " (", vehicle.type, ")"] }, vehicle.id))) }) }), _jsx(Divider, {}), _jsx(Title, { level: 5, children: "2. \uC815\uBE44 \uC815\uBCF4" }), _jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "maintenanceTypeId", label: "\uC815\uBE44 \uC720\uD615", rules: [{ required: true, message: '정비 유형을 선택해주세요' }], children: _jsx(Select, { placeholder: "\uC815\uBE44 \uC720\uD615 \uC120\uD0DD", suffixIcon: _jsx(ToolOutlined, {}), children: maintenanceTypes.map(type => (_jsx(Option, { value: type.id, children: type.name }, type.id))) }) }) }), _jsx(Col, { span: 12, children: _jsx(Form.Item, { label: "\uAE34\uAE09\uB3C4", children: _jsxs(Radio.Group, { value: urgencyLevel, onChange: handleUrgencyChange, children: [_jsx(Radio.Button, { value: "low", children: "\uB0AE\uC74C" }), _jsx(Radio.Button, { value: "medium", children: "\uC911\uAC04" }), _jsx(Radio.Button, { value: "high", children: "\uB192\uC74C" })] }) }) })] }), _jsx(Form.Item, { name: "description", label: "\uBB38\uC81C \uC124\uBA85", children: _jsx(TextArea, { rows: 4, placeholder: "\uC815\uBE44\uAC00 \uD544\uC694\uD55C \uBB38\uC81C\uC5D0 \uB300\uD574 \uC0C1\uC138\uD788 \uC124\uBA85\uD574\uC8FC\uC138\uC694" }) }), _jsx(Divider, {}), _jsx(Title, { level: 5, children: "3. \uC815\uBE44\uC18C \uBC0F \uC77C\uC815" }), _jsx(Form.Item, { name: "shopId", label: "\uC815\uBE44\uC18C", rules: [{ required: true, message: '정비소를 선택해주세요' }], children: _jsx(Select, { placeholder: "\uC815\uBE44\uC18C \uC120\uD0DD", suffixIcon: _jsx(EnvironmentOutlined, {}), onChange: handleShopChange, children: shops.map(shop => (_jsxs(Option, { value: shop.id, children: [shop.name, " (", shop.address, ")"] }, shop.id))) }) }), _jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "date", label: "\uB0A0\uC9DC", rules: [{ required: true, message: '날짜를 선택해주세요' }], children: _jsx(DatePicker, { style: { width: '100%' }, disabledDate: current => current && current < dayjs().startOf('day'), onChange: handleDateChange, format: "YYYY-MM-DD" }) }) }), _jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "time", label: "\uC2DC\uAC04", rules: [{ required: true, message: '시간을 선택해주세요' }], children: _jsx(Select, { placeholder: "\uC2DC\uAC04 \uC120\uD0DD", disabled: !selectedShop || availableTimeSlots.length === 0, children: availableTimeSlots.map(slot => (_jsx(Option, { value: slot, children: slot }, slot))) }) }) })] }), _jsx(Form.Item, { name: "requiresPickup", valuePropName: "checked", children: _jsx(Checkbox, { children: "\uD53D\uC5C5 \uC11C\uBE44\uC2A4 \uD544\uC694" }) }), _jsx(Divider, {}), _jsx(Title, { level: 5, children: "4. \uC5F0\uB77D\uCC98 \uC815\uBCF4" }), _jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "contactName", label: "\uB2F4\uB2F9\uC790 \uC774\uB984", rules: [{ required: true, message: '담당자 이름을 입력해주세요' }], children: _jsx(Input, { prefix: _jsx(UserOutlined, {}), placeholder: "\uB2F4\uB2F9\uC790 \uC774\uB984" }) }) }), _jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "contactPhone", label: "\uC5F0\uB77D\uCC98", rules: [
                                    { required: true, message: '연락처를 입력해주세요' },
                                    {
                                        pattern: /^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}$/,
                                        message: '올바른 연락처 형식이 아닙니다 (예: 010-1234-5678)'
                                    }
                                ], children: _jsx(Input, { prefix: _jsx(PhoneOutlined, {}), placeholder: "\uC5F0\uB77D\uCC98 (\uC608: 010-1234-5678)" }) }) })] }), _jsx(Form.Item, { children: _jsxs("div", { style: { textAlign: 'right', marginTop: '16px' }, children: [onCancel && (_jsx(Button, { onClick: onCancel, style: { marginRight: '8px' }, children: "\uCDE8\uC18C" })), _jsx(Button, { type: "primary", htmlType: "submit", loading: loading, icon: _jsx(CalendarOutlined, {}), children: "\uC608\uC57D \uB4F1\uB85D" })] }) })] }) }));
};
export default MaintenanceBookingForm;
