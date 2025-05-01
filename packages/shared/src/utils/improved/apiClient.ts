/**
 * API 클라이언트 구현
 * 애플리케이션에서 백엔드 API와 통신하기 위한 표준화된 클라이언트입니다.
 */
import axios from 'axios';
// @ts-ignore - axios 타입 호환성 이슈 회피
import type { 
  AxiosInstance, 
  AxiosRequestConfig,
  AxiosResponse, 
  AxiosError
} from 'axios';
// axios 헬퍼 함수
import { isAxiosError, isCancel } from 'axios';

import {
  ApplicationError,
  NetworkError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ServerError,
  TimeoutError,
  OfflineError,
  CancelledError,
  ApiError
} from './errorTypes';

/**
 * API 클라이언트 설정 인터페이스
 */
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
  authTokenProvider?: () => string | null | undefined;
  unauthorizedHandler?: () => void;
  offlineMode?: boolean;
  offlineStorage?: OfflineStorage;
  retryConfig?: RetryConfig;
}

/**
 * 재시도 설정 인터페이스
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryStatusCodes: number[];
}

/**
 * 오프라인 저장소 인터페이스
 */
export interface OfflineStorage {
  saveRequest: (request: OfflineRequest) => Promise<void>;
  getRequests: () => Promise<OfflineRequest[]>;
  removeRequest: (id: string) => Promise<void>;
  clearRequests: () => Promise<void>;
}

/**
 * 오프라인 요청 인터페이스
 */
export interface OfflineRequest {
  id: string;
  url: string;
  method: string;
  data?: unknown;
  headers?: Record<string, string>;
  timestamp: number;
  priority?: number; // 숫자가 낮을수록 우선순위가 높음
}

// API 응답 데이터 인터페이스
interface ApiResponseData {
  message?: string;
  errors?: Record<string, string[]>;
  code?: string;
  [key: string]: any;
}

// 기본 API 클라이언트 설정
const DEFAULT_CONFIG: Partial<ApiClientConfig> = {
  timeout: 30000, // 30초
  withCredentials: true,
  offlineMode: false,
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000, // 1초
    retryStatusCodes: [408, 429, 500, 502, 503, 504]
  }
};

/**
 * API 클라이언트 클래스
 * RESTful API 호출을 위한 표준화된 인터페이스를 제공합니다.
 */
export class ApiClient {
  // Axios 인스턴스
  private axiosInstance: AxiosInstance;
  
  // 설정 옵션
  private config: ApiClientConfig;
  
  // 오프라인 모드
  private isOfflineMode: boolean;
  
  // 인증 토큰 제공자
  private authTokenProvider?: () => string | null | undefined;
  
  // 인증 오류 핸들러
  private handleUnauthorized?: () => void;
  
  // 오프라인 저장소
  private offlineStorage?: OfflineStorage;
  
  // 재시도 설정
  private retryConfig: RetryConfig;

  // 요청 재시도 횟수 추적을 위한 맵
  private retryCountMap: Map<string, number> = new Map();
  
