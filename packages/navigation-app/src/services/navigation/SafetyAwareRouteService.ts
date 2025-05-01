import { GeoPoint, Node, RoadSegment } from '../../types';
import { alternativeRouteService } from './AlternativeRouteService';
import { safetyTrafficIntegration } from '../traffic/SafetyTrafficIntegration';
import { safetyDataService } from '../traffic/SafetyDataService';
import { mapData } from '../../data/mapData';
import { calculateDistance } from '../NavigationService';
import { getLogger } from '../../utils/logger';
import { 
  RouteError,
  ErrorCode,
  SafetyDataError,
  createRouteCalculationError
} from '../../utils/errors';
import { handleError, safeAsyncCall, safeCall } from '../../utils/errorHandlers';

// SafetyAwareRouteService 전용 로거 생성
const logger = getLogger('SafetyAwareRouteService');

/**
 * 안전 데이터를 고려한 경로 서비스
 * 경찰청 교통안전데이터를 활용하여 보다 안전한 경로 제공
 */
export class SafetyAwareRouteService {
  private initialized: boolean = false;

  /**
   * 서비스 초기화
   * @param apiKey 경찰청 교통안전정보 API 키
   */
  async initialize(apiKey?: string): Promise<boolean> {
    if (this.initialized) {
      logger.info('이미 초기화되어 있습니다');
      return true;
    }
    
    try {
      // 안전-교통 통합 서비스 초기화
      logger.info('통합 서비스 초기화 시작');
      const result = await safetyTrafficIntegration.initialize(apiKey);
      if (result) {
        this.initialized = true;
        logger.info('SafetyAwareRouteService 초기화 완료');
        return true;
      }
      
      logger.error('SafetyAwareRouteService 초기화 실패');
      throw new RouteError(
        '안전 경로 서비스 초기화 실패', 
        { 
          code: ErrorCode.ROUTE_CALCULATION_FAILED,
          isUserFacing: true
        }
      );
    } catch (error) {
      logger.error('SafetyAwareRouteService 초기화 중 오류 발생', error);
      
      if (error instanceof SafetyDataError || error instanceof RouteError) {
        throw error;
      }
      
      throw new RouteError(
        '안전 경로 서비스 초기화 중 오류 발생', 
        {
          code: ErrorCode.ROUTE_CALCULATION_FAILED,
          cause: error instanceof Error ? error : undefined,
          isUserFacing: true
        }
      );
    }
  }
  
  /**
   * 경로 계산 시 안전 점수 반영
   * @param routes 계산된 경로 목록
   */
  rankRoutesBySafety(routes: any[]): any[] {
    if (!this.initialized) {
      logger.warn('서비스가 초기화되지 않았습니다. initialize() 메서드를 먼저 호출하세요.');
      return routes;
    }
    
    if (!Array.isArray(routes) || routes.length === 0) {
      logger.warn('유효한 경로가 제공되지 않았습니다');
      return routes;
    }
    
    if (routes.length <= 1) {
      logger.debug('경로가 하나만 있어 안전 점수 계산 불필요');
      return routes;
    }
    
    try {
      logger.debug(`${routes.length}개 경로의 안전 점수 계산 시작`);
      
      // 각 경로에 안전 점수 계산 및 추가
      const routesWithSafety = routes.map(route => {
        try {
          const points = this.extractRoutePoints(route);
          const safetyInfo = safetyTrafficIntegration.calculateRouteSafetyScore(points);
          
          logger.debug(`경로 안전 점수: ${safetyInfo.score}, 영향 요소: ${safetyInfo.factors.length}개`);
          
          return {
            ...route,
            safetyScore: safetyInfo.score,
            safetyFactors: safetyInfo.factors
          };
        } catch (error) {
          // 개별 경로 처리 중 오류가 발생해도 중단하지 않고 기본 점수로 계속 진행
          handleError(error, '경로 안전 점수 계산 오류', false);
          return {
            ...route,
            safetyScore: 50, // 기본 점수
            safetyFactors: []
          };
        }
      });
      
      // 안전 점수에 따라 정렬 (높은 점수가 앞으로)
      const sortedRoutes = routesWithSafety.sort((a, b) => b.safetyScore - a.safetyScore);
      
      logger.info(`경로 안전 점수 계산 완료. 최고 점수: ${sortedRoutes[0]?.safetyScore || 0}`);
      return sortedRoutes;
    } catch (error) {
      logger.error('경로 안전 점수 계산 중 오류 발생', error);
      // 오류가 발생해도 원본 경로는 반환
      return routes;
    }
  }
  
