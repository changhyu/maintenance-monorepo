import React, { useMemo } from 'react';
import { View, StyleSheet, GestureResponderEvent } from 'react-native';
import { useNavigationStore } from '../stores/navigationStore';
import Svg, { Path, Circle, G, Polyline, Text as SvgText } from 'react-native-svg';
import { GeoPoint } from '../types';

type DxfMapViewerProps = {
  width: number;
  height: number;
  padding?: number;
  showWaypoints?: boolean;
  showRoutes?: boolean;
  interactive?: boolean;
  onPointSelected?: (point: GeoPoint) => void;
};

export const DxfMapViewer: React.FC<DxfMapViewerProps> = ({ 
  width, 
  height,
  padding = 10,
  showWaypoints = true,
  showRoutes = true,
  interactive = false,
  onPointSelected
}) => {
  const { nodes, roadSegments, navigationState, waypoints } = useNavigationStore();
  
  // 경계 계산 함수
  const calculateBounds = (points: GeoPoint[]): { 
    minLat: number, 
    maxLat: number, 
    minLng: number, 
    maxLng: number 
  } => {
    if (points.length === 0) {
      return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
    }
    
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
    
    return { minLat, maxLat, minLng, maxLng };
  };
  
  // 모든 좌표를 하나의 배열로 모음
  const allPoints = useMemo(() => {
    const points: GeoPoint[] = [];
    
    // 노드 좌표 추가
    nodes.forEach(node => {
      points.push(node.position);
    });
    
    // 도로 경로 좌표 추가
    roadSegments.forEach(segment => {
      segment.path.forEach(point => {
        points.push(point);
      });
    });
    
    return points;
  }, [nodes, roadSegments]);
  
  // 맵의 경계 계산
  const bounds = useMemo(() => calculateBounds(allPoints), [allPoints]);
  
  // 좌표를 SVG 뷰포트 좌표로 변환
  const transformPoint = (point: GeoPoint): { x: number, y: number } => {
    if (bounds.maxLng === bounds.minLng || bounds.maxLat === bounds.minLat) {
      return { x: padding, y: padding };
    }
    
    const svgWidth = width - 2 * padding;
    const svgHeight = height - 2 * padding;
    
    // 경도->x, 위도->y 변환 (위도는 위아래 반전)
    const x = padding + ((point.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * svgWidth;
    const y = height - padding - ((point.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * svgHeight;
    
    return { x, y };
  };

  // 도로 세그먼트 렌더링
  const roadSegmentPaths = useMemo(() => {
    return roadSegments.map(segment => {
      const points = segment.path.map(transformPoint);
      
      // SVG 패스 데이터 문자열 생성
      let pathData = '';
      if (points.length > 0) {
        pathData = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
          pathData += ` L ${points[i].x} ${points[i].y}`;
        }
      }
      
      // 기본 스타일 설정
      let color = '#AACCFF'; // 기본 도로 색상 - minor_road
      let strokeWidth = 1;
      
      // 도로 유형에 따른 스타일 설정
      switch (segment.roadType) {
        case 'highway':
          color = '#3388FF';
          strokeWidth = 3;
          break;
        case 'major_road':
          color = '#5599FF';
          strokeWidth = 2;
          break;
        // minor_road는 기본값 사용
      }
      
      // 현재 내비게이션 경로에 속하는지 확인
      const isOnRoute = navigationState.currentRoute?.roadSegmentIds.includes(segment.id);
      if (isOnRoute && showRoutes) {
        color = '#FF6600';
        strokeWidth = 4;
      }
      
      return (
        <Path
          key={segment.id}
          d={pathData}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
        />
      );
    });
  }, [roadSegments, navigationState.currentRoute, showRoutes, bounds]);

  // 주요 노드 렌더링 (교차로, 관심 지점 등)
  const nodeCircles = useMemo(() => {
    return nodes
      .filter(node => {
        // 중요한 노드만 보이게 (단순 노드 제외, 여러 연결점 있는 것만)
        return node.connections.length > 1;
      })
      .map(node => {
        const { x, y } = transformPoint(node.position);
        
        let color = '#888888';
        let size = 2;
        
        // 노드 유형에 따른 스타일
        switch (node.type) {
          case 'poi':
            color = '#FF6666';
            size = 4;
            break;
          case 'highway_entrance':
            color = '#33CC33';
            size = 4;
            break;
          case 'highway_exit':
            color = '#FF3333';
            size = 4;
            break;
          case 'intersection':
            if (node.connections.length > 2) {
              size = 3;
            }
            break;
          // default 케이스는 이미 기본값으로 설정되어 있음
        }
        
        return (
          <Circle 
            key={node.id} 
            cx={x} 
            cy={y} 
            r={size} 
            fill={color}
          />
        );
      });
  }, [nodes, bounds]);
  
  // 경유지 렌더링
  const waypointMarkers = useMemo(() => {
    if (!showWaypoints) {
      return null;
    }
    
    return waypoints.map((waypoint, index) => {
      const { x, y } = transformPoint(waypoint);
      
      // 좌표값을 활용하여 고유한 키 생성
      const uniqueId = `waypoint-${waypoint.latitude}-${waypoint.longitude}-${index}`;
      
      return (
        <G key={uniqueId}>
          <Circle 
            cx={x} 
            cy={y} 
            r={6} 
            fill="#FF9900" 
            strokeWidth={2} 
            stroke="#FFFFFF"
          />
          <SvgText
            x={x}
            y={y - 10}
            fill="#000000"
            fontSize={12}
            textAnchor="middle"
          >
            {index + 1}
          </SvgText>
        </G>
      );
    });
  }, [waypoints, showWaypoints, bounds]);
  
  // 현재 위치 마커 렌더링
  const currentPositionMarker = useMemo(() => {
    if (!navigationState.currentPosition) {
      return null;
    }
    
    const { x, y } = transformPoint(navigationState.currentPosition);
    
    return (
      <G>
        <Circle 
          cx={x} 
          cy={y} 
          r={8} 
          fill="#0066FF" 
          strokeWidth={3} 
          stroke="#FFFFFF"
        />
        <Circle 
          cx={x} 
          cy={y} 
          r={4} 
          fill="#FFFFFF"
        />
      </G>
    );
  }, [navigationState.currentPosition, bounds]);
  
  // 출발지/목적지 마커 렌더링
  const routeMarkers = useMemo(() => {
    if (!navigationState.currentRoute || !showRoutes) {
      return null;
    }
    
    const { origin, destination } = navigationState.currentRoute;
    const originPoint = transformPoint(origin);
    const destPoint = transformPoint(destination);
    
    return (
      <>
        {/* 출발지 마커 */}
        <G>
          <Circle 
            cx={originPoint.x} 
            cy={originPoint.y} 
            r={8} 
            fill="#00CC00" 
            strokeWidth={2} 
            stroke="#FFFFFF"
          />
          <SvgText
            x={originPoint.x}
            y={originPoint.y - 12}
            fill="#000000"
            fontSize={12}
            textAnchor="middle"
          >
            출발
          </SvgText>
        </G>
        
        {/* 목적지 마커 */}
        <G>
          <Circle 
            cx={destPoint.x} 
            cy={destPoint.y} 
            r={8} 
            fill="#FF0000" 
            strokeWidth={2} 
            stroke="#FFFFFF"
          />
          <SvgText
            x={destPoint.x}
            y={destPoint.y - 12}
            fill="#000000"
            fontSize={12}
            textAnchor="middle"
          >
            도착
          </SvgText>
        </G>
      </>
    );
  }, [navigationState.currentRoute, showRoutes, bounds]);
  
  // 경로 라인 렌더링
  const routePath = useMemo(() => {
    if (!navigationState.currentRoute || !showRoutes) {
      return null;
    }
    
    const { pathPoints } = navigationState.currentRoute;
    if (pathPoints.length < 2) {
      return null;
    }
    
    const points = pathPoints.map(transformPoint);
    let pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
    
    return (
      <Polyline
        points={pointsStr}
        stroke="#FF6600"
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }, [navigationState.currentRoute, showRoutes, bounds]);
  
  // 맵 클릭 이벤트 핸들러
  const handleMapClick = (event: GestureResponderEvent) => {
    if (!interactive || !onPointSelected) {
      return;
    }
    
    // Native 이벤트 처리
    const { locationX, locationY } = event.nativeEvent;
    
    // 상대 좌표를 지오 좌표로 변환
    const svgWidth = width - 2 * padding;
    const svgHeight = height - 2 * padding;
    
    const relX = locationX;
    const relY = locationY;
    
    const longitude = bounds.minLng + ((relX - padding) / svgWidth) * (bounds.maxLng - bounds.minLng);
    const latitude = bounds.minLat + ((height - padding - relY) / svgHeight) * (bounds.maxLat - bounds.minLat);
    
    onPointSelected({ latitude, longitude });
  };

  return (
    <View style={[styles.container, { width, height }]}>
      {nodes.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyBox}>
            <View style={styles.emptyContent}>
              <SvgText fontSize={14} textAnchor="middle" x={width/2} y={height/2 - 10}>
                지도 데이터가 로드되지 않았습니다.
              </SvgText>
              <SvgText fontSize={12} textAnchor="middle" x={width/2} y={height/2 + 10}>
                DXF 파일을 불러와주세요.
              </SvgText>
            </View>
          </View>
        </View>
      ) : (
        <Svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          onPress={handleMapClick}
        >
          {/* 배경 */}
          <G>
            <Path
              d={`M 0 0 H ${width} V ${height} H 0 Z`}
              fill="#F8F8F8"
            />
            
            {/* 도로 세그먼트 렌더링 */}
            {roadSegmentPaths}
            
            {/* 경로 라인 (도로 위에 덧그리기) */}
            {routePath}
            
            {/* 노드 (교차로/관심지점) 렌더링 */}
            {nodeCircles}
            
            {/* 경유지 마커 */}
            {waypointMarkers}
            
            {/* 출발지/목적지 마커 */}
            {routeMarkers}
            
            {/* 현재 위치 마커 */}
            {currentPositionMarker}
          </G>
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    padding: 20,
    backgroundColor: 'rgba(200, 200, 200, 0.2)',
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyContent: {
    alignItems: 'center',
  }
});