import { GeoPoint } from '../../types';
import { 
  SafetyFactor, 
  SafetyDataPoint, 
  SafetyDataMajorCategory 
} from '../../types/safetyData';
import { safetyDataService } from './SafetyDataService';
import { trafficService } from './TrafficService';
import { calculateDistance } from '../NavigationService';
import { getLogger } from '../../utils/logger';
import { 
  SafetyDataError, 
  ErrorCode, 
  TrafficError,
  createSafetyDataLoadError
} from '../../utils/errors';
import { safeAsyncCall, safeCall } from '../../utils/errorHandlers';

// SafetyTrafficIntegration 전용 로거 생성
const logger = getLogger('SafetyTrafficIntegration');

/**
 * 안전 데이터와 교통 데이터 통합 서비스
 */
export class SafetyTrafficIntegration {
  private initialized: boolean = false;
  
  /**
   * 서비스 초기화 - 필요한 데이터를 로드합니다.
   * @param apiKey 경찰청 교통안전정보 API 키
   */
  async initialize(apiKey?: string): Promise<boolean> {
    if (this.initialized) {
      logger.info('이미 초기화되어 있습니다');
      return true;
    }
    
    try {
      logger.info('SafetyTrafficIntegration 초기화 시작');
      
      // API 키가 제공된 경우 설정
      if (apiKey) {
        safetyDataService.setApiKey(apiKey);
      }
      
      // 안전 데이터와 교통 데이터 로드
      logger.debug('안전 데이터 로드 시작');
      const safetyDataLoaded = await safetyDataService.loadFromApi().catch(error => {
        logger.error('API에서 안전 데이터 로드 실패, 백업 데이터 시도', error);
        return safetyDataService.loadFromExcel('backup_safety_data.xlsx');
      });
      
      logger.debug('교통 데이터 로드 시작');
      const trafficDataLoaded = await trafficService.loadTrafficData();
      
      if (safetyDataLoaded && trafficDataLoaded) {
        this.initialized = true;
        logger.info('SafetyTrafficIntegration 초기화 완료');
        return true;
      } else {
        if (!safetyDataLoaded) {
          logger.error('안전 데이터 로드 실패');
          throw new SafetyDataError(
            '안전 데이터를 로드할 수 없습니다', 
            {
              code: ErrorCode.SAFETY_DATA_LOAD_FAILED,
              isUserFacing: true
            }
          );
        }
        if (!trafficDataLoaded) {
          logger.error('교통 데이터 로드 실패');
          throw new TrafficError(
            '교통 데이터를 로드할 수 없습니다', 
            {
              code: ErrorCode.TRAFFIC_DATA_LOAD_FAILED,
              isUserFacing: true
            }
          );
        }
      }
      
      logger.error('알 수 없는 이유로 초기화 실패');
      return false;
    } catch (error) {
      // 구체적인 오류 처리
      if (error instanceof SafetyDataError || error instanceof TrafficError) {
        throw error;  // 이미 적절한 타입의 오류이므로 그대로 전파
      }
      
      // 기타 오류는 SafetyDataError로 래핑
      logger.error('통합 서비스 초기화 중 오류 발생', error);
      throw new SafetyDataError(
        '안전-교통 통합 서비스 초기화 실패', 
        {
          code: ErrorCode.SAFETY_DATA_LOAD_FAILED,
          cause: error instanceof Error ? error : undefined,
          isUserFacing: true
        }
      );
    }
  }
  
