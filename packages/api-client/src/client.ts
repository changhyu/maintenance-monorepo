import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig, CreateAxiosDefaults } from 'axios';

// ResponseType 정의 추가
type ResponseType = 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream' | 'formdata';

interface AxiosProgressEvent {
  loaded: number;
  total?: number;
  progress?: number;
  bytes: number;
  rate?: number;
  estimated?: number;
}

// 재시도 로직을 위한 확장된 요청 구성 인터페이스
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _retryCount?: number;
}

// AxiosXHRConfig를 제거하고 필요한 인터페이스 추가
interface AxiosRequestConfigWithUrl extends AxiosRequestConfig {
  url: string;
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
  offlineStorage?: boolean; // 오프라인 저장소 활성화 여부
  tokenRefreshEndpoint?: string; // 토큰 갱신 엔드포인트
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
  [key: string]: unknown; // 추가 프로퍼티 허용 (기존 인터페이스와 호환성 유지)
}

// 인증 토큰 응답 인터페이스
export interface AuthTokenResponse {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

// 캐시 항목 인터페이스
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// 오프라인 저장 요청 인터페이스
export interface OfflineRequest {
  id: string;
  method: string;
  url: string;
  data?: unknown;
  headers?: Record<string, string>;
  createdAt: string;
  priority?: number;
}

// 연결 상태 타입
export type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

export class ApiClient {
  private readonly client: ReturnType<typeof axios.create>;
  private tokenRefreshPromise: Promise<string> | null = null;
  private readonly cache = new Map<string, CacheItem<unknown>>();
  private readonly cacheTTL: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private logger?: (message: string, data?: unknown) => void;
  private isOfflineMode: boolean = false;
  private connectionStatus: ConnectionStatus = 'checking';
  private offlineRequests: OfflineRequest[] = [];
  private readonly tokenRefreshEndpoint: string;
  private readonly offlineStorageKey = 'api_offline_requests';

