import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { GeoPoint, RouteStep } from '../types';
import { useNavigationStore } from '../stores/NavigationStore';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface RouteViewerProps {
  width: number;
  height: number;
  showSteps?: boolean;
}

export const RouteViewer: React.FC<RouteViewerProps> = ({ width, height, showSteps = true }) => {
  const { navigationState } = useNavigationStore();
  const [svgPath, setSvgPath] = useState<string>('');
  const [waypointCoordinates, setWaypointCoordinates] = useState<Array<{x: number, y: number}>>([]);
  const [stepMarkers, setStepMarkers] = useState<Array<{x: number, y: number, step: RouteStep}>>([]);

  // 현재 경로 추출
  const route = navigationState.currentRoute;
  
  // 좌표 변환 함수: 지리좌표 -> SVG 좌표
  const convertToSvgCoordinates = (points: GeoPoint[]) => {
    if (!points || points.length === 0) return { pathData: '', waypoints: [], stepPoints: [] };

    // 최소/최대 경도, 위도 찾기
    let minLat = Number.MAX_VALUE;
    let maxLat = Number.MIN_VALUE;
    let minLng = Number.MAX_VALUE;
    let maxLng = Number.MIN_VALUE;

    points.forEach(point => {
      minLat = Math.min(minLat, point.latitude);
      maxLat = Math.max(maxLat, point.latitude);
      minLng = Math.min(minLng, point.longitude);
      maxLng = Math.max(maxLng, point.longitude);
    });

    // 여백 추가 (10%)
    const padding = 0.1;
    const latRange = (maxLat - minLat) || 0.01; // 0 예방
    const lngRange = (maxLng - minLng) || 0.01; // 0 예방
    
    minLat -= latRange * padding;
    maxLat += latRange * padding;
    minLng -= lngRange * padding;
    maxLng += lngRange * padding;

    // SVG 패스 생성
    let pathData = '';
    const waypoints: Array<{x: number, y: number}> = [];
    const stepPoints: Array<{x: number, y: number, step: RouteStep}> = [];

    points.forEach((point, index) => {
      // 위도, 경도를 SVG 좌표로 변환
      const x = ((point.longitude - minLng) / (maxLng - minLng)) * width;
      const y = height - ((point.latitude - minLat) / (maxLat - minLat)) * height;
      
      // 첫 점이면 M(이동), 이후에는 L(라인)
      if (index === 0) {
        pathData += `M ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
      }
      
      // 첫 점과 마지막 점은 웨이포인트로 처리
      if (index === 0 || index === points.length - 1) {
        waypoints.push({ x, y });
      }
    });

    // 경로 단계별 마커 위치 계산
    if (route?.steps?.length) {
      route.steps.forEach(step => {
        // 각 단계의 시작점을 마커로 표시
        const point = step.startPoint;
        const x = ((point.longitude - minLng) / (maxLng - minLng)) * width;
        const y = height - ((point.latitude - minLat) / (maxLat - minLat)) * height;
        
        stepPoints.push({ x, y, step });
      });
    }

    return { pathData, waypoints, stepPoints };
  };

  useEffect(() => {
    if (route?.pathPoints?.length) {
      const { pathData, waypoints, stepPoints } = convertToSvgCoordinates(route.pathPoints);
      setSvgPath(pathData);
      setWaypointCoordinates(waypoints);
      setStepMarkers(stepPoints);
    }
  }, [route]);

  // 경로가 없는 경우 처리
  if (!route || !route.pathPoints?.length) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.noRouteText}>표시할 경로가 없습니다.</Text>
      </View>
    );
  }

  const getManeuverIcon = (maneuver: string): string => {
    switch (maneuver) {
      case 'turn-left':
        return 'turn-left';
      case 'turn-right':
        return 'turn-right';
      case 'slight-left':
        return 'turn-slight-left';
      case 'slight-right':
        return 'turn-slight-right';
      case 'u-turn':
        return 'u-turn';
      case 'merge':
        return 'merge';
      case 'exit':
        return 'exit-to-app';
      case 'depart':
        return 'trip-origin';
      case 'arrive':
        return 'place';
      default:
        return 'arrow-upward';
    }
  };

  // 단계별 거리와 시간을 포맷팅하는 함수
  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters.toFixed(0)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds.toFixed(0)}초`;
    }
    if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}분`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}시간 ${minutes}분`;
  };

  return (
    <View style={[styles.container, { width }]}>
      <View style={styles.mapView}>
        <Svg width={width} height={height} style={styles.svg}>
          <Path
            d={svgPath}
            stroke="#3498db"
            strokeWidth="5"
            fill="transparent"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* 시작점과 끝점 */}
          {waypointCoordinates.map((point, index) => (
            <Circle
              key={`waypoint-${index}`}
              cx={point.x}
              cy={point.y}
              r={10}
              fill={index === 0 ? "#27ae60" : "#e74c3c"}
            />
          ))}
          
          {/* 경로 단계 마커 */}
          {stepMarkers.map((marker, index) => (
            index !== 0 && index !== stepMarkers.length - 1 ? (
              <Circle
                key={`step-${index}`}
                cx={marker.x}
                cy={marker.y}
                r={4}
                fill="#f39c12"
              />
            ) : null
          ))}
        </Svg>
      </View>

      {showSteps && (
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>경로 안내</Text>
          <View style={styles.routeSummary}>
            <Text style={styles.summaryText}>총 거리: {formatDistance(route.totalDistance)}</Text>
            <Text style={styles.summaryText}>총 소요시간: {formatDuration(route.totalDuration)}</Text>
          </View>
          <ScrollView style={styles.stepsList}>
            {route.steps.map((step, index) => {
              // 단계에 따른 적절한 아이콘 선택
              let iconName = getManeuverIcon(step.maneuver);
              
              // 마지막 단계면 도착 아이콘으로 변경
              if (index === route.steps.length - 1) {
                iconName = 'place';
              }
              
              return (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepIconContainer}>
                    <Icon name={iconName} size={24} color="#3498db" />
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={styles.instruction}>{step.instruction}</Text>
                    <Text style={styles.stepDetails}>
                      {formatDistance(step.distance)} · {formatDuration(step.duration)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 10,
  },
  mapView: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#ecf0f1',
  },
  svg: {
    backgroundColor: '#f0f0f0',
  },
  noRouteText: {
    textAlign: 'center',
    padding: 20,
    color: '#7f8c8d',
    fontSize: 16,
  },
  stepsContainer: {
    padding: 15,
    backgroundColor: 'white',
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  routeSummary: {
    backgroundColor: '#ecf0f1',
    padding: 12,
    borderRadius: 6,
    marginBottom: 15,
  },
  summaryText: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 4,
  },
  stepsList: {
    maxHeight: 300,
  },
  stepItem: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  stepIconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  instruction: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
  },
  stepDetails: {
    fontSize: 12,
    color: '#7f8c8d',
  },
});