  /**
   * 경로의 안전 점수 계산
   * @param routePoints 경로의 좌표 목록
   * @returns 안전 점수 (0-100, 높을수록 더 안전)와 영향 요소 목록
   */
  calculateRouteSafetyScore(routePoints: GeoPoint[]): { score: number; factors: SafetyFactor[] } {
    if (!this.initialized) {
      logger.warn('서비스가 초기화되지 않았습니다. initialize() 메서드를 먼저 호출하세요.');
      return { score: 50, factors: [] }; // 기본 점수
    }
    
    if (!Array.isArray(routePoints) || routePoints.length === 0) {
      logger.warn('유효한 경로 포인트가 제공되지 않았습니다');
      return { score: 50, factors: [] }; // 기본 점수
    }
    
    try {
      // 경로 주변 안전 이벤트 찾기
      const safetyEvents = safetyDataService.findSafetyEventsAlongRoute(routePoints, 200); // 200m 반경 이내 이벤트
      logger.debug(`경로를 따라 ${safetyEvents.length}개의 안전 이벤트 발견`);
      
      if (safetyEvents.length === 0) {
        logger.debug('경로에 안전 이슈가 없습니다');
        return { score: 90, factors: [] }; // 안전 이벤트 없으면 높은 점수
      }
      
      // 경로 길이 계산
      const routeLength = this.calculateRouteLength(routePoints);
      
      // 사고다발구간 발견 수
      const accidentProneAreas = safetyEvents.filter(
        event => event.safetyData.L_CD === SafetyDataMajorCategory.ACCIDENT_PRONE_AREA
      );
      
      // 위험요소 발견 수
      const riskFactors = safetyEvents.filter(
        event => event.safetyData.L_CD === SafetyDataMajorCategory.RISK_FACTOR
      );
      
      logger.debug(`발견된 사고다발구간: ${accidentProneAreas.length}개, 위험요소: ${riskFactors.length}개`);
      
      // 교통 상황 점수 (0-100)
      const trafficScore = trafficService.getTrafficScoreForRoute(routePoints);
      logger.debug(`경로의 교통 상황 점수: ${trafficScore}`);
      
      // 안전 점수 계산 (경로 길이 대비 위험 요소 수, 교통 상황 등 고려)
      // 더 복잡한 계산이 필요할 수 있지만, 여기서는 간단한 공식 사용
      const eventsPerKm = safetyEvents.length / (routeLength / 1000);
      const baseScore = 100 - Math.min(eventsPerKm * 5, 40); // 최대 40점 감소
      
      // 교통 상황 가중치 (30%)
      const weightedTrafficScore = trafficScore * 0.3;
      
      // 최종 안전 점수 계산 (기본 점수 70% + 교통 상황 30%)
      const finalScore = Math.round((baseScore * 0.7) + weightedTrafficScore);
      
      // 제한된 범위 (0-100)
      const limitedScore = Math.max(0, Math.min(100, finalScore));
      
      // 영향을 준 요인들 정리
      const factors: SafetyFactor[] = [];
      
      if (accidentProneAreas.length > 0) {
        factors.push({
          type: 'ACCIDENT_PRONE_AREA',
          count: accidentProneAreas.length,
          impact: -10 * Math.min(accidentProneAreas.length, 4), // 최대 -40
          description: `${accidentProneAreas.length}개의 사고다발구간 발견`
        });
      }
      
      if (riskFactors.length > 0) {
        factors.push({
          type: 'RISK_FACTOR',
          count: riskFactors.length,
          impact: -5 * Math.min(riskFactors.length, 5), // 최대 -25
          description: `${riskFactors.length}개의 위험요소 발견`
        });
      }
      
      // 교통 상황이 특별히 좋거나 나쁜 경우 요인 추가
      if (trafficScore < 50) {
        factors.push({
          type: 'BAD_TRAFFIC',
          count: 1,
          impact: -10,
          description: '교통 혼잡 상태'
        });
      } else if (trafficScore > 80) {
        factors.push({
          type: 'GOOD_TRAFFIC',
          count: 1,
          impact: 5,
          description: '원활한 교통 상태'
        });
      }
      
      logger.info(`경로 안전 점수: ${limitedScore} (사고다발구간: ${accidentProneAreas.length}개, 위험요소: ${riskFactors.length}개, 교통점수: ${trafficScore})`);
      
      return {
        score: limitedScore,
        factors: factors
      };
    } catch (error) {
      logger.error('경로 안전 점수 계산 중 오류 발생', error);
      
      // 오류가 발생해도 기본 점수는 반환
      return { score: 50, factors: [] };
    }
  }
  
