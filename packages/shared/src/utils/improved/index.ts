/**
 * 차량 정비 관리 시스템의 공통 유틸리티 모듈
 * 
 * 이 파일은 모든 공통 유틸리티 함수와 객체를 내보냅니다.
 * 하나의 진입점(entry point)을 통해 모든 유틸리티에 접근할 수 있도록 합니다.
 */

import {
  formatDate,
  getCurrentDate,
  isValidDate,
  dateDiff,
  addToDate,
  subtractFromDate,
  relativeTimeFromNow,
  isValidDateRange,
  isValidDateString,
  isSameDay,
  isToday,
  isPast,
  isFuture,
  getMonthName,
  getDayName,
  getMoreRecentDate,
  startOfDay,
  endOfDay,
  getDateRange,
  formatLocalizedDate,
  toDateObject,
  DateFormat,
  dateUtils,
  type DateInput
} from './dateUtils';

import {
  apiClient,
  createApiClient,
  ApiClient,
  type ApiClientConfig,
  type OfflineStorage,
  type OfflineRequest,
  type RetryConfig
} from './apiClient';

import {
  ApplicationError,
  NetworkError,
  UnauthorizedError,
  ApiError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  DuplicateError,
  ServerError,
  TimeoutError,
  OfflineError,
  CancelledError,
  createErrorFromResponse,
  parseErrorMessage,
  parseErrorCode,
  errorTypes
} from './errorTypes';

export const dates = {
  format: formatDate,
  getCurrent: getCurrentDate,
  isValid: isValidDate,
  diff: dateDiff,
  add: addToDate,
  subtract: subtractFromDate,
  relativeTime: relativeTimeFromNow,
  isValidRange: isValidDateRange,
  isValidString: isValidDateString,
  isSameDay,
  isToday,
  isPast,
  isFuture,
  getMonthName,
  getDayName,
  getMoreRecent: getMoreRecentDate,
  startOfDay,
  endOfDay,
  getRange: getDateRange,
  formatLocalized: formatLocalizedDate,
  toObject: toDateObject,
  DateFormat
};

/**
 * API 관련 유틸리티
 */
export const api = {
  client: apiClient,
  createClient: createApiClient,
  ApiClient
};

/**
 * 에러 관련 유틸리티
 */
export const errors = {
  ApplicationError,
  NetworkError,
  UnauthorizedError,
  ApiError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  DuplicateError,
  ServerError,
  TimeoutError,
  OfflineError,
  CancelledError,
  createFromResponse: createErrorFromResponse,
  parseMessage: parseErrorMessage,
  parseCode: parseErrorCode
};

// 모든 유틸리티 함수들 내보내기
export {
  // 날짜 유틸리티
  dateUtils,
  DateFormat,
  formatDate,
  getCurrentDate,
  isValidDate,
  dateDiff,
  addToDate,
  subtractFromDate,
  relativeTimeFromNow,
  isValidDateRange,
  isValidDateString,
  isSameDay,
  isToday,
  isPast,
  isFuture,
  getMonthName,
  getDayName,
  getMoreRecentDate,
  startOfDay,
  endOfDay,
  getDateRange,
  formatLocalizedDate,
  toDateObject,
  
  // API 클라이언트
  apiClient,
  createApiClient,
  ApiClient,
  
  // 에러 타입
  errorTypes,
  ApplicationError,
  NetworkError,
  UnauthorizedError,
  ApiError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  DuplicateError,
  ServerError,
  TimeoutError,
  OfflineError,
  CancelledError,
  createErrorFromResponse,
  parseErrorMessage,
  parseErrorCode
};

// 타입 내보내기
export type {
  DateInput,
  ApiClientConfig,
  OfflineStorage,
  OfflineRequest,
  RetryConfig
};

// 기본 내보내기 - 모든 유틸리티를 포함하는 객체
export default {
  dates,
  api,
  errors
};
