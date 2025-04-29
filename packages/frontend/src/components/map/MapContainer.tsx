import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, CircularProgress, IconButton } from '@mui/material';
import { MyLocation as MyLocationIcon, ZoomOutMap as ZoomOutMapIcon } from '@mui/icons-material';
import { Location } from '../../services/MapService';

interface MapContainerProps {
  markers?: Location[];
  route?: Location[];
  currentLocation?: Location;
  onMapClick?: (location: Location) => void;
  onMarkerClick?: (marker: Location) => void;
  isLoading?: boolean;
}

// 이 컴포넌트는 실제로는 Google Maps, Kakao Maps, Naver Maps 등 지도 API와 통합해야 합니다.
// 여기서는 간단한 Canvas로 시뮬레이션만 합니다.
const MapContainer: React.FC<MapContainerProps> = ({
  markers = [],
  route = [],
  currentLocation,
  onMapClick,
  onMarkerClick,
  isLoading = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  
  // 지도 경계 설정
  const mapBounds = {
    minLat: 33.0,
    maxLat: 38.0,
    minLng: 125.0,
    maxLng: 130.0,
  };
  
  useEffect(() => {
    const updateMapSize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        setMapSize({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    };
    
    updateMapSize();
    window.addEventListener('resize', updateMapSize);
    
    return () => {
      window.removeEventListener('resize', updateMapSize);
    };
  }, []);
  
  // 지도 그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 캔버스 크기 설정
    canvas.width = mapSize.width;
    canvas.height = mapSize.height;
    
    // 지도 배경 그리기
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 격자 그리기
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // 세로 선
    for (let i = 0; i <= 10; i++) {
      const x = (canvas.width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // 가로 선
    for (let i = 0; i <= 10; i++) {
      const y = (canvas.height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // 좌표를 캔버스 위치로 변환하는 함수
    const latLngToPoint = (location: Location) => {
      const x = ((location.longitude - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * canvas.width;
      const y = canvas.height - ((location.latitude - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat)) * canvas.height;
      return { x, y };
    };
    
    // 경로 그리기
    if (route.length > 1) {
      ctx.strokeStyle = '#2196F3';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      const start = latLngToPoint(route[0]);
      ctx.moveTo(start.x, start.y);
      
      for (let i = 1; i < route.length; i++) {
        const point = latLngToPoint(route[i]);
        ctx.lineTo(point.x, point.y);
      }
      
      ctx.stroke();
    }
    
    // 마커 그리기
    markers.forEach((marker) => {
      const { x, y } = latLngToPoint(marker);
      
      // 마커 원
      ctx.fillStyle = '#FF5722';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // 마커 라벨
      if (marker.name) {
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.fillText(marker.name, x + 12, y + 4);
      }
    });
    
    // 현재 위치 그리기
    if (currentLocation) {
      const { x, y } = latLngToPoint(currentLocation);
      
      // 외부 원
      ctx.fillStyle = 'rgba(33, 150, 243, 0.2)';
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      
      // 내부 원
      ctx.fillStyle = '#2196F3';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // 테두리
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [mapSize, markers, route, currentLocation, mapBounds]);
  
  // 캔버스 클릭 이벤트 처리
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onMapClick) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 캔버스 좌표를 위도/경도로 변환
    const longitude = mapBounds.minLng + (x / canvas.width) * (mapBounds.maxLng - mapBounds.minLng);
    const latitude = mapBounds.minLat + ((canvas.height - y) / canvas.height) * (mapBounds.maxLat - mapBounds.minLat);
    
    onMapClick({ latitude, longitude });
  };
  
  return (
    <Box position="relative" width="100%" height="100%" overflow="hidden">
      <Paper
        elevation={3}
        sx={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
        
        {isLoading && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bgcolor="rgba(255, 255, 255, 0.5)"
          >
            <CircularProgress />
          </Box>
        )}
        
        {/* 현재 위치 버튼 */}
        {currentLocation && (
          <IconButton
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              backgroundColor: 'white',
              '&:hover': { backgroundColor: '#f0f0f0' },
              boxShadow: 3,
            }}
            onClick={() => {}}
          >
            <MyLocationIcon color="primary" />
          </IconButton>
        )}
        
        {/* 경로 전체 보기 버튼 */}
        {route.length > 0 && (
          <IconButton
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 80,
              backgroundColor: 'white',
              '&:hover': { backgroundColor: '#f0f0f0' },
              boxShadow: 3,
            }}
            onClick={() => {}}
          >
            <ZoomOutMapIcon color="primary" />
          </IconButton>
        )}
        
        {/* 지도 속성 정보 */}
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            bottom: 4,
            left: 8,
            color: 'gray',
            fontSize: '0.7rem',
          }}
        >
          지도 데이터 © 2023 CarGoro 인증 사이트 - 실제 지도가 아닙니다
        </Typography>
      </Paper>
    </Box>
  );
};

export default MapContainer; 