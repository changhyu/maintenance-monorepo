import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import config from '../config';

/**
 * HTTP 클라이언트 기본 설정
 */
const defaultConfig: AxiosRequestConfig = {
  baseURL: config.apiUrl,
  timeout: config.apiTimeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

/**
 * HTTP 클라이언트 인스턴스 생성
 */
export const createHttpClient = (customConfig?: AxiosRequestConfig): AxiosInstance => {
  const axiosInstance = axios.create({
    ...defaultConfig,
    ...customConfig,
  });

  // 요청 인터셉터 설정
  axiosInstance.interceptors.request.use(
    (config) => {
      // 토큰이 필요한 경우 여기서 토큰을 추가
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // 요청 로깅 (개발 모드에서만)
      if (process.env.NODE_ENV === 'development' && config.enableLogging) {
        console.log('API 요청:', {
          url: config.url,
          method: config.method,
          data: config.data,
          params: config.params,
        });
      }

      return config;
    },
    (error) => {
      console.error('API 요청 오류:', error);
      return Promise.reject(error);
    }
  );

  // 응답 인터셉터 설정
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      // 응답 로깅 (개발 모드에서만)
      if (process.env.NODE_ENV === 'development' && config.enableLogging) {
        console.log('API 응답:', {
          url: response.config.url,
          status: response.status,
          data: response.data,
        });
      }

      return response;
    },
    (error: AxiosError) => {
      const { response } = error;
      
      // 오류 로깅
      console.error('API 응답 오류:', {
        url: error.config?.url,
        status: response?.status,
        data: response?.data,
      });

      // 인증 관련 오류 처리 (401 Unauthorized)
      if (response?.status === 401) {
        // 토큰 갱신 또는 로그아웃 처리
        // localStorage.removeItem('accessToken');
        // window.location.href = '/login';
      }

      return Promise.reject(error);
    }
  );

  return axiosInstance;
};

// 기본 HTTP 클라이언트 인스턴스 생성
export const httpClient = createHttpClient();

/**
 * API 응답 데이터 추출 유틸리티
 */
export const extractResponseData = <T>(response: AxiosResponse<T>): T => response.data;

/**
 * 에러 메시지 추출 유틸리티
 */
export const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // API 응답에서 오류 메시지 추출
    const responseData = error.response?.data as any;
    if (responseData?.message) {
      return responseData.message;
    }
    if (responseData?.error) {
      return responseData.error;
    }
    if (error.message) {
      return error.message;
    }
  }

  // 일반적인 오류 처리
  if (error instanceof Error) {
    return error.message;
  }

  return '알 수 없는 오류가 발생했습니다.';
};