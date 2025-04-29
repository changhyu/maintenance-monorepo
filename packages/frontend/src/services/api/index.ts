/**
 * API 클라이언트 및 서비스 모듈 인덱스 파일
 * 
 * 중앙 API 클라이언트 인스턴스 및 도메인별 API 서비스를 제공합니다.
 */

import { ApiClient } from '@maintenance/api-client';
import { getStoredToken } from '@maintenance/api-client/dist/auth';

// API 클라이언트 설정
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';
const isProduction = process.env.NODE_ENV === 'production';

// API 클라이언트 인스턴스 생성
export const apiClient = new ApiClient({
  baseURL: API_BASE_URL,
  timeout: 30000,
  enableLogging: !isProduction,
  offlineStorage: true,
  tokenRefreshEndpoint: '/auth/refresh'
});

// 기존 토큰이 있으면 API 클라이언트에 설정
const initApiClient = () => {
  try {
    const tokenInfo = getStoredToken();
    if (tokenInfo && tokenInfo.token) {
      apiClient.setAuthToken(tokenInfo.token, tokenInfo.tokenType);
    }
  } catch (error) {
    console.error('API 클라이언트 초기화 오류:', error);
  }
};

// 초기화 실행
initApiClient();

// @maintenance/api-client에서 다시 내보내기
export * from '@maintenance/api-client/dist/auth';
export * from '@maintenance/api-client/dist/hooks';

// 도메인별 API 서비스
export * from './domain';

/**
 * API 서비스 모듈 내보내기
 */

// API 클라이언트 기본 클래스
export { ApiClientCore } from './core';
export { ApiClient } from './api-client';

// 기본 인스턴스
export { default as apiClient } from './api-client';

// 인증 관련 유틸리티
export * from './auth-helpers';

// 알림 관련 유틸리티
export * from './notifications';

// 타입 정의
export * from './types';

// 도메인별 API 클라이언트
export * from './domain';