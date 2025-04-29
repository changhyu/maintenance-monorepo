import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { MaintenancePriority } from '../../types/maintenance';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FlagIcon from '@mui/icons-material/Flag';
import RemoveIcon from '@mui/icons-material/Remove';

interface MaintenancePriorityBadgeProps {
  priority: MaintenancePriority;
  size?: 'small' | 'medium';
  className?: string;
}

/**
 * 정비 우선순위를 시각적으로 보여주는 칩(Chip) 컴포넌트
 */
const MaintenancePriorityBadge: React.FC<MaintenancePriorityBadgeProps> = ({ 
  priority, 
  size = 'medium',
  className 
}) => {
  // 우선순위별 색상, 아이콘 및 텍스트 매핑
  const priorityConfig: Record<MaintenancePriority, { 
    color: ChipProps['color']; 
    icon: React.ReactNode; 
    label: string 
  }> = {
    'critical': { 
      color: 'error', 
      icon: <PriorityHighIcon />, 
      label: '긴급' 
    },
    'high': { 
      color: 'warning', 
      icon: <WarningAmberIcon />, 
      label: '높음' 
    },
    'medium': { 
      color: 'info', 
      icon: <FlagIcon />, 
      label: '중간' 
    },
    'low': { 
      color: 'default', 
      icon: <RemoveIcon />, 
      label: '낮음' 
    },
  };

  const { color, icon, label } = priorityConfig[priority] || { 
    color: 'default', 
    icon: <RemoveIcon />, 
    label: '알 수 없음' 
  };

  return (
    <Chip 
      label={label}
      color={color}
      size={size}
      icon={icon}
      className={className}
    />
  );
};

export default MaintenancePriorityBadge;