  /**
   * 위치 주변의 안전 및 교통 정보 통합 조회
   * @param location 중심 위치
   * @param radiusMeters 반경 (미터)
   */
  async getIntegratedInfoNear(
    location: GeoPoint,
    radiusMeters: number = 500
  ): Promise<{
    safetyEvents: any[];
    trafficStatus: any;
    combinedScore: number;
  }> {
    if (!this.initialized) {
      logger.warn('서비스가 초기화되지 않았습니다. initialize() 메서드를 먼저 호출하세요.');
      
      try {
        await this.initialize();
      } catch (error) {
        logger.error('자동 초기화 실패', error);
        throw error;
      }
    }
    
    try {
      logger.debug(`위치 주변 ${radiusMeters}m 통합 정보 조회 시작`);
      
      // 비동기 작업 병렬 실행
      const [safetyEvents, trafficStatus] = await Promise.all([
        safeAsyncCall(
          () => safetyDataService.findSafetyEventsNear(location, radiusMeters),
          `위치(${location.latitude}, ${location.longitude}) 주변 안전 이벤트 조회 실패`,
          [] // 오류 발생시 빈 배열 반환
        ),
        safeAsyncCall(
          () => trafficService.getTrafficStatusNear(location, radiusMeters),
          `위치(${location.latitude}, ${location.longitude}) 주변 교통 상태 조회 실패`,
          { congestionLevel: 2, score: 50 } // 오류 발생시 기본값 반환
        )
      ]);
      
      // 통합 점수 계산 (안전 70% + 교통 30%)
      const safetyScore = this.calculateSafetyScoreFromEvents(safetyEvents);
      const combinedScore = Math.round((safetyScore * 0.7) + (trafficStatus.score * 0.3));
      
      logger.info(`위치 주변 통합 점수: ${combinedScore} (안전: ${safetyScore}, 교통: ${trafficStatus.score})`);
      
      return {
        safetyEvents,
        trafficStatus,
        combinedScore
      };
    } catch (error) {
      logger.error('통합 정보 조회 중 오류 발생', error);
      
      if (error instanceof SafetyDataError || error instanceof TrafficError) {
        throw error;
      }
      
      throw new SafetyDataError(
        '위치 주변 통합 정보를 조회하는 중 오류가 발생했습니다', 
        {
          code: ErrorCode.DATA_PARSE_ERROR,
          cause: error instanceof Error ? error : undefined,
          isUserFacing: true,
          meta: { locationLatitude: location.latitude, locationLongitude: location.longitude, radiusMeters }
        }
      );
    }
  }
  
  /**
   * 이벤트 목록에서 안전 점수 계산
   */
  private calculateSafetyScoreFromEvents(events: any[]): number {
    return safeCall(() => {
      if (!Array.isArray(events) || events.length === 0) {
        return 90; // 안전 이벤트 없으면 높은 점수
      }
      
      // 사고다발구간 및 위험요소 수에 따라 점수 계산
      const accidentProneAreas = events.filter(
        event => event.safetyData.L_CD === SafetyDataMajorCategory.ACCIDENT_PRONE_AREA
      );
      
      const riskFactors = events.filter(
        event => event.safetyData.L_CD === SafetyDataMajorCategory.RISK_FACTOR
      );
      
      // 간단한 계산 공식
      const baseScore = 90;
      const deduction = (accidentProneAreas.length * 8) + (riskFactors.length * 4);
      const score = baseScore - Math.min(deduction, 50); // 최대 50점까지 감소
      
      return Math.max(40, score); // 최소 40점
    },
    '안전 점수 계산 실패',
    50 // 오류 발생시 기본값
    );
  }
  
  /**
   * 경로의 길이 계산 (미터 단위)
   */
  private calculateRouteLength(points: GeoPoint[]): number {
    return safeCall(() => {
      if (points.length < 2) {
        return 0;
      }
      
      let length = 0;
      for (let i = 1; i < points.length; i++) {
        length += calculateDistance(points[i-1], points[i]);
      }
      
      return length;
    },
    '경로 길이 계산 실패',
    0 // 오류 발생시 기본값
    );
  }
  
  /**
   * 특정 구간에서 가장 위험한 지점 찾기
   */
  findMostDangerousPoints(routePoints: GeoPoint[], count: number = 3): { point: GeoPoint; reason: string }[] {
    if (!this.initialized || !Array.isArray(routePoints) || routePoints.length === 0) {
      return [];
    }
    
    try {
      // 경로를 따라 안전 이벤트 찾기
      const events = safetyDataService.findSafetyEventsAlongRoute(routePoints, 100);
      if (events.length === 0) return [];
      
      // 이벤트 위치와 경로상 가장 가까운 점 찾기
      const dangerPoints = events.map(event => {
        // 이벤트 위치
        const eventLocation = this.extractLocationFromEvent(event);
        if (!eventLocation) return null;
        
        // 경로상에서 가장 가까운 지점 찾기
        const nearestPoint = this.findNearestPointOnRoute(eventLocation, routePoints);
        
        // 위험 이유
        let reason = '위험 지점';
        if (event.safetyData.L_CD === SafetyDataMajorCategory.ACCIDENT_PRONE_AREA) {
          reason = '사고다발구간';
          if (event.safetyData.DATA_DESC) {
            reason += `: ${event.safetyData.DATA_DESC}`;
          }
        } else if (event.safetyData.L_CD === SafetyDataMajorCategory.RISK_FACTOR) {
          reason = '위험요소';
          if (event.safetyData.DATA_DESC) {
            reason += `: ${event.safetyData.DATA_DESC}`;
          }
        }
        
        return {
          point: nearestPoint,
          reason,
          severity: event.severity || 1,
          distance: calculateDistance(eventLocation, nearestPoint)
        };
      }).filter(Boolean);
      
      // 심각도 및 거리에 따라 정렬 (심각도 높고 거리 가까운 순)
      const sorted = dangerPoints.sort((a, b) => {
        if (a.severity !== b.severity) {
          return b.severity - a.severity; // 심각도 높은 순
        }
        return a.distance - b.distance; // 거리 가까운 순
      });
      
      // 요청한 개수만큼 반환 (중복 제거)
      const uniquePoints: { point: GeoPoint; reason: string }[] = [];
      const usedLocations = new Set();
      
      for (const item of sorted) {
        const key = `${item.point.latitude.toFixed(5)},${item.point.longitude.toFixed(5)}`;
        if (!usedLocations.has(key) && uniquePoints.length < count) {
          usedLocations.add(key);
          uniquePoints.push({
            point: item.point,
            reason: item.reason
          });
        }
      }
      
      return uniquePoints;
    } catch (error) {
      logger.error('위험 지점 검색 중 오류 발생', error);
      return [];
    }
  }
  
