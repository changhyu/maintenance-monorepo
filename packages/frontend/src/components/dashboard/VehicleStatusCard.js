import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardHeader, 
  CardContent,
  Grid,
  Box,
  Typography,
  CircularProgress,
  Button,
  Divider,
  IconButton
} from '@mui/material';
import {
  LocalGasStation as GasIcon,
  Speed as SpeedIcon,
  DirectionsCar as CarIcon,
  Timeline as TimelineIcon,
  BatteryChargingFull as BatteryIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';

// 원형 프로그레스 컴포넌트
const CircularProgressWithLabel = ({ value, label, description, icon, color = 'primary' }) => {
  return (
    <Box sx={{ textAlign: 'center', m: 1 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={value}
          size={90}
          thickness={4}
          color={color}
          sx={{
            circle: {
              strokeLinecap: 'round'
            }
          }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
      <Typography variant="h6" sx={{ mt: 1, fontWeight: 'medium' }}>
        {label}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {description}
      </Typography>
    </Box>
  );
};

// 차량 상태 카드
const VehicleStatusCard = ({ data = null }) => {
  const navigate = useNavigate();

  // 샘플 데이터 (실제로는 props로 전달받거나 API에서 가져와야 함)
  const vehicleStatus = data || {
    vehicle: {
      id: 1,
      name: '현대 투싼',
      licensePlate: '12가 3456'
    },
    fuel: 68,
    tireHealth: 85,
    batteryHealth: 92,
    overallHealth: 88,
    oilLevel: 75
  };

  const getStatusColor = (value) => {
    if (value >= 75) return 'success';
    if (value >= 50) return 'warning';
    return 'error';
  };

  return (
    <Card>
      <CardHeader 
        title={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CarIcon sx={{ mr: 1 }} />
            <Typography variant="h6">
              차량 상태 대시보드 - {vehicleStatus.vehicle.name} ({vehicleStatus.vehicle.licensePlate})
            </Typography>
          </Box>
        }
        action={
          <IconButton>
            <MoreVertIcon />
          </IconButton>
        }
      />
      <Divider />
      <CardContent>
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={6} sm={4} md={2.4}>
            <CircularProgressWithLabel
              value={vehicleStatus.fuel}
              label={`${vehicleStatus.fuel}%`}
              description="연료 상태"
              icon={<GasIcon color="primary" />}
              color="primary"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <CircularProgressWithLabel
              value={vehicleStatus.tireHealth}
              label={`${vehicleStatus.tireHealth}%`}
              description="타이어 상태"
              icon={<SpeedIcon />}
              color={getStatusColor(vehicleStatus.tireHealth)}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <CircularProgressWithLabel
              value={vehicleStatus.batteryHealth}
              label={`${vehicleStatus.batteryHealth}%`}
              description="배터리 상태"
              icon={<BatteryIcon />}
              color={getStatusColor(vehicleStatus.batteryHealth)}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <CircularProgressWithLabel
              value={vehicleStatus.overallHealth}
              label={`${vehicleStatus.overallHealth}%`}
              description="전체 상태"
              icon={<TimelineIcon />}
              color={getStatusColor(vehicleStatus.overallHealth)}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <CircularProgressWithLabel
              value={vehicleStatus.oilLevel}
              label={`${vehicleStatus.oilLevel}%`}
              description="오일 상태"
              icon={<GasIcon color="warning" />}
              color={getStatusColor(vehicleStatus.oilLevel)}
            />
          </Grid>
        </Grid>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => navigate(`/vehicles/${vehicleStatus.vehicle.id}`)}
            sx={{ mr: 2 }}
          >
            상세 정보
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => navigate(`/maintenance/new/${vehicleStatus.vehicle.id}`)}
          >
            정비 일정 잡기
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default VehicleStatusCard;