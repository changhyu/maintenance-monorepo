import { GeoPoint } from '../../types';
import { 
  SafetyDataPoint, 
  SafetyEvent, 
  GeoShape, 
  SafetyDataMajorCategory, 
  LocationType 
} from '../../types/safetyData';
import { parseExcel } from '../../utils/excelParser';
import { calculateDistance } from '../NavigationService';
import { trafficService } from './TrafficService';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../config';
import { mapData } from '../../data/mapData';
import { getLogger } from '../../utils/logger';
import { 
  SafetyDataError,
  ErrorCode,
  createSafetyDataLoadError
} from '../../utils/errors';
import { safeAsyncCall, safeCall, handleError } from '../../utils/errorHandlers';

// SafetyDataService 전용 로거 생성
const logger = getLogger('SafetyDataService');

/**
 * WKT(Well-Known Text) 포맷을 GeoShape 객체로 변환
 * @param wkt WKT 형식의 지오메트리 텍스트
 */
function parseWKT(wktString: string): GeoShape | null {
  if (!wktString || typeof wktString !== 'string') {
    return null;
  }
  
  try {
    if (wktString.startsWith('POINT')) {
      const coordsMatch = wktString.match(/POINT\s*\(([^)]+)\)/i);
      if (coordsMatch && coordsMatch[1]) {
        const [x, y] = coordsMatch[1].split(' ').map(Number);
        return {
          type: 'Point',
          coordinates: [x, y]
        };
      }
    } else if (wktString.startsWith('LINESTRING')) {
      const coordsMatch = wktString.match(/LINESTRING\s*\(([^)]+)\)/i);
      if (coordsMatch && coordsMatch[1]) {
        const coordinates = coordsMatch[1]
          .split(',')
          .map(coordPair => coordPair.trim().split(' ').map(Number));
        return {
          type: 'LineString',
          coordinates
        };
      }
    } else if (wktString.startsWith('POLYGON')) {
      const coordsMatch = wktString.match(/POLYGON\s*\(\(([^)]+)\)\)/i);
      if (coordsMatch && coordsMatch[1]) {
        const coordinates = coordsMatch[1]
          .split(',')
          .map(coordPair => coordPair.trim().split(' ').map(Number));
        return {
          type: 'Polygon',
          coordinates: [coordinates]
        };
      }
    }
  } catch (error) {
    logger.error(`WKT 파싱 오류 (입력값: ${wktString})`, error);
    return null;
  }
  
  return null;
}

/**
 * 교통안전정보 서비스 - 경찰청 교통사고 데이터 관리
 */
export class SafetyDataService {
  private safetyData: SafetyDataPoint[] = [];
  private safetyEvents: SafetyEvent[] = [];
  private isLoaded: boolean = false;
  private lastLoadDate: Date | null = null;
  private apiKey: string | null = null;

  constructor() {
    // 초기화 로깅
    logger.info('SafetyDataService 초기화됨');
  }

  /**
   * API 키 설정
   * @param key 경찰청 교통안전정보 API 키
   */
  setApiKey(key: string): void {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new SafetyDataError('유효하지 않은 API 키입니다', {
        code: ErrorCode.SAFETY_API_KEY_MISSING
      });
    }
    
