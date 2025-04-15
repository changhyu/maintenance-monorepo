import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

/**
 * API 클라이언트 클래스
 * 프론트엔드에서 API 요청을 처리하기 위한 래퍼 클래스
 */
export class ApiClient {
  private readonly instance: AxiosInstance;
  private baseURL: string;
  private isOfflineMode: boolean = false;
  private connectionStatus: 'connected' | 'disconnected' | 'checking' = 'checking';
  private retryCount: number = 0;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000; // 초기 1초

  /**
   * API 클라이언트 생성자
   * @param baseURL API 기본 URL
   * @param config Axios 설정
   */
  constructor(baseURL: string = '/api', config: AxiosRequestConfig = {}) {
    this.baseURL = baseURL;
    this.instance = axios.create({
      baseURL,
      timeout: 30000, // 30초
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      ...config
    });

    // 요청 인터셉터 설정
    this.instance.interceptors.request.use(
      config => {
        // 토큰 추가 또는 기타 요청 변환
        const token = localStorage.getItem('authToken');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // 오프라인 모드 체크 - 요청 건너뛰기 로직 추가 가능
        if (this.isOfflineMode && !config.headers?.['force-online']) {
          throw new Error('오프라인 모드에서는 요청이 취소됩니다.');
        }
        
        return config;
      },
      error => Promise.reject(error)
    );

    // 응답 인터셉터 설정
    this.instance.interceptors.response.use(
      response => {
        // 성공적인 응답은 오프라인 모드 초기화 및 재시도 카운트 초기화
        this.setOfflineMode(false);
        this.retryCount = 0;
        this.connectionStatus = 'connected';
        return response;
      },
      (error: AxiosError) => {
        // 네트워크 오류 처리 (서버 연결 실패)
        if (error.code === 'ECONNABORTED' || !error.response) {
          console.error('API 서버 연결 실패:', error.message);
          this.connectionStatus = 'disconnected';
          
          // 오프라인 모드로 전환
          if (!this.isOfflineMode) {
            console.warn('네트워크 연결이 불안정합니다. 오프라인 모드로 전환합니다.');
            this.setOfflineMode(true);
            
            // 로컬 스토리지 또는 IndexedDB에 오프라인 모드 상태 저장
            localStorage.setItem('apiOfflineMode', 'true');
            
            // 사용자에게 알림
            this.notifyOfflineMode();
          }
          
          // 요청 재시도 로직
          const config = error.config;
          if (config && this.retryCount < this.maxRetries) {
            this.retryCount++;
            
            // 지수 백오프 적용
            const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
            console.log(`${this.retryCount}번째 재시도 예정... (${delay}ms 후)`);
            
            return new Promise(resolve => {
              setTimeout(() => {
                console.log(`재시도 중... (${this.retryCount}/${this.maxRetries})`);
                resolve(this.instance(config));
              }, delay);
            });
          }
        }
        
        // 인증 오류 처리
        if (error.response && error.response.status === 401) {
          // 토큰 만료 시 처리
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        
        // 서버 오류 처리
        if (error.response && error.response.status >= 500) {
          console.error('서버 오류:', error.response.data);
          
          // 사용자에게 알림
          this.notifyServerError(error.response.status, error.response.data);
        }
        
        return Promise.reject(error);
      }
    );

    // 오프라인 모드 상태 복원
    const offlineMode = localStorage.getItem('apiOfflineMode');
    if (offlineMode === 'true') {
      this.setOfflineMode(true);
    }
  }

  /**
   * 초기화 후 연결 상태 확인
   * 생성자에서 비동기 작업을 분리
   */
  public initialize(): void {
    // 초기 연결 상태 확인
    this.checkConnection().catch(error => {
      console.error('초기 연결 확인 실패:', error);
    });
  }

  /**
   * 서버 연결 상태 확인
   * @returns Promise<boolean> 연결 상태
   */
  public async checkConnection(): Promise<boolean> {
    this.connectionStatus = 'checking';
    try {
      await this.instance.get('/health', {
        timeout: 5000,
        headers: {
          'force-online': 'true'
        }
      });
      
      this.connectionStatus = 'connected';
      
      if (this.isOfflineMode) {
        console.log('서버 연결이 복원되었습니다. 오프라인 모드를 해제합니다.');
        this.setOfflineMode(false);
      }
      
      return true;
    } catch (error) {
      console.error('서버 연결 확인 실패:', error);
      this.connectionStatus = 'disconnected';
      
      // 오프라인 모드로 자동 전환
      if (!this.isOfflineMode) {
        this.setOfflineMode(true);
      }
      
      return false;
    }
  }
  
  /**
   * 오프라인 모드 설정
   * @param value 오프라인 모드 활성화 여부
   */
  public setOfflineMode(value: boolean): void {
    if (this.isOfflineMode !== value) {
      this.isOfflineMode = value;
      localStorage.setItem('apiOfflineMode', value ? 'true' : 'false');
      
      // 오프라인 모드 변경 이벤트 발생
      window.dispatchEvent(new CustomEvent('api:offline-mode-changed', { 
        detail: { offline: value } 
      }));
      
      console.log(`오프라인 모드 ${value ? '활성화' : '비활성화'}`);
    }
  }
  
  /**
   * 현재 오프라인 모드 상태 반환
   * @returns boolean 오프라인 모드 여부
   */
  public isOffline(): boolean {
    return this.isOfflineMode;
  }
  
  /**
   * 현재 연결 상태 반환
   * @returns 연결 상태
   */
  public getConnectionStatus(): 'connected' | 'disconnected' | 'checking' {
    return this.connectionStatus;
  }
  
  /**
   * 오프라인 모드 알림
   */
  private notifyOfflineMode(): void {
    // 앱 내 알림 표시 로직 (구현 필요)
    console.warn('오프라인 모드로 전환되었습니다. 일부 기능이 제한됩니다.');
    
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
  
  /**
   * 서버 오류 알림
   * @param status HTTP 상태 코드
   * @param data 오류 데이터
   */
  private notifyServerError(status: number, data: any): void {
    // 서버 오류 알림 로직 (구현 필요)
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

  /**
   * GET 요청 수행
   * @param url 엔드포인트 URL
   * @param config 요청 설정
   * @returns Promise<AxiosResponse>
   */
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config);
  }

  /**
   * POST 요청 수행
   * @param url 엔드포인트 URL
   * @param data 요청 데이터
   * @param config 요청 설정
   * @returns Promise<AxiosResponse>
   */
  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config);
  }

  /**
   * PUT 요청 수행
   * @param url 엔드포인트 URL
   * @param data 요청 데이터
   * @param config 요청 설정
   * @returns Promise<AxiosResponse>
   */
  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.put<T>(url, data, config);
  }

  /**
   * DELETE 요청 수행
   * @param url 엔드포인트 URL
   * @param config 요청 설정
   * @returns Promise<AxiosResponse>
   */
  public async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.delete<T>(url, config);
  }

  /**
   * PATCH 요청 수행
   * @param url 엔드포인트 URL
   * @param data 요청 데이터
   * @param config 요청 설정
   * @returns Promise<AxiosResponse>
   */
  public async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.patch<T>(url, data, config);
  }

  /**
   * 파일 업로드 요청
   * @param url 엔드포인트 URL
   * @param formData FormData 객체
   * @param config 요청 설정
   * @returns Promise<AxiosResponse>
   */
  public async upload<T = any>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      ...config
    });
  }

  /**
   * 기본 URL 설정
   * @param baseURL 새 기본 URL
   */
  public setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
    this.instance.defaults.baseURL = baseURL;
    
    // URL 변경 후 연결 상태 확인
    this.checkConnection();
  }

  /**
   * 헤더 설정
   * @param headers 헤더 객체
   */
  public setHeaders(headers: Record<string, string>): void {
    Object.entries(headers).forEach(([key, value]) => {
      this.instance.defaults.headers.common[key] = value;
    });
  }
  
  /**
   * 오프라인 모드에서 작업 큐에 추가
   * @param method HTTP 메소드
   * @param url 엔드포인트 URL
   * @param data 요청 데이터
   * @returns 작업 ID
   */
  public queueOfflineOperation(method: string, url: string, data?: any): string {
    const id = Date.now().toString();
    
    // 로컬 스토리지에 작업 저장
    const pendingOps = JSON.parse(localStorage.getItem('apiPendingOperations') ?? '[]');
    pendingOps.push({
      id,
      method,
      url,
      data,
      timestamp: new Date().toISOString()
    });
    
    localStorage.setItem('apiPendingOperations', JSON.stringify(pendingOps));
    
    console.log(`오프라인 작업이 큐에 추가되었습니다: ${method} ${url}`);
    return id;
  }
  
  /**
   * 오프라인 모드에서 큐에 추가된 작업 동기화
   * @returns 동기화 결과
   */
  public async syncOfflineOperations(): Promise<{ success: number, failed: number }> {
    if (this.isOfflineMode) {
      console.warn('오프라인 모드에서는 동기화를 수행할 수 없습니다.');
      return { success: 0, failed: 0 };
    }
    
    const pendingOps = JSON.parse(localStorage.getItem('apiPendingOperations') ?? '[]');
    if (pendingOps.length === 0) {
      return { success: 0, failed: 0 };
    }
    
    console.log(`${pendingOps.length}개의 오프라인 작업 동기화 시작`);
    
    let success = 0;
    let failed = 0;
    const remainingOps = [];
    
    for (const op of pendingOps) {
      try {
        const { method, url, data } = op;
        
        switch (method.toLowerCase()) {
          case 'get':
            await this.get(url);
            break;
          case 'post':
            await this.post(url, data);
            break;
          case 'put':
            await this.put(url, data);
            break;
          case 'delete':
            await this.delete(url);
            break;
          case 'patch':
            await this.patch(url, data);
            break;
          default:
            throw new Error(`지원되지 않는 HTTP 메소드: ${method}`);
        }
        
        success++;
        console.log(`오프라인 작업 동기화 성공: ${method} ${url}`);
      } catch (error) {
        failed++;
        console.error(`오프라인 작업 동기화 실패: ${op.method} ${op.url}`, error);
        
        // 실패한 작업은 재시도를 위해 보관
        remainingOps.push(op);
      }
    }
    
    // 남은 작업 저장
    localStorage.setItem('apiPendingOperations', JSON.stringify(remainingOps));
    
    console.log(`오프라인 작업 동기화 완료: 성공 ${success}개, 실패 ${failed}개`);
    
    // 이벤트 발생
    window.dispatchEvent(new CustomEvent('api:sync-completed', {
      detail: { success, failed, remaining: remainingOps.length }
    }));
    
    return { success, failed };
  }
}

