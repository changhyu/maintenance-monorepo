import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { CalendarOutlined } from '@ant-design/icons';
import { Modal, Button } from 'antd';
import MaintenanceBookingForm from './MaintenanceBookingForm';
/**
 * 정비 예약 모달 컴포넌트
 */
const BookingModal = ({ vehicleId, visible, onClose, onBookingCreated, buttonText = '정비 예약', buttonType = 'primary' }) => {
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(visible);
    // 가시성 변경 시 내부 상태 업데이트
    React.useEffect(() => {
        setModalVisible(visible);
    }, [visible]);
    // 예약 생성 완료 처리
    const handleBookingCreated = (bookingId) => {
        setLoading(false);
        setModalVisible(false);
        if (onBookingCreated) {
            onBookingCreated(bookingId);
        }
        onClose();
    };
    // 취소 처리
    const handleCancel = () => {
        setModalVisible(false);
        onClose();
    };
    return (_jsx(Modal, { title: "\uC815\uBE44 \uC608\uC57D \uC2E0\uCCAD", open: modalVisible, onCancel: handleCancel, footer: null, width: 800, destroyOnClose: true, children: _jsx(MaintenanceBookingForm, { vehicleId: vehicleId, onSuccess: handleBookingCreated, onCancel: handleCancel }) }));
};
/**
 * 정비 예약 버튼 + 모달 컴포넌트
 */
export const BookingButton = ({ vehicleId, onBookingCreated, buttonText = '정비 예약', buttonType = 'primary', className, style }) => {
    const [visible, setVisible] = useState(false);
    const showModal = () => {
        setVisible(true);
    };
    const handleClose = () => {
        setVisible(false);
    };
    return (_jsxs(_Fragment, { children: [_jsx(Button, { type: buttonType, icon: _jsx(CalendarOutlined, {}), onClick: showModal, className: className, style: style, children: buttonText }), _jsx(BookingModal, { vehicleId: vehicleId, visible: visible, onClose: handleClose, onBookingCreated: onBookingCreated, buttonText: buttonText, buttonType: buttonType })] }));
};
export default BookingModal;
