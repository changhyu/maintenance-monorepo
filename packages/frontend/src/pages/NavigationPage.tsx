import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, IconButton, Fab, Drawer, List, ListItem, ListItemIcon, ListItemText, Switch } from '@mui/material';
import {
  MyLocation as MyLocationIcon,
  Directions as DirectionsIcon,
  Videocam as VideocamIcon,
  Warning as WarningIcon,
  Construction as ConstructionIcon,
  School as SchoolIcon,
  Menu as MenuIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import Map from '../components/Map';
import CCTVViewer from '../components/CCTVViewer';
import { 
  Coordinates, 
  Route, 
  getRoute,
  getCurrentLocation
} from '../services/navigationService';
import { 
  CCTVData, 
  TrafficIncident,
  RoadHazard,
  ProtectedArea,
  ConstructionInfo,
  getTrafficIncidents,
  getRoadHazards,
  getProtectedAreas,
  getConstructionInfo
} from '../services/uticService';

/**
 * 내비게이션 페이지 컴포넌트
 * 
 * UTIC API를 활용한 내비게이션 메인 페이지
 */
const NavigationPage: React.FC = () => {
  // 기본 상태 관리
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  
  // CCTV 관련 상태
  const [showCCTV, setShowCCTV] = useState<boolean>(false);
  const [selectedCCTV, setSelectedCCTV] = useState<CCTVData | null>(null);
  
  // 알림 관련 상태
  const [alerts, setAlerts] = useState<{
    type: string;
    coordinates: Coordinates;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }[]>([]);
  
  // 알림 필터 상태
  const [showIncidents, setShowIncidents] = useState<boolean>(true);
  const [showHazards, setShowHazards] = useState<boolean>(true);
  const [showConstructions, setShowConstructions] = useState<boolean>(true);
  const [showProtectedAreas, setShowProtectedAreas] = useState<boolean>(true);
  
  // 현재 위치 가져오기
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const location = await getCurrentLocation();
        setCurrentLocation(location);
      } catch (error) {
        console.error('Error getting current location:', error);
        // 서울 좌표를 기본값으로 설정
        setCurrentLocation({ latitude: 37.5665, longitude: 126.9780 });
      }
    };
    
    fetchLocation();
    
    // 위치 주기적 업데이트 (10초마다)
    const intervalId = setInterval(fetchLocation, 10000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // 경로 계산
  useEffect(() => {
    if (currentLocation && destination) {
      const calculateRoute = async () => {
        try {
          const calculatedRoute = await getRoute(currentLocation, destination);
          setRoute(calculatedRoute);
        } catch (error) {
          console.error('Error calculating route:', error);
        }
      };
      
      calculateRoute();
    }
  }, [currentLocation, destination]);
  
  // 알림 데이터 가져오기
  useEffect(() => {
    const fetchAlertData = async () => {
      if (!currentLocation) return;
      
      try {
        // 돌발정보 가져오기
        const incidents = showIncidents ? await getTrafficIncidents() : [];
        
        // 도로위험상황예보 가져오기
        const hazards = showHazards ? await getRoadHazards() : [];
        
        // 공사정보 가져오기
        const constructions = showConstructions ? await getConstructionInfo() : [];
        
        // 보호구역 정보 가져오기 (서울 기준)
        const protectedAreas = showProtectedAreas ? await getProtectedAreas('11') : [];
        
        // 알림 목록 생성
        const alertsList = [
          // 돌발 정보를 알림으로 변환
          ...incidents.map((incident: TrafficIncident) => ({
            type: 'INCIDENT',
            coordinates: {
              latitude: incident.latitude,
              longitude: incident.longitude
            },
            severity: incident.severityLevel === 'A0403' ? 'HIGH' : 
                     incident.severityLevel === 'A0402' ? 'MEDIUM' : 'LOW',
            description: incident.description
          })),
          
          // 도로위험상황예보를 알림으로 변환
          ...hazards.map((hazard: RoadHazard) => ({
            type: 'HAZARD',
            coordinates: {
              latitude: hazard.latitude,
              longitude: hazard.longitude
            },
            severity: 'HIGH',
            description: hazard.description
          })),
          
          // 공사정보를 알림으로 변환
          ...constructions.map((construction: ConstructionInfo) => ({
            type: 'CONSTRUCTION',
            coordinates: {
              latitude: construction.latitude,
              longitude: construction.longitude
            },
            severity: 'MEDIUM',
            description: `${construction.roadName} ${construction.description}`
          })),
          
          // 보호구역 정보를 알림으로 변환
          ...protectedAreas.map((area: ProtectedArea) => ({
            type: 'PROTECTED_AREA',
            coordinates: {
              latitude: area.latitude,
              longitude: area.longitude
            },
            severity: 'LOW',
            description: `${area.type} - ${area.name}`
          }))
        ];
        
        setAlerts(alertsList);
      } catch (error) {
        console.error('Error fetching alert data:', error);
      }
    };
    
    fetchAlertData();
    
    // 알림 데이터 주기적 업데이트 (30초마다)
    const intervalId = setInterval(fetchAlertData, 30000);
    
    return () => clearInterval(intervalId);
  }, [currentLocation, showIncidents, showHazards, showConstructions, showProtectedAreas]);
  
  // 지도 클릭 핸들러
  const handleMapClick = (location: Coordinates) => {
    setDestination(location);
  };
  
  // CCTV 클릭 핸들러
  const handleCCTVClick = (cctv: CCTVData) => {
    setSelectedCCTV(cctv);
  };
  
  // 현재 위치로 이동
  const goToCurrentLocation = () => {
    if (currentLocation) {
      // 지도 중앙을 현재 위치로 설정
      // 실제로는 Map 컴포넌트에서 이미 처리됨
    }
  };
  
  return (
    <Box sx={{ height: '100vh', width: '100vw', position: 'relative' }}>
      {/* 지도 컴포넌트 */}
      <Map
        currentLocation={currentLocation}
        destination={destination}
        route={route}
        alerts={alerts}
        showCCTV={showCCTV}
        onClick={handleMapClick}
        onCCTVClick={handleCCTVClick}
      />
      
      {/* CCTV 뷰어 */}
      <CCTVViewer
        cctv={selectedCCTV}
        onClose={() => setSelectedCCTV(null)}
      />
      
      {/* 메뉴 버튼 */}
      <Fab
        color="primary"
        aria-label="menu"
        onClick={() => setDrawerOpen(true)}
        sx={{ position: 'absolute', top: 16, left: 16, zIndex: 900 }}
      >
        <MenuIcon />
      </Fab>
      
      {/* 현재 위치 버튼 */}
      <Fab
        color="primary"
        aria-label="my location"
        onClick={goToCurrentLocation}
        sx={{ position: 'absolute', bottom: 16, right: 16, zIndex: 900 }}
      >
        <MyLocationIcon />
      </Fab>
      
      {/* 사이드 메뉴 */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box
          sx={{ width: 250 }}
          role="presentation"
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #eee' }}>
            <Typography variant="h6">내비게이션 설정</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          {/* 메뉴 항목 */}
          <List>
            {/* CCTV 표시 설정 */}
            <ListItem>
              <ListItemIcon>
                <VideocamIcon />
              </ListItemIcon>
              <ListItemText primary="CCTV 표시" />
              <Switch
                edge="end"
                checked={showCCTV}
                onChange={(e) => setShowCCTV(e.target.checked)}
              />
            </ListItem>
            
            {/* 돌발정보 표시 설정 */}
            <ListItem>
              <ListItemIcon>
                <WarningIcon />
              </ListItemIcon>
              <ListItemText primary="돌발정보 표시" />
              <Switch
                edge="end"
                checked={showIncidents}
                onChange={(e) => setShowIncidents(e.target.checked)}
              />
            </ListItem>
            
            {/* 위험상황 표시 설정 */}
            <ListItem>
              <ListItemIcon>
                <WarningIcon color="error" />
              </ListItemIcon>
              <ListItemText primary="위험상황 표시" />
              <Switch
                edge="end"
                checked={showHazards}
                onChange={(e) => setShowHazards(e.target.checked)}
              />
            </ListItem>
            
            {/* 공사정보 표시 설정 */}
            <ListItem>
              <ListItemIcon>
                <ConstructionIcon />
              </ListItemIcon>
              <ListItemText primary="공사정보 표시" />
              <Switch
                edge="end"
                checked={showConstructions}
                onChange={(e) => setShowConstructions(e.target.checked)}
              />
            </ListItem>
            
            {/* 보호구역 표시 설정 */}
            <ListItem>
              <ListItemIcon>
                <SchoolIcon />
              </ListItemIcon>
              <ListItemText primary="보호구역 표시" />
              <Switch
                edge="end"
                checked={showProtectedAreas}
                onChange={(e) => setShowProtectedAreas(e.target.checked)}
              />
            </ListItem>
          </List>
        </Box>
      </Drawer>
      
      {/* 목적지 정보 패널 */}
      {destination && (
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            p: 2,
            maxWidth: '80%',
            borderRadius: 2,
            zIndex: 900
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <DirectionsIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="subtitle1">
              목적지: {destination.latitude.toFixed(6)}, {destination.longitude.toFixed(6)}
            </Typography>
          </Box>
          
          {route && (
            <Typography variant="body2" color="text.secondary">
              예상 소요시간: {Math.floor(route.duration / 60)}분 {route.duration % 60}초 ({(route.distance / 1000).toFixed(1)} km)
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default NavigationPage;