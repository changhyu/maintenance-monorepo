import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Tooltip,
  CircularProgress,
  FormControlLabel,
  Switch,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  MyLocation as MyLocationIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Layers as LayersIcon,
  Traffic as TrafficIcon,
  CameraAlt as CameraAltIcon,
  Explore as ExploreIcon,
  VideoLabel as VideoLabelIcon,
  Image as ImageIcon,
  PlayCircle as PlayCircleIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { Map, MapRef, Source, Layer } from 'react-map-gl';
import type { MapboxGeoJSONFeature } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getCCTVData, CCTVData } from '../services/uticService';
import CCTVViewer from './CCTVViewer';

// MapBox 액세스 토큰 (환경 변수에서 로드)
const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || 'pk.YOUR_MAPBOX_TOKEN_HERE';

// 지도 스타일 옵션
const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  navigation: 'mapbox://styles/mapbox/navigation-day-v1'
};

// CCTV 타입별 필터 옵션
const CCTV_FILTERS = {
  ALL: 'all',
  STREAMING: '1',
  VIDEO: '2',
  IMAGE: '3'
};

// CCTV 마커 레이어 스타일 - 필터링 적용
const createCctvLayerStyle = (filter: string) => ({
  id: 'cctv-points',
  type: 'circle',
  filter: filter === CCTV_FILTERS.ALL 
    ? ['has', 'type'] // 모든 CCTV 표시
    : ['==', ['get', 'type'], filter], // 특정 타입만 표시
  paint: {
    'circle-radius': 8,
    'circle-color': [
      'match',
      ['get', 'type'],
      '1', '#4caf50', // 실시간 스트리밍 - 녹색
      '2', '#2196f3', // 동영상 파일 - 파란색
      '3', '#ff9800', // 정지 영상 - 주황색
      '#757575' // 기본 - 회색
    ],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
    'circle-opacity': 0.9
  }
});

// CCTV 마커 심볼 레이어 스타일 - 필터링 적용
const createCctvSymbolLayerStyle = (filter: string) => ({
  id: 'cctv-symbols',
  type: 'symbol',
  filter: filter === CCTV_FILTERS.ALL 
    ? ['has', 'type'] // 모든 CCTV 표시
    : ['==', ['get', 'type'], filter], // 특정 타입만 표시
  layout: {
    'text-field': ['get', 'name'],
    'text-size': 11,
    'text-offset': [0, 1.5],
    'text-anchor': 'top',
    'icon-image': [
      'match',
      ['get', 'type'],
      '1', 'streaming-camera',
      '2', 'video-camera',
      '3', 'image-camera',
      'default-camera'
    ],
    'icon-size': 0.7,
    'icon-allow-overlap': true
  },
  paint: {
    'text-color': '#ffffff',
    'text-halo-color': '#000000',
    'text-halo-width': 1
  }
});

// CCTV 클러스터 레이어 스타일
const cctvClusterLayer = {
  id: 'cctv-clusters',
  type: 'circle',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step',
      ['get', 'point_count'],
      '#51bbd6', // 20개 미만일 때
      20, '#f1f075', // 20-50개
      50, '#f28cb1' // 50개 이상
    ],
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      15, // 기본 크기
      20, 20, // 20개 이상일 때 크기
      50, 25 // 50개 이상일 때 크기
    ],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff'
  }
};

// 클러스터 카운트 레이어
const cctvClusterCountLayer = {
  id: 'cctv-cluster-count',
  type: 'symbol',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 12
  },
  paint: {
    'text-color': '#ffffff'
  }
};

// TrafficFlow 레이어 스타일링
const trafficFlowLayerStyle: any = {
  id: 'traffic-flow',
  type: 'line',
  layout: {
    'line-join': 'round',
    'line-cap': 'round'
  },
  paint: {
    'line-color': [
      'match',
      ['get', 'congestionLevel'],
      'SMOOTH', '#4caf50', // 원활 - 녹색
      'SLOW', '#ff9800',   // 서행 - 주황색
      'CONGESTED', '#f44336', // 정체 - 빨간색
      '#03a9f4' // 기본 - 파란색
    ],
    'line-width': 4,
    'line-opacity': 0.8
  }
};

