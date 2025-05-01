import * as XLSX from 'xlsx';
import { SafetyDataPoint } from '../types/safetyData';
import { safetyDataService } from '../services/traffic/SafetyDataService';
import { getLogger } from './logger';

// 로거 인스턴스 생성
const logger = getLogger('SafetyDataLoader');

/**
 * 교통안전데이터 로드 및 처리 유틸리티
 */
export class SafetyDataLoader {
  /**
   * 엑셀 파일에서 교통안전 데이터 로드
   * @param filePath 엑셀 파일 경로
   */
  static async loadFromExcel(filePath: string): Promise<SafetyDataPoint[]> {
    if (!filePath) {
      const error = new Error('유효하지 않은 파일 경로');
      logger.error('파일 경로가 제공되지 않았습니다', error);
      throw error;
    }

    try {
      // 파일 시스템 API를 사용하여 엑셀 파일 로드
      logger.info(`교통안전데이터 엑셀 로드 시작: ${filePath}`);
      
      // 브라우저 또는 React Native 환경에 따라 적절한 파일 로드 로직 사용
      // 예: React Native의 경우 RNFetchBlob 또는 FileSystem API 활용
      
      // 브라우저 환경에서의 예시
      /*
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`파일 로드 실패: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      */
      
      // 파일 시스템 직접 접근의 예시 (Node.js 환경)
      /*
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<SafetyDataPoint>(worksheet);
      */
      
      // 여기서는 서비스의 더미 데이터 로드 메소드 사용
      logger.debug('SafetyDataService를 통한 데이터 로드 시작');
      try {
        await safetyDataService.loadFromExcel(filePath);
        const data = safetyDataService.getAllSafetyData();
        logger.info(`${data.length}개의 안전 데이터 포인트 로드 완료`);
        return data;
      } catch (serviceError) {
        logger.error('SafetyDataService에서 데이터 로드 중 오류 발생', serviceError);
        throw new Error(`안전 데이터 서비스 오류: ${(serviceError as Error).message}`);
      }
    } catch (error) {
      logger.error('엑셀에서 교통안전데이터 로드 실패', error);
      throw new Error(`데이터 로드 실패: ${(error as Error).message}`);
    }
  }
  
  /**
   * API에서 교통안전 데이터 로드
   * @param apiKey API 키
   * @param url API URL (선택 사항)
   */
  static async loadFromApi(
    apiKey: string, 
    url: string = 'https://www.utic.go.kr/guide/tsdmsOpenData.do'
  ): Promise<SafetyDataPoint[]> {
    if (!apiKey) {
      const error = new Error('API 키가 제공되지 않았습니다');
      logger.error('API 키가 없습니다', error);
      throw error;
    }
    
    try {
      logger.info(`교통안전데이터 API 로드 시작: ${url}`);
      
      // API 키 설정 및 API로부터 데이터 로드
      safetyDataService.setApiKey(apiKey);
      
      try {
        await safetyDataService.loadFromApi();
        const data = safetyDataService.getAllSafetyData();
        logger.info(`API에서 ${data.length}개의 안전 데이터 포인트 로드 완료`);
        return data;
      } catch (serviceError) {
        logger.error('SafetyDataService에서 API 데이터 로드 중 오류 발생', serviceError);
        throw new Error(`API 데이터 로드 실패: ${(serviceError as Error).message}`);
      }
    } catch (error) {
      logger.error('API에서 교통안전데이터 로드 실패', error);
      throw new Error(`API 데이터 로드 오류: ${(error as Error).message}`);
    }
  }
  
  /**
   * WKT 문자열에서 위/경도 좌표 추출
   * @param wkt WKT 형식 문자열 (예: 'POINT(126.978 37.567)')
   */
  static extractCoordinatesFromWKT(wkt: string): { longitude: number; latitude: number } | null {
    if (!wkt || typeof wkt !== 'string') {
      logger.warn('유효하지 않은 WKT 문자열', wkt);
      return null;
    }
    
    try {
      // POINT 형식 파싱
      if (wkt.startsWith('POINT')) {
        const content = wkt.substring(6, wkt.length - 1);
        const coordinates = content.split(' ').map(Number);
        
        if (coordinates.length !== 2 || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
          throw new Error('유효하지 않은 POINT 형식');
        }
        
        const [longitude, latitude] = coordinates;
        return { longitude, latitude };
      }
      
      // LINESTRING 형식에서 첫 번째 좌표 사용
      if (wkt.startsWith('LINESTRING')) {
        const content = wkt.substring(11, wkt.length - 1);
        const firstPoint = content.split(',')[0];
        const coordinates = firstPoint.trim().split(' ').map(Number);
        
        if (coordinates.length !== 2 || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
          throw new Error('유효하지 않은 LINESTRING 형식');
        }
        
        const [longitude, latitude] = coordinates;
        return { longitude, latitude };
      }
      
      // POLYGON 형식에서 첫 번째 좌표 사용
      if (wkt.startsWith('POLYGON')) {
        const content = wkt.substring(9, wkt.length - 2);
        const firstRing = content.split('),(')[0];
        const firstPoint = firstRing.split(',')[0];
        const coordinates = firstPoint.trim().split(' ').map(Number);
        
        if (coordinates.length !== 2 || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
          throw new Error('유효하지 않은 POLYGON 형식');
        }
        
        const [longitude, latitude] = coordinates;
        return { longitude, latitude };
      }
      
      logger.warn('지원되지 않는 WKT 형식', wkt);
      return null;
    } catch (error) {
      logger.error('WKT 파싱 오류', error, wkt);
      return null;
    }
  }
  
