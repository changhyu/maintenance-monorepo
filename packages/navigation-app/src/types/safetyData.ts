// Traffic Safety Data Types from Korean Police Agency
// Based on TASS (Traffic Accident Analysis System) data

export interface SafetyDataPoint {
  SAFEDATA_ID: string;         // 안전데이터 ID
  LOCATION_YN: 'Y' | 'N';      // 형상정보 존재여부
  LOCATION_DATA?: string;      // 형상정보(WKT)
  ADDRESS_JIBUN?: string;      // 지번주소
  LINK_ID?: string;            // 관련 링크ID
  REPORT_DATE?: string;        // 데이터 기준일자
  ADDRESS_NEW?: string;        // 도로명주소
  L_CD?: string;               // 안전데이터 대분류코드
  M_CD?: string;               // 안전데이터 중분류코드
  S_CD?: string;               // 안전데이터 소분류코드
  LOCATION_TYPE_CD?: string;   // 형상정보 종류코드
  ADDR_CD?: string;            // 법정동코드
  LOCATION_X?: number;         // 경도
  LOCATION_Y?: number;         // 위도
  DATA_DESC?: string;          // 상세내용
  VUL_NAME?: string;           // 구간명칭
  VUL_TYPE?: string;           // 구간유형
  ROAD_LEN?: number;           // 구간길이
  ROAD_CNT?: number;           // 구간차로
  ROAD_LEN2?: number;          // 구간차로폭
  HP_INFO?: string;            // 병원정보
  FS_INFO?: string;            // 소방서정보
  POL_INFO?: string;           // 경찰처정보
  NEAR_IC?: string;            // 최인접IC
}

// 안전데이터 대분류
export enum SafetyDataMajorCategory {
  ACCIDENT_PRONE_AREA = '1',    // 사고다발지역
  RISK_FACTOR = '2',           // 위험요소
}

// 안전데이터 중분류 (위험요소)
export enum SafetyDataMiddleCategory {
  VEHICLE_TYPE = '21',         // 차종별
  PEDESTRIAN = '22',           // 보행자별
  LAW_VIOLATION = '23',        // 법규위반별
  ROAD_ENVIRONMENT = '24',     // 도로환경별
}

// 형상정보 종류
export enum LocationType {
  POINT = 'P',                 // 포인트
  LINE = 'L',                  // 라인
  POLYGON = 'A',               // 영역
}

// WKT 형상정보를 파싱하기 위한 유틸리티 타입
export interface GeoShape {
  type: 'Point' | 'LineString' | 'Polygon';
  coordinates: number[][] | number[] | number[][][];
}

// 안전정보와 관련된 교통 이벤트
export interface SafetyEvent {
  id: string;
  safetyData: SafetyDataPoint;
  severity: 1 | 2 | 3;         // 1: 정보성, 2: 주의, 3: 경고
  expirationDate?: Date;       // 정보 만료일
}