  constructor(config: ApiClientConfig) {
    this.cacheTTL = config.cacheTTL ?? 60000; // 기본값 1분
    this.maxRetries = config.maxRetries ?? 3; // 기본값 3회
    this.retryDelay = config.retryDelay ?? 1000; // 기본값 1초
    this.tokenRefreshEndpoint = config.tokenRefreshEndpoint ?? '/auth/refresh';

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'X-API-Key': config.apiKey }),
        ...config.headers,
      },
    } as CreateAxiosDefaults<any>); // 타입 단언 추가

    // 요청 인터셉터 추가
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // 오프라인 모드 체크
        if (this.isOfflineMode && !config.headers?.['force-online'] && config.method !== 'get') {
          // GET이 아닌 요청은 오프라인 큐에 저장
          this.queueOfflineRequest({
            url: config.url,
            method: config.method,
            headers: config.headers,
            data: config.data,
            params: config.params
          } as AxiosRequestConfig);
          throw new Error('오프라인 모드에서는 요청이 큐에 저장됩니다.');
        }
        
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
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    );

    // 응답 인터셉터 추가
    this.client.interceptors.response.use(
      this.handleSuccessResponse.bind(this),
      this.handleErrorResponse.bind(this)
    );

    // 로깅 활성화 설정
    if (config.enableLogging) {
      this.setLogger((message, data) => {
        console.log(`[ApiClient] ${message}`, data);
      });
    }
    
    // 오프라인 상태 복원
    this.restoreOfflineMode();
    
    // 오프라인 요청 로드
    if (config.offlineStorage) {
      this.loadOfflineRequests();
    }
  }

  // 성공 응답 처리
  private handleSuccessResponse(response: AxiosResponse): AxiosResponse {
    // 네트워크 연결이 복원된 것으로 표시
    this.connectionStatus = 'connected';
    
    // 오프라인 모드였다면 해제 시도
    if (this.isOfflineMode) {
      this.checkConnection().catch(err => {
        if (this.logger) {
          this.logger(`연결 상태 확인 실패: ${err.message}`);
        }
      });
    }
    
    if (this.logger) {
      this.logger(`API 응답 성공: ${response.status} ${response.config.url}`, {
        data: response.data
      });
    }
    return response;
  }

  // 오류 응답 처리를 여러 함수로 분리하여 복잡도 감소
  private async handleErrorResponse(error: unknown): Promise<AxiosResponse> {
    // 오류가 AxiosError 타입인지 확인
    if (!(error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError)) {
      if (this.logger) {
        this.logger(`API 응답 오류: 알 수 없는 오류`, error);
      }
      return Promise.reject(error instanceof Error ? error : new Error(JSON.stringify(error)));
    }

    const axiosError = error as AxiosError;
    
    // 네트워크 오류 처리
    if (axiosError.code === 'ECONNABORTED' || !axiosError.response) {
      return this.handleNetworkError(axiosError);
    }
    
    if (this.logger) {
      this.logger(`API 응답 오류: ${axiosError.message}`, {
        status: axiosError.response?.status,
        data: axiosError.response?.data
      });
    }

    // 인증 관련 오류 처리
    if (this.isAuthError(axiosError)) {
      return this.handleAuthError(axiosError);
    }

    // 요청 제한 초과 오류 처리
    if (this.isRateLimitError(axiosError)) {
      return this.handleRateLimitError(axiosError);
    }

    // 서버 오류 처리 (5xx)
    if (axiosError.response && axiosError.response.status >= 500) {
      this.notifyServerError(axiosError.response.status, axiosError.response.data);
    }

    return Promise.reject(new Error(axiosError.message));
  }
  
  // 네트워크 오류 처리 함수 추출
  private handleNetworkError(axiosError: AxiosError): Promise<AxiosResponse> {
    this.connectionStatus = 'disconnected';
    
    // 오프라인 모드로 전환
    if (!this.isOfflineMode) {
      this.setOfflineMode(true);
      this.notifyOfflineMode();
    }
    
    // GET 이외의 요청은 오프라인 큐에 저장 시도
    const { config } = axiosError;
    if (config?.method?.toLowerCase() !== 'get' && config) {
      this.queueOfflineRequest({
        url: config.url,
        method: config.method,
        headers: config.headers,
        data: config.data,
        params: config.params
      } as AxiosRequestConfig);
    }
    
    return Promise.reject(new Error('네트워크 연결이 끊겼습니다. 오프라인 모드로 전환합니다.'));
  }

  // 인증 오류 확인
  private isAuthError(error: AxiosError): boolean {
    return error.response?.status === 401 && 
           !!error.config && 
           !error.config.url?.includes(this.tokenRefreshEndpoint);
  }

  // 요청 제한 초과 오류 확인
  private isRateLimitError(error: AxiosError): boolean {
    return error.response?.status === 429 && !!error.config;
  }

  // 인증 오류 처리
  private async handleAuthError(error: AxiosError): Promise<AxiosResponse> {
    try {
      // 토큰 갱신 시도
      await this.refreshAuthToken();
      
      // 원래 요청 재시도
      const originalRequest = error.config;
      return this.client(originalRequest as AxiosRequestConfigWithUrl); // 타입 단언 추가
    } catch (refreshError) {
      // 토큰 갱신 실패 시 로그아웃 이벤트 발생
      this.removeAuthToken();
      window.dispatchEvent(new CustomEvent('auth:logout-required', {
        detail: { reason: 'token_refresh_failed' }
      }));
      
      // 원래 오류 반환
      return Promise.reject(new Error(error.message));
    }
  }

  // 요청 제한 초과 오류 처리
  private async handleRateLimitError(error: AxiosError): Promise<AxiosResponse> {
    const retryAfter = error.response?.headers['retry-after'];
    const config = error.config as ExtendedAxiosRequestConfig;
    
    if (retryAfter && config._retryCount === undefined) {
      config._retryCount = 0;
      const parsedDelay = parseInt(retryAfter, 10);
      const delay = isNaN(parsedDelay) ? this.retryDelay : parsedDelay * 1000;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.client(config as AxiosRequestConfigWithUrl); // 타입 단언 추가
    }
    
    return Promise.reject(new Error(error.message));
  }

  // 인증 토큰 설정 메서드
  setAuthToken(token: string, tokenType: string = 'Bearer'): void {
    const { headers } = this.client.defaults;
    
    if (headers) {
      // headers가 존재하는지 확인하고 안전하게 설정
      headers.common ??= {};
      headers.common['Authorization'] = `${tokenType} ${token}`;
      
      // 로컬 스토리지에도 저장 (선택적)
      this.saveTokenToStorage(token, tokenType);
    }
  }

  // 인증 토큰 저장 (로컬 스토리지)
  private saveTokenToStorage(token: string, tokenType: string = 'Bearer'): void {
    try {
      localStorage.setItem('authToken', token);
      localStorage.setItem('tokenType', tokenType);
    } catch (error) {
      if (this.logger) {
        this.logger('토큰 저장 실패', error instanceof Error ? error : new Error('토큰 저장 중 오류 발생'));
      }
    }
  }

  // 인증 토큰 가져오기 (로컬 스토리지)
  getStoredToken(): { token: string | null, tokenType: string } {
    try {
      const token = localStorage.getItem('authToken');
      const tokenType = localStorage.getItem('tokenType') || 'Bearer';
      return { token, tokenType };
    } catch (error) {
      if (this.logger) {
        this.logger('토큰 조회 실패', error);
      }
      return { token: null, tokenType: 'Bearer' };
    }
  }

  // 인증 토큰 제거 메서드
  removeAuthToken(): void {
    if (this.client.defaults.headers?.common?.['Authorization']) {
      delete this.client.defaults.headers.common['Authorization'];
    }
    
    // 로컬 스토리지에서도 제거
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenType');
      localStorage.removeItem('refreshToken');
    } catch (error) {
      if (this.logger) {
        this.logger('토큰 제거 실패', error instanceof Error ? error : new Error('토큰 제거 중 오류 발생'));
      }
    }
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
  setLogger(logger: (message: string, data?: unknown) => void): void {
    this.logger = logger;
  }

  // 오프라인 모드 상태 복원
  private restoreOfflineMode(): void {
    try {
      const offlineMode = localStorage.getItem('apiOfflineMode');
      if (offlineMode === 'true') {
        this.setOfflineMode(true);
      }
    } catch (error) {
      // 예외 처리 개선: 오류 로그를 남기고 기본 상태(온라인 모드)로 설정
      if (this.logger) {
        this.logger('오프라인 모드 상태 복원 실패', 
          error instanceof Error ? error : new Error('오프라인 모드 복원 중 오류 발생'));
      }
      // 오류 발생 시 기본적으로 온라인 모드로 설정
      this.isOfflineMode = false;
      // UI에 알림
      window.dispatchEvent(new CustomEvent('api:notification', {
        detail: {
          type: 'warning',
          message: '오프라인 모드 상태를 복원할 수 없습니다. 온라인 모드로 시작합니다.',
          duration: 3000
        }
      }));
    }
  }

  // 오프라인 모드 설정 - 복잡도 감소를 위해 코드 분리
  setOfflineMode(value: boolean): void {
    if (this.isOfflineMode === value) {
      return; // 상태가 변경되지 않으면 빠르게 리턴
    }
    
    this.isOfflineMode = value;
    this.saveOfflineModeState(value);
    this.notifyOfflineModeChanged(value);
    
    // 온라인 모드로 전환 시 보류 중인 요청 처리 시도
    if (!value && this.offlineRequests.length > 0) {
      this.processPendingRequests();
    }
  }
  
  // 오프라인 모드 상태 저장
  private saveOfflineModeState(value: boolean): void {
    try {
      localStorage.setItem('apiOfflineMode', value ? 'true' : 'false');
    } catch (error) {
      if (this.logger) {
        this.logger('오프라인 모드 상태 저장 실패', 
          error instanceof Error ? error : new Error('오프라인 모드 상태 저장 중 오류 발생'));
      }
    }
  }
  
  // 오프라인 모드 변경 알림
  private notifyOfflineModeChanged(value: boolean): void {
    window.dispatchEvent(new CustomEvent('api:offline-mode-changed', { 
      detail: { offline: value } 
    }));
    
    if (this.logger) {
      this.logger(`오프라인 모드 ${value ? '활성화' : '비활성화'}`);
    }
  }

  // 오프라인 상태 알림
  private notifyOfflineMode(): void {
    // 사용자에게 Toast 메시지 표시 등의 UI 처리
    const event = new CustomEvent('api:notification', {
      detail: {
        type: 'warning',
        message: '오프라인 모드로 전환되었습니다. 일부 기능이 제한됩니다.',
        duration: 5000
      }
    });
    window.dispatchEvent(event);
  }

  // 서버 오류 알림
  private notifyServerError(status: number, data: any): void {
    // 서버 오류 알림 로직
    const event = new CustomEvent('api:notification', {
      detail: {
        type: 'error',
        message: `서버 오류가 발생했습니다. (${status})`,
        duration: 5000,
        data: data
      }
    });
    window.dispatchEvent(event);
  }

  // 현재 오프라인 모드 상태 반환
  isOffline(): boolean {
    return this.isOfflineMode;
  }

  // 현재 연결 상태 반환
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  // 서버 연결 상태 확인
  async checkConnection(): Promise<boolean> {
    this.connectionStatus = 'checking';
    try {
      await this.client.get('/health', {
        timeout: 5000,
        headers: {
          'force-online': 'true'
        }
      });
      
      this.connectionStatus = 'connected';
      
      if (this.isOfflineMode) {
        this.setOfflineMode(false);
      }
      
      return true;
    } catch (error) {
      this.connectionStatus = 'disconnected';
      
      // 오프라인 모드로 자동 전환
      if (!this.isOfflineMode) {
        this.setOfflineMode(true);
      }
      
      return false;
    }
  }

  // 오프라인 요청 큐에 추가
  private queueOfflineRequest(config: AxiosRequestConfig): string {
    if (!config.url) {
      throw new Error('요청 URL이 없습니다.');
    }
    
    const id = `offline_req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const request: OfflineRequest = {
      id,
      method: config.method?.toLowerCase() || 'get',
      url: config.url,
      data: config.data,
      headers: config.headers as Record<string, string>,
      createdAt: new Date().toISOString(),
      priority: 1, // 기본 우선순위
    };
    
    this.offlineRequests.push(request);
    this.saveOfflineRequests();
    
    if (this.logger) {
      this.logger(`오프라인 요청 큐에 추가됨: ${request.method.toUpperCase()} ${request.url}`, request);
    }
    
    // 요청이 큐에 추가되었음을 알리는 이벤트
    window.dispatchEvent(new CustomEvent('api:offline-request-queued', {
      detail: { request }
    }));
    
    return id;
  }

  // 오프라인 요청 저장
  private saveOfflineRequests(): void {
    try {
      localStorage.setItem(this.offlineStorageKey, JSON.stringify(this.offlineRequests));
    } catch (error) {
      if (this.logger) {
        this.logger('오프라인 요청 저장 실패', 
          error instanceof Error ? error : new Error('오프라인 요청 저장 중 오류 발생'));
      }
    }
  }

  // 오프라인 요청 로드
  private loadOfflineRequests(): void {
    try {
      const stored = localStorage.getItem(this.offlineStorageKey);
      if (stored) {
        this.offlineRequests = JSON.parse(stored);
        
        if (this.logger) {
          this.logger(`${this.offlineRequests.length}개의 오프라인 요청을 로드했습니다.`);
        }
      }
    } catch (error) {
      if (this.logger) {
        this.logger('오프라인 요청 로드 실패', 
          error instanceof Error ? error : new Error('오프라인 요청 로드 중 오류 발생'));
      }
      // 오류 발생 시 오프라인 요청 목록 초기화
      this.offlineRequests = [];
      // UI에 알림
      window.dispatchEvent(new CustomEvent('api:notification', {
        detail: {
          type: 'warning',
          message: '오프라인 요청을 로드할 수 없습니다. 요청 목록이 재설정됩니다.',
          duration: 3000
        }
      }));
      // 저장소 초기화 시도
      try {
        localStorage.removeItem(this.offlineStorageKey);
      } catch (storageError) {
        // 저장소 초기화 실패 시 무시하고 계속 진행
      }
    }
  }

  // 보류 중인 오프라인 요청 처리
  public async processPendingRequests(): Promise<{ success: number, failed: number }> {
    if (this.offlineRequests.length === 0) {
      return { success: 0, failed: 0 };
    }
    
    let success = 0;
    let failed = 0;
    const requestsToProcess = [...this.offlineRequests];
    
    // 처리 시작 이벤트
    window.dispatchEvent(new CustomEvent('api:offline-sync-started', {
      detail: { total: requestsToProcess.length }
    }));
    
    // 요청 우선순위에 따라 정렬
    requestsToProcess.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    for (const request of requestsToProcess) {
      try {
        if (this.logger) {
          this.logger(`오프라인 요청 처리 중: ${request.method.toUpperCase()} ${request.url}`);
        }
        
        await this.client({
          method: request.method,
          url: request.url,
          data: request.data,
          headers: {
            ...request.headers,
            'x-offline-request': 'true'
          }
        });
        
        // 성공 시 목록에서 제거
        this.offlineRequests = this.offlineRequests.filter(r => r.id !== request.id);
        success++;
        
        // 진행 상황 이벤트
        window.dispatchEvent(new CustomEvent('api:offline-sync-progress', {
          detail: { 
            total: requestsToProcess.length,
            processed: success + failed,
            success,
            failed
          }
        }));
      } catch (error) {
        failed++;
        if (this.logger) {
          this.logger(`오프라인 요청 처리 실패: ${request.id}`, error);
        }
      }
    }
    
    // 변경사항 저장
    this.saveOfflineRequests();
    
    // 완료 이벤트
    window.dispatchEvent(new CustomEvent('api:offline-sync-completed', {
      detail: { success, failed, remaining: this.offlineRequests.length }
    }));
    
    return { success, failed };
  }

  // 보류 중인 오프라인 요청 개수 반환
  getPendingRequestsCount(): number {
    return this.offlineRequests.length;
  }

  // 보류 중인 오프라인 요청 목록 반환
  getPendingRequests(): ReadonlyArray<OfflineRequest> {
    return [...this.offlineRequests];
  }

  // 보류 중인 오프라인 요청 지우기
  clearPendingRequests(): void {
    this.offlineRequests = [];
    this.saveOfflineRequests();
  }

  // 기본 GET 요청 메서드
  async get<T = unknown>(
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
  async getCached<T = unknown>(
    path: string, 
    config?: AxiosRequestConfig & { 
      cacheTTL?: number;
      abortSignal?: AbortSignal;
    }
  ): Promise<T> {
    const cacheKey = `${path}:${JSON.stringify(config?.params ?? {})}`;
    const cacheTTL = config?.cacheTTL ?? this.cacheTTL;
    const cachedItem = this.cache.get(cacheKey) as CacheItem<T> | undefined;
    
    // 유효한 캐시가 있으면 반환
    if (cachedItem && (Date.now() - cachedItem.timestamp) < cacheTTL) {
      if (this.logger) {
        this.logger(`캐시에서 데이터 가져옴: ${path}`);
      }
      return cachedItem.data;
    }
    
    // 캐시가 없거나 만료되었으면 새로 요청
    try {
      const data = await this.get<T>(path, config);
      
      // 결과 캐싱
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      // 오프라인 모드이고 만료된 캐시가 있으면 그걸 반환
      if (this.isOfflineMode && cachedItem) {
        if (this.logger) {
          this.logger(`오프라인 모드에서 만료된 캐시 사용: ${path}`);
        }
        return cachedItem.data;
      }
      throw error;
    }
  }

  // POST 요청 메서드
  async post<T = unknown>(
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
  async put<T = unknown>(
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
  async patch<T = unknown>(
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
  async delete<T = unknown>(
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

  // 파일 업로드 메서드
  async upload<T = unknown>(
    path: string,
    formData: FormData,
    config?: AxiosRequestConfig & { 
      abortSignal?: AbortSignal;
      onProgress?: (progressEvent: AxiosProgressEvent) => void;
    }
  ): Promise<T> {
    const { onProgress, ...restConfig } = config || {};
    
    return this.request<T>({
      ...restConfig,
      method: 'post',
      url: path,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...restConfig?.headers
      },
      signal: config?.abortSignal,
      onUploadProgress: onProgress
    });
  }

  // 실제 요청을 처리하는 내부 메서드
  private async request<T>(
    config: ExtendedAxiosRequestConfig,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      const response = await this.client(config as AxiosRequestConfigWithUrl);
      return response.data;
    } catch (error) {
      // 재시도 가능 여부 확인
      if (this.shouldRetry(error) && retries > 0 && config._retryCount === undefined) {
        config._retryCount = this.maxRetries - retries + 1;
        
        // 지수 백오프 방식의 재시도 대기 시간 계산
        const delay = this.retryDelay * Math.pow(2, config._retryCount - 1);
        
        if (this.logger) {
          this.logger(`요청 재시도 (${config._retryCount}/${this.maxRetries})... ${delay}ms 후`, {
            url: config.url,
            method: config.method
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.request<T>(config, retries - 1);
      }
      
      throw error;
    }
  }

  // 요청 재시도 가능 여부 확인
  private shouldRetry(error: unknown): boolean {
    if (!(error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError)) {
      return false;
    }
    
    const axiosError = error as AxiosError;
    
    // 네트워크 오류는 재시도
    if (axiosError.code === 'ECONNABORTED' || !axiosError.response) {
      return true;
    }
    
    // 5xx 서버 오류는 재시도
    if (axiosError.response && axiosError.response.status >= 500) {
      return true;
    }
    
    // 요청 시간 초과는 재시도
    if (axiosError.code === 'ETIMEDOUT') {
      return true;
    }
    
    return false;
  }

  // 인증 토큰 갱신 메서드
  private async refreshAuthToken(): Promise<string> {
    // 이미 진행 중인 토큰 갱신 요청이 있으면 그 결과를 기다림
    if (this.tokenRefreshPromise !== null) {
      return this.tokenRefreshPromise;
    }
    
    try {
      // 새 토큰 갱신 요청 시작
      this.tokenRefreshPromise = this.performTokenRefresh();
      return await this.tokenRefreshPromise;
    } finally {
      // 완료 후 프로미스 참조 정리
      this.tokenRefreshPromise = null;
    }
  }
  
  // 토큰 갱신 로직을 별도 메서드로 추출
  private async performTokenRefresh(): Promise<string> {
    // 리프레시 토큰 확인
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('리프레시 토큰이 없습니다.');
    }
    
    // 토큰 갱신 요청
    const response = await this.client.post<AuthTokenResponse>(
      this.tokenRefreshEndpoint,
      { refreshToken }
    );
    
    const { token, tokenType = 'Bearer' } = response.data;
    
    // 새 토큰 설정
    this.setAuthToken(token, tokenType);
    
    // 새 리프레시 토큰이 있으면 저장
    if (response.data.refreshToken) {
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    
    return token;
  }
}