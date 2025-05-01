import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, useWindowDimensions, TouchableOpacity } from 'react-native';
import { ShpMapLoader } from '../components/ShpMapLoader';
import { DxfMapViewer } from '../components/DxfMapViewer'; // 지도 뷰어는 재사용
import { RouteViewer } from '../components/RouteViewer';
import { useNavigationStore } from '../stores/navigationStore';
import { calculatePathBetweenPoints } from '../utils/routeCalculator';
import { GeoPoint } from '../types';

export const ShpMapScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const { 
    nodes, 
    roadSegments, 
    startNavigation, 
    stopNavigation, 
    navigationState,
    setCurrentRoute
  } = useNavigationStore();
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState<{
    start?: GeoPoint;
    end?: GeoPoint;
  }>({});
  const [showRouteView, setShowRouteView] = useState(false);
  
  const handleMapLoaded = useCallback(() => {
    setIsMapLoaded(true);
  }, []);
  
  // 화면 너비에 맞춰 정사각형 맵 뷰어 생성
  const mapSize = width - 32; // 양쪽 패딩 16px씩 제외
  
  // 임의의 시작점과 종료점 선택 (시연용)
  const selectRandomPoints = useCallback(() => {
    if (nodes.length < 2) {
      alert('지도에 노드가 부족합니다. SHP 파일을 먼저 로드해주세요.');
      return;
    }
    
    // 시작점과 종료점으로 사용할 노드 인덱스
    const startIndex = Math.floor(Math.random() * nodes.length);
    let endIndex;
    do {
      endIndex = Math.floor(Math.random() * nodes.length);
    } while (endIndex === startIndex);
    
    setSelectedPoints({
      start: nodes[startIndex].position,
      end: nodes[endIndex].position
    });
  }, [nodes]);
  
  // 경로 계산 전용 함수 (기존 calculateRoute 함수가 다른 역할을 할 경우를 위해)
  const handleCalculateCustomRoute = useCallback(async () => {
    if (!selectedPoints.start || !selectedPoints.end) {
      alert('출발지와 목적지를 먼저 선택해주세요.');
      return;
    }
    
    try {
      // 우리가 구현한 경로 계산 알고리즘 사용
      const route = calculatePathBetweenPoints(
        selectedPoints.start,
        selectedPoints.end,
        new Map(nodes.map(node => [node.id, node])),
        new Map(roadSegments.map(segment => [segment.id, segment])),
        {
          preferFasterRoute: true,
          avoidHighways: false,
        }
      );
      
      if (route) {
        // NavigationStore에 경로 설정 (스토어의 액션 사용)
        setCurrentRoute(route);
        setShowRouteView(true);
      } else {
        alert('경로를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('경로 계산 중 오류 발생:', error);
      alert('경로 계산에 실패했습니다.');
    }
  }, [selectedPoints, nodes, roadSegments, setCurrentRoute]);
  
  // 내비게이션 시작
  const handleStartNavigation = useCallback(() => {
    if (!navigationState.currentRoute) {
      alert('경로를 먼저 계산해주세요.');
      return;
    }
    
    startNavigation();
  }, [navigationState.currentRoute, startNavigation]);
  
  // 내비게이션 중지
  const handleStopNavigation = useCallback(() => {
    stopNavigation();
  }, [stopNavigation]);
  
  // 경로 초기화
  const handleClearRoute = useCallback(() => {
    setCurrentRoute(undefined);
    setSelectedPoints({});
    setShowRouteView(false);
  }, [setCurrentRoute]);
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>SHP 지도 뷰어</Text>
        
        <View style={styles.loaderSection}>
          <ShpMapLoader onMapLoaded={handleMapLoaded} />
        </View>
        
        {(isMapLoaded || nodes.length > 0) && (
          <>
            <View style={styles.mapSection}>
              <Text style={styles.sectionTitle}>지도 미리보기</Text>
              <DxfMapViewer width={mapSize} height={mapSize} />
            </View>
            
            <View style={styles.routeSection}>
              <Text style={styles.sectionTitle}>경로 계산</Text>
              <View style={styles.routeControls}>
                <TouchableOpacity 
                  style={styles.routeButton}
                  onPress={selectRandomPoints}
                >
                  <Text style={styles.routeButtonText}>출발/도착 무작위 선택</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.routeButton}
                  onPress={handleCalculateCustomRoute}
                  disabled={!selectedPoints.start || !selectedPoints.end}
                >
                  <Text style={styles.routeButtonText}>경로 계산</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.routeButton}
                  onPress={handleClearRoute}
                  disabled={!navigationState.currentRoute}
                >
                  <Text style={styles.routeButtonText}>경로 초기화</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.navigationControls}>
                <TouchableOpacity 
                  style={[styles.navButton, styles.startButton]}
                  onPress={handleStartNavigation}
                  disabled={!navigationState.currentRoute || navigationState.navigationMode === 'navigating'}
                >
                  <Text style={styles.navButtonText}>내비게이션 시작</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.navButton, styles.stopButton]}
                  onPress={handleStopNavigation}
                  disabled={navigationState.navigationMode !== 'navigating'}
                >
                  <Text style={styles.navButtonText}>내비게이션 중지</Text>
                </TouchableOpacity>
              </View>
              
              {selectedPoints.start && selectedPoints.end && (
                <View style={styles.pointsInfo}>
                  <Text style={styles.pointText}>
                    출발: {selectedPoints.start.latitude.toFixed(6)}, {selectedPoints.start.longitude.toFixed(6)}
                  </Text>
                  <Text style={styles.pointText}>
                    도착: {selectedPoints.end.latitude.toFixed(6)}, {selectedPoints.end.longitude.toFixed(6)}
                  </Text>
                </View>
              )}
            </View>
            
            {showRouteView && navigationState.currentRoute && (
              <View style={styles.routeViewSection}>
                <Text style={styles.sectionTitle}>경로 정보</Text>
                <RouteViewer width={mapSize} height={mapSize} showSteps={true} />
              </View>
            )}
          </>
        )}
        
        {nodes.length > 0 && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>지도 정보</Text>
            <View style={styles.statsCard}>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>노드 수:</Text>
                <Text style={styles.statsValue}>{nodes.length}개</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>도로 세그먼트 수:</Text>
                <Text style={styles.statsValue}>{roadSegments.length}개</Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>노드 유형별 개수:</Text>
              </View>
              {countNodeTypes(nodes).map(({ type, count }) => (
                <View key={type} style={styles.statsSubRow}>
                  <Text style={styles.statsSubLabel}>{formatNodeType(type)}:</Text>
                  <Text style={styles.statsValue}>{count}개</Text>
                </View>
              ))}
              
              <View style={styles.divider} />
              
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>도로 유형별 개수:</Text>
              </View>
              {countRoadTypes(roadSegments).map(({ type, count }) => (
                <View key={type} style={styles.statsSubRow}>
                  <Text style={styles.statsSubLabel}>{formatRoadType(type)}:</Text>
                  <Text style={styles.statsValue}>{count}개</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// 노드 유형별 개수 계산
const countNodeTypes = (nodes: any[]) => {
  const counts: Record<string, number> = {};
  
  nodes.forEach(node => {
    const type = node.type ?? 'unknown';
    counts[type] = (counts[type] ?? 0) + 1;
  });
  
  return Object.entries(counts).map(([type, count]) => ({ type, count }));
};

// 도로 유형별 개수 계산
const countRoadTypes = (roadSegments: any[]) => {
  const counts: Record<string, number> = {};
  
  roadSegments.forEach(segment => {
    const type = segment.type ?? 'unknown';
    counts[type] = (counts[type] ?? 0) + 1;
  });
  
  return Object.entries(counts).map(([type, count]) => ({ type, count }));
};

// 노드 유형 포맷팅
const formatNodeType = (type: string): string => {
  switch (type) {
    case 'intersection':
      return '교차로';
    case 'terminal':
      return '종점';
    case 'poi':
      return '관심지점';
    case 'unknown':
      return '미분류';
    default:
      return type;
  }
};

// 도로 유형 포맷팅
const formatRoadType = (type: string): string => {
  switch (type) {
    case 'highway':
      return '고속도로';
    case 'major_road':
      return '주요 도로';
    case 'minor_road':
      return '보조 도로';
    case 'local_road':
      return '지역 도로';
    case 'normal':
      return '일반 도로';
    case 'unknown':
      return '미분류';
    default:
      return type;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  loaderSection: {
    marginBottom: 24,
  },
  mapSection: {
    marginBottom: 24,
  },
  routeSection: {
    marginBottom: 24,
  },
  routeViewSection: {
    marginBottom: 24,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#444',
  },
  routeControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  routeButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  routeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  navigationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  startButton: {
    backgroundColor: '#27ae60',
  },
  stopButton: {
    backgroundColor: '#e74c3c',
  },
  navButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pointsInfo: {
    backgroundColor: '#eee',
    padding: 12,
    borderRadius: 8,
  },
  pointText: {
    fontSize: 14,
    marginBottom: 4,
  },
  statsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statsSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingLeft: 16,
  },
  statsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statsSubLabel: {
    fontSize: 14,
    color: '#555',
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
});