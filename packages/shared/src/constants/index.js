/**
 * 공통 상수 정의 파일
 *
 * 모든 패키지에서 공유하는 상수값들을 정의합니다.
 * 변경 가능성이 적은 값들을 중앙에서 관리하여 일관성을 유지합니다.
 */
// API 설정
export const API_CONFIG = {
    BASE_URL: process.env.API_URL || 'https://api.car-goro.com/api',
    TIMEOUT: 30000,
    CACHE_TTL: 60000, // 1분
    MAX_RETRIES: 3
};
// 상태 코드
export var STATUS_CODES;
(function (STATUS_CODES) {
    STATUS_CODES[STATUS_CODES["OK"] = 200] = "OK";
    STATUS_CODES[STATUS_CODES["CREATED"] = 201] = "CREATED";
    STATUS_CODES[STATUS_CODES["BAD_REQUEST"] = 400] = "BAD_REQUEST";
    STATUS_CODES[STATUS_CODES["UNAUTHORIZED"] = 401] = "UNAUTHORIZED";
    STATUS_CODES[STATUS_CODES["FORBIDDEN"] = 403] = "FORBIDDEN";
    STATUS_CODES[STATUS_CODES["NOT_FOUND"] = 404] = "NOT_FOUND";
    STATUS_CODES[STATUS_CODES["INTERNAL_SERVER_ERROR"] = 500] = "INTERNAL_SERVER_ERROR";
})(STATUS_CODES || (STATUS_CODES = {}));
// 차량 상태
export var VEHICLE_STATUS;
(function (VEHICLE_STATUS) {
    VEHICLE_STATUS["ACTIVE"] = "active";
    VEHICLE_STATUS["MAINTENANCE"] = "maintenance";
    VEHICLE_STATUS["STANDBY"] = "standby";
    VEHICLE_STATUS["BROKEN"] = "broken";
    VEHICLE_STATUS["NEEDS_INSPECTION"] = "needsInspection";
})(VEHICLE_STATUS || (VEHICLE_STATUS = {}));
// 정비 우선순위
export var MAINTENANCE_PRIORITY;
(function (MAINTENANCE_PRIORITY) {
    MAINTENANCE_PRIORITY["LOW"] = "low";
    MAINTENANCE_PRIORITY["MEDIUM"] = "medium";
    MAINTENANCE_PRIORITY["HIGH"] = "high";
    MAINTENANCE_PRIORITY["URGENT"] = "urgent";
})(MAINTENANCE_PRIORITY || (MAINTENANCE_PRIORITY = {}));
// 정비 상태
export var MAINTENANCE_STATUS;
(function (MAINTENANCE_STATUS) {
    MAINTENANCE_STATUS["SCHEDULED"] = "scheduled";
    MAINTENANCE_STATUS["IN_PROGRESS"] = "inProgress";
    MAINTENANCE_STATUS["COMPLETED"] = "completed";
    MAINTENANCE_STATUS["CANCELLED"] = "cancelled";
})(MAINTENANCE_STATUS || (MAINTENANCE_STATUS = {}));
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
    SORT_ORDER: 'desc'
};
// 로컬 스토리지 키
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    USER_INFO: 'user_info',
    THEME: 'app_theme',
    PREFERENCES: 'user_preferences'
};
