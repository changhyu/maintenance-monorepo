import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import config from '../config';

/**
 * 기본 API 클라이언트 설정
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: config.apiTimeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * 요청 인터셉터
 * - 인증 토큰 추가
 * - 로깅
 */
apiClient.interceptors.request.use(
  (requestConfig) => {
    // 로컬 스토리지에서 토큰 가져오기
    const token = localStorage.getItem(config.tokenStorageKey);

    // 토큰이 있으면 헤더에 추가
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }

    // 요청 로깅
    if (config.enableLogging) {
      console.log('API Request:', {
        url: `${requestConfig.baseURL}${requestConfig.url}`,
        method: requestConfig.method,
        headers: requestConfig.headers,
        data: requestConfig.data,
      });
    }

    return requestConfig;
  },
  (error: AxiosError) => {
    // 요청 에러 로깅
    if (config.enableLogging) {
      console.error('API Request Error:', error);
    }
    return Promise.reject(error);
  }
);

/**
 * 응답 인터셉터
 * - 응답 로깅
 * - 인증 에러 처리
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 응답 로깅
    if (config.enableLogging) {
      console.log('API Response:', {
        url: response.config.url,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      });
    }

    return response;
  },
  async (error: AxiosError) => {
    // 응답 에러 로깅
    if (config.enableLogging) {
      console.error('API Response Error:', {
        url: error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
    }

    // 인증 에러 처리 (401)
    if (error.response?.status === 401) {
      // 리프레시 토큰으로 새 토큰 요청 로직
      // 여기에 토큰 갱신 로직 구현 (필요한 경우)
    }

    return Promise.reject(error);
  }
);

export default apiClient;