  /**
   * 안전 데이터 중 특정 유형만 필터링
   * @param data 안전 데이터 배열
   * @param majorCategory 대분류 코드
   * @param middleCategory 중분류 코드 (선택 사항)
   */
  static filterByCategory(
    data: SafetyDataPoint[],
    majorCategory: string,
    middleCategory?: string
  ): SafetyDataPoint[] {
    if (!data || !Array.isArray(data)) {
      logger.warn('필터링할 데이터가 없거나 배열이 아닙니다');
      return [];
    }
    
    if (!majorCategory) {
      logger.warn('대분류 코드가 제공되지 않았습니다');
      return data;
    }
    
    try {
      const filtered = data.filter(item => {
        if (!item) return false;
        if (item.L_CD !== majorCategory) return false;
        if (middleCategory && item.M_CD !== middleCategory) return false;
        return true;
      });
      
      logger.debug(`카테고리 필터링: ${data.length}개 중 ${filtered.length}개 항목이 조건에 맞습니다`);
      return filtered;
    } catch (error) {
      logger.error('카테고리 필터링 중 오류 발생', error);
      return [];
    }
  }
  
  /**
   * 안전 데이터를 GeoJSON 형식으로 변환
   * @param data 안전 데이터 배열
   */
  static convertToGeoJSON(data: SafetyDataPoint[]): any {
    if (!data || !Array.isArray(data)) {
      logger.warn('변환할 데이터가 없거나 배열이 아닙니다');
      return { type: 'FeatureCollection', features: [] };
    }
    
    try {
      const features = data.map(item => {
        try {
          // 좌표 정보 추출
          let coordinates;
          let geometryType = 'Point';
          
          if (item.LOCATION_X && item.LOCATION_Y && !isNaN(item.LOCATION_X) && !isNaN(item.LOCATION_Y)) {
            coordinates = [item.LOCATION_X, item.LOCATION_Y];
          } else if (item.LOCATION_DATA) {
            // WKT에서 좌표 추출 시도
            const coord = SafetyDataLoader.extractCoordinatesFromWKT(item.LOCATION_DATA);
            if (coord) {
              coordinates = [coord.longitude, coord.latitude];
            } else {
              // 좌표 없는 경우 기본값 (서울시청)
              coordinates = [126.9780, 37.5665];
              logger.debug(`아이템 ${item.SAFEDATA_ID}에 유효한 좌표가 없어 기본값 사용`);
            }
            
            // 형상 유형 확인
            if (item.LOCATION_DATA.startsWith('LINESTRING')) {
              geometryType = 'LineString';
            } else if (item.LOCATION_DATA.startsWith('POLYGON')) {
              geometryType = 'Polygon';
            }
          } else {
            // 좌표 정보가 없는 경우 기본값 (서울시청)
            coordinates = [126.9780, 37.5665];
            logger.debug(`아이템 ${item.SAFEDATA_ID}에 좌표 정보가 없어 기본값 사용`);
          }
          
          // GeoJSON Feature 생성
          return {
            type: 'Feature',
            geometry: {
              type: geometryType,
              coordinates: coordinates
            },
            properties: {
              id: item.SAFEDATA_ID,
              name: item.VUL_NAME || item.DATA_DESC || `안전 데이터 ${item.SAFEDATA_ID}`,
              description: item.DATA_DESC || '',
              address: item.ADDRESS_NEW || item.ADDRESS_JIBUN || '',
              category: {
                major: item.L_CD,
                middle: item.M_CD,
                minor: item.S_CD
              },
              reportDate: item.REPORT_DATE,
              attributes: {
                roadLen: item.ROAD_LEN,
                roadCnt: item.ROAD_CNT,
                roadLen2: item.ROAD_LEN2,
                hpInfo: item.HP_INFO,
                fsInfo: item.FS_INFO,
                polInfo: item.POL_INFO,
                nearIc: item.NEAR_IC
              }
            }
          };
        } catch (itemError) {
          logger.warn(`아이템 변환 중 오류 발생: ${(itemError as Error).message}`, item);
          // 오류가 발생한 아이템은 기본 Feature로 대체
          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [126.9780, 37.5665]
            },
            properties: {
              id: item.SAFEDATA_ID || 'unknown',
              name: '오류 항목',
              description: '이 항목은 변환 중 오류가 발생했습니다',
              error: (itemError as Error).message
            }
          };
        }
      });
      
      logger.info(`${data.length}개 안전 데이터 항목을 GeoJSON으로 변환 완료`);
      return {
        type: 'FeatureCollection',
        features
      };
    } catch (error) {
      logger.error('GeoJSON 변환 중 오류 발생', error);
      return {
        type: 'FeatureCollection',
        features: [],
        error: (error as Error).message
      };
    }
  }
}

export default SafetyDataLoader;