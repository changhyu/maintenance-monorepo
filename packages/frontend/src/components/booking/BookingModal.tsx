import React, { useState } from 'react';
import { Modal, Button, message } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import MaintenanceBookingForm from './MaintenanceBookingForm';

export interface BookingModalProps {
  vehicleId?: string;
  visible: boolean;
  onClose: () => void;
  onBookingCreated?: (bookingId: string) => void;
  buttonText?: string;
  buttonType?: 'text' | 'link' | 'default' | 'primary' | 'ghost' | 'dashed' | undefined;
}

/**
 * 정비 예약 모달 컴포넌트
 */
const BookingModal: React.FC<BookingModalProps> = ({
  vehicleId,
  visible,
  onClose,
  onBookingCreated,
  buttonText = '정비 예약',
  buttonType = 'primary'
}) => {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(visible);

  // 가시성 변경 시 내부 상태 업데이트
  React.useEffect(() => {
    setModalVisible(visible);
  }, [visible]);

  // 예약 생성 완료 처리
  const handleBookingCreated = (bookingId: string) => {
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

  return (
    <Modal
      title="정비 예약 신청"
      open={modalVisible}
      onCancel={handleCancel}
      footer={null}
      width={800}
      destroyOnClose
    >
      <MaintenanceBookingForm
        vehicleId={vehicleId}
        onSuccess={handleBookingCreated}
        onCancel={handleCancel}
      />
    </Modal>
  );
};

/**
 * 정비 예약 버튼 + 모달 컴포넌트
 */
export const BookingButton: React.FC<Omit<BookingModalProps, 'visible' | 'onClose'> & { className?: string; style?: React.CSSProperties }> = ({
  vehicleId,
  onBookingCreated,
  buttonText = '정비 예약',
  buttonType = 'primary',
  className,
  style
}) => {
  const [visible, setVisible] = useState(false);

  const showModal = () => {
    setVisible(true);
  };

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <>
      <Button
        type={buttonType as "text" | "link" | "default" | "primary" | "dashed" | undefined}
        icon={<CalendarOutlined />}
        onClick={showModal}
        className={className}
        style={style}
      >
        {buttonText}
      </Button>
      
      <BookingModal
        vehicleId={vehicleId}
        visible={visible}
        onClose={handleClose}
        onBookingCreated={onBookingCreated}
        buttonText={buttonText}
        buttonType={buttonType}
      />
    </>
  );
};

export default BookingModal; 