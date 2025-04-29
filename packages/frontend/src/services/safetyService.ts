import axios from 'axios';

/**
 * 교통안전정보 API Service
 * 교통안전데이터 API 서비스
 */

// API 기본 URL 및 키 설정
const API_BASE_URL = process.env.REACT_APP_SAFETY_API_URL || 'https://www.utic.go.kr/guide';
const API_KEY = process.env.REACT_APP_SAFETY_API_KEY || '';

// 안전데이터 대분류 코드
export enum SafetyLargeCategory {
  ACCIDENT_PRONE = '01', // 사고다발지역
  RISK_FACTOR = '02',    // 위험요소
  PROTECTION_ZONE = '03' // 보호구역
}

// 안전데이터 중분류 코드
export enum SafetyMediumCategory {
  // 사고다발지역 하위 분류
  TASS = '01',           // TASS 사고다발지역

  // 위험요소 하위 분류
  VEHICLE_TYPE = '01',   // 차종별 위험요소
  PEDESTRIAN = '02',     // 보행자별 위험요소
  LAW_VIOLATION = '03',  // 법규위반별 위험요소
  ROAD_ENV = '04',       // 도로환경별 위험요소
}

// 형상정보 종류 코드
export enum LocationType {
  POINT = '01',      // 점
  LINE = '02',       // 선
  POLYGON = '03'     // 다각형
}

// 교통안전 데이터 인터페이스
export interface SafetyData {
  safetyId: string;       // SAFEDATA_ID
  hasLocation: boolean;   // LOCATION_YN (형상정보 존재여부)
  locationData?: string;  // LOCATION_DATA (WKT 형식의 형상정보)
  addressJibun?: string;  // ADDRESS_JIBUN (지번주소)
  addressRoad?: string;   // ADDRESS_NEW (도로명주소)
  linkId?: string;        // LINK_ID
  reportDate?: string;    // REPORT_DATE (데이터 기준일자)
  largeCategory: string;  // L_CD (대분류코드)
  mediumCategory: string; // M_CD (중분류코드)
  smallCategory?: string; // S_CD (소분류코드)
  locationType?: string;  // LOCATION_TYPE_CD (형상정보 종류코드)
  addressCode?: string;   // ADDR_CD (법정동코드)
  longitude: number;      // LOCATION_X
  latitude: number;       // LOCATION_Y
  description?: string;   // DATA_DESC (상세내용)
  vulnerableName?: string;// VUL_NAME (구간명칭)
  vulnerableType?: string;// VUL_TYPE (구간유형)
  roadLength?: number;    // ROAD_LEN (구간길이)
  roadCount?: number;     // ROAD_CNT (구간차로)
  roadWidth?: number;     // ROAD_LEN2 (구간차로폭)
  hospitalInfo?: string;  // HP_INFO (병원정보)
  fireStationInfo?: string;// FS_INFO (소방서정보)
  policeInfo?: string;    // POL_INFO (경찰처정보)
  nearestIc?: string;     // NEAR_IC (최인접IC)
  severity?: 'LOW' | 'MEDIUM' | 'HIGH'; // 심각도 (프론트엔드에서 사용)
}

// 교통안전정보 요청 파라미터
export interface SafetyRequestParams {
  minX: number;       // 최소 경도
  maxX: number;       // 최대 경도
  minY: number;       // 최소 위도
  maxY: number;       // 최대 위도
  largeCategory?: string;  // 대분류 코드 필터
  mediumCategory?: string; // 중분류 코드 필터
  getType?: 'json' | 'xml'; // 응답 형식
}

/**
 * 지정된 영역 내의 교통안전정보 데이터를 가져옴
 * 
 * @param params 교통안전정보 요청 파라미터
 * @returns 교통안전 데이터 배열
 */