  /**
   * 안전 이벤트에서 위치 정보 추출
   */
  private extractLocationFromEvent(event: any): GeoPoint | null {
    return safeCall(() => {
      const data = event.safetyData;
      
      // 직접 좌표가 있는 경우
      if (data.LOCATION_X && data.LOCATION_Y) {
        return {
          latitude: data.LOCATION_Y,
          longitude: data.LOCATION_X
        };
      }
      
      // WKT 좌표 파싱 시도 (SafetyDataService의 parseWKT 메서드를 통해 이미 파싱됨)
      if (data.parsed_location && data.parsed_location.type === 'Point') {
        return {
          latitude: data.parsed_location.coordinates[1],
          longitude: data.parsed_location.coordinates[0]
        };
      }
      
      return null;
    },
    '이벤트에서 위치 정보 추출 실패',
    null // 오류 발생시 null 반환
    );
  }
  
  /**
   * 특정 위치에서 경로 상의 가장 가까운 지점 찾기
   */
  private findNearestPointOnRoute(location: GeoPoint, routePoints: GeoPoint[]): GeoPoint {
    return safeCall(() => {
      let minDistance = Infinity;
      let nearestPoint = routePoints[0];
      
      routePoints.forEach(point => {
        const distance = calculateDistance(location, point);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = point;
        }
      });
      
      return nearestPoint;
    },
    '경로상 가장 가까운 지점 찾기 실패',
    routePoints[0] || location // 오류 발생시 기본값
    );
  }
  
  /**
   * 경로 안전 통계 생성
   */
  generateRouteSafetyStatistics(routePoints: GeoPoint[]): any {
    if (!this.initialized || !Array.isArray(routePoints) || routePoints.length === 0) {
      return {
        safetyScore: 50,
        accidentProneAreaCount: 0,
        riskFactorsCount: 0,
        dangerousPoints: []
      };
    }
    
    try {
      // 안전 점수 및 요소 계산
      const safetyInfo = this.calculateRouteSafetyScore(routePoints);
      
      // 위험 지점 찾기
      const dangerousPoints = this.findMostDangerousPoints(routePoints, 5);
      
      // 사고다발구간 및 위험요소 수 계산
      const accidentProneAreaCount = safetyInfo.factors.find(f => f.type === 'ACCIDENT_PRONE_AREA')?.count || 0;
      const riskFactorsCount = safetyInfo.factors.find(f => f.type === 'RISK_FACTOR')?.count || 0;
      
      // 전체 경로 길이
      const routeLength = this.calculateRouteLength(routePoints);
      
      // km당 안전 이슈 수
      const issuesPerKm = (accidentProneAreaCount + riskFactorsCount) / (routeLength / 1000 || 1);
      
      return {
        safetyScore: safetyInfo.score,
        factors: safetyInfo.factors,
        accidentProneAreaCount,
        riskFactorsCount,
        dangerousPoints,
        routeLength,
        issuesPerKm: parseFloat(issuesPerKm.toFixed(2))
      };
    } catch (error) {
      logger.error('경로 안전 통계 생성 중 오류 발생', error);
      
      // 오류 발생해도 기본 통계 반환
      return {
        safetyScore: 50,
        accidentProneAreaCount: 0,
        riskFactorsCount: 0,
        dangerousPoints: [],
        error: '통계 생성 중 오류 발생'
      };
    }
  }
}

// 싱글톤 인스턴스 생성
export const safetyTrafficIntegration = new SafetyTrafficIntegration();
export default safetyTrafficIntegration;