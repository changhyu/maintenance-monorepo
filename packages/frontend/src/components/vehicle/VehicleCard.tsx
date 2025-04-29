import React from 'react';
import { 
  Card, 
  CardContent, 
  CardMedia, 
  Typography, 
  Box, 
  IconButton,
  CardActionArea,
  CardActions,
  Tooltip
} from '@mui/material';
import { Vehicle } from '../../types/vehicle';
import VehicleStatusBadge from './VehicleStatusBadge';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import BuildIcon from '@mui/icons-material/Build';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FuelIcon from '@mui/icons-material/LocalGasStation';
import { useNavigate } from 'react-router-dom';

interface VehicleCardProps {
  vehicle: Vehicle;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
  onMaintenanceRequest?: (vehicle: Vehicle) => void;
}

/**
 * 차량 정보를 카드 형태로 표시하는 컴포넌트
 */
const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  onEdit,
  onDelete,
  onMaintenanceRequest
}) => {
  const navigate = useNavigate();

  // 차량 세부 정보 페이지로 이동
  const handleClick = () => {
    navigate(`/vehicles/${vehicle.id}`);
  };

  // 연료 유형에 따른 아이콘 색상 매핑
  const getFuelIconColor = (fuelType: string) => {
    switch (fuelType) {
      case 'gasoline':
        return '#FF9800'; // 주황색
      case 'diesel':
        return '#795548'; // 갈색
      case 'lpg':
        return '#2196F3'; // 파란색
      case 'hybrid':
        return '#4CAF50'; // 초록색
      case 'electric':
        return '#00BCD4'; // 청록색
      case 'hydrogen':
        return '#9C27B0'; // 보라색
      default:
        return '#757575'; // 회색
    }
  };

  // 차량 유형에 따른 텍스트 매핑
  const getVehicleTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      'sedan': '승용차',
      'suv': 'SUV',
      'van': '밴',
      'truck': '트럭',
      'bus': '버스',
      'special': '특수 차량'
    };
    return typeMap[type] || type;
  };

  return (
    <Card sx={{ maxWidth: 345, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={handleClick}>
        {vehicle.imageUrl ? (
          <CardMedia
            component="img"
            height="140"
            image={vehicle.imageUrl}
            alt={vehicle.name}
          />
        ) : (
          <Box 
            sx={{ 
              height: 140, 
              bgcolor: 'grey.200', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <DirectionsCarIcon sx={{ fontSize: 60, color: 'grey.400' }} />
          </Box>
        )}

        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography gutterBottom variant="h6" component="div" noWrap>
              {vehicle.name}
            </Typography>
            <VehicleStatusBadge status={vehicle.status} />
          </Box>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {vehicle.manufacturer} {vehicle.model} ({vehicle.year})
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <FuelIcon sx={{ mr: 1, color: getFuelIconColor(vehicle.fuelType) }} />
            <Typography variant="body2" color="text.secondary">
              {vehicle.fuelType.charAt(0).toUpperCase() + vehicle.fuelType.slice(1)}
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {getVehicleTypeText(vehicle.type)}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            번호판: {vehicle.licensePlate}
          </Typography>

          {vehicle.department && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              부서: {vehicle.department}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>

      <CardActions disableSpacing>
        {onMaintenanceRequest && (
          <Tooltip title="정비 요청">
            <IconButton 
              aria-label="maintenance request" 
              onClick={(e) => {
                e.stopPropagation();
                onMaintenanceRequest(vehicle);
              }}
            >
              <BuildIcon />
            </IconButton>
          </Tooltip>
        )}
        
        <Box sx={{ ml: 'auto' }}>
          {onEdit && (
            <Tooltip title="수정">
              <IconButton 
                aria-label="edit" 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(vehicle);
                }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
          )}
          
          {onDelete && (
            <Tooltip title="삭제">
              <IconButton 
                aria-label="delete" 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(vehicle);
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardActions>
    </Card>
  );
};

export default VehicleCard;