import React from 'react';

// 예약 상태 정의
export enum BookingStatus {
  PENDING = '대기 중',
  CONFIRMED = '확정',
  COMPLETED = '완료',
  CANCELLED = '취소'
}

// 긴급도 타입 정의
export type UrgencyLevel = 'low' | 'medium' | 'high';

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
  urgencyLevel: UrgencyLevel;
  requiresPickup: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cost?: number;
}

interface BookingHistoryPageProps {
  booking?: Booking;
}

const BookingHistoryPage: React.FC<BookingHistoryPageProps> = ({ booking }) => {
  // 옵셔널 체이닝 사용
  const status = booking?.status;
  const vehicleInfo = booking?.vehicleName;

  return (
    <div>
      {/* 컴포넌트 내용 */}
    </div>
  );
};

export default BookingHistoryPage; 