// 초기 지도 설정 값
const INITIAL_VIEW_STATE = {
  longitude: 126.9779, // 서울 중심
  latitude: 37.5665,
  zoom: 14,
  bearing: 0,
  pitch: 0
};

// NavigationMap 컴포넌트 props 타입
interface NavigationMapProps {
  onMapLoaded?: () => void;
}

/**
 * NavigationMap 컴포넌트
 * CCTV 위치와 교통 정보를 보여주는 지도 컴포넌트
 */
const NavigationMap: React.FC<NavigationMapProps> = ({ onMapLoaded }) => {
  // 지도 참조
  const mapRef = useRef<MapRef | null>(null);
  
  // 상태 관리
  const [mapStyle, setMapStyle] = useState<string>(MAP_STYLES.streets);
  const [showTraffic, setShowTraffic] = useState<boolean>(false);
  const [showCCTV, setShowCCTV] = useState<boolean>(true);
  const [cctvFilter, setCctvFilter] = useState<string>(CCTV_FILTERS.ALL);
  const [cctvData, setCctvData] = useState<CCTVData[]>([]);
  const [selectedCCTV, setSelectedCCTV] = useState<CCTVData | null>(null);
  const [isLoadingCCTV, setIsLoadingCCTV] = useState<boolean>(false);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [cctvError, setCctvError] = useState<string | null>(null);
  const [enableClustering, setEnableClustering] = useState<boolean>(true);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  
  // 캐싱을 위한 상태
  const [cachedCctvData, setCachedCctvData] = useState<{
    [key: string]: { data: CCTVData[]; timestamp: number }
  }>({});
  const cacheTTL = 5 * 60 * 1000; // 5분 캐시 유효 시간
  
  // 로드 최적화를 위한 상태
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const minLoadInterval = 1000; // 최소 로딩 간격 (ms)
  const [hasPendingLoad, setHasPendingLoad] = useState<boolean>(false);

  // 필터 메뉴 열기/닫기
  const openFilterMenu = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const closeFilterMenu = () => {
    setFilterAnchorEl(null);
  };

  // CCTV 필터 변경
  const handleFilterChange = (filter: string) => {
    setCctvFilter(filter);
    closeFilterMenu();
  };
  
  // CCTV 데이터 GeoJSON 변환
  const cctvGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: cctvData.map(cctv => ({
      type: 'Feature',
      properties: {
        id: cctv.id || `cctv-${Math.random().toString(36).substr(2, 9)}`,
        name: cctv.name || 'CCTV',
        type: cctv.type || '1',
        url: cctv.url,
        format: cctv.format,
        resolution: cctv.resolution,
        createTime: cctv.createTime
      },
      geometry: {
        type: 'Point',
        coordinates: [cctv.longitude, cctv.latitude]
      }
    }))
  }), [cctvData]);
  
  // 캐시 키 생성 함수
  const createCacheKey = useCallback((bounds: any) => {
    // 위치를 반올림하여 캐시 키 생성 (정밀도 제한)
    const precision = 2; // 소수점 2자리까지
    return `${bounds.getWest().toFixed(precision)},${bounds.getSouth().toFixed(precision)},` +
           `${bounds.getEast().toFixed(precision)},${bounds.getNorth().toFixed(precision)}`;
  }, []);
  
  // 지도 바운드에 따른 CCTV 데이터 로딩
  const loadCCTVData = useCallback(async (forceLoad = false) => {
    if (!mapRef.current || !showCCTV) {
      setHasPendingLoad(false);
      return;
    }
    
    // 너무 빠른 연속 호출 방지
    const currentTime = Date.now();
    if (!forceLoad && currentTime - lastLoadTime < minLoadInterval) {
      // 로딩을 지연시키고 나중에 실행
      if (!hasPendingLoad) {
        setHasPendingLoad(true);
        setTimeout(() => {
          loadCCTVData(true);
          setHasPendingLoad(false);
        }, minLoadInterval);
      }
      return;
    }
    
    try {
      setIsLoadingCCTV(true);
      setCctvError(null);
      setLastLoadTime(currentTime);
      
      const bounds = mapRef.current.getBounds();
      const cacheKey = createCacheKey(bounds);
      
      // 캐시 확인
      if (!forceLoad && 
          cachedCctvData[cacheKey] && 
          currentTime - cachedCctvData[cacheKey].timestamp < cacheTTL) {
        // 캐시된 데이터 사용
        setCctvData(cachedCctvData[cacheKey].data);
        setIsLoadingCCTV(false);
        return;
      }
      
      // API 호출
      const params = {
        type: 'all', // 모든 도로 유형
        cctvType: cctvFilter === CCTV_FILTERS.ALL ? '1' : cctvFilter, // 필터 적용
        minX: bounds.getWest(),
        maxX: bounds.getEast(),
        minY: bounds.getSouth(),
        maxY: bounds.getNorth(),
        getType: 'json' as const
      };
      
      const data = await getCCTVData(params);
      setCctvData(data);
      
      // 캐시 업데이트
      setCachedCctvData(prev => ({
        ...prev,
        [cacheKey]: { data, timestamp: currentTime }
      }));
      
    } catch (error) {
      console.error('CCTV 데이터 로딩 실패:', error);
      setCctvError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setIsLoadingCCTV(false);
    }
  }, [showCCTV, lastLoadTime, minLoadInterval, hasPendingLoad, cachedCctvData, createCacheKey, cctvFilter]);

  // 필터 변경시 데이터 다시 로딩
  useEffect(() => {
    loadCCTVData(true);
  }, [cctvFilter, loadCCTVData]);

  // 지도 이동 종료 시 CCTV 데이터 로딩
  const handleMoveEnd = useCallback(() => {
    loadCCTVData();
  }, [loadCCTVData]);

  // 컴포넌트 마운트 시 CCTV 데이터 로딩
  useEffect(() => {
    if (showCCTV) {
      loadCCTVData(true);
    }
  }, [loadCCTVData, showCCTV]);
  
  // 캐시 주기적 정리
  useEffect(() => {
    const cleanCacheInterval = setInterval(() => {
      const now = Date.now();
      setCachedCctvData(prev => {
        const newCache = { ...prev };
        Object.keys(newCache).forEach(key => {
          if (now - newCache[key].timestamp > cacheTTL) {
            delete newCache[key];
          }
        });
        return newCache;
      });
    }, 60000); // 1분마다 캐시 정리
    
    return () => clearInterval(cleanCacheInterval);
  }, [cacheTTL]);
  
  // 지도 스타일 변경
  const toggleMapStyle = () => {
    // Streets -> Satellite -> Navigation -> Light -> Dark -> Streets 순으로 변경
    if (mapStyle === MAP_STYLES.streets) {
      setMapStyle(MAP_STYLES.satellite);
    } else if (mapStyle === MAP_STYLES.satellite) {
      setMapStyle(MAP_STYLES.navigation);
    } else if (mapStyle === MAP_STYLES.navigation) {
      setMapStyle(MAP_STYLES.light);
    } else if (mapStyle === MAP_STYLES.light) {
      setMapStyle(MAP_STYLES.dark);
    } else {
      setMapStyle(MAP_STYLES.streets);
    }
  };
  
  // 현재 위치로 이동
  const moveToCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [longitude, latitude],
              zoom: 16,
              duration: 2000
            });
          }
        },
        (error) => {
          console.error('위치 정보 가져오기 실패:', error);
          alert('현재 위치를 가져오는데 실패했습니다.');
        }
      );
    } else {
      alert('이 브라우저에서는 위치 기능을 지원하지 않습니다.');
    }
  };
  
  // 지도 확대
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };
  
  // 지도 축소
  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };
  
  // CCTV 클릭 핸들러
  const handleCCTVClick = (e: any) => {
    if (!e.features || e.features.length === 0) {
      return;
    }
    
    // 클러스터 클릭 처리
    const feature = e.features[0];
    
    // 클러스터를 클릭한 경우
    if (feature.properties.cluster) {
      const clusterId = feature.properties.cluster_id;
      const mapboxSource = mapRef.current?.getMap().getSource('cctv-source');
      
      if (mapboxSource && 'getClusterExpansionZoom' in mapboxSource) {
        (mapboxSource as any).getClusterExpansionZoom(
          clusterId,
          (err: any, zoom: any) => {
            if (err || !mapRef.current) {
              return;
            }
            
            mapRef.current.flyTo({
              center: feature.geometry.coordinates,
              zoom: zoom as number
            });
          }
        );
      }
      return;
    }
    
    // 일반 CCTV를 클릭한 경우
    const { geometry } = feature;
    
    // CCTV 데이터 찾기
    const clickedCCTV = cctvData.find(cctv => 
      cctv.longitude === geometry.coordinates[0] && 
      cctv.latitude === geometry.coordinates[1]
    );
    
    if (clickedCCTV) {
      setSelectedCCTV(clickedCCTV);
    }
  };
  
  // 지도 로드 완료 핸들러
  const handleMapLoad = () => {
    if (onMapLoaded) {
      onMapLoaded();
    }
    
    // CCTV 아이콘 추가
    if (mapRef.current && mapRef.current.getMap()) {
      const map = mapRef.current.getMap();
      
      // 다양한 아이콘 이미지 추가
      const addIcon = (id: string, path: string) => {
        if (!map.hasImage(id)) {
          const img = new Image(24, 24);
          img.onload = () => {
            if (!map.hasImage(id)) {
              map.addImage(id, img);
            }
          };
          img.src = path;
        }
      };
      
      // 실시간 스트리밍 카메라 아이콘
      addIcon('streaming-camera', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgLTk2MCA5NjAgOTYwIiB3aWR0aD0iMjQiIGZpbGw9IiM0Y2FmNTAiPjxwYXRoIGQ9Ik00MDAgLTI0MEgyMDB2LTgwaDIwMHYtMjQwaDgwdjI0MGgyMDB2ODBINDgwdjI0MGgtODB2LTI0MFptODAtNDAwcS04MyAwLTE0MS41OC01OC41VDI4MCAtODQwcTAtODMgNTguNS0xNDEuNVQ0ODAgLTEwNDBxODMgMCAxNDEuNTggNTguNVQ2ODAgLTg0MHEwIDgzLTU4LjUgMTQxLjVUNDgwIC02NDBaIi8+PC9zdmc+');
      
      // 비디오 카메라 아이콘
      addIcon('video-camera', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgLTk2MCA5NjAgOTYwIiB3aWR0aD0iMjQiIGZpbGw9IiMyMTk2ZjMiPjxwYXRoIGQ9Ik0xNjAgLTEyMHEtMzMgMC01Ni41LTIzLjVUODAgLTIwMHYtNTYwcTAtMzMgMjMuNS01Ni41VDE2MCAtODQwaDQ0MHEzMyAwIDU2LjUgMjMuNVQ2ODAgLTc2MHYxNjhsMTYwLTEyMHY0ODRMMjE4IC0zNDhsLTU4LTU4djIwNnEwIDMzLTIzLjUgNTYuNVQxNjAgLTEyMFptMC04MGg0NDB2LTU2MGgtNDQwdjU2MFptMCAwdi01NjBoNDQwdjU2MEg0NDAgLTY0MFoiLz48L3N2Zz4=');
      
      // 이미지 카메라 아이콘
      addIcon('image-camera', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgLTk2MCA5NjAgOTYwIiB3aWR0aD0iMjQiIGZpbGw9IiNmZjk4MDAiPjxwYXRoIGQ9Ik00ODAgLTQ4NnEtNTggMC05OS00MS41VDM0MCAtNjI3cTAtNTggNDELTk5dDk5LTQxcTU4IDAgOTkuNSA0MVQ2MjAgLTYyN3EtMSA1OC00MiA5OS41VDQ4MCAtNDg2Wm0wLTYwcTM0IDAgNTctMjN0MjMtNThxMC0zNC0yMy01N3QtNTctMjNxLTM0IDAtNTcgMjN0LTIzIDU3cTAgMzUgMjMgNTh0NTcgMjNaTTIwMCAtMjAwcS0zMyAwLTU2LjUtMjMuNVQxMjAgLTI4MHYtNDAwcTAtMzMgMjMuNS01Ni41VDIwMCAtNzYwaDU2MHEzMyAwIDU2LjUgMjMuNVQ4NDAgLTY4MHYwbDI0aDFsNCAwcTEzIDAgMjEuNSA4LjVUODk5IC02NDl2MjU4cTAgMTMtOC41IDIxLjVUODY5IC0zNjFoLTU2NWwtMTA0IDEwOFYtMjAwWm00MC0xNjBoNTIwdi00MDBIMjQwdjQwMFptLTQwIDB2LTQwMCA0MDBIMjAwWiIvPjwvc3ZnPg==');
      
      // 기본 카메라 아이콘
      addIcon('default-camera', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgLTk2MCA5NjAgOTYwIiB3aWR0aD0iMjQiIGZpbGw9IiM3NTc1NzUiPjxwYXRoIGQ9Ik00ODAgLTQ0MHEtNjYgMC0xMTMtNDdUMzIwIC02MDBxMC02NiA0Ny0xMTN0MTEzLTQ3cTY2IDAgMTEzIDQ3dDQ3IDExM3EwIDY2LTQ3IDExM3QtMTEzIDQ3Wk0yMDAgLTI0MHEtMzMgMC01Ni41LTIzLjVUMTIwIC0zMjB2LTU2MHEwLTMzIDIzLjUtNTYuNVQyMDAgLTk2MGg1NjBxMzMgMCA1Ni41IDIzLjVUODQwIC04ODB2NTYwcTAgMzMtMjMuNSA1Ni41VDc2MCAtMjQwSDIwMFptMC04MGg1NjB2LTU2MEgyMDB2NTYwWm0wIDB2LTU2MCA1NjBoLTU2MFoiLz48L3N2Zz4=');
    }
  };
  
  // 레이어 스타일 - 필터링 적용
  const cctvLayerStyle = useMemo(() => createCctvLayerStyle(cctvFilter), [cctvFilter]);
  const cctvSymbolLayerStyle = useMemo(() => createCctvSymbolLayerStyle(cctvFilter), [cctvFilter]);
  
  // CCTV 타입 필터 라벨
  const getCctvFilterLabel = () => {
    switch (cctvFilter) {
      case CCTV_FILTERS.STREAMING:
        return '실시간 스트리밍';
      case CCTV_FILTERS.VIDEO:
        return '동영상 파일';
      case CCTV_FILTERS.IMAGE:
        return '정지 영상';
      default:
        return '모든 유형';
    }
  };

  // CCTV 타입별 아이콘
  const getCctvFilterIcon = (type: string) => {
    switch (type) {
      case CCTV_FILTERS.STREAMING:
        return <PlayCircleIcon style={{ color: '#4caf50' }} />;
      case CCTV_FILTERS.VIDEO:
        return <VideoLabelIcon style={{ color: '#2196f3' }} />;
      case CCTV_FILTERS.IMAGE:
        return <ImageIcon style={{ color: '#ff9800' }} />;
      default:
        return <VideocamIcon />;
    }
  };
  
  return (
    <Paper 
      elevation={3}
      sx={{
        width: '100%',
        height: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* 지도 */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={e => setViewState(e.viewState)}
        onMoveEnd={handleMoveEnd}
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={['cctv-points', 'cctv-clusters']}
        onClick={handleCCTVClick}
        onLoad={handleMapLoad}
      >
        {/* CCTV 마커 레이어 */}
        {showCCTV && (
          enableClustering ? (
            // 클러스터링된 CCTV 마커
            <Source
              id="cctv-source"
              type="geojson"
              data={cctvGeoJson}
              cluster={true}
              clusterMaxZoom={14}
              clusterRadius={50}
            >
              <Layer {...cctvClusterLayer} />
              <Layer {...cctvClusterCountLayer} />
              <Layer {...cctvLayerStyle} />
              <Layer {...cctvSymbolLayerStyle} />
            </Source>
          ) : (
            // 단일 CCTV 마커
            <Source type="geojson" data={cctvGeoJson}>
              <Layer {...cctvLayerStyle} />
              <Layer {...cctvSymbolLayerStyle} />
            </Source>
          )
        )}
        
        {/* 교통 정보 레이어 (구현 시) */}
        {showTraffic && (
          <Source type="geojson" data={{ type: 'FeatureCollection', features: [] }}>
            <Layer {...trafficFlowLayerStyle} />
          </Source>
        )}
      </Map>
      
      {/* 지도 컨트롤 패널 */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 10, 
          right: 10, 
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: 0.5, 
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.9)'
          }}
        >
          <Tooltip title="지도 스타일 변경">
            <IconButton size="small" onClick={toggleMapStyle}>
              <LayersIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="확대">
            <IconButton size="small" onClick={handleZoomIn}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="축소">
            <IconButton size="small" onClick={handleZoomOut}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="내 위치">
            <IconButton size="small" onClick={moveToCurrentLocation}>
              <MyLocationIcon />
            </IconButton>
          </Tooltip>
        </Paper>
        
        <Paper 
          elevation={3} 
          sx={{ 
            p: 1, 
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={showTraffic}
                onChange={() => setShowTraffic(!showTraffic)}
                size="small"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrafficIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2">교통정보</Typography>
              </Box>
            }
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showCCTV}
                  onChange={() => setShowCCTV(!showCCTV)}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Badge 
                    badgeContent={cctvData.length > 0 ? cctvData.length : null} 
                    color="primary"
                    sx={{ mr: 0.5 }}
                  >
                    <VideocamIcon fontSize="small" />
                  </Badge>
                  <Typography variant="body2">CCTV</Typography>
                </Box>
              }
            />
            
            {showCCTV && (
              <Tooltip title="CCTV 필터">
                <IconButton 
                  size="small"
                  onClick={openFilterMenu}
                  color={cctvFilter !== CCTV_FILTERS.ALL ? 'primary' : 'default'}
                >
                  <FilterListIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            <Menu
              anchorEl={filterAnchorEl}
              open={Boolean(filterAnchorEl)}
              onClose={closeFilterMenu}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem 
                selected={cctvFilter === CCTV_FILTERS.ALL}
                onClick={() => handleFilterChange(CCTV_FILTERS.ALL)}
              >
                <ListItemIcon>
                  {getCctvFilterIcon(CCTV_FILTERS.ALL)}
                </ListItemIcon>
                <ListItemText>모든 유형</ListItemText>
              </MenuItem>
              
              <MenuItem 
                selected={cctvFilter === CCTV_FILTERS.STREAMING}
                onClick={() => handleFilterChange(CCTV_FILTERS.STREAMING)}
              >
                <ListItemIcon>
                  {getCctvFilterIcon(CCTV_FILTERS.STREAMING)}
                </ListItemIcon>
                <ListItemText>실시간 스트리밍</ListItemText>
              </MenuItem>
              
              <MenuItem 
                selected={cctvFilter === CCTV_FILTERS.VIDEO}
                onClick={() => handleFilterChange(CCTV_FILTERS.VIDEO)}
              >
                <ListItemIcon>
                  {getCctvFilterIcon(CCTV_FILTERS.VIDEO)}
                </ListItemIcon>
                <ListItemText>동영상 파일</ListItemText>
              </MenuItem>
              
              <MenuItem 
                selected={cctvFilter === CCTV_FILTERS.IMAGE}
                onClick={() => handleFilterChange(CCTV_FILTERS.IMAGE)}
              >
                <ListItemIcon>
                  {getCctvFilterIcon(CCTV_FILTERS.IMAGE)}
                </ListItemIcon>
                <ListItemText>정지 영상</ListItemText>
              </MenuItem>
              
              <MenuItem 
                onClick={() => setEnableClustering(!enableClustering)}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableClustering}
                      size="small"
                    />
                  }
                  label="클러스터링"
                />
              </MenuItem>
            </Menu>
          </Box>
        </Paper>
      </Box>
      
      {/* CCTV 필터 정보 */}
      {showCCTV && cctvFilter !== CCTV_FILTERS.ALL && (
        <Paper 
          elevation={3} 
          sx={{ 
            position: 'absolute', 
            top: 10, 
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 10px',
            borderRadius: 2,
            backgroundColor: 'rgba(33, 150, 243, 0.8)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          {getCctvFilterIcon(cctvFilter)}
          <Typography variant="body2">
            {getCctvFilterLabel()} CCTV만 표시 중
          </Typography>
        </Paper>
      )}
      
      {/* 좌표 정보 */}
      <Paper 
        elevation={3} 
        sx={{ 
          position: 'absolute', 
          bottom: 10, 
          left: 10, 
          padding: 1,
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <ExploreIcon fontSize="small" />
        <Typography variant="caption">
          {`위도: ${viewState.latitude.toFixed(6)}, 경도: ${viewState.longitude.toFixed(6)}, 줌: ${viewState.zoom.toFixed(2)}`}
        </Typography>
      </Paper>
      
      {/* CCTV 로딩 인디케이터 */}
      {isLoadingCCTV && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 10, 
            left: 10, 
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1,
            borderRadius: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white'
          }}
        >
          <CircularProgress size={20} sx={{ color: 'white' }} />
          <Typography variant="caption">CCTV 불러오는 중...</Typography>
        </Box>
      )}

      {/* CCTV 에러 메시지 */}
      {cctvError && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 10, 
            left: 10, 
            zIndex: 1,
            p: 1,
            borderRadius: 2,
            backgroundColor: 'rgba(244, 67, 54, 0.7)',
            color: 'white'
          }}
        >
          <Typography variant="caption">{cctvError}</Typography>
        </Box>
      )}
      
      {/* CCTV 정보 패널 */}
      {showCCTV && cctvData.length > 0 && (
        <Paper 
          elevation={3} 
          sx={{ 
            position: 'absolute', 
            bottom: 50, 
            left: 10, 
            padding: 1,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            maxWidth: 200
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <CameraAltIcon fontSize="small" sx={{ mr: 0.5 }} />
            CCTV 정보
          </Typography>
          <Typography variant="caption" display="block">
            표시된 CCTV: {cctvData.length}개
          </Typography>
          <Typography variant="caption" display="block">
            실시간: {cctvData.filter(c => c.type === '1').length}개
          </Typography>
          <Typography variant="caption" display="block">
            동영상: {cctvData.filter(c => c.type === '2').length}개
          </Typography>
          <Typography variant="caption" display="block">
            정지영상: {cctvData.filter(c => c.type === '3').length}개
          </Typography>
        </Paper>
      )}
      
      {/* CCTV 뷰어 모달 */}
      <CCTVViewer
        cctv={selectedCCTV}
        onClose={() => setSelectedCCTV(null)}
      />
    </Paper>
  );
};

export default NavigationMap;