// 기본 API 클라이언트 인스턴스 생성
let apiBaseUrl = '/api';

// 로컬 환경에서 백엔드 API 서버 URL 설정
if (process.env.NODE_ENV === 'development') {
  apiBaseUrl = 'http://localhost:8080/api'; // 포트 8000에서 8080으로 변경
} else if (process.env.REACT_APP_API_URL) {
  apiBaseUrl = process.env.REACT_APP_API_URL;
}

console.log(`API 클라이언트 설정: ${apiBaseUrl}`);
const defaultApiClient = new ApiClient(apiBaseUrl);
// 초기화 실행
defaultApiClient.initialize();

/**
 * API 연결 상태 모니터링 설정
 */
let connectionMonitorInterval: number | null = null;

// 페이지가 포커스되거나 온라인 상태가 변경될 때 연결 확인
window.addEventListener('focus', () => {
  defaultApiClient.checkConnection();
});

window.addEventListener('online', () => {
  console.log('온라인 상태로 변경되었습니다. 서버 연결을 확인합니다.');
  defaultApiClient.checkConnection().then(connected => {
    if (connected) {
      // 오프라인 작업 동기화
      defaultApiClient.syncOfflineOperations();
    }
  });
});

window.addEventListener('offline', () => {
  console.log('오프라인 상태로 변경되었습니다.');
  defaultApiClient.setOfflineMode(true);
});

// 연결 모니터링 시작
function startConnectionMonitoring(interval = 30000) {
  if (connectionMonitorInterval) {
    clearInterval(connectionMonitorInterval);
  }
  
  connectionMonitorInterval = window.setInterval(() => {
    if (defaultApiClient.isOffline()) {
      defaultApiClient.checkConnection();
    }
  }, interval);
  
  console.log(`API 연결 모니터링이 시작되었습니다 (간격: ${interval}ms)`);
}

// 연결 모니터링 중지
function stopConnectionMonitoring() {
  if (connectionMonitorInterval) {
    clearInterval(connectionMonitorInterval);
    connectionMonitorInterval = null;
    console.log('API 연결 모니터링이 중지되었습니다.');
  }
}

// 모니터링 시작
startConnectionMonitoring();

export { startConnectionMonitoring, stopConnectionMonitoring };
export default defaultApiClient;