  /**
   * 경로로부터 포인트 목록 추출
   */
  private extractRoutePoints(route: any): GeoPoint[] {
    if (!route) {
      throw new RouteError(
        '경로 객체가 null 또는 undefined입니다',
        { code: ErrorCode.INVALID_DATA }
      );
    }
    
    // 실제 구현은 애플리케이션의 경로 객체 구조에 따라 달라질 수 있음
    if (route.segments && Array.isArray(route.segments)) {
      // 모든 세그먼트의 모든 경로 포인트 수집
      const points = route.segments.flatMap((segment: any) => 
        segment.path || []
      );
      
      if (points.length === 0) {
        logger.warn('경로에서 포인트를 추출할 수 없습니다: 세그먼트는 있지만 경로 포인트가 없음');
      }
      
      return points;
    }
    
    if (route.path && Array.isArray(route.path)) {
      return route.path;
    }
    
    logger.warn('경로에서 포인트를 추출할 수 없습니다. 지원되지 않는 구조입니다.');
    throw new RouteError(
      '지원되지 않는 경로 구조', 
      {
        code: ErrorCode.INVALID_DATA,
        meta: { routeType: typeof route }
      }
    );
  }
  
  /**
   * 사고다발지역을 회피하는 대체 경로 계산
   * @param start 출발지 좌표
   * @param end 목적지 좌표
   * @param options 경로 옵션
   */
  async findSafeAlternativeRoute(
    start: GeoPoint, 
    end: GeoPoint, 
    options?: any
  ): Promise<any> {
    if (!start || !end || 
        typeof start.latitude !== 'number' || 
        typeof start.longitude !== 'number' ||
        typeof end.latitude !== 'number' ||
        typeof end.longitude !== 'number') {
      throw new RouteError(
        '유효하지 않은 출발지 또는 목적지 좌표', 
        {
          code: ErrorCode.INVALID_LOCATION,
          isUserFacing: true,
          meta: { start, end }
        }
      );
    }
    
    if (!this.initialized) {
      logger.info('서비스가 초기화되지 않았습니다. 초기화 시작...');
      try {
        await this.initialize();
      } catch (error) {
        // 초기화 실패해도 기본 경로는 계산 시도
        logger.warn('초기화에 실패했지만 기본 경로 계산은 계속 진행합니다', error);
      }
    }
    
    logger.info(`안전 경로 탐색 시작. 출발: (${start.latitude}, ${start.longitude}), 도착: (${end.latitude}, ${end.longitude})`);
    
    try {
      // 먼저 기존 방식으로 경로 계산
      const mainRoute = await this.calculateMainRoute(start, end, options);
      
      // 안전 데이터가 로드되지 않았으면 기존 경로 반환
      if (!safetyDataService.isDataLoaded()) {
        logger.warn('안전 데이터가 로드되지 않았습니다. 기본 경로만 반환합니다.');
        return mainRoute;
      }
      
      // 경로의 세그먼트 중 사고다발구간이 있는지 확인
      const segmentsToAvoid = this.findAccidentProneSegments(mainRoute);
      
      logger.debug(`사고다발구간: ${segmentsToAvoid.length}개 발견됨`);
      
      if (segmentsToAvoid.length === 0) {
        // 사고다발구간이 없으면 기존 경로 반환
        logger.info('사고다발구간이 없습니다. 기본 경로를 반환합니다.');
        
        // 안전 점수 계산 추가
        const mainRoutePoints = this.extractRoutePoints(mainRoute);
        const mainRouteSafety = safetyTrafficIntegration.calculateRouteSafetyScore(mainRoutePoints);
        mainRoute.safetyScore = mainRouteSafety.score;
        mainRoute.safetyFactors = mainRouteSafety.factors;
        
        return mainRoute;
      }
      
      // 사고다발구간을 피하는 대체 경로 계산
      logger.debug(`${segmentsToAvoid.length}개의 사고다발구간을 피하는 대체 경로 계산 시작`);
      const alternativeRoute = await this.calculateRouteAvoidingSegments(
        start, end, segmentsToAvoid, options
      );
      
      // 대체 경로가 없거나 기존 경로보다 너무 길면 기존 경로 반환
      if (!alternativeRoute) {
        logger.warn('대체 경로를 찾을 수 없습니다. 기본 경로를 반환합니다.');
        
        // 안전 점수 계산 추가
        const mainRoutePoints = this.extractRoutePoints(mainRoute);
        const mainRouteSafety = safetyTrafficIntegration.calculateRouteSafetyScore(mainRoutePoints);
        mainRoute.safetyScore = mainRouteSafety.score;
        mainRoute.safetyFactors = mainRouteSafety.factors;
        
        return mainRoute;
      }
      
      if (this.isRouteMuchLonger(alternativeRoute, mainRoute)) {
        logger.info('대체 경로가 기존 경로보다 너무 깁니다. 기본 경로를 반환합니다.');
        
        // 안전 점수 계산 추가
        const mainRoutePoints = this.extractRoutePoints(mainRoute);
        const mainRouteSafety = safetyTrafficIntegration.calculateRouteSafetyScore(mainRoutePoints);
        mainRoute.safetyScore = mainRouteSafety.score;
        mainRoute.safetyFactors = mainRouteSafety.factors;
        
        return mainRoute;
      }
      
      // 안전 점수 계산 추가
      logger.debug('경로별 안전 점수 계산 시작');
      const mainRoutePoints = this.extractRoutePoints(mainRoute);
      const alternativeRoutePoints = this.extractRoutePoints(alternativeRoute);
      
      const mainRouteSafety = safetyTrafficIntegration.calculateRouteSafetyScore(mainRoutePoints);
      const alternativeRouteSafety = safetyTrafficIntegration.calculateRouteSafetyScore(alternativeRoutePoints);
      
      // 안전 정보 첨부
      mainRoute.safetyScore = mainRouteSafety.score;
      mainRoute.safetyFactors = mainRouteSafety.factors;
      
      alternativeRoute.safetyScore = alternativeRouteSafety.score;
      alternativeRoute.safetyFactors = alternativeRouteSafety.factors;
      
      logger.info(`안전 점수 - 기본 경로: ${mainRouteSafety.score}, 대체 경로: ${alternativeRouteSafety.score}`);
      
      // 두 경로 모두 반환 (호출자가 선택할 수 있도록)
      const result = {
        mainRoute,
        alternativeRoute,
        saferRoute: mainRouteSafety.score > alternativeRouteSafety.score ? mainRoute : alternativeRoute
      };
      
      logger.info('안전 경로 탐색 완료');
      return result;
    } catch (error) {
      logger.error('안전 경로 탐색 중 오류 발생', error);
      
      if (error instanceof SafetyDataError || error instanceof RouteError) {
        throw error;
      }
      
      throw createRouteCalculationError(
        '안전 경로를 계산하는 중 오류가 발생했습니다', 
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * 기존 경로 계산 서비스 활용
   */
  private async calculateMainRoute(
    start: GeoPoint, 
    end: GeoPoint, 
    options?: any
  ): Promise<any> {
    try {
      logger.debug('기본 경로 계산 시작');
      
      // 이 부분은 애플리케이션의 실제 경로 계산 서비스 호출 방식에 따라 수정 필요
      return new Promise((resolve, reject) => {
        // 예시 - 실제로는 existing route service 사용
        setTimeout(() => {
          try {
            const routeResult = {
              // 경로 정보...
              segments: this.simulateRouteCalculation(start, end)
            };
            logger.debug('기본 경로 계산 완료');
            resolve(routeResult);
          } catch (error) {
            reject(new RouteError(
              '기본 경로 계산 실패', 
              {
                code: ErrorCode.ROUTE_CALCULATION_FAILED,
                cause: error instanceof Error ? error : undefined
              }
            ));
          }
        }, 100);
      });
    } catch (error) {
      logger.error('기본 경로 계산 중 오류 발생', error);
      
      if (error instanceof RouteError) {
        throw error;
      }
      
      throw createRouteCalculationError(
        '경로 계산에 실패했습니다',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * 특정 세그먼트를 회피하는 경로 계산
   */
  private async calculateRouteAvoidingSegments(
    start: GeoPoint, 
    end: GeoPoint, 
    segmentsToAvoid: string[], 
    options?: any
  ): Promise<any> {
    if (!Array.isArray(segmentsToAvoid)) {
      throw new RouteError(
        '회피할 세그먼트 목록이 배열이 아닙니다',
        { code: ErrorCode.INVALID_DATA }
      );
    }
    
    try {
      logger.debug(`${segmentsToAvoid.length}개 세그먼트를 회피하는 경로 계산 시작`);
      
      // 실제 구현은 애플리케이션의 경로 계산 서비스에 따라 달라짐
      // 여기서는 시뮬레이션만 제공
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            // 기본 경로 계산 후 회피해야 할 세그먼트를 제거한 경로 계산
            const segments = this.simulateRouteCalculation(start, end, segmentsToAvoid);
            if (segments.length === 0) {
              logger.warn('대체 경로를 생성할 수 없습니다');
              resolve(null); // 대체 경로 없음
            } else {
              logger.debug('대체 경로 계산 완료');
              resolve({
                // 경로 정보...
                segments: segments
              });
            }
          } catch (error) {
            reject(new RouteError(
              '대체 경로 계산 실패', 
              {
                code: ErrorCode.ROUTE_CALCULATION_FAILED,
                cause: error instanceof Error ? error : undefined
              }
            ));
          }
        }, 150);
      });
    } catch (error) {
      logger.error('대체 경로 계산 중 오류 발생', error);
      
      if (error instanceof RouteError) {
        throw error;
      }
      
      throw createRouteCalculationError(
        '대체 경로 계산에 실패했습니다',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * 경로의 세그먼트 중 사고다발구간 찾기
   */
  private findAccidentProneSegments(route: any): string[] {
    try {
      const segmentsToAvoid: string[] = [];
      
      if (!route || !route.segments || !Array.isArray(route.segments)) {
        return segmentsToAvoid;
      }
      
      route.segments.forEach((segment: any) => {
        if (segment.id && safetyDataService.isAccidentProneSegment(segment.id)) {
          segmentsToAvoid.push(segment.id);
          logger.debug(`사고다발구간 발견: ${segment.id}`);
        }
      });
      
      return segmentsToAvoid;
    } catch (error) {
      // 오류가 발생하더라도 빈 배열 반환하여 기본 경로 계산 진행
      logger.error('사고다발구간 검색 중 오류 발생', error);
      return [];
    }
  }
  
  /**
   * 대체 경로가 기존 경로보다 너무 긴지 확인
   * (거리 또는 예상 시간이 30% 이상 길면 '너무 김'으로 간주)
   */
  private isRouteMuchLonger(alternativeRoute: any, mainRoute: any): boolean {
    try {
      // 거리 기반 판단
      const altDistance = this.calculateRouteDistance(alternativeRoute);
      const mainDistance = this.calculateRouteDistance(mainRoute);
      
      if (mainDistance === 0) {
        return false;
      }
      
      logger.debug(`거리 비교 - 기본: ${mainDistance}m, 대체: ${altDistance}m`);
      
      if (altDistance > mainDistance * 1.3) {
        logger.debug(`대체 경로가 기본 경로보다 ${((altDistance / mainDistance) - 1) * 100}% 더 깁니다`);
        return true;
      }
      
      // 예상 시간 기반 판단 (있는 경우)
      if (alternativeRoute.estimatedTime && mainRoute.estimatedTime) {
        logger.debug(`시간 비교 - 기본: ${mainRoute.estimatedTime}초, 대체: ${alternativeRoute.estimatedTime}초`);
        return alternativeRoute.estimatedTime > mainRoute.estimatedTime * 1.3;
      }
      
      return false;
    } catch (error) {
      logger.error('경로 거리 비교 중 오류 발생', error);
      return false; // 오류 발생 시 '너무 길지 않음'으로 판단
    }
  }
  
  /**
   * 경로의 총 거리 계산
   */
  private calculateRouteDistance(route: any): number {
    return safeCall(() => {
      let totalDistance = 0;
      const points = this.extractRoutePoints(route);
      
      for (let i = 1; i < points.length; i++) {
        totalDistance += calculateDistance(points[i-1], points[i]);
      }
      
      return totalDistance;
    }, 
    '경로 거리 계산 실패',
    0 // 오류 발생 시 기본값
    );
  }
  
  /**
   * 경로 계산 시뮬레이션 (실제 구현은 애플리케이션 서비스 사용)
   */
  private simulateRouteCalculation(
    start: GeoPoint, 
    end: GeoPoint, 
    avoidSegments: string[] = []
  ): any[] {
    try {
      logger.debug(`경로 계산 시뮬레이션 - 출발: (${start.latitude}, ${start.longitude}), 도착: (${end.latitude}, ${end.longitude})`);
      
      // 실제 구현에서는 애플리케이션의 경로 계산 서비스 사용
      // 여기서는 간단한 시뮬레이션만 제공
      
      // 가상의 중간 지점 생성
      const midPoint = {
        latitude: (start.latitude + end.latitude) / 2,
        longitude: (start.longitude + end.longitude) / 2
      };
      
      const midPoint2 = {
        latitude: (start.latitude + midPoint.latitude) / 2,
        longitude: (start.longitude + midPoint.longitude) / 2
      };
      
      const midPoint3 = {
        latitude: (midPoint.latitude + end.latitude) / 2,
        longitude: (midPoint.longitude + end.longitude) / 2
      };
      
      // 가상의 세그먼트 ID 생성
      const segmentIds = ['seg1', 'seg2', 'seg3', 'seg4'];
      
      // 회피해야 할 세그먼트가 있으면 경로 수정
      if (avoidSegments.includes('seg2')) {
        logger.debug('seg2 세그먼트 회피 경로 생성');
        const detourPoint = {
          latitude: midPoint2.latitude + 0.01,
          longitude: midPoint2.longitude - 0.01
        };
        
        return [
          {
            id: 'seg1',
            path: [start, detourPoint]
          },
          {
            id: 'seg2_alt',
            path: [detourPoint, midPoint]
          },
          {
            id: 'seg3',
            path: [midPoint, midPoint3]
          },
          {
            id: 'seg4',
            path: [midPoint3, end]
          }
        ];
      }
      
      // 기본 경로 반환
      logger.debug('기본 경로 생성');
      return [
        {
          id: 'seg1',
          path: [start, midPoint2]
        },
        {
          id: 'seg2',
          path: [midPoint2, midPoint]
        },
        {
          id: 'seg3',
          path: [midPoint, midPoint3]
        },
        {
          id: 'seg4',
          path: [midPoint3, end]
        }
      ];
    } catch (error) {
      logger.error('경로 시뮬레이션 중 오류 발생', error);
      throw new RouteError(
        '경로 시뮬레이션 실패', 
        {
          code: ErrorCode.ROUTE_CALCULATION_FAILED,
          cause: error instanceof Error ? error : undefined
        }
      );
    }
  }
}

// 싱글톤 인스턴스 생성
export const safetyAwareRouteService = new SafetyAwareRouteService();
export default safetyAwareRouteService;