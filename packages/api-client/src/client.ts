import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// 재시도 로직을 위한 확장된 요청 구성 인터페이스
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _retryCount?: number;
}

export interface ApiClientConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
  headers?: Record<string, string>;
  cacheTTL?: number; // 캐시 유효 시간(ms)
  maxRetries?: number; // 최대 재시도 횟수
  retryDelay?: number; // 재시도 간 대기 시간(ms)
  enableLogging?: boolean; // 로깅 활성화 여부
}

// API 오류 응답을 위한 인터페이스
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// 응답 데이터를 위한 기본 인터페이스
export interface ApiResponse<T = unknown> {
  data: T;
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
  };
}

// 기존 코드와 호환성을 위해 유지
export interface ApiResponse {
  [key: string]: unknown;
}

export class ApiClient {
  private client: AxiosInstance;
  private tokenRefreshPromise: Promise<string> | null = null;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL: number;
  private maxRetries: number;
  private retryDelay: number;
  private logger?: (message: string, data?: any) => void;

  constructor(config: ApiClientConfig) {
    this.cacheTTL = config.cacheTTL || 60000; // 기본값 1분
    this.maxRetries = config.maxRetries || 3; // 기본값 3회
    this.retryDelay = config.retryDelay || 1000; // 기본값 1초

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'X-API-Key': config.apiKey }),
        ...config.headers,
      },
    });

    // 요청 인터셉터 추가
    this.client.interceptors.request.use(
      (config) => {
        // 요청 전 처리
        if (this.logger) {
          this.logger(`API 요청: ${config.method?.toUpperCase()} ${config.url}`, {
            params: config.params,
            data: config.data
          });
        }
        return config;
      },
      (error) => {
        if (this.logger) {
          this.logger(`API 요청 오류: ${error.message}`, error);
        }
        return Promise.reject(error);
      }
    );

    // 응답 인터셉터 추가
    this.client.interceptors.response.use(
      (response) => {
        if (this.logger) {
          this.logger(`API 응답 성공: ${response.status} ${response.config.url}`, {
            data: response.data
          });
        }
        return response;
      },
      async (error: AxiosError) => {
        if (this.logger) {
          this.logger(`API 응답 오류: ${error.message}`, {
            status: error.response?.status,
            data: error.response?.data
          });
        }

        // 토큰 만료 시 자동 갱신 시도 (401 오류)
        if (error.response?.status === 401 && error.config) {
          // 토큰 갱신 API 호출에서 실패한 경우는 재시도하지 않음
          if (error.config.url?.includes('/auth/refresh')) {
            return Promise.reject(error);
          }

          try {
            // 토큰 갱신 시도
            await this.refreshAuthToken();
            
            // 원래 요청 재시도
            const originalRequest = error.config;
            return this.client(originalRequest);
          } catch (refreshError) {
            // 토큰 갱신 실패 시 원래 오류 반환
            return Promise.reject(error);
          }
        }

        // 요청 제한 초과 시 잠시 대기 후 재시도 가능 (429 오류)
        if (error.response?.status === 429 && error.config) {
          const retryAfter = error.response.headers['retry-after'];
          const config = error.config as ExtendedAxiosRequestConfig;
          if (retryAfter && config._retryCount === undefined) {
            config._retryCount = 0;
            const delay = parseInt(retryAfter, 10) * 1000 || this.retryDelay;
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.client(config);
          }
        }

        return Promise.reject(error);
      }
    );

    // 로깅 활성화 설정
    if (config.enableLogging) {
      this.setLogger((message, data) => {
        console.log(`[ApiClient] ${message}`, data);
      });
    }
  }

  // 기본 GET 요청 메서드
  async get<T = ApiResponse>(
    path: string, 
    config?: AxiosRequestConfig & { abortSignal?: AbortSignal }
  ): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'get',
      url: path,
      signal: config?.abortSignal
    });
  }

  // 캐싱을 지원하는 GET 요청 메서드
  async getCached<T = ApiResponse>(
    path: string, 
    config?: AxiosRequestConfig & { 
      skipCache?: boolean; 
      cacheTTL?: number;
      abortSignal?: AbortSignal;
    }
  ): Promise<T> {
    const cacheKey = `${path}${JSON.stringify(config?.params || {})}`;
    
    // 캐시 사용하지 않거나 캐시에 없는 경우 또는 캐시가 만료된 경우
    if (
      config?.skipCache || 
      !this.cache.has(cacheKey) || 
      Date.now() - this.cache.get(cacheKey)!.timestamp > (config?.cacheTTL || this.cacheTTL)
    ) {
      const response = await this.get<T>(path, config);
      this.cache.set(cacheKey, { data: response, timestamp: Date.now() });
      return response;
    }
    
    return this.cache.get(cacheKey)!.data as T;
  }

  // POST 요청 메서드
  async post<T = ApiResponse>(
    path: string, 
    data?: unknown, 
    config?: AxiosRequestConfig & { abortSignal?: AbortSignal }
  ): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'post',
      url: path,
      data,
      signal: config?.abortSignal
    });
  }

  // PUT 요청 메서드
  async put<T = ApiResponse>(
    path: string, 
    data?: unknown, 
    config?: AxiosRequestConfig & { abortSignal?: AbortSignal }
  ): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'put',
      url: path,
      data,
      signal: config?.abortSignal
    });
  }

  // PATCH 요청 메서드
  async patch<T = ApiResponse>(
    path: string, 
    data?: unknown, 
    config?: AxiosRequestConfig & { abortSignal?: AbortSignal }
  ): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'patch',
      url: path,
      data,
      signal: config?.abortSignal
    });
  }

  // DELETE 요청 메서드
  async delete<T = ApiResponse>(
    path: string, 
    config?: AxiosRequestConfig & { abortSignal?: AbortSignal }
  ): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'delete',
      url: path,
      signal: config?.abortSignal
    });
  }

  // 공통 요청 처리 메서드 (재시도 로직 포함)
  private async request<T>(
    config: ExtendedAxiosRequestConfig,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      // 재시도 가능한 오류인지 확인
      if (retries > 0 && this.shouldRetry(error) && !config._retryCount) {
        // 재시도 카운트 설정
        const retryConfig = { ...config, _retryCount: (config._retryCount || 0) + 1 };
        
        // 재시도 전 대기
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        
        if (this.logger) {
          this.logger(`API 요청 재시도 (${retryConfig._retryCount}/${this.maxRetries}): ${config.method} ${config.url}`);
        }
        
        // 재귀적으로 재시도
        return this.request<T>(retryConfig, retries - 1);
      }
      
  async put<T = ApiResponse>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(path, data, config);
    return response.data;
  }

  // 재시도 가능한 오류인지 확인하는 메서드
  private shouldRetry(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false;
    
    // 네트워크 오류는 재시도
    if (!error.response) return true;
    
    // 서버 오류(5xx)는 재시도
    const status = error.response.status;
    return status >= 500 && status < 600;
  }

  // 토큰 자동 갱신 메서드
  private async refreshAuthToken(): Promise<string> {
    // 이미 진행 중인 토큰 갱신 요청이 있다면 재사용
    if (!this.tokenRefreshPromise) {
      this.tokenRefreshPromise = this.client
        .post<{ token: string }>('/auth/refresh')
        .then(response => {
          const newToken = response.data.token;
          this.setAuthToken(newToken);
          return newToken;
        })
        .finally(() => {
          this.tokenRefreshPromise = null;
        });
    }
    return this.tokenRefreshPromise;
  }

  // 인증 토큰 설정 메서드
  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // 인증 토큰 제거 메서드
  removeAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  // 캐시 초기화 메서드
  clearCache(): void {
    this.cache.clear();
  }

  // 특정 경로의 캐시 삭제 메서드
  invalidateCache(path?: string): void {
    if (path) {
      // 특정 경로로 시작하는 모든 캐시 항목 삭제
      for (const key of this.cache.keys()) {
        if (key.startsWith(path)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.clearCache();
    }
  }

  // 로거 설정 메서드
  setLogger(logger: (message: string, data?: any) => void): void {
    this.logger = logger;
  }
} 