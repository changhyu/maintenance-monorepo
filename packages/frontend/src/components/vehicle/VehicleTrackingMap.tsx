import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from '@react-google-maps/api';
import axios from 'axios';
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Paper,
  Alert,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { LocationPoint } from '../../types/location';
import { Vehicle } from '../../types/vehicle';

// date-fns 모듈이 설치되어 있지 않으면 임시 포맷 함수 정의
const formatDate = (date: Date): string => {
  try {
    // date-fns가 설치되어 있으면 format 함수 사용
    const { format } = require('date-fns');
    const { ko } = require('date-fns/locale');
    return format(date, "yyyy-MM-dd'T'HH:mm", { locale: ko });
  } catch (e) {
    // date-fns가 없으면 기본 Date 메서드 사용
    return date.toISOString().substring(0, 16);
  }
};

// 환경 변수에서 Google Maps API 키 가져오기
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
const apiBaseUrl = process.env.REACT_APP_API_URL || '/api';

// 지도 스타일
const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// 기본 중심 좌표 (서울)
const defaultCenter = {
  lat: 37.5665,
  lng: 126.9780,
};

// 차량 상태별 색상
const statusColors = {
  DRIVING: '#4CAF50',  // 녹색
  STOPPED: '#FFC107',  // 노랑
  IDLE: '#2196F3',     // 파랑
  PARKED: '#9E9E9E',   // 회색
  OFFLINE: '#F44336',  // 빨강
};

// 차량 상태 한글 표시
const statusLabels = {
  DRIVING: '주행 중',
  STOPPED: '정지',
  IDLE: '공회전',
  PARKED: '주차',
  OFFLINE: '오프라인',
};

// API 응답 타입 정의
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// API 응답 타입
interface VehicleLocation {
  id: string;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  status: 'DRIVING' | 'STOPPED' | 'IDLE' | 'PARKED' | 'OFFLINE';
  address: string;
  timestamp: string;
  location: { lat: number; lng: number };
}

// GoogleMaps에서 사용하는 타입
interface GoogleLatLng {
  lat: number;
  lng: number;
}

// LocationPoint를 GoogleLatLng로 변환하는 함수
const locationPointToGoogleLatLng = (location: LocationPoint | null): GoogleLatLng | undefined => {
  if (!location) return undefined;
  return {
    lat: location.latitude,
    lng: location.longitude
  };
};

// Vehicle 타입을 확장하여 추가 속성 정의
interface VehicleInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  vin?: string;
  lastUpdated?: string;
  locations?: VehicleLocation[];
  location?: {
    latitude: number;
    longitude: number;
    status: 'DRIVING' | 'STOPPED' | 'IDLE' | 'PARKED' | 'OFFLINE';
    speed: number;
    address: string;
    timestamp: string;
  };
}

interface HistoryQuery {
  startDate: Date;
  endDate: Date;
  vehicleId: string;
}

interface VehicleTrackingMapProps {
  height?: string;
  centerMode?: 'vehicle' | 'current' | 'custom' | 'follow' | 'auto';
  showHistory?: boolean;
  showAllVehicles?: boolean;
  vehicleId?: string;
  customCenter?: LocationPoint;
  onVehicleSelect?: (vehicle: Vehicle) => void;
  onLocationSelect?: (location: LocationPoint) => void;
}

// 기본 맵 옵션
const defaultMapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
};

// 현재 시간으로부터 N시간 이전
const getTimeNHoursAgo = (hours: number): string => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
};

// 마커 아이콘 (google.maps.Point는 Maps API 로드 후 사용하므로 함수로 래핑)
const getMarkerIcon = (heading: number): google.maps.Symbol | undefined => {
  if (typeof google !== 'undefined' && google.maps) {
    return {
      path: "M29.395,0H17.636c-3.117,0-5.643,3.467-5.643,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759   c3.116,0,5.644-2.527,5.644-5.644V6.584C35.037,3.467,32.511,0,29.395,0z M34.05,14.188v11.665l-2.729,0.351v-4.806L34.05,14.188z    M32.618,10.773c-1.016,3.9-2.219,8.51-2.219,8.51H16.631l-2.222-8.51C14.41,10.773,23.293,7.755,32.618,10.773z M15.741,21.713   v4.492l-2.73-0.349V14.502L15.741,21.713z M13.011,37.938V27.579l2.73,0.343v8.196L13.011,37.938z M14.568,40.882l2.218-3.336   h13.771l2.219,3.336H14.568z M31.321,35.805v-7.872l2.729-0.355v10.048L31.321,35.805z",
      fillColor: '#2196F3',
      fillOpacity: 1,
      strokeColor: '#1565C0',
      strokeWeight: 1,
      scale: 0.4,
      anchor: new google.maps.Point(23, 23),
      rotation: heading,
    };
  }
  return undefined;
};