export const getSafetyData = async (params: SafetyRequestParams): Promise<SafetyData[]> => {
  try {
    const queryParams = new URLSearchParams({
      key: API_KEY,
      minX: params.minX.toString(),
      maxX: params.maxX.toString(),
      minY: params.minY.toString(),
      maxY: params.maxY.toString(),
      getType: params.getType || 'json'
    });
    
    if (params.largeCategory) {
      queryParams.append('lCd', params.largeCategory);
    }
    
    if (params.mediumCategory) {
      queryParams.append('mCd', params.mediumCategory);
    }
    
    const response = await axios.get(`${API_BASE_URL}/tsdmsOpenData.do`, {
      params: queryParams
    });
    
    // 응답 형식에 따라 파싱
    if (params.getType === 'xml') {
      // XML 처리 로직 (필요한 경우 구현)
      console.warn('XML 응답 형식은 아직 구현되지 않았습니다.');
      return [];
    } else {
      // JSON 응답 처리
      const data = response.data;
      
      if (!data || !Array.isArray(data)) {
        console.error('유효한 교통안전정보 데이터가 아닙니다:', data);
        return [];
      }
      
      // 데이터 변환
      return data.map((item: any): SafetyData => {
        // 심각도 결정 (예: 사고다발지역은 HIGH, 기타는 MEDIUM 또는 LOW로 설정)
        let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
        if (item.L_CD === SafetyLargeCategory.ACCIDENT_PRONE) {
          severity = 'HIGH';
        } else if (item.L_CD === SafetyLargeCategory.PROTECTION_ZONE) {
          severity = 'LOW';
        }
        
        return {
          safetyId: item.SAFEDATA_ID || '',
          hasLocation: item.LOCATION_YN === 'Y',
          locationData: item.LOCATION_DATA,
          addressJibun: item.ADDRESS_JIBUN,
          addressRoad: item.ADDRESS_NEW,
          linkId: item.LINK_ID,
          reportDate: item.REPORT_DATE,
          largeCategory: item.L_CD,
          mediumCategory: item.M_CD,
          smallCategory: item.S_CD,
          locationType: item.LOCATION_TYPE_CD,
          addressCode: item.ADDR_CD,
          longitude: parseFloat(item.LOCATION_X) || 0,
          latitude: parseFloat(item.LOCATION_Y) || 0,
          description: item.DATA_DESC,
          vulnerableName: item.VUL_NAME,
          vulnerableType: item.VUL_TYPE,
          roadLength: item.ROAD_LEN ? parseFloat(item.ROAD_LEN) : undefined,
          roadCount: item.ROAD_CNT ? parseInt(item.ROAD_CNT, 10) : undefined,
          roadWidth: item.ROAD_LEN2 ? parseFloat(item.ROAD_LEN2) : undefined,
          hospitalInfo: item.HP_INFO,
          fireStationInfo: item.FS_INFO,
          policeInfo: item.POL_INFO,
          nearestIc: item.NEAR_IC,
          severity
        };
      });
    }
  } catch (error) {
    console.error('교통안전정보를 가져오는 중 오류가 발생했습니다:', error);
    throw error;
  }
};

/**
 * 교통안전정보 카테고리별 아이콘 경로 반환
 * 
 * @param largeCategory 대분류 코드
 * @param mediumCategory 중분류 코드
 * @returns 아이콘 경로
 */
export const getSafetyIconPath = (largeCategory: string, mediumCategory: string): string => {
  if (largeCategory === SafetyLargeCategory.ACCIDENT_PRONE) {
    return '/assets/icons/accident-prone.svg';
  } else if (largeCategory === SafetyLargeCategory.RISK_FACTOR) {
    switch (mediumCategory) {
      case SafetyMediumCategory.VEHICLE_TYPE:
        return '/assets/icons/vehicle-risk.svg';
      case SafetyMediumCategory.PEDESTRIAN:
        return '/assets/icons/pedestrian-risk.svg';
      case SafetyMediumCategory.LAW_VIOLATION:
        return '/assets/icons/law-violation.svg';
      case SafetyMediumCategory.ROAD_ENV:
        return '/assets/icons/road-risk.svg';
      default:
        return '/assets/icons/general-risk.svg';
    }
  } else if (largeCategory === SafetyLargeCategory.PROTECTION_ZONE) {
    return '/assets/icons/protection-zone.svg';
  }
  
  return '/assets/icons/general-safety.svg';
};

/**
 * 교통안전정보 카테고리별 색상 코드 반환
 * 
 * @param largeCategory 대분류 코드
 * @param severity 심각도
 * @returns 색상 코드
 */
export const getSafetyColor = (largeCategory: string, severity: 'LOW' | 'MEDIUM' | 'HIGH'): string => {
  if (severity === 'HIGH') {
    return '#f44336'; // 빨간색
  } else if (severity === 'MEDIUM') {
    return '#ff9800'; // 주황색
  } else if (largeCategory === SafetyLargeCategory.PROTECTION_ZONE) {
    return '#4caf50'; // 녹색
  } else {
    return '#2196f3'; // 파란색
  }
};

/**
 * 교통안전정보 카테고리별 설명 반환
 * 
 * @param largeCategory 대분류 코드
 * @param mediumCategory 중분류 코드
 * @returns 설명 문자열
 */
export const getSafetyCategoryName = (largeCategory: string, mediumCategory?: string): string => {
  if (largeCategory === SafetyLargeCategory.ACCIDENT_PRONE) {
    return '사고다발지역';
  } else if (largeCategory === SafetyLargeCategory.RISK_FACTOR) {
    if (!mediumCategory) return '위험요소';
    
    switch (mediumCategory) {
      case SafetyMediumCategory.VEHICLE_TYPE:
        return '차종별 위험요소';
      case SafetyMediumCategory.PEDESTRIAN:
        return '보행자별 위험요소';
      case SafetyMediumCategory.LAW_VIOLATION:
        return '법규위반별 위험요소';
      case SafetyMediumCategory.ROAD_ENV:
        return '도로환경별 위험요소';
      default:
        return '위험요소';
    }
  } else if (largeCategory === SafetyLargeCategory.PROTECTION_ZONE) {
    return '보호구역';
  }
  
  return '교통안전정보';
};