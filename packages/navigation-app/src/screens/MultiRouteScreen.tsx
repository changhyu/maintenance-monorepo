import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator 
} from 'react-native';
import { useTheme, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { GeoPoint } from '../types';
import { AlternativeRoute, RoutePriority } from '../services/route/types';
import alternativeRouteService from '../services/route/AlternativeRouteService';
import { formatTime, formatDistance } from '../utils/formatters';
import { StackNavigationProp } from '@react-navigation/stack';

// 네비게이션 파라미터 타입 정의 추가
interface RouteParams {
  start?: GeoPoint;
  end?: GeoPoint;
}

// 테마 타입 충돌을 방지하기 위한 인터페이스 이름 변경
interface CustomTheme {
  background: string;
  text: string;
  card: string;
  textSecondary: string;
}

// 테마 타입과 합쳐서 사용
type ExtendedTheme = ReturnType<typeof useTheme> & CustomTheme;

// 네비게이션 타입 정의
type MultiRouteScreenProps = {
  navigation: StackNavigationProp<any, 'MultiRoute'>;
  route: RouteProp<any, 'MultiRoute'>;
};

// 경로 우선순위 옵션 정의
const routeOptions = [
  { id: RoutePriority.FASTEST, name: '최단 시간', color: '#4285F4' }, // 파랑
  { id: RoutePriority.SHORTEST, name: '최단 거리', color: '#34A853' }, // 녹색
  { id: RoutePriority.LEAST_TRAFFIC, name: '최소 교통', color: '#FBBC05' }, // 노랑
  { id: RoutePriority.SCENIC, name: '경관 우선', color: '#EA4335' }, // 빨강
];

// RouteService 모킹 - 올바른 타입 정의 추가
interface Route {
  id: string;
  path: GeoPoint[];
  distance: number;
  estimatedTime: number;
  segments: any[];
  nodes: any[];
  trafficLevel?: number;
  name?: string;
}

// RouteService 직접 구현 (모듈을 찾을 수 없는 문제 해결)
const routeService = {
  calculateRoute: async (start: GeoPoint, end: GeoPoint, priority: RoutePriority): Promise<Route> => {
    // 실제 구현은 여기에 있어야 하지만, 모킹으로 대체
    console.log('Calculating route from', start, 'to', end, 'with priority', priority);
    return { 
      id: 'mock-route-id',
      path: [start, end],
      distance: 1000,
      estimatedTime: 600,
      segments: [],
      nodes: [],
      name: '기본 경로',
      trafficLevel: 0.3,
    };
  }
};

const MultiRouteScreen: React.FC<MultiRouteScreenProps> = ({ navigation, route }) => {
  // 확장된 테마 타입 사용
  const theme = useTheme() as ExtendedTheme;
  
  // 경로 계산 상태
  const [isLoading, setIsLoading] = useState(false);
  const [startPoint, setStartPoint] = useState<GeoPoint | null>(null);
  const [endPoint, setEndPoint] = useState<GeoPoint | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedPriorityId, setSelectedPriorityId] = useState(RoutePriority.FASTEST);
  const [availableRoutes, setAvailableRoutes] = useState<AlternativeRoute[]>([]);
  
  // 경로 옵션
  const routeOption = routeOptions.find(option => option.id === selectedPriorityId);
  
  // 출발지, 목적지 설정
  useEffect(() => {
    // route.params 타입 체크 추가
    if (route.params && 'start' in route.params && 'end' in route.params) {
      const params = route.params as unknown as RouteParams;
      if (params.start) {
        setStartPoint(params.start);
      }
      if (params.end) {
        setEndPoint(params.end);
      }
      if (params.start && params.end) {
        calculateRoutes(params.start, params.end);
      }
    }
  }, [route.params]);
  
  // 경로 계산 함수
  const calculateRoutes = useCallback(async (start: GeoPoint, end: GeoPoint) => {
    setIsLoading(true);
    try {
      // 기본 경로 먼저 계산
      const baseRoute = await routeService.calculateRoute(start, end, selectedPriorityId);
      
      if (baseRoute) {
        // 대체 경로 계산
        const result = alternativeRouteService.calculateAlternatives(baseRoute, selectedPriorityId);
        setAvailableRoutes([result.mainRoute, ...result.alternatives]);
        setSelectedRouteId(result.mainRoute.id);
      } else {
        console.error('기본 경로를 계산할 수 없습니다.');
      }
    } catch (error) {
      console.error('경로 계산 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPriorityId]);
  
  // 우선순위 변경 시 경로 재계산
  useEffect(() => {
    if (startPoint && endPoint) {
      calculateRoutes(startPoint, endPoint);
    }
  }, [selectedPriorityId, calculateRoutes]);
  
  // 선택된 경로
  const selectedRoute = availableRoutes.find(r => r.id === selectedRouteId);
  
  // 경로 선택 처리
  const handleRouteSelect = (routeId: string) => {
    setSelectedRouteId(routeId);
  };
  
  // 네비게이션 시작
  const handleStartNavigation = () => {
    if (selectedRoute) {
      navigation.navigate('Navigation', { route: selectedRoute } as never);
    }
  };
  
  // 맵 표시할 경로 좌표
  const routePoints = useMemo(() => {
    if (selectedRoute) {
      return selectedRoute.path;
    }
    return [];
  }, [selectedRoute]);
  
  // 맵 중심 및 확대/축소 레벨 계산
  const mapProps = useMemo(() => {
    if (!startPoint || !endPoint) {
      return {
        initialRegion: {
          latitude: 37.5665, // 서울시청
          longitude: 126.9780,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }
      };
    }
    
    // 출발지, 목적지 포함하는 영역 계산
    const minLat = Math.min(startPoint.latitude, endPoint.latitude) - 0.03;
    const maxLat = Math.max(startPoint.latitude, endPoint.latitude) + 0.03;
    const minLng = Math.min(startPoint.longitude, endPoint.longitude) - 0.03;
    const maxLng = Math.max(startPoint.longitude, endPoint.longitude) + 0.03;
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = maxLat - minLat;
    const lngDelta = maxLng - minLng;
    
    return {
      initialRegion: {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: Math.max(latDelta, 0.02),
        longitudeDelta: Math.max(lngDelta, 0.02),
      }
    };
  }, [startPoint, endPoint]);
  
  // 교통 상황 텍스트 변환
  const getTrafficText = (level: number): string => {
    if (level < 0.2) {
      return '원활';
    }
    if (level < 0.4) {
      return '약간 혼잡';
    }
    if (level < 0.6) {
      return '보통 혼잡';
    }
    if (level < 0.8) {
      return '심한 혼잡';
    }
    return '매우 혼잡';
  };
  
  // 교통 수준에 따른 색상
  const getTrafficColor = (level: number): string => {
    if (level < 0.2) {
      return '#34A853'; // 녹색
    }
    if (level < 0.4) {
      return '#FBBC05'; // 노란색
    }
    if (level < 0.6) {
      return '#FF9800'; // 주황색
    }
    if (level < 0.8) {
      return '#EA4335'; // 빨강
    }
    return '#B71C1C'; // 진한 빨강
  };
  
  // 지도에 경로 렌더링
  const renderMapRoute = () => {
    if (!routePoints || routePoints.length === 0) {
      return null;
    }
    
    return (
      <Polyline
        coordinates={routePoints}
        strokeColor={routeOption?.color ?? '#4285F4'}
        strokeWidth={5}
      />
    );
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          경로 선택
        </Text>
      </View>
      
      {/* 지도 영역 */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          {...mapProps}
        >
          {startPoint && (
            <Marker coordinate={startPoint} pinColor="green" title="출발지" />
          )}
          {endPoint && (
            <Marker coordinate={endPoint} pinColor="red" title="목적지" />
          )}
          {renderMapRoute()}
        </MapView>
      </View>
      
      {/* 경로 옵션 선택 */}
      <View style={styles.optionsContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          경로 우선순위
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
          {routeOptions.map(option => {
            const isSelected = selectedPriorityId === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  { backgroundColor: isSelected ? option.color : theme.card }
                ]}
                onPress={() => setSelectedPriorityId(option.id)}
              >
                <Text 
                  style={[
                    styles.optionText, 
                    { color: isSelected ? '#FFFFFF' : theme.text }
                  ]}
                >
                  {option.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      
      {/* 경로 목록 */}
      <View style={styles.routesContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          추천 경로
        </Text>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4285F4" />
            <Text style={styles.loadingText}>경로를 계산 중입니다...</Text>
          </View>
        ) : (
          <ScrollView style={styles.routesList}>
            {availableRoutes.map(route => (
              <TouchableOpacity
                key={route.id}
                style={[
                  styles.routeItem,
                  {
                    backgroundColor: theme.card,
                    borderColor: selectedRouteId === route.id ? routeOption?.color ?? '#4285F4' : 'transparent'
                  }
                ]}
                onPress={() => handleRouteSelect(route.id)}
              >
                <View style={styles.routeItemContent}>
                  <Text style={[styles.routeName, { color: theme.text }]}>
                    {route.name}
                  </Text>
                  
                  <View style={styles.routeDetailRow}>
                    <Icon name="access-time" size={16} color="#757575" style={styles.detailIcon} />
                    <Text style={[styles.routeDetailText, { color: theme.textSecondary }]}>
                      {formatTime(route.estimatedTime)}
                    </Text>
                    
                    <Icon name="straighten" size={16} color="#757575" style={styles.detailIcon} />
                    <Text style={[styles.routeDetailText, { color: theme.textSecondary }]}>
                      {formatDistance(route.distance)}
                    </Text>
                    
                    <View style={[styles.trafficIndicator, { backgroundColor: getTrafficColor(route.trafficLevel) }]} />
                    <Text style={[styles.routeDetailText, { color: theme.textSecondary }]}>
                      {getTrafficText(route.trafficLevel)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
      
      {/* 하단 버튼 */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.startButton, { backgroundColor: selectedRoute ? '#4285F4' : '#cccccc' }]}
          onPress={handleStartNavigation}
          disabled={!selectedRoute}
        >
          <Text style={styles.startButtonText}>
            네비게이션 시작
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  mapContainer: {
    height: '30%',
    width: '100%',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  optionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  optionsScroll: {
    flexDirection: 'row',
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    elevation: 1,
  },
  optionText: {
    fontSize: 14,
  },
  routesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#757575',
  },
  routesList: {
    flex: 1,
  },
  routeItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 2,
    elevation: 1,
  },
  routeItemContent: {
    flexDirection: 'column',
  },
  routeName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  routeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 4,
  },
  routeDetailText: {
    fontSize: 14,
    marginRight: 12,
  },
  trafficIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  bottomContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  startButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default MultiRouteScreen;