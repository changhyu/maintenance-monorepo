import { GeoPoint, Route, RouteCalculationOptions } from '../types';
import { calculateDistance, calculateRoute } from './NavigationService';

/**
 * 경로 이탈 여부를 확인하고 필요한 경우 경로를 재계산하는 서비스
 */
export class RouteRecalculationService {
  // 경로 이탈 임계값 (미터)
  private deviationThreshold: number = 30;
  
  // 마지막 재계산 시간 (연속 재계산 방지)
  private lastRecalculationTime: number = 0;
  
  // 최소 재계산 간격 (밀리초)
  private minRecalculationInterval: number = 10000; // 10초
  
  /**
   * 현재 위치가 현재 경로에서 벗어났는지 확인하고 필요시 경로를 재계산
   * 
   * @param currentPosition 현재 사용자의 위치
   * @param currentRoute 현재 활성화된 경로
   * @param originalOptions 원래 경로 계산에 사용된 옵션
   * @returns 재계산된 경로 또는 null (재계산이 필요 없는 경우)
   */
  public async checkRouteDeviation(
    currentPosition: GeoPoint,
    currentRoute: Route,
    originalOptions: RouteCalculationOptions = {}
  ): Promise<Route | null> {
    // 경로가 없는 경우 처리 불가
    if (!currentRoute || !currentRoute.pathPoints || currentRoute.pathPoints.length === 0) {
      return null;
    }
    
    // 현재 시간 확인 (연속 재계산 방지)
    const now = Date.now();
    if (now - this.lastRecalculationTime < this.minRecalculationInterval) {
      return null;
    }
    
    // 현재 위치와 경로 사이의 최소 거리 계산
    const deviation = this.calculateMinimumDeviation(currentPosition, currentRoute.pathPoints);
    
    // 경로 이탈 여부 확인
    if (deviation > this.deviationThreshold) {
      console.log(`경로 이탈 감지: ${deviation.toFixed(2)}m 벗어남`);
      
      // 마지막 재계산 시간 업데이트
      this.lastRecalculationTime = now;
      
      try {
        // 현재 위치에서 원래 목적지까지 새 경로 계산
        const newRoute = await calculateRoute(
          currentPosition,
          currentRoute.destination,
          originalOptions
        );
        
        return newRoute;
      } catch (error) {
        console.error('경로 재계산 오류:', error);
        return null;
      }
    }
    
    // 이탈하지 않았으면 null 반환
    return null;
  }
  
  /**
   * 현재 위치와 경로 사이의 최소 거리 계산
   * 
   * @param position 현재 위치
   * @param routePoints 경로 포인트 배열
   * @returns 최소 거리 (미터 단위)
   */
  private calculateMinimumDeviation(position: GeoPoint, routePoints: GeoPoint[]): number {
    let minDistance = Number.MAX_VALUE;
    
    // 각 경로 세그먼트에 대해 현재 위치까지의 거리 계산
    for (let i = 0; i < routePoints.length - 1; i++) {
      const segmentStart = routePoints[i];
      const segmentEnd = routePoints[i + 1];
      
      // 현재 위치에서 세그먼트까지의 수직 거리 계산
      const distance = this.pointToLineDistance(position, segmentStart, segmentEnd);
      
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
    
    return minDistance;
  }
  
  /**
   * 점에서 선까지의 수직 거리 계산
   * 
   * @param point 점 좌표
   * @param lineStart 선의 시작점
   * @param lineEnd 선의 끝점
   * @returns 수직 거리 (미터 단위)
   */
  private pointToLineDistance(
    point: GeoPoint,
    lineStart: GeoPoint,
    lineEnd: GeoPoint
  ): number {
    // 선의 길이가 0이면 점과 선의 시작점 사이의 거리 반환
    if (lineStart.latitude === lineEnd.latitude && lineStart.longitude === lineEnd.longitude) {
      return calculateDistance(point, lineStart);
    }
    
    // 선 벡터의 크기 계산
    const lineLength = calculateDistance(lineStart, lineEnd);
    
    // 점이 선의 시작점이나 끝점에 있는지 확인
    if (lineLength === 0) {
      return calculateDistance(point, lineStart);
    }
    
    // 선 벡터에서 점에 내린 수선의 발이 선분 외부에 있는지 확인
    const t = ((point.longitude - lineStart.longitude) * (lineEnd.longitude - lineStart.longitude) +
             (point.latitude - lineStart.latitude) * (lineEnd.latitude - lineStart.latitude)) /
             (lineLength * lineLength);
    
    if (t < 0) {
      // 점과 선의 시작점 사이의 거리
      return calculateDistance(point, lineStart);
    }
    
    if (t > 1) {
      // 점과 선의 끝점 사이의 거리
      return calculateDistance(point, lineEnd);
    }
    
    // 수선의 발 좌표 계산
    const projection: GeoPoint = {
      longitude: lineStart.longitude + t * (lineEnd.longitude - lineStart.longitude),
      latitude: lineStart.latitude + t * (lineEnd.latitude - lineStart.latitude)
    };
    
    // 점과 수선의 발 사이의 거리
    return calculateDistance(point, projection);
  }
  
  /**
   * 경로 이탈 임계값 변경
   * 
   * @param threshold 새 임계값 (미터)
   */
  public setDeviationThreshold(threshold: number): void {
    if (threshold > 0) {
      this.deviationThreshold = threshold;
    }
  }
  
  /**
   * 최소 재계산 간격 변경
   * 
   * @param interval 새 간격 (밀리초)
   */
  public setRecalculationInterval(interval: number): void {
    if (interval > 0) {
      this.minRecalculationInterval = interval;
    }
  }
}