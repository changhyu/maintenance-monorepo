import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Form, Input, Select, DatePicker, Button, Row, Col, Card, Alert, Spin } from 'antd';
import dayjs from 'dayjs';
import { bookingService, ServiceType } from '../../services/bookingService';
const { Option } = Select;
const { TextArea } = Input;
const BookingForm = ({ apiClient, customerId, vehicles, availableShops, onSuccess, onCancel }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [selectedShop, setSelectedShop] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedServiceType, setSelectedServiceType] = useState(ServiceType.REGULAR_MAINTENANCE);
    const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
    // 날짜나 정비소가 변경되면 가용 시간대 조회
    useEffect(() => {
        if (selectedShop && selectedDate) {
            fetchAvailableTimeSlots();
        }
    }, [selectedShop, selectedDate, selectedServiceType]);
    // 가용 시간대 조회 함수
    const fetchAvailableTimeSlots = async () => {
        try {
            setIsCheckingAvailability(true);
            const timeSlots = await bookingService.getAvailableTimeSlots(selectedShop, selectedDate, selectedServiceType);
            setAvailableTimeSlots(timeSlots);
        }
        catch (err) {
            setError('가용 시간대 조회 중 오류가 발생했습니다.');
            console.error('가용 시간대 조회 오류:', err);
        }
        finally {
            setIsCheckingAvailability(false);
        }
    };
    // 폼 제출 핸들러
    const handleSubmit = async (values) => {
        try {
            setLoading(true);
            setError(null);
            const bookingData = {
                customerId,
                vehicleId: values.vehicleId,
                shopId: values.shopId,
                serviceType: values.serviceType,
                additionalServices: values.additionalServices,
                scheduledDate: values.scheduledDate.format('YYYY-MM-DD'),
                scheduledTime: values.scheduledTime.format('HH:mm'),
                notes: values.notes
            };
            const booking = await bookingService.createBooking(bookingData);
            if (onSuccess) {
                onSuccess(booking);
            }
            form.resetFields();
        }
        catch (err) {
            setError('예약 생성 중 오류가 발생했습니다.');
            console.error('예약 생성 오류:', err);
        }
        finally {
            setLoading(false);
        }
    };
    // 차량 변경 핸들러
    const handleVehicleChange = (vehicleId) => {
        setSelectedVehicle(vehicleId);
    };
    // 정비소 변경 핸들러
    const handleShopChange = (shopId) => {
        setSelectedShop(shopId);
    };
    // 날짜 변경 핸들러
    const handleDateChange = (date) => {
        if (date) {
            setSelectedDate(date.format('YYYY-MM-DD'));
        }
        else {
            setSelectedDate('');
        }
    };
    // 서비스 유형 변경 핸들러
    const handleServiceTypeChange = (serviceType) => {
        setSelectedServiceType(serviceType);
    };
    return (_jsxs(Card, { title: "\uCC28\uB7C9 \uC815\uBE44 \uC608\uC57D", className: "booking-form-card", children: [error && _jsx(Alert, { message: error, type: "error", showIcon: true, className: "mb-4" }), _jsx(Spin, { spinning: loading, children: _jsxs(Form, { form: form, layout: "vertical", onFinish: handleSubmit, initialValues: {
                        serviceType: ServiceType.REGULAR_MAINTENANCE
                    }, children: [_jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "vehicleId", label: "\uCC28\uB7C9 \uC120\uD0DD", rules: [{ required: true, message: '차량을 선택해주세요' }], children: _jsx(Select, { placeholder: "\uC815\uBE44\uD560 \uCC28\uB7C9 \uC120\uD0DD", onChange: handleVehicleChange, children: vehicles.map(vehicle => (_jsxs(Option, { value: vehicle.id, children: [vehicle.year, " ", vehicle.make, " ", vehicle.model, " (", vehicle.licensePlate, ")"] }, vehicle.id))) }) }) }), _jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "serviceType", label: "\uC11C\uBE44\uC2A4 \uC720\uD615", rules: [{ required: true, message: '서비스 유형을 선택해주세요' }], children: _jsxs(Select, { placeholder: "\uD544\uC694\uD55C \uC11C\uBE44\uC2A4 \uC120\uD0DD", onChange: handleServiceTypeChange, children: [_jsx(Option, { value: ServiceType.REGULAR_MAINTENANCE, children: "\uC815\uAE30 \uC720\uC9C0\uBCF4\uC218" }), _jsx(Option, { value: ServiceType.REPAIR, children: "\uC218\uB9AC" }), _jsx(Option, { value: ServiceType.INSPECTION, children: "\uAC80\uC0AC" }), _jsx(Option, { value: ServiceType.TIRE_CHANGE, children: "\uD0C0\uC774\uC5B4 \uAD50\uCCB4" }), _jsx(Option, { value: ServiceType.OIL_CHANGE, children: "\uC624\uC77C \uAD50\uCCB4" }), _jsx(Option, { value: ServiceType.CUSTOM, children: "\uAE30\uD0C0 \uC11C\uBE44\uC2A4" })] }) }) })] }), _jsx(Row, { gutter: 16, children: _jsx(Col, { span: 24, children: _jsx(Form.Item, { name: "additionalServices", label: "\uCD94\uAC00 \uC11C\uBE44\uC2A4 (\uC120\uD0DD\uC0AC\uD56D)", children: _jsxs(Select, { mode: "multiple", placeholder: "\uD544\uC694\uD55C \uCD94\uAC00 \uC11C\uBE44\uC2A4 \uC120\uD0DD", optionLabelProp: "label", children: [_jsx(Option, { value: "air_filter", label: "\uC5D0\uC5B4\uD544\uD130 \uAD50\uCCB4", children: "\uC5D0\uC5B4\uD544\uD130 \uAD50\uCCB4" }), _jsx(Option, { value: "alignment", label: "\uD720 \uC5BC\uB77C\uC778\uBA3C\uD2B8", children: "\uD720 \uC5BC\uB77C\uC778\uBA3C\uD2B8" }), _jsx(Option, { value: "battery", label: "\uBC30\uD130\uB9AC \uC810\uAC80/\uAD50\uCCB4", children: "\uBC30\uD130\uB9AC \uC810\uAC80/\uAD50\uCCB4" }), _jsx(Option, { value: "brake", label: "\uBE0C\uB808\uC774\uD06C \uC810\uAC80", children: "\uBE0C\uB808\uC774\uD06C \uC810\uAC80" }), _jsx(Option, { value: "cooling", label: "\uB0C9\uAC01 \uC2DC\uC2A4\uD15C \uC810\uAC80", children: "\uB0C9\uAC01 \uC2DC\uC2A4\uD15C \uC810\uAC80" }), _jsx(Option, { value: "diagnostic", label: "\uC9C4\uB2E8 \uAC80\uC0AC", children: "\uC9C4\uB2E8 \uAC80\uC0AC" })] }) }) }) }), _jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "shopId", label: "\uC815\uBE44\uC18C \uC120\uD0DD", rules: [{ required: true, message: '정비소를 선택해주세요' }], children: _jsx(Select, { placeholder: "\uC815\uBE44\uC18C \uC120\uD0DD", onChange: handleShopChange, children: availableShops.map(shop => (_jsxs(Option, { value: shop.id, children: [shop.name, " ", shop.distance ? `(${shop.distance}km)` : '', " - ", shop.rating, "\u2605"] }, shop.id))) }) }) }), _jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "scheduledDate", label: "\uC608\uC57D \uB0A0\uC9DC", rules: [{ required: true, message: '예약 날짜를 선택해주세요' }], children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: current => {
                                                // 오늘 이전 날짜는 선택 불가
                                                return current && current < dayjs().startOf('day');
                                            }, onChange: handleDateChange, placeholder: "\uC608\uC57D \uB0A0\uC9DC \uC120\uD0DD" }) }) })] }), _jsx(Row, { children: _jsx(Col, { span: 24, children: _jsx(Form.Item, { name: "scheduledTime", label: "\uC608\uC57D \uC2DC\uAC04", rules: [{ required: true, message: '예약 시간을 선택해주세요' }], extra: isCheckingAvailability ? '가능한 시간대 확인 중...' : '', children: _jsx(Select, { placeholder: "\uC608\uC57D \uC2DC\uAC04 \uC120\uD0DD", loading: isCheckingAvailability, disabled: !selectedDate || !selectedShop || isCheckingAvailability, children: availableTimeSlots
                                            .filter(slot => slot.available)
                                            .map(slot => (_jsx(Option, { value: slot.time, children: slot.time }, slot.time))) }) }) }) }), _jsx(Form.Item, { name: "notes", label: "\uCD94\uAC00 \uC694\uCCAD\uC0AC\uD56D (\uC120\uD0DD\uC0AC\uD56D)", children: _jsx(TextArea, { rows: 4, placeholder: "\uCD94\uAC00 \uC694\uCCAD\uC0AC\uD56D\uC774\uB098 \uCC28\uB7C9 \uC0C1\uD0DC\uC5D0 \uB300\uD55C \uC124\uBA85\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694", maxLength: 500 }) }), _jsx(Form.Item, { children: _jsxs("div", { className: "flex justify-end space-x-2", children: [onCancel && _jsx(Button, { onClick: onCancel, children: "\uCDE8\uC18C" }), _jsx(Button, { type: "primary", htmlType: "submit", loading: loading, children: "\uC608\uC57D\uD558\uAE30" })] }) })] }) })] }));
};
export default BookingForm;
