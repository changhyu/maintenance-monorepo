import { GeoPoint, Route, RouteCalculationOptions } from '../../types';
import { calculateRoute } from '../NavigationService';

/**
 * 다중 경유지 경로 계산을 위한 서비스 클래스
 */
export class MultiRouteService {
  /**
   * 다중 경유지를 포함한 경로 계산
   * @param origin 출발지
   * @param waypoints 경유지 목록
   * @param destination 목적지
   * @param options 경로 계산 옵션
   * @returns 계산된 경로 목록
   */
  public async calculateMultiWaypointRoute(
    origin: GeoPoint,
    waypoints: GeoPoint[],
    destination: GeoPoint,
    options: RouteCalculationOptions = {}
  ): Promise<Route[]> {
    const routes: Route[] = [];
    
    // 경유지가 없으면 직접 목적지로 가는 경로만 계산
    if (waypoints.length === 0) {
      const route = await calculateRoute(origin, destination, options);
      return [route];
    }
    
    try {
      // 출발지에서 첫 번째 경유지까지 경로 계산
      let previousPoint = origin;
      
      // 모든 경유지에 대해 경로 계산
      for (const waypoint of waypoints) {
        const route = await calculateRoute(previousPoint, waypoint, options);
        routes.push(route);
        previousPoint = waypoint;
      }
      
      // 마지막 경유지에서 목적지까지 경로 계산
      const finalRoute = await calculateRoute(previousPoint, destination, options);
      routes.push(finalRoute);
      
      return routes;
    } catch (error) {
      console.error('다중 경유지 경로 계산 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 여러 경로를 하나의 경로로 병합
   * @param routes 병합할 경로 목록
   * @returns 병합된 하나의 경로
   */
  public mergeRoutes(routes: Route[]): Route | undefined {
    if (!routes || routes.length === 0) {
      return undefined;
    }
    
    if (routes.length === 1) {
      return routes[0];
    }
    
    // 첫 번째 경로를 기준으로 병합
    const firstRoute = routes[0];
    const lastRoute = routes[routes.length - 1];
    
    // 모든 경로의 중간 정보 합치기
    let totalDistance = 0;
    let totalDuration = 0;
    const allPathPoints: GeoPoint[] = [];
    const allSteps: any[] = [];
    const allRoadSegmentIds: string[] = [];
    
    for (const route of routes) {
      totalDistance += route.totalDistance;
      totalDuration += route.totalDuration;
      
      // 마지막 좌표는 다음 경로의 첫 좌표와 중복되므로 제외
      if (allPathPoints.length === 0) {
        allPathPoints.push(...route.pathPoints);
      } else {
        allPathPoints.push(...route.pathPoints.slice(1));
      }
      
      allSteps.push(...route.steps);
      allRoadSegmentIds.push(...route.roadSegmentIds);
    }
    
    // 병합된 경로 생성
    const mergedRoute: Route = {
      id: `merged-${firstRoute.id}-to-${lastRoute.id}`,
      origin: firstRoute.origin,
      destination: lastRoute.destination,
      pathPoints: allPathPoints,
      steps: allSteps,
      totalDistance,
      totalDuration,
      roadSegmentIds: allRoadSegmentIds,
    };
    
    return mergedRoute;
  }
  
  /**
   * 경유지 순서 최적화 (가장 효율적인 순서로 재배열)
   * @param origin 출발지
   * @param waypoints 경유지 목록
   * @param destination 목적지
   * @returns 최적화된 경유지 순서
   */
  public optimizeWaypoints(
    origin: GeoPoint,
    waypoints: GeoPoint[],
    destination: GeoPoint
  ): GeoPoint[] {
    if (waypoints.length <= 1) {
      return [...waypoints];
    }
    
    // 실제 프로젝트에서는 TSP(Traveling Salesman Problem) 알고리즘을 구현해야 함
    // 여기서는 간단한 가장 가까운 이웃(Nearest Neighbor) 알고리즘 사용
    
    const optimizedWaypoints: GeoPoint[] = [];
    const remainingWaypoints = [...waypoints];
    
    let currentPoint = origin;
    
    while (remainingWaypoints.length > 0) {
      // 현재 위치에서 가장 가까운 경유지 찾기
      let closestIndex = 0;
      let minDistance = this.calculateDistance(
        currentPoint.latitude,
        currentPoint.longitude,
        remainingWaypoints[0].latitude,
        remainingWaypoints[0].longitude
      );
      
      for (let i = 1; i < remainingWaypoints.length; i++) {
        const distance = this.calculateDistance(
          currentPoint.latitude,
          currentPoint.longitude,
          remainingWaypoints[i].latitude,
          remainingWaypoints[i].longitude
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }
      
      // 가장 가까운 경유지를 다음 방문지로 선택
      const nextWaypoint = remainingWaypoints.splice(closestIndex, 1)[0];
      optimizedWaypoints.push(nextWaypoint);
      currentPoint = nextWaypoint;
    }
    
    return optimizedWaypoints;
  }
  
  /**
   * 두 지점 간의 거리 계산 (Haversine 공식)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // 지구 반경 (km)
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // 거리 (km)
    return distance;
  }
  
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}