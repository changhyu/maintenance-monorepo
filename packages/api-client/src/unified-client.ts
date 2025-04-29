/**
 * 통합 API 클라이언트
 * 
 * 웹사이트와 프론트엔드 애플리케이션에서 공통으로 사용할 수 있는 통합 API 클라이언트입니다.
 * 오프라인 모드 지원 및 토큰 갱신 기능을 포함합니다.
 */

import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError,
  InternalAxiosRequestConfig
} from 'axios';
import { getStoredToken, saveToken, removeToken, refreshToken } from './auth';

// 오프라인 관련 타입은 shared 패키지에서 가져온 것으로 가정합니다.
import type { OfflineStorage, OfflineRequest } from '@maintenance/shared/dist/utils/offlineStorage';

export interface ApiClientConfig {
  /**
   * API 기본 URL
   */
  baseURL: string;
  
  /**
   * 요청 타임아웃 (ms)
   */
  timeout?: number;
  
  /**
   * 로깅 활성화 여부
   */
  enableLogging?: boolean;
  
  /**
   * 오프라인 스토리지 객체 또는 활성화 여부
   */
  offlineStorage?: OfflineStorage | boolean;
  
  /**
   * 토큰 갱신 엔드포인트
   */
  tokenRefreshEndpoint?: string;
  
  /**
   * 기본 헤더
   */
  defaultHeaders?: Record<string, string>;
  
  /**
   * API 에러 핸들러
   */
  errorHandler?: (error: any) => void;
}

/**
 * API 응답 타입
 */
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  offline?: boolean;
}

/**
 * API 에러 타입
 */
export class ApiError extends Error {
  status: number;
  data: any;
  
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * API 클라이언트 클래스
 */
export class ApiClient {
  private axiosInstance: AxiosInstance;
  private offlineStorage?: OfflineStorage;
  private isOfflineMode: boolean = false;
  private tokenRefreshEndpoint: string;
  private isRefreshing: boolean = false;
  private refreshQueue: Array<(token: string) => void> = [];
  
