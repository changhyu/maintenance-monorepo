import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { MaintenanceStatus } from '../../types/maintenance';

interface MaintenanceStatusBadgeProps {
  status: MaintenanceStatus;
  size?: 'small' | 'medium';
  className?: string;
}

/**
 * 정비 상태를 시각적으로 보여주는 칩(Chip) 컴포넌트
 */
const MaintenanceStatusBadge: React.FC<MaintenanceStatusBadgeProps> = ({ 
  status, 
  size = 'medium',
  className 
}) => {
  // 상태별 색상 및 텍스트 매핑
  const statusConfig: Record<MaintenanceStatus, { color: ChipProps['color']; label: string }> = {
    'scheduled': { color: 'info', label: '예약됨' },
    'in-progress': { color: 'warning', label: '진행 중' },
    'completed': { color: 'success', label: '완료됨' },
    'delayed': { color: 'error', label: '지연됨' },
    'cancelled': { color: 'default', label: '취소됨' },
  };

  const { color, label } = statusConfig[status] || { color: 'default', label: '알 수 없음' };

  return (
    <Chip 
      label={label}
      color={color}
      size={size}
      className={className}
      variant="outlined"
    />
  );
};

export default MaintenanceStatusBadge;