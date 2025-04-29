import React from 'react';
import { Badge, BadgeProps } from '@mui/material';
import { VehicleStatus } from '../../types/vehicle';

interface VehicleStatusBadgeProps {
  status: VehicleStatus;
  className?: string;
}

/**
 * 차량 상태를 시각적으로 보여주는 뱃지 컴포넌트
 */
const VehicleStatusBadge: React.FC<VehicleStatusBadgeProps> = ({ status, className }) => {
  // 상태별 색상 및 텍스트 매핑
  const statusConfig: Record<VehicleStatus, { color: BadgeProps['color']; label: string }> = {
    'active': { color: 'success', label: '운행 중' },
    'maintenance': { color: 'warning', label: '정비 중' },
    'retired': { color: 'error', label: '폐차/은퇴' },
    'rented': { color: 'info', label: '임대 중' },
    'unavailable': { color: 'default', label: '이용 불가' },
  };

  const { color, label } = statusConfig[status] || { color: 'default', label: '알 수 없음' };

  return (
    <Badge 
      color={color} 
      variant="dot" 
      className={className}
      sx={{ 
        '& .MuiBadge-badge': { 
          position: 'relative',
          transform: 'none',
          marginRight: '8px'
        }
      }}
    >
      {label}
    </Badge>
  );
};

export default VehicleStatusBadge;