import { Route, RouteStep } from '../types';
import { AlternativeRoute, RoutePriority, RoadSegment } from '../services/route/types';

/**
 * AlternativeRoute 타입을 표준 Route 타입으로 변환
 */
export const convertToStandardRoute = (alternativeRoute: AlternativeRoute): Route => {
  // 시작점과 종료점 추출
  let origin = { latitude: 0, longitude: 0 };
  if (alternativeRoute.path && alternativeRoute.path.length > 0) {
    origin = alternativeRoute.path[0];
  }
  
  let destination = { latitude: 0, longitude: 0 };
  if (alternativeRoute.path && alternativeRoute.path.length > 0) {
    destination = alternativeRoute.path[alternativeRoute.path.length - 1];
  }

  // 세그먼트에서 roadSegmentIds 추출
  const roadSegmentIds = alternativeRoute.segments.map(segment => segment.id);
  
  // 기본 경로 단계 생성
  const steps: RouteStep[] = alternativeRoute.segments.map((segment, index) => {
    // 세그먼트 시작/끝 지점
    const startPoint = segment.path[0];
    const endPoint = segment.path[segment.path.length - 1];
    
    // 기본 도로명은 세그먼트 ID를 사용
    const roadName = `도로 ${segment.id}`;
    
    // 진행 상태에 따른 안내 메시지와 조작 결정
    let instruction: string;
    let maneuver: 'straight' | 'turn-left' | 'turn-right' | 'slight-left' | 'slight-right' | 'u-turn' | 'merge' | 'exit' | 'depart' | 'arrive';
    
    if (index === 0) {
      instruction = '출발';
      maneuver = 'depart';
    } else if (index === alternativeRoute.segments.length - 1) {
      instruction = `${roadName}에 도착`;
      maneuver = 'arrive';
    } else {
      instruction = `${roadName}로 진행`;
      maneuver = 'straight';
    }
    
    return {
      instruction,
      distance: segment.length,
      duration: (alternativeRoute.estimatedTime / alternativeRoute.segments.length),
      maneuver,
      roadName,
      startPoint,
      endPoint,
      roadSegmentIds: [segment.id]
    };
  });

  return {
    id: alternativeRoute.id,
    name: alternativeRoute.name,
    origin,
    destination,
    totalDistance: alternativeRoute.distance,
    totalDuration: alternativeRoute.estimatedTime,
    steps,
    pathPoints: alternativeRoute.path ?? [],
    roadSegmentIds
  };
};

/**
 * 표준 Route 타입에서 AlternativeRoute 타입으로 변환 (간단 구현)
 */
export const convertToAlternativeRoute = (route: Route, segments: RoadSegment[]): AlternativeRoute => {
  return {
    id: route.id,
    name: route.name ?? '생성된 경로',
    path: route.pathPoints,
    segments: segments,
    nodes: route.roadSegmentIds.map((_, index) => `node_${index}`), // 임시 노드 ID 배열
    distance: route.totalDistance,
    estimatedTime: route.totalDuration,
    trafficLevel: 0,
    priority: RoutePriority.BALANCED // 기본 우선순위로 BALANCED 설정
  };
};