// Define a simple interface for our Polyline component
interface PolylineProps {
  path: google.maps.LatLngLiteral[];
  options?: google.maps.PolylineOptions;
  map: google.maps.Map | null;
}

// Create a custom Polyline component for use in our map
const CustomPolyline: React.FC<PolylineProps> = ({ path, options, map }) => {
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (window.google && map && path.length > 0) {
      // Create a new polyline directly with the Google Maps API
      const newPolyline = new google.maps.Polyline({
        path: path,
        ...options,
        map: map,
      });
      
      setPolyline(newPolyline);
      
      return () => {
        newPolyline.setMap(null);
      };
    }
  }, [path, options, map]);

  return null; // This component doesn't render anything visible
};

const VehicleTrackingMap: React.FC<VehicleTrackingMapProps> = ({
  height = '400px',
  centerMode = 'vehicle',
  showHistory = false,
  showAllVehicles = false,
  vehicleId,
  customCenter,
  onVehicleSelect,
  onLocationSelect
}) => {
  // Google Maps API 로드
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  // 상태 관리
  const [vehicles, setVehicles] = useState<Record<string, VehicleInfo>>({});
  const [locationData, setLocationData] = useState<VehicleLocation[]>([]);
  const [historyData, setHistoryData] = useState<VehicleLocation[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [center, setCenter] = useState<LocationPoint | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyQuery, setHistoryQuery] = useState<HistoryQuery>({
    startDate: new Date(new Date().setHours(0, 0, 0, 0)),
    endDate: new Date(),
    vehicleId: '',
  });
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 지도 로드 콜백
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // 지도 이동 함수
  const panTo = useCallback(({ lat, lng }: { lat: number; lng: number }) => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(15);
    }
  }, []);

  // 차량 정보 로드
  const loadVehiclesInfo = useCallback(async () => {
    if (showAllVehicles || vehicleId) {
      try {
        const response = await axios.get<ApiResponse<VehicleInfo[]>>(`${apiBaseUrl}/vehicles`);
        
        if (response.data.success && response.data.data) {
          const vehicleMap: Record<string, VehicleInfo> = {};
          response.data.data.forEach(vehicle => {
            vehicleMap[vehicle.id] = vehicle;
          });
          setVehicles(vehicleMap);
        }
      } catch (error) {
        console.error('차량 정보 로드 실패:', error);
      }
    }
  }, [showAllVehicles, vehicleId]);

  // 최신 위치 데이터 로드
  const loadLatestLocationData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (showAllVehicles) {
        response = await axios.get<ApiResponse<VehicleLocation[]>>(`${apiBaseUrl}/vehicles/location/active`);
      } else if (vehicleId) {
        response = await axios.get<ApiResponse<VehicleLocation>>(`${apiBaseUrl}/vehicles/${vehicleId}/location`);
      } else {
        setLocationData([]);
        setLoading(false);
        return;
      }
      
      if (response.data.success && response.data.data) {
        const locations = Array.isArray(response.data.data) 
          ? response.data.data 
          : [response.data.data];
          
        // 위치 정보 업데이트
        setLocationData(locations);
        
        // 맵 중심 설정
        if (locations.length > 0 && (centerMode === 'follow' || (centerMode === 'auto' && !historyData.length))) {
          const targetVehicle = vehicleId ? locations.find(loc => loc.vehicle_id === vehicleId) : locations[0];
          
          if (targetVehicle && mapRef.current) {
            // LocationPoint 형식으로 변환하여 저장
            setCenter({
              latitude: targetVehicle.latitude,
              longitude: targetVehicle.longitude,
              name: `Vehicle ${targetVehicle.vehicle_id}`
            });
            mapRef.current.panTo(targetVehicle.location);
          }
        }
      } else if (!showAllVehicles) {
        // 단일 차량 조회 실패 시 에러 표시
        setError(response.data.message || '차량 위치 데이터를 불러오지 못했습니다.');
      }
    } catch (error) {
      console.error('위치 데이터 로드 실패:', error);
      setError('위치 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [vehicleId, showAllVehicles, centerMode, historyData.length]);

  // 역사 데이터 로드
  const loadHistoryData = useCallback(async () => {
    if (!vehicleId || !showHistory) return;
    
    try {
      const response = await axios.get<ApiResponse<VehicleLocation[]>>(
        `${apiBaseUrl}/vehicles/${vehicleId}/location/history`,
        {
          params: {
            start_date: getTimeNHoursAgo(24),
            end_date: new Date().toISOString(),
          }
        }
      );
      
      if (response.data.success && response.data.data) {
        const historyPoints = response.data.data;
        setHistoryData(historyPoints);
        
        // 기록이 있으면 맵 범위 조정
        if (historyPoints.length > 0 && centerMode === 'auto' && mapRef.current) {
          const bounds = new google.maps.LatLngBounds();
          
          historyPoints.forEach(point => {
            bounds.extend(point.location);
          });
          
          mapRef.current.fitBounds(bounds);
        }
      }
    } catch (error) {
      console.error('이력 데이터 로드 실패:', error);
    }
  }, [vehicleId, showHistory, centerMode]);

  // 초기 데이터 로드
  useEffect(() => {
    if (!isLoaded) return;
    
    loadVehiclesInfo();
    loadLatestLocationData();
    loadHistoryData();
    
    // 실시간 업데이트 설정
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
    }
    
    trackingIntervalRef.current = setInterval(() => {
      loadLatestLocationData();
    }, 10000); // 10초 간격으로 업데이트
    
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, [isLoaded, vehicleId, showAllVehicles, loadVehiclesInfo, loadLatestLocationData, loadHistoryData]);

  // 차량 ID 변경 시 해당 차량으로 포커스
  useEffect(() => {
    if (vehicleId) {
      const vehicle = vehicles[vehicleId];
      if (vehicle) {
        setSelectedVehicle(vehicle.id);
        if (vehicle.location && centerMode === 'follow') {
          panTo({
            lat: vehicle.location.latitude,
            lng: vehicle.location.longitude,
          });
        }
      }
    }
  }, [vehicleId, vehicles, centerMode, panTo]);

  // 마커 클릭 핸들러
  const handleMarkerClick = (vehicle: VehicleLocation) => {
    setSelectedVehicle(vehicle.vehicle_id);
    if (vehicle.location) {
      panTo({
        lat: vehicle.location.lat || vehicle.latitude,
        lng: vehicle.location.lng || vehicle.longitude,
      });
    }
  };

  // 이력 조회 버튼 클릭 핸들러
  const handleHistoryButtonClick = () => {
    setHistoryQuery(prev => ({
      ...prev,
      vehicleId: selectedVehicle || '',
    }));
    setShowHistoryDialog(true);
  };

  // 로딩 중 또는 에러 처리
  if (loadError) {
    return (
      <Paper elevation={3} sx={{ p: 3, textAlign: 'center', height }}>
        <Alert severity="error">
          Google Maps API를 로드하지 못했습니다. API 키를 확인해주세요.
        </Alert>
      </Paper>
    );
  }

  if (!isLoaded) {
    return (
      <Paper elevation={3} sx={{ p: 3, textAlign: 'center', height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>지도 로딩 중...</Typography>
      </Paper>
    );
  }

  // 차량 필터링 (단일 차량만 표시 옵션)
  const filteredVehicles = showAllVehicles
    ? vehicles
    : vehicles[vehicleId || ''];

  return (
    <Box sx={{ position: 'relative', width: '100%', height }}>
      {/* 로딩 표시 */}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '4px',
            padding: '5px 15px',
          }}
        >
          <CircularProgress size={20} sx={{ marginRight: 1 }} />
          <Typography variant="body2" component="span">
            데이터 로딩 중...
          </Typography>
        </Box>
      )}
      
      {/* 컨트롤 패널 */}
      <Box
        sx={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Paper sx={{ p: 1 }}>
          <IconButton onClick={loadLatestLocationData} title="새로고침">
            <RefreshIcon />
          </IconButton>
          
          {showHistory && (
            <IconButton
              onClick={handleHistoryButtonClick}
              disabled={!selectedVehicle}
              title="이동 경로 조회"
            >
              <HistoryIcon />
            </IconButton>
          )}
        </Paper>
      </Box>
      
      {/* 구글 지도 */}
      <GoogleMap
        mapContainerStyle={{ ...mapContainerStyle, height }}
        center={center ? { lat: center.latitude, lng: center.longitude } : defaultCenter}
        zoom={13}
        onLoad={onMapLoad}
        options={defaultMapOptions}
      >
        {/* 차량 마커 표시 */}
        {locationData.map((location) => {
          if (!location.location) return null;
          
          return (
            <Marker
              key={location.vehicle_id}
              position={{
                lat: location.latitude,
                lng: location.longitude
              }}
              title={vehicles[location.vehicle_id]?.licensePlate || location.vehicle_id}
              icon={getMarkerIcon(location.heading)}
              onClick={() => handleMarkerClick(location)}
            />
          );
        })}
        
        {/* 선택된 차량 정보 창 */}
        {selectedVehicle && vehicles[selectedVehicle] && vehicles[selectedVehicle].location && (
          <InfoWindow
            position={{
              lat: vehicles[selectedVehicle].location.latitude,
              lng: vehicles[selectedVehicle].location.longitude,
            }}
            onCloseClick={() => setSelectedVehicle(null)}
          >
            <Box sx={{ maxWidth: 250 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {vehicles[selectedVehicle].make} {vehicles[selectedVehicle].model} ({vehicles[selectedVehicle].year})
              </Typography>
              
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                차량 번호: {vehicles[selectedVehicle].licensePlate}
              </Typography>
              
              {vehicles[selectedVehicle].location && (
                <>
                  <Chip
                    size="small"
                    label={statusLabels[vehicles[selectedVehicle].location.status]}
                    sx={{
                      backgroundColor: statusColors[vehicles[selectedVehicle].location.status],
                      color: '#FFF',
                      mb: 1,
                    }}
                  />
                  
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    현재 속도: {vehicles[selectedVehicle].location.speed} km/h
                  </Typography>
                  
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    위치: {vehicles[selectedVehicle].location.address || '알 수 없음'}
                  </Typography>
                  
                  <Typography variant="caption" color="textSecondary">
                    최종 업데이트: {formatDate(new Date(vehicles[selectedVehicle].location.timestamp))}
                  </Typography>
                </>
              )}
              
              {showHistory && (
                <Box mt={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<HistoryIcon />}
                    onClick={handleHistoryButtonClick}
                    fullWidth
                  >
                    이동 경로 조회
                  </Button>
                </Box>
              )}
            </Box>
          </InfoWindow>
        )}
        
        {/* 이동 경로 표시 */}
        {historyData.length > 0 && (
          <CustomPolyline
            path={historyData.map((point) => ({
              lat: point.latitude,
              lng: point.longitude,
            }))}
            options={{
              strokeColor: '#2196F3',
              strokeOpacity: 1,
              strokeWeight: 3,
            }}
            map={mapRef.current}
          />
        )}
      </GoogleMap>
      
      {/* 이력 조회 다이얼로그 */}
      <Dialog
        open={showHistoryDialog}
        onClose={() => setShowHistoryDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>차량 이동 경로 조회</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 240px' }}>
                <TextField
                  label="시작 날짜"
                  type="datetime-local"
                  fullWidth
                  value={formatDate(historyQuery.startDate)}
                  onChange={(e) => {
                    setHistoryQuery(prev => ({
                      ...prev,
                      startDate: new Date(e.target.value),
                    }));
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              
              <Box sx={{ flex: '1 1 240px' }}>
                <TextField
                  label="종료 날짜"
                  type="datetime-local"
                  fullWidth
                  value={formatDate(historyQuery.endDate)}
                  onChange={(e) => {
                    setHistoryQuery(prev => ({
                      ...prev,
                      endDate: new Date(e.target.value),
                    }));
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Box>
            
            {showAllVehicles && (
              <Box sx={{ width: '100%' }}>
                <FormControl fullWidth>
                  <InputLabel id="vehicle-select-label">차량 선택</InputLabel>
                  <Select
                    labelId="vehicle-select-label"
                    value={historyQuery.vehicleId}
                    label="차량 선택"
                    onChange={(e) => {
                      setHistoryQuery(prev => ({
                        ...prev,
                        vehicleId: e.target.value as string,
                      }));
                    }}
                  >
                    {Object.values(vehicles).map((vehicle) => (
                      <MenuItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.make} {vehicle.model} ({vehicle.licensePlate})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHistoryDialog(false)}>취소</Button>
          <Button
            onClick={loadHistoryData}
            variant="contained"
            color="primary"
            disabled={!historyQuery.vehicleId}
          >
            경로 조회
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VehicleTrackingMap;