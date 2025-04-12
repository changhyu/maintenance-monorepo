/**
 * 공통 상수 정의 파일
 * 
 * 모든 패키지에서 공유하는 상수값들을 정의합니다.
 * 변경 가능성이 적은 값들을 중앙에서 관리하여 일관성을 유지합니다.
 */

// API 설정
export const API_CONFIG = {
  BASE_URL: process.env.API_URL || 'http://localhost:5000/api',
  TIMEOUT: 30000,
  CACHE_TTL: 60000, // 1분
  MAX_RETRIES: 3
};

// 상태 코드
export enum STATUS_CODES {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500
}

// 차량 상태
export enum VEHICLE_STATUS {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  STANDBY = 'standby',
  BROKEN = 'broken',
  NEEDS_INSPECTION = 'needsInspection'
}

// 정비 우선순위
export enum MAINTENANCE_PRIORITY {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// 정비 상태
export enum MAINTENANCE_STATUS {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'inProgress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// 날짜 형식
export const DATE_FORMATS = {
  API: 'YYYY-MM-DD',
  DISPLAY: 'YYYY년 MM월 DD일',
  DATETIME_DISPLAY: 'YYYY년 MM월 DD일 HH:mm',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
};

// 페이지네이션 기본값
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PER_PAGE: 10,
  SORT_ORDER: 'desc' as const
};

// 로컬 스토리지 키
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_INFO: 'user_info',
  THEME: 'app_theme',
  PREFERENCES: 'user_preferences'
}; 