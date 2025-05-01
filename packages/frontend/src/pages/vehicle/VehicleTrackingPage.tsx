import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import {
  Map as MapIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  AccessTime as TimeIcon,
  Route as RouteIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';

import VehicleTrackingMap from '../../components/vehicle/VehicleTrackingMap';
import axios from 'axios';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Vehicle } from '../../types/vehicle';

// 환경 변수 확인
const apiBaseUrl = process.env.REACT_APP_API_URL || '/api';
const isGoogleMapsApiKeySet = !!process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// 확장된 차량 타입 (API로부터 받는 데이터에 맞춤)
interface VehicleExtended extends Vehicle {
  make?: string;
  vin?: string;
}

// 타입 정의
interface TripReport {
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_distance: number;
  driving_time: number;
  average_speed: number;
  max_speed: number;
  stops: Array<{
    location: { lat: number; lng: number };
    address: string;
    timestamp: string;
  }>;
  route: Array<{ lat: number; lng: number }>;
}

// API 응답 인터페이스
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

// 페이지 컴포넌트
const VehicleTrackingPage: React.FC = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [vehicles, setVehicles] = useState<VehicleExtended[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicleId || '');
  const [startDate, setStartDate] = useState<string>(
    format(new Date(new Date().setHours(0, 0, 0, 0)), "yyyy-MM-dd'T'HH:mm")
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [tripReport, setTripReport] = useState<TripReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Google Maps API 키 확인
  useEffect(() => {
    if (!isGoogleMapsApiKeySet) {
      setError('Google Maps API 키가 설정되지 않았습니다. 지도 기능이 제한됩니다.');
    }
  }, []);
  
  // 차량 목록 불러오기
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get<ApiResponse<VehicleExtended[]>>(`${apiBaseUrl}/vehicles`);
        
        if (response.data.success && response.data.data) {
          const vehicles = response.data.data;
          setVehicles(vehicles);
          
          // URL에 차량 ID가 없을 경우 첫 번째 차량 선택
          if (!vehicleId && vehicles.length > 0) {
            setSelectedVehicleId(vehicles[0].id);
          }
        } else {
          setError(response.data.message || '차량 목록을 불러오는데 실패했습니다.');
        }
      } catch (error) {
        console.error('차량 목록 로딩 실패:', error);
        setError('차량 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVehicles();
  }, [vehicleId]);
  
  // 주행 보고서 불러오기
  const loadTripReport = async () => {
    if (!selectedVehicleId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get<ApiResponse<TripReport>>(
        `${apiBaseUrl}/vehicles/${selectedVehicleId}/location/report`, 
        {
          params: {
            start_date: new Date(startDate).toISOString(),
            end_date: new Date(endDate).toISOString(),
          },
        }
      );
      
      if (response.data.success && response.data.data) {
        setTripReport(response.data.data);
        setSelectedTab(1);  // 보고서 탭으로 전환
      } else {
        setError(response.data.message || '주행 보고서를 불러오는데 실패했습니다.');
      }
    } catch (error: any) {
      console.error('주행 보고서 로딩 실패:', error);
      setError(error.response?.data?.detail || '주행 보고서를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 탭 변경 핸들러
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };
  
  // 차량 선택 핸들러 - MUI v5 타입으로 수정
  const handleVehicleChange = (event: SelectChangeEvent) => {
    const newVehicleId = event.target.value;
    setSelectedVehicleId(newVehicleId);
    
    // URL 업데이트
    if (newVehicleId) {
      navigate(`/vehicles/tracking/${newVehicleId}`);
    } else {
      navigate('/vehicles/tracking');
    }
  };
  
  // 날짜 입력 유효성 검증
  const validateDates = (): boolean => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      setError('종료 날짜는 시작 날짜보다 이후여야 합니다.');
      return false;
    }
    
    // 최대 30일로 제한
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays > 30) {
      setError('조회 기간은 최대 30일로 제한됩니다.');
      return false;
    }
    
    setError(null);
    return true;
  };
  
  // 조회 버튼 클릭 핸들러
  const handleSearchClick = () => {
    if (validateDates()) {
      loadTripReport();
    }
  };
  
  // 선택된 차량 정보
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  
  return (
    <Container maxWidth="xl">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          차량 위치 추적
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {!isGoogleMapsApiKeySet && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Google Maps API 키가 설정되지 않았습니다. 지도 기능이 제한될 수 있습니다.
          </Alert>
        )}
        
        {/* 차량 선택 */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
              <FormControl fullWidth>
                <InputLabel id="vehicle-select-label">차량 선택</InputLabel>
                <Select
                  labelId="vehicle-select-label"
                  value={selectedVehicleId}
                  label="차량 선택"
                  onChange={handleVehicleChange}
                >
                  {vehicles.map((vehicle) => (
                    <MenuItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.make} {vehicle.model} ({vehicle.licensePlate})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
              {selectedVehicle && (
                <Box>
                  <Typography variant="subtitle1">
                    <strong>{selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})</strong>
                  </Typography>
                  <Typography variant="body2">
                    차량 번호: {selectedVehicle.licensePlate} | VIN: {selectedVehicle.vin}
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>
        
        {/* 탭 */}
        <Paper sx={{ mb: 2 }}>
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab icon={<MapIcon />} label="실시간 위치" />
            <Tab icon={<TimelineIcon />} label="주행 이력" />
          </Tabs>
        </Paper>
        
        {/* 탭 컨텐츠 */}
        {selectedTab === 0 && (
          <Paper sx={{ p: 0, overflow: 'hidden', height: '70vh' }}>
            {selectedVehicleId ? (
              <VehicleTrackingMap
                height="70vh"
                centerMode="follow"
                showHistory={true}
                showAllVehicles={false}
                vehicleId={selectedVehicleId}
              />
            ) : (
              <Box p={4} textAlign="center">
                <Typography variant="h6" color="textSecondary">
                  추적할 차량을 선택해주세요.
                </Typography>
              </Box>
            )}
          </Paper>
        )}
        
        {selectedTab === 1 && (
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={3}>
              {/* 기간 선택 */}
              <Grid component="div" sx={{ gridColumn: 'span 12' }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      주행 이력 조회
                    </Typography>
                    
                    <Grid container spacing={2} alignItems="center">
                      <Grid component="div" sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                        <TextField
                          label="시작 날짜"
                          type="datetime-local"
                          fullWidth
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      
                      <Grid component="div" sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                        <TextField
                          label="종료 날짜"
                          type="datetime-local"
                          fullWidth
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      
                      <Grid component="div" sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleSearchClick}
                          disabled={!selectedVehicleId || isLoading}
                          fullWidth
                        >
                          {isLoading ? '로딩 중...' : '조회하기'}
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* 결과 보고서 */}
              {tripReport && (
                <>
                  {/* 요약 정보 */}
                  <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          주행 요약
                        </Typography>
                        
                        <List>
                          <ListItem component="li">
                            <ListItemIcon>
                              <RouteIcon />
                            </ListItemIcon>
                            <ListItemText
                              primary="총 주행 거리"
                              secondary={`${tripReport.total_distance.toFixed(1)} km`}
                            />
                          </ListItem>
                          
                          <ListItem component="li">
                            <ListItemIcon>
                              <TimeIcon />
                            </ListItemIcon>
                            <ListItemText
                              primary="운전 시간"
                              secondary={`${tripReport.driving_time.toFixed(1)} 분`}
                            />
                          </ListItem>
                          
                          <ListItem component="li">
                            <ListItemIcon>
                              <SpeedIcon />
                            </ListItemIcon>
                            <ListItemText
                              primary="평균 속도"
                              secondary={`${tripReport.average_speed.toFixed(1)} km/h`}
                            />
                          </ListItem>
                          
                          <ListItem component="li">
                            <ListItemIcon>
                              <SpeedIcon color="error" />
                            </ListItemIcon>
                            <ListItemText
                              primary="최고 속도"
                              secondary={`${tripReport.max_speed.toFixed(1)} km/h`}
                            />
                          </ListItem>
                          
                          <ListItem component="li">
                            <ListItemIcon>
                              <LocationIcon />
                            </ListItemIcon>
                            <ListItemText
                              primary="정지 횟수"
                              secondary={`${tripReport.stops.length} 회`}
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  {/* 정지 위치 목록 */}
                  <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                    <Card sx={{ maxHeight: 400, overflow: 'auto' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          정지 위치
                        </Typography>
                        
                        {tripReport.stops.length > 0 ? (
                          <List>
                            {tripReport.stops.map((stop, index) => (
                              <React.Fragment key={index}>
                                {index > 0 && <Divider />}
                                <ListItem component="li">
                                  <ListItemText
                                    primary={stop.address}
                                    secondary={format(
                                      new Date(stop.timestamp),
                                      'PPP p',
                                      { locale: ko }
                                    )}
                                  />
                                </ListItem>
                              </React.Fragment>
                            ))}
                          </List>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            정지 위치 데이터가 없습니다.
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  {/* 경로 지도 */}
                  <Grid component="div" sx={{ gridColumn: 'span 12' }}>
                    <Card sx={{ overflow: 'hidden' }}>
                      <CardContent sx={{ p: 0, height: '400px' }}>
                        <VehicleTrackingMap
                          height="400px"
                          centerMode="auto"
                          showHistory={false}
                          showAllVehicles={false}
                          vehicleId={selectedVehicleId}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}
              
              {!tripReport && selectedTab === 1 && (
                <Grid component="div" sx={{ gridColumn: 'span 12' }}>
                  <Box textAlign="center" p={4}>
                    <Typography variant="body1" color="textSecondary">
                      날짜를 선택하고 '조회하기' 버튼을 클릭하여 주행 이력을 확인하세요.
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default VehicleTrackingPage;