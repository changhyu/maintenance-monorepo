// filepath: /Users/gongchanghyeon/Desktop/maintenance-monorepo/packages/navigation-app/src/services/route/RouteService.ts
import { GeoPoint } from '../../types';
import { Route, RoadSegment, RoutePriority } from './types';
import { v4 as uuidv4 } from 'uuid';

class RouteService {
  // 두 지점 사이의 직선 거리 계산
  getDirectDistanceBetween(point1: GeoPoint, point2: GeoPoint): number {
    const R = 6371e3; // 지구 반경 (미터)
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // 세그먼트 목록으로부터 전체 경로 좌표 계산
  calculatePathFromSegments(segments: RoadSegment[]): GeoPoint[] {
    if (!segments || segments.length === 0) {
      return [];
    }

    const path: GeoPoint[] = [];
    
    // 첫 번째 세그먼트의 모든 좌표 추가
    path.push(...segments[0].path);
    
    // 나머지 세그먼트의 첫 번째 좌표는 중복이므로 생략하고 나머지 좌표만 추가
    for (let i = 1; i < segments.length; i++) {
      path.push(...segments[i].path.slice(1));
    }
    
    return path;
  }

  // 경로 생성 (기본 구현)
  createRoute(
    pathPoints: GeoPoint[], 
    segments: RoadSegment[], 
    nodes: string[]
  ): Route {
    // 전체 거리와 예상 시간 계산
    const distance = segments.reduce((sum, segment) => sum + segment.length, 0);
    const estimatedTime = segments.reduce((sum, segment) => sum + segment.estimatedTime, 0);
    
    return {
      id: uuidv4(),
      path: pathPoints,
      segments,
      nodes,
      distance,
      estimatedTime
    };
  }
}

export default new RouteService();