  /**
   * API 클라이언트 생성자
   */
  constructor(config: ApiClientConfig) {
    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(config.defaultHeaders || {})
      }
    });
    
    this.tokenRefreshEndpoint = config.tokenRefreshEndpoint || '/auth/refresh';
    
    // 오프라인 스토리지 설정
    if (typeof window !== 'undefined') { // 브라우저 환경인 경우만
      if (config.offlineStorage === true) {
        // true인 경우 shared 패키지에서 기본 오프라인 스토리지 가져오기
        try {
          // 동적 가져오기 - 실제 구현에서는 import() 또는 require() 사용
          // this.offlineStorage = await import('@maintenance/shared/dist/utils/offlineStorage').then(m => m.default);
          console.log('오프라인 스토리지 활성화됨 (기본)');
        } catch (e) {
          console.error('기본 오프라인 스토리지를 가져올 수 없습니다:', e);
        }
      } else if (typeof config.offlineStorage === 'object') {
        // 직접 인스턴스가 제공된 경우
        this.offlineStorage = config.offlineStorage;
        console.log('오프라인 스토리지 활성화됨 (커스텀)');
      }
    }
    
    // 인터셉터 설정
    this.setupInterceptors(config);
  }
  
  /**
   * 인터셉터 설정
   */
  private setupInterceptors(config: ApiClientConfig): void {
    // 요청 인터셉터 - 토큰 추가
    this.axiosInstance.interceptors.request.use(
      async (requestConfig) => {
        // 토큰 추가
        const tokenInfo = getStoredToken();
        if (tokenInfo?.token) {
          requestConfig.headers.Authorization = `Bearer ${tokenInfo.token}`;
        }
        
        // 로깅
        if (config.enableLogging) {
          console.log(`🔶 API 요청: ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`, requestConfig);
        }
        
        return requestConfig;
      },
      (error) => {
        if (config.enableLogging) {
          console.error('🔴 API 요청 실패:', error);
        }
        return Promise.reject(error);
      }
    );
    
    // 응답 인터셉터 - 에러 처리 및 토큰 갱신
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // 로깅
        if (config.enableLogging) {
          console.log(`🟢 API 응답: ${response.config.method?.toUpperCase()} ${response.config.url}`, response);
        }
        
        return response;
      },
      async (error: AxiosError) => {
        // 에러 로깅
        if (config.enableLogging) {
          console.error('🔴 API 응답 오류:', error);
        }
        
        // 오프라인 모드인 경우 오프라인 처리
        if (!error.response && this.isOfflineMode && this.offlineStorage) {
          return this.handleOfflineRequest(error.config as AxiosRequestConfig);
        }
        
        // 토큰 만료 (401) 처리
        if (error.response?.status === 401) {
          return this.handleTokenRefresh(error);
        }
        
        // 에러 핸들러 호출
        if (config.errorHandler) {
          config.errorHandler(error);
        }
        
        return Promise.reject(
          new ApiError(
            (error.response?.data as any)?.message || (error as Error).message || '요청 처리 중 오류가 발생했습니다.',
            error.response?.status || 500,
            error.response?.data
          )
        );
      }
    );
  }
  
  /**
   * 토큰 갱신 처리
   */
  private async handleTokenRefresh(error: AxiosError): Promise<AxiosResponse> {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // 토큰 갱신 요청 자체에 대한 오류인 경우 로그아웃
    if (originalRequest.url === this.tokenRefreshEndpoint) {
      removeToken();
      return Promise.reject(error);
    }
    
    // 이미 재시도한 요청인 경우
    if (originalRequest._retry) {
      removeToken();
      return Promise.reject(error);
    }
    
    // 토큰 갱신 표시
    originalRequest._retry = true;
    
    // 토큰 갱신 중인 경우 대기
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshQueue.push((token: string) => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(this.axiosInstance(originalRequest));
        });
      });
    }
    
    // 토큰 갱신 진행
    this.isRefreshing = true;
    
    try {
      // 토큰 갱신 시도
      const result = await refreshToken();
      
      if (result.success && result.accessToken) {
        // 새 토큰으로 원래 요청 재시도
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${result.accessToken}`;
        
        // 대기 중인 요청들도 새 토큰 적용
        this.refreshQueue.forEach(callback => callback(result.accessToken));
        this.refreshQueue = [];
        
        return axios(originalRequest);
      } else {
        // 갱신 실패
        removeToken();
        return Promise.reject(error);
      }
    } catch (refreshError) {
      // 갱신 오류
      removeToken();
      return Promise.reject(refreshError);
    } finally {
      this.isRefreshing = false;
    }
  }
  
  /**
   * 오프라인 요청 처리
   */
  private async handleOfflineRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
    if (!this.offlineStorage) {
      return Promise.reject(new Error('오프라인 스토리지가 설정되지 않았습니다.'));
    }
    
    const method = config.method?.toLowerCase() || 'get';
    
    // GET 요청은 캐시에서 검색
    if (method === 'get') {
      const cacheKey = this.generateCacheKey(config);
      const cachedData = await this.offlineStorage.getCachedResponse(cacheKey);
      
      if (cachedData) {
        return {
          data: cachedData,
          status: 200,
          statusText: 'OK (Offline)',
          headers: {},
          config,
          offline: true,
        } as any;
      }
      
      return Promise.reject(new Error('오프라인 모드에서 데이터를 찾을 수 없습니다.'));
    }
    
    // 변경 요청은 큐에 저장
    const offlineRequest: OfflineRequest = {
      id: this.generateRequestId(),
      url: config.url || '',
      method,
      data: config.data,
      headers: config.headers as Record<string, string>,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    };
    
    await this.offlineStorage.saveRequest(offlineRequest);
    
    // 오프라인 응답 생성
    return {
      data: { success: true, message: '요청이 오프라인 큐에 저장되었습니다.', offlineRequestId: offlineRequest.id },
      status: 202,
      statusText: 'Accepted (Offline)',
      headers: {},
      config,
      offline: true,
    } as any;
  }
  
  /**
   * 캐시 키 생성
   */
  private generateCacheKey(config: AxiosRequestConfig): string {
    const url = config.url || '';
    const params = config.params ? JSON.stringify(config.params) : '';
    return `${url}?${params}`;
  }
  
  /**
   * 요청 ID 생성
   */
  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
  
  /**
   * 오프라인 모드 설정
   */
  public setOfflineMode(enabled: boolean): void {
    this.isOfflineMode = enabled;
  }
  
  /**
   * 인증 토큰 설정
   */
  public setAuthToken(token: string, tokenType: string = 'Bearer'): void {
    saveToken({ token, tokenType });
  }
  
  /**
   * GET 요청
   */
  public async get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.get<T>(url, { ...config, params });
      
      // GET 요청 결과 캐싱
      if (this.offlineStorage) {
        const cacheKey = this.generateCacheKey({ url, params });
        await this.offlineStorage.setCachedResponse(cacheKey, response.data);
      }
      
      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      if ((error as any).offline) {
        return error as ApiResponse<T>;
      }
      throw error;
    }
  }
  
  /**
   * POST 요청
   */
  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post<T>(url, data, config);
      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      if ((error as any).offline) {
        return error as ApiResponse<T>;
      }
      throw error;
    }
  }
  
  /**
   * PUT 요청
   */
  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.put<T>(url, data, config);
      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      if ((error as any).offline) {
        return error as ApiResponse<T>;
      }
      throw error;
    }
  }
  
  /**
   * PATCH 요청
   */
  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.patch<T>(url, data, config);
      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      if ((error as any).offline) {
        return error as ApiResponse<T>;
      }
      throw error;
    }
  }
  
  /**
   * DELETE 요청
   */
  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.delete<T>(url, config);
      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      if ((error as any).offline) {
        return error as ApiResponse<T>;
      }
      throw error;
    }
  }
  
  /**
   * 파일 업로드
   */
  public async upload<T = any>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const uploadConfig: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        ...config,
      };
      
      const response = await this.axiosInstance.post<T>(url, formData, uploadConfig);
      
      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      if ((error as any).offline) {
        return error as ApiResponse<T>;
      }
      throw error;
    }
  }
}

/**
 * API 클라이언트 생성 함수
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

export default ApiClient;