    this.apiKey = key;
    logger.info('API 키 설정됨');
  }

  /**
   * 엑셀 파일로부터 교통안전정보 로드
   * @param filePath 엑셀 파일 경로
   */
  async loadFromExcel(filePath: string): Promise<boolean> {
    try {
      logger.info(`엑셀 파일에서 안전 데이터 로드 시작: ${filePath}`);
      
      // 파일 존재 여부 확인
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      
      if (!fileInfo.exists) {
        logger.error(`엑셀 파일을 찾을 수 없습니다: ${filePath}`);
        throw new SafetyDataError(
          `엑셀 파일을 찾을 수 없습니다: ${filePath}`, 
          {
            code: ErrorCode.SAFETY_DATA_LOAD_FAILED,
            isUserFacing: false,
            meta: { filePath }
          }
        );
      }
      
      // 엑셀 파일 파싱
      const excelData = await parseExcel(filePath);
      
      if (!Array.isArray(excelData) || excelData.length === 0) {
        logger.error('엑셀 파일에서 유효한 데이터를 찾을 수 없습니다');
        throw new SafetyDataError(
          '엑셀 파일에서 유효한 데이터를 찾을 수 없습니다', 
          {
            code: ErrorCode.SAFETY_DATA_PARSE_ERROR,
            isUserFacing: false,
            meta: { dataLength: excelData?.length }
          }
        );
      }
      
      // 받은 데이터 처리
      this.processSafetyData(excelData);
      
      // 캐시 저장
      await this.saveSafetyDataToCache(excelData);
      
      this.lastLoadDate = new Date();
      this.isLoaded = true;
      
      logger.info(`엑셀 파일에서 ${this.safetyData.length}개의 안전 데이터 항목 로드 완료`);
      return true;
    } catch (error) {
      // 이미 SafetyDataError인 경우 그대로 전파
      if (error instanceof SafetyDataError) {
        throw error;
      }
      
      // 기타 오류는 새로운 SafetyDataError로 래핑
      logger.error(`엑셀 파일에서 안전 데이터 로드 중 오류 발생: ${filePath}`, error);
      throw createSafetyDataLoadError(
        '엑셀 파일에서 안전 데이터를 로드하는 중 오류가 발생했습니다',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * API로부터 교통안전정보 로드
   */
  async loadFromApi(): Promise<boolean> {
    if (!this.apiKey) {
      throw new SafetyDataError('API 키가 설정되지 않았습니다. setApiKey()를 먼저 호출하세요.', {
        code: ErrorCode.SAFETY_API_KEY_MISSING
      });
    }
    
    try {
      const apiUrl = `${API_BASE_URL}/safety-data?apiKey=${this.apiKey}`;
      logger.info(`API에서 교통안전정보 로드 시작: ${apiUrl}`);
      
      // 실제 API 호출 로직 구현
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        logger.error(`API 응답 오류: ${response.status} ${response.statusText}`);
        throw new SafetyDataError(
          `API 응답 오류: ${response.status} ${response.statusText}`, 
          {
            code: ErrorCode.SAFETY_DATA_LOAD_FAILED,
            isUserFacing: true,
            meta: { status: response.status }
          }
        );
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        logger.error('API에서 유효한 데이터를 받지 못했습니다');
        throw new SafetyDataError(
          'API에서 유효한 데이터를 받지 못했습니다', 
          {
            code: ErrorCode.SAFETY_DATA_PARSE_ERROR,
            isUserFacing: false,
            meta: { responseType: typeof data }
          }
        );
      }
      
      // 받은 데이터 처리
      this.processSafetyData(data);
      
      // 로컬에 캐시 저장
      await this.saveSafetyDataToCache(data);
      
      this.lastLoadDate = new Date();
      this.isLoaded = true;
      
      logger.info(`API에서 ${this.safetyData.length}개의 안전 데이터 항목 로드 완료`);
      return true;
    } catch (error) {
      // 이미 SafetyDataError인 경우 그대로 전파
      if (error instanceof SafetyDataError) {
        throw error;
      }
      
      // 기타 오류는 새로운 SafetyDataError로 래핑
      logger.error('API에서 안전 데이터 로드 중 오류 발생', error);
      throw createSafetyDataLoadError(
        'API에서 안전 데이터를 로드하는 중 오류가 발생했습니다',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 캐시에서 안전 데이터 로드
   * @returns 로드 성공 여부
   */
  async loadFromCache(): Promise<boolean> {
    try {
      logger.info('캐시에서 안전 데이터 로드 시작');
      
      // 캐시에서 데이터 로드
      const cachedData = await SecureStore.getItemAsync('safety_data_cache');
      
      if (!cachedData) {
        logger.warn('캐시에 저장된 안전 데이터가 없습니다');
        return false;
      }
      
      // JSON 파싱
      const data = JSON.parse(cachedData);
      
      if (!Array.isArray(data) || data.length === 0) {
        logger.error('캐시에서 유효하지 않은 데이터 형식이 발견되었습니다');
        throw new SafetyDataError(
          '캐시에서 유효하지 않은 데이터 형식이 발견되었습니다', 
          {
            code: ErrorCode.SAFETY_DATA_PARSE_ERROR,
            isUserFacing: false
          }
        );
      }
      
      // 받은 데이터 처리
      this.processSafetyData(data);
      
      this.isLoaded = true;
      logger.info(`캐시에서 ${this.safetyData.length}개의 안전 데이터 항목 로드 완료`);
      return true;
    } catch (error) {
      // 이미 SafetyDataError인 경우 그대로 전파
      if (error instanceof SafetyDataError) {
        throw error;
      }
      
      // 캐시 로드 실패는 치명적이지 않으므로 로그만 남기고 false 반환
      logger.error('캐시에서 안전 데이터 로드 중 오류 발생', error);
      return false;
    }
  }

  /**
   * 안전 데이터를 로컬 캐시에 저장
   * @param data 저장할 데이터
   */
  private async saveSafetyDataToCache(data: any[]): Promise<boolean> {
    try {
      logger.debug('안전 데이터를 캐시에 저장 시작');
      
      const jsonData = JSON.stringify(data);
      await SecureStore.setItemAsync('safety_data_cache', jsonData);
      
      logger.debug('안전 데이터가 캐시에 성공적으로 저장됨');
      return true;
    } catch (error) {
      // 캐시 저장 실패는 치명적이지 않으므로 로그만 남기고 false 반환
      logger.error('안전 데이터를 캐시에 저장하는 중 오류 발생', error);
      handleError(error, '안전 데이터 캐싱 실패', false);
      return false;
    }
  }

  /**
   * 로드된 데이터 처리 및 필터링
   */
  private processSafetyData(data: any[]): void {
    try {
      logger.debug('안전 데이터 처리 시작');
      
      // WKT 위치 정보가 있는 경우 파싱
      const processedData: SafetyDataPoint[] = data.map((item, index) => {
        try {
          // WKT 위치 정보 파싱 시도
          let parsed_location = null;
          if (item.LOCATION_DATA) {
            parsed_location = parseWKT(item.LOCATION_DATA);
          }
          
          // 데이터 포인트 생성
          return {
            ...item,
            SAFEDATA_ID: item.SAFEDATA_ID || `data_${index}`,
            parsed_location
          };
        } catch (itemError) {
          logger.warn(`항목 ${index} 처리 중 오류 발생`, itemError);
          return {
            ...item,
            SAFEDATA_ID: item.SAFEDATA_ID || `data_${index}`,
            parsed_location: null,
            _parse_error: true
          };
        }
      });
      
      this.safetyData = processedData.filter(data => {
        if (data.LOCATION_YN !== 'Y') return false;
        
        // 좌표가 직접 있거나 WKT에서 파싱할 수 있는 경우만 유효
        if (data.LOCATION_X && data.LOCATION_Y) return true;
        
        if (data.LOCATION_DATA) {
          try {
            const shape = parseWKT(data.LOCATION_DATA);
            return shape !== null;
          } catch (error) {
            logger.warn(`WKT 파싱 실패하여 데이터 제외: ID=${data.SAFEDATA_ID}`);
            return false;
          }
        }
        
        return false;
      });
      
      logger.info(`유효한 교통안전 데이터 포인트 ${this.safetyData.length}개 처리됨`);
      
      // 기존 이벤트 초기화 후 새로운 안전 이벤트 생성
      this.safetyEvents = [];
      
      // 사고다발지역은 기본적으로 '주의' 레벨 이벤트로 처리
      this.safetyData
        .filter(data => data.L_CD === SafetyDataMajorCategory.ACCIDENT_PRONE_AREA)
        .forEach(data => {
          this.safetyEvents.push({
            id: `safety_${data.SAFEDATA_ID}`,
            safetyData: data,
            severity: 2, // 주의 레벨
            expirationDate: this.calculateExpirationDate()
          });
        });
        
      logger.info(`교통안전 이벤트 ${this.safetyEvents.length}개 생성됨`);
    } catch (error) {
      this.isLoaded = false;
      logger.error('데이터 처리 중 오류 발생', error);
      
      throw new SafetyDataError(
        '안전 데이터 처리 중 오류가 발생했습니다', 
        {
          code: ErrorCode.SAFETY_DATA_PARSE_ERROR,
          cause: error instanceof Error ? error : undefined
        }
      );
    }
  }
  
  /**
   * 이벤트 만료일 계산 (현재는 3개월 후로 설정)
   */
  private calculateExpirationDate(): Date {
    const now = new Date();
    return new Date(now.setMonth(now.getMonth() + 3));
  }

  /**
   * 위치 주변 안전 이벤트 찾기
   * @param location 중심 위치
   * @param radiusMeters 검색 반경(미터)
   */
  findSafetyEventsNear(location: GeoPoint, radiusMeters: number): SafetyEvent[] {
    if (!this.isLoaded) {
      logger.warn('교통안전 데이터가 아직 로드되지 않았습니다');
      return [];
    }
    
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      throw new SafetyDataError(
        '유효하지 않은 위치 좌표', 
        {
          code: ErrorCode.INVALID_LOCATION,
          meta: { location }
        }
      );
    }
    
    if (typeof radiusMeters !== 'number' || radiusMeters <= 0) {
      throw new SafetyDataError(
        '유효하지 않은 검색 반경', 
        {
          code: ErrorCode.INVALID_DATA,
          meta: { radiusMeters }
        }
      );
    }
    
    try {
      // 만료된 이벤트 필터링
      const now = new Date();
      this.safetyEvents = this.safetyEvents.filter(
        event => !event.expirationDate || event.expirationDate > now
      );
      
      const events = this.safetyEvents.filter(event => {
        const data = event.safetyData;
        
        // 데이터에 직접 좌표가 있는 경우
        if (data.LOCATION_X && data.LOCATION_Y) {
          const distance = calculateDistance(
            location,
            { latitude: data.LOCATION_Y, longitude: data.LOCATION_X }
          );
          return distance <= radiusMeters;
        }
        
        // WKT 형태로 좌표가 있는 경우
        if (data.LOCATION_DATA) {
          const shape = parseWKT(data.LOCATION_DATA);
          if (!shape) return false;
          
          if (shape.type === 'Point') {
            const point = shape.coordinates as number[];
            const distance = calculateDistance(
              location,
              { latitude: point[1], longitude: point[0] }
            );
            return distance <= radiusMeters;
          }
          
          // LineString과 Polygon은 더 복잡한 계산이 필요하지만,
          // 간단한 구현을 위해 첫 번째 점만 사용하여 판단
          if (shape.type === 'LineString') {
            const points = shape.coordinates as number[][];
            if (points.length > 0) {
              const distance = calculateDistance(
                location,
                { latitude: points[0][1], longitude: points[0][0] }
              );
              return distance <= radiusMeters;
            }
          }
          
          return false;
        }
        
        return false;
      });
      
      logger.debug(`위치(${location.latitude}, ${location.longitude}) 주변 ${radiusMeters}m 이내에서 ${events.length}개의 안전 이벤트 발견`);
      return events;
    } catch (error) {
      if (error instanceof SafetyDataError) throw error;
      
      logger.error('안전 이벤트 검색 중 오류 발생', error);
      throw new SafetyDataError(
        '위치 주변 안전 이벤트 검색 중 오류가 발생했습니다', 
        {
          code: ErrorCode.DATA_PARSE_ERROR,
          cause: error instanceof Error ? error : undefined,
          meta: { locationLatitude: location.latitude, locationLongitude: location.longitude, radiusMeters }
        }
      );
    }
  }
  
  /**
   * 경로 주변의 안전 이벤트 찾기
   * @param routePoints 경로 포인트
   * @param radiusMeters 각 포인트별 검색 반경(미터)
   */
  findSafetyEventsAlongRoute(routePoints: GeoPoint[], radiusMeters: number): SafetyEvent[] {
    if (!this.isLoaded || routePoints.length === 0) {
      if (!this.isLoaded) {
        logger.warn('교통안전 데이터가 아직 로드되지 않았습니다');
      }
      return [];
    }
    
    if (!Array.isArray(routePoints) || routePoints.length === 0) {
      throw new SafetyDataError(
        '유효한 경로 포인트가 제공되지 않았습니다', 
        {
          code: ErrorCode.INVALID_DATA,
          meta: { routePointsLength: routePoints?.length || 0 }
        }
      );
    }
    
    try {
      // 중복 방지를 위한 Set
      const foundEventIds = new Set<string>();
      const events: SafetyEvent[] = [];
      
      // 경로를 따라 적절한 간격으로 샘플링하여 이벤트 찾기
      const sampledPoints = this.samplePointsAlongRoute(routePoints, 500); // 500m 간격으로 샘플링
      
      logger.debug(`경로 ${routePoints.length}개 포인트에서 ${sampledPoints.length}개의 샘플링 포인트 생성`);
      
      sampledPoints.forEach(point => {
        const nearbyEvents = this.findSafetyEventsNear(point, radiusMeters);
        nearbyEvents.forEach(event => {
          if (!foundEventIds.has(event.id)) {
            foundEventIds.add(event.id);
            events.push(event);
          }
        });
      });
      
      logger.info(`경로를 따라 ${events.length}개의 안전 이벤트 발견`);
      return events;
    } catch (error) {
      if (error instanceof SafetyDataError) throw error;
      
      logger.error('경로 안전 이벤트 검색 중 오류 발생', error);
      throw new SafetyDataError(
        '경로 주변 안전 이벤트 검색 중 오류가 발생했습니다', 
        {
          code: ErrorCode.DATA_PARSE_ERROR,
          cause: error instanceof Error ? error : undefined,
          meta: { routePointsLength: routePoints.length, radiusMeters }
        }
      );
    }
  }
  
  /**
   * 경로를 따라 일정 간격으로 포인트 샘플링
   * @param routePoints 경로 포인트
   * @param intervalMeters 샘플링 간격(미터)
   */
  private samplePointsAlongRoute(routePoints: GeoPoint[], intervalMeters: number): GeoPoint[] {
    return safeCall(() => {
      if (routePoints.length <= 2) return routePoints;
      
      const sampledPoints: GeoPoint[] = [routePoints[0]];
      let distanceFromLastSample = 0;
      
      for (let i = 1; i < routePoints.length; i++) {
        const segmentDistance = calculateDistance(routePoints[i-1], routePoints[i]);
        distanceFromLastSample += segmentDistance;
        
        if (distanceFromLastSample >= intervalMeters) {
          sampledPoints.push(routePoints[i]);
          distanceFromLastSample = 0;
        }
      }
      
      // 마지막 포인트 항상 추가
      if (sampledPoints[sampledPoints.length - 1] !== routePoints[routePoints.length - 1]) {
        sampledPoints.push(routePoints[routePoints.length - 1]);
      }
      
      return sampledPoints;
    }, 
    '경로 포인트 샘플링 실패',
    // 오류 발생시 원본 포인트 반환
    routePoints
    );
  }
  
  /**
   * 특정 세그먼트가 사고다발구간인지 확인
   * @param segmentId 도로 세그먼트 ID
   */
  isAccidentProneSegment(segmentId: string): boolean {
    if (!this.isLoaded) {
      logger.warn('교통안전 데이터가 아직 로드되지 않았습니다');
      return false;
    }
    
    if (!segmentId) {
      logger.warn('유효하지 않은 세그먼트 ID');
      return false;
    }
    
    try {
      // 해당 세그먼트 찾기
      const segment = mapData.roadSegments.find(s => s.id === segmentId);
      if (!segment) {
        logger.debug(`세그먼트 ID ${segmentId}를 찾을 수 없습니다`);
        return false;
      }
      
      // 세그먼트의 중간 지점 계산
      const midPoint = { 
        latitude: 0, 
        longitude: 0
      };
      
      if (segment.path.length >= 2) {
        midPoint.latitude = (segment.path[0].latitude + segment.path[segment.path.length - 1].latitude) / 2;
        midPoint.longitude = (segment.path[0].longitude + segment.path[segment.path.length - 1].longitude) / 2;
      } else if (segment.path.length === 1) {
        midPoint.latitude = segment.path[0].latitude;
        midPoint.longitude = segment.path[0].longitude;
      } else {
        logger.warn(`세그먼트 ID ${segmentId}에 경로 포인트가 없습니다`);
        return false;
      }
      
      // 중간 지점 주변 50m 이내의 사고다발지역 이벤트 찾기
      const events = this.findSafetyEventsNear(midPoint, 50);
      const isAccidentProne = events.some(event => 
        event.safetyData.L_CD === SafetyDataMajorCategory.ACCIDENT_PRONE_AREA
      );
      
      if (isAccidentProne) {
        logger.info(`세그먼트 ID ${segmentId}는 사고다발구간입니다`);
      }
      
      return isAccidentProne;
    } catch (error) {
      // 여기서는 오류를 던지지 않고 로깅만 수행하고 기본값 반환
      logger.error(`세그먼트 확인 중 오류 발생: ${segmentId}`, error);
      return false;
    }
  }
  
  /**
   * 데이터 로드 상태 확인
   */
  isDataLoaded(): boolean {
    return this.isLoaded;
  }
  
  /**
   * 마지막 데이터 업데이트 시간 확인
   */
  getLastUpdateTime(): Date | null {
    return this.lastLoadDate;
  }
  
  /**
   * 모든 안전 데이터 포인트 가져오기
   */
  getAllSafetyData(): SafetyDataPoint[] {
    return [...this.safetyData];
  }
  
  /**
   * 모든 안전 이벤트 가져오기
   */
  getAllSafetyEvents(): SafetyEvent[] {
    return [...this.safetyEvents];
  }

  /**
   * 사고다발구간 데이터만 필터링하여 반환
   */
  getAccidentProneAreas(): SafetyDataPoint[] {
    return safeCall(() => this.safetyData.filter(
      data => data.L_CD === SafetyDataMajorCategory.ACCIDENT_PRONE_AREA
    ), '사고다발구간 데이터 필터링 실패', []);
  }

  /**
   * 위험요소 데이터만 필터링하여 반환
   */
  getRiskFactors(): SafetyDataPoint[] {
    return safeCall(() => this.safetyData.filter(
      data => data.L_CD === SafetyDataMajorCategory.RISK_FACTOR
    ), '위험요소 데이터 필터링 실패', []);
  }
}

// 싱글톤 인스턴스 생성
export const safetyDataService = new SafetyDataService();
export default safetyDataService;