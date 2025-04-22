/**
 * API 클라이언트 설정
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// API 클라이언트 설정
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 요청 인터셉터 설정
api.interceptors.request.use(
  config => {
    // 요청 전 처리 (토큰 추가 등)
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 서버에서 설정한 CSRF 토큰 가져오기
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    // CSRF 토큰 헤더 추가
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  error => {
    // 요청 오류 처리
    return Promise.reject(error);
  }
);

// 응답 인터셉터 설정
api.interceptors.response.use(
  response => {
    // 응답 데이터 처리

    // 서버에서 새 CSRF 토큰을 받았을 경우 메타 태그 업데이트
    const newCsrfToken = response.headers['x-csrf-token'];
    if (newCsrfToken) {
      let metaTag = document.querySelector('meta[name="csrf-token"]');
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.name = 'csrf-token';
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', newCsrfToken);
    }

    return response;
  },
  error => {
    // 응답 오류 처리 (401 토큰 만료 등)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('authToken');
      // 로그인 페이지로 리디렉션 필요 시 구현
    }
    return Promise.reject(error);
  }
);

/**
 * 통합 API 요청 함수
 * @param config Axios 요청 설정
 * @returns 응답 데이터
 * @throws 요청 오류
 */
export const apiRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await api(config);
    return response.data;
  } catch (error) {
    console.error('API 요청 오류:', error);
    throw error;
  }
};

// 이전 코드와의 호환성을 위해 apiClient 별칭 내보내기
export const apiClient = api;
export default api;
