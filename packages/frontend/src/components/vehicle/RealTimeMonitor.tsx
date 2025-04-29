import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Speed as SpeedIcon,
  BatteryFull as BatteryIcon,
  LocalGasStation as FuelIcon,
  Tire as TireIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { Vehicle } from '../../types/vehicle';

interface RealTimeMonitorProps {
  vehicle: Vehicle;
  onAlert?: (message: string) => void;
}

const RealTimeMonitor: React.FC<RealTimeMonitorProps> = ({ vehicle, onAlert }) => {
  const [realTimeData, setRealTimeData] = useState(vehicle.realTimeData);

  useEffect(() => {
    // 실시간 데이터 업데이트를 위한 WebSocket 연결
    const ws = new WebSocket(`ws://your-api-url/vehicles/${vehicle.id}/telemetry`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setRealTimeData(data);
      
      // 경고 상태 체크
      if (data.engineStatus === 'warning' || data.engineStatus === 'error') {
        onAlert?.(`차량 ${vehicle.licensePlate}에서 경고가 발생했습니다.`);
      }
    };

    return () => {
      ws.close();
    };
  }, [vehicle.id]);

  if (!realTimeData) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              실시간 모니터링
            </Typography>
          </Grid>

          {/* 속도 */}
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" alignItems="center">
              <SpeedIcon color="primary" />
              <Box ml={1}>
                <Typography variant="body2" color="textSecondary">
                  속도
                </Typography>
                <Typography variant="h6">
                  {vehicle.location?.speed || 0} km/h
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* 연료 */}
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" alignItems="center">
              <FuelIcon color="primary" />
              <Box ml={1} flexGrow={1}>
                <Typography variant="body2" color="textSecondary">
                  연료 소모량
                </Typography>
                <Typography variant="h6">
                  {realTimeData.fuelConsumption} L/100km
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* 배터리 */}
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" alignItems="center">
              <BatteryIcon color="primary" />
              <Box ml={1} flexGrow={1}>
                <Typography variant="body2" color="textSecondary">
                  배터리
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={realTimeData.batteryLevel}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption">
                  {realTimeData.batteryLevel}%
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* 타이어 */}
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" alignItems="center">
              <TireIcon color="primary" />
              <Box ml={1}>
                <Typography variant="body2" color="textSecondary">
                  타이어 압력
                </Typography>
                <Box display="flex" alignItems="center">
                  <Typography variant="h6">
                    {Math.min(
                      ...Object.values(realTimeData.tirePressure)
                    )} - {Math.max(...Object.values(realTimeData.tirePressure))} PSI
                  </Typography>
                  {Object.values(realTimeData.tirePressure).some(
                    (pressure) => pressure < 30 || pressure > 40
                  ) && (
                    <Tooltip title="타이어 압력 이상">
                      <IconButton size="small" color="warning">
                        <WarningIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* 엔진 상태 */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center">
              <Typography
                variant="body2"
                color={
                  realTimeData.engineStatus === 'normal'
                    ? 'success.main'
                    : realTimeData.engineStatus === 'warning'
                    ? 'warning.main'
                    : 'error.main'
                }
              >
                엔진 상태: {realTimeData.engineStatus}
              </Typography>
              {realTimeData.diagnosticCodes?.length > 0 && (
                <Tooltip title={realTimeData.diagnosticCodes.join(', ')}>
                  <IconButton size="small" color="error">
                    <WarningIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default RealTimeMonitor; 