  /**
   * API 클라이언트 생성자
   * @param config API 클라이언트 설정
   */
  constructor(config: ApiClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as ApiClientConfig;
    this.isOfflineMode = this.config.offlineMode || false;
    this.authTokenProvider = this.config.authTokenProvider;
    this.handleUnauthorized = this.config.unauthorizedHandler;
    this.offlineStorage = this.config.offlineStorage;
    this.retryConfig = this.config.retryConfig as RetryConfig;
    
    // Axios 인스턴스 생성
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: this.config.headers,
      withCredentials: this.config.withCredentials
    });
    
    // 인터셉터 설정
    this.setupInterceptors();
  }
  
  /**
   * 요청 및 응답 인터셉터 설정
   */
  private setupInterceptors(): void {
    // 요청 인터셉터
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // 인증 토큰 추가
        if (this.authTokenProvider) {
          const token = this.authTokenProvider();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        
        if (this.isOfflineMode) {
          // 오프라인 저장소가 있으면 요청 저장
          if (this.offlineStorage && config.method !== 'get') {
            const offlineRequest: OfflineRequest = {
              id: this.generateRequestId(),
              url: config.url || '',
              method: config.method || 'get',
              data: config.data,
              headers: config.headers as Record<string, string>,
              timestamp: Date.now()
            };
            
            this.offlineStorage.saveRequest(offlineRequest)
              .catch(error => console.error('오프라인 요청 저장 실패:', error));
          }
          
          // GET 요청이 아니면 오프라인 오류 발생
          if (config.method !== 'get') {
            return Promise.reject(new OfflineError());
          }
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // 응답 인터셉터
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponseData>) => {
        if (error.response?.status === 401) {
          if (this.handleUnauthorized) {
            this.handleUnauthorized();
          }
          return Promise.reject(new UnauthorizedError('인증이 필요합니다.'));
        }
        
        // 재시도 대상 상태 코드인 경우
        if (
          error.config && 
          this.retryConfig.retryStatusCodes.includes(error.response?.status || 0)
        ) {
          const requestId = this.getRequestId(error.config);
          const retryCount = this.retryCountMap.get(requestId) || 0;
          
          if (retryCount < this.retryConfig.maxRetries) {
            return this.retryRequest(error.config, requestId, retryCount);
          }
        }
        
        // 타임아웃 오류
        if (error.code === 'ECONNABORTED') {
          return Promise.reject(new TimeoutError('요청 시간이 초과되었습니다.'));
        }
        
        // 네트워크 연결 오류
        if (!error.response) {
          return Promise.reject(new NetworkError('네트워크 연결 오류가 발생했습니다.'));
        }
        
        const errorData = error.response.data || {};
        const errorMessage = errorData.message || '';
        
        // HTTP 상태 코드에 따른 적절한 오류 객체 생성
        switch (error.response.status) {
          case 403:
            return Promise.reject(new ForbiddenError(
              errorMessage || '접근 권한이 없습니다.',
              errorData
            ));
          case 404:
            return Promise.reject(new NotFoundError(
              errorMessage || '요청한 리소스를 찾을 수 없습니다.',
              errorData
            ));
          case 400:
          case 422:
            return Promise.reject(new ValidationError(
              errorMessage || '입력 값이 유효하지 않습니다.',
              errorData.errors || {},
              error.response.status,
              errorData
            ));
          case 500:
          case 502:
          case 503:
          case 504:
            return Promise.reject(new ServerError(
              errorMessage || '서버 오류가 발생했습니다.',
              errorData
            ));
          default:
            // 일반 API 오류
            return Promise.reject(
              new ApiError(
                errorMessage || '요청 처리 중 오류가 발생했습니다.',
                error.response.status,
                errorData
              )
            );
        }
      }
    );
  }

  /**
   * 요청 ID 생성
   * @param config Axios 요청 설정
   * @returns 요청 ID
   */
  private getRequestId(config: AxiosRequestConfig): string {
    // 메서드, URL, 파라미터를 기반으로 요청 식별자 생성
    const method = config.method || 'get';
    const url = config.url || '';
    const params = config.params ? JSON.stringify(config.params) : '';
    const data = config.data ? JSON.stringify(config.data) : '';
    
    return `${method}:${url}:${params}:${data}`;
  }
  
  /**
   * 요청 재시도
   * @param config Axios 요청 설정
   * @param requestId 요청 식별자
   * @param retryCount 현재 재시도 횟수
   * @returns Promise<any>
   */
  private async retryRequest(
    config: AxiosRequestConfig, 
    requestId: string,
    retryCount: number
  ): Promise<any> {
    // 재시도 횟수 증가
    const newRetryCount = retryCount + 1;
    this.retryCountMap.set(requestId, newRetryCount);
    
    // 재시도 전 지연
    const delay = this.retryConfig.retryDelay * newRetryCount;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      // 재시도 요청 수행
      const response = await this.axiosInstance.request(config);
      
      // 성공 시 재시도 횟수 맵에서 해당 요청 제거
      this.retryCountMap.delete(requestId);
      
      return response;
    } catch (error) {
      // 오류 발생 시 재시도 횟수가 최대 재시도 횟수 이상이면 요청 실패로 간주
      if (newRetryCount >= this.retryConfig.maxRetries) {
        this.retryCountMap.delete(requestId);
      }
      throw error;
    }
  }
  
  /**
   * 요청 ID 생성
   * @returns 요청 ID
   */
  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString();
  }
  
  /**
   * GET 요청
   * @param url 요청 URL
   * @param params URL 매개변수
   * @param config Axios 요청 설정
   * @returns Promise<T>
   */
  public async get<T = any>(url: string, params?: Record<string, any>, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.get<T>(url, { ...config, params });
      return response.data;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw this.handleAxiosError(error);
    }
  }
  
  /**
   * POST 요청
   * @param url 요청 URL
   * @param data 요청 본문 데이터
   * @param config Axios 요청 설정
   * @returns Promise<T>
   */
  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw this.handleAxiosError(error);
    }
  }
  
  /**
   * PUT 요청
   * @param url 요청 URL
   * @param data 요청 본문 데이터
   * @param config Axios 요청 설정
   * @returns Promise<T>
   */
  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw this.handleAxiosError(error);
    }
  }
  
  /**
   * PATCH 요청
   * @param url 요청 URL
   * @param data 요청 본문 데이터
   * @param config Axios 요청 설정
   * @returns Promise<T>
   */
  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.patch<T>(url, data, config);
      return response.data;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw this.handleAxiosError(error);
    }
  }
  
  /**
   * DELETE 요청
   * @param url 요청 URL
   * @param config Axios 요청 설정
   * @returns Promise<T>
   */
  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.delete<T>(url, config);
      return response.data;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw this.handleAxiosError(error);
    }
  }
  
  /**
   * Axios 오류 처리
   * @param error Axios 오류
   * @returns ApplicationError
   */
  private handleAxiosError(error: any): ApplicationError {
    if (isCancel(error)) {
      return new CancelledError('요청이 취소되었습니다.');
    }
    
    if (error.message === 'Network Error') {
      return new NetworkError('네트워크 연결 오류가 발생했습니다.');
    }
    
    if (error.code === 'ECONNABORTED') {
      return new TimeoutError('요청 시간이 초과되었습니다.');
    }
    
    return new ApplicationError(error.message || '알 수 없는 오류가 발생했습니다.');
  }
  
  /**
   * 오프라인 모드 설정
   * @param enabled 활성화 여부
   */
  public setOfflineMode(enabled: boolean): void {
    this.isOfflineMode = enabled;
  }
  
  /**
   * 오프라인 요청 동기화
   * 네트워크 연결이 복구되었을 때 저장된 요청을 처리합니다.
   */
  public async syncOfflineRequests(): Promise<void> {
    if (!this.offlineStorage || this.isOfflineMode) {
      return;
    }
    
    try {
      // 저장된 요청 가져오기
      const requests = await this.offlineStorage.getRequests();
      
      if (requests.length === 0) {
        return;
      }
      
      // 우선순위 순으로 정렬
      const sortedRequests = [...requests].sort((a, b) => (a.priority || 0) - (b.priority || 0));
      
      // 요청 처리
      for (const request of sortedRequests) {
        try {
          await this.axiosInstance.request({
            url: request.url,
            method: request.method,
            data: request.data,
            headers: request.headers
          });
          
          // 성공 시 요청 제거
          await this.offlineStorage.removeRequest(request.id);
        } catch (error) {
          console.error('오프라인 요청 동기화 실패:', error);
          // 오류 발생 시 다음 요청으로 계속 진행
        }
      }
    } catch (error) {
      console.error('오프라인 요청 동기화 처리 중 오류:', error);
    }
  }
}

/**
 * 기본 설정으로 API 클라이언트 생성
 */
const createDefaultApiClient = (): ApiClient => {
  const baseURL = typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_API_URL) || 
                 typeof window !== 'undefined' && (window as any).API_BASE_URL || 
                 'http://localhost:8000';
  
  const getAuthToken = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('auth_token');
    }
    return null;
  };
  
  const handleUnauthorized = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
      
      // 로그인 페이지가 아닌 경우에만 리다이렉트
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
  };
  
  return new ApiClient({
    baseURL,
    authTokenProvider: getAuthToken,
    unauthorizedHandler: handleUnauthorized
  });
};

/**
 * 기본 설정의 API 클라이언트 인스턴스
 */
export const apiClient = createDefaultApiClient();

/**
 * 커스텀 API 클라이언트 생성
 * @param config API 클라이언트 설정
 * @returns ApiClient 인스턴스
 */
export const createApiClient = (config: ApiClientConfig): ApiClient => {
  return new ApiClient(config);
};

export default apiClient;
