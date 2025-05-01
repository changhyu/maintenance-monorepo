import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ConnectionStatus } from './types';
import { notifyOfflineMode, notifyServerError } from './notifications';

/**
 * API 클라이언트 코어 클래스
 * API 요청을 처리하기 위한 기본 기능 제공
 */
export class ApiClientCore {
  protected readonly instance: AxiosInstance;
  private baseURL: string;
  private isOfflineMode: boolean = false;
  private connectionStatus: ConnectionStatus = 'checking';
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
    
    this.setupInterceptors();
    this.restoreOfflineMode();
  }

  /**
   * 인터셉터 설정
   * 요청 및 응답 처리를 위한 인터셉터를 설정합니다.
   */
  protected setupInterceptors(): void {
    // 요청 인터셉터 설정
    this.instance.interceptors.request.use(
      config => {
        // 오프라인 모드 체크
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
      (error: AxiosError) => this.handleResponseError(error)
    );
  }

  /**
   * 응답 오류 처리
   * @param error Axios 오류 객체
   * @returns Promise reject 결과
   */
  protected handleResponseError(error: AxiosError): Promise<any> {
    // 네트워크 오류 처리 (서버 연결 실패)
    if (error.code === 'ECONNABORTED' || !error.response) {
      console.error('API 서버 연결 실패:', error.message);
      this.connectionStatus = 'disconnected';
      
      // 오프라인 모드로 전환
      if (!this.isOfflineMode) {
        console.warn('네트워크 연결이 불안정합니다. 오프라인 모드로 전환합니다.');
        this.setOfflineMode(true);
        
        // 사용자에게 알림
        notifyOfflineMode();
      }
      
      // 요청 재시도 로직
      return this.retryRequest(error);
    }
    
    // 서버 오류 처리
    if (error.response && error.response.status >= 500) {
      console.error('서버 오류:', error.response.data);
      
      // 사용자에게 알림
      notifyServerError(error.response.status, error.response.data);
    }
    
    return Promise.reject(error);
  }

  /**
   * 요청 재시도 처리
   * @param error 발생한 오류
   * @returns Promise 객체
   */
  private retryRequest(error: AxiosError): Promise<any> {
    const config = error.config;
    if (!config || this.retryCount >= this.maxRetries) {
      return Promise.reject(error);
    }
    
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

  /**
   * 오프라인 모드 상태 복원
   */
  private restoreOfflineMode(): void {
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
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
  
  /**
   * 기본 URL 설정
   * @param baseURL 기본 URL
   */
  public setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
    this.instance.defaults.baseURL = baseURL;
  }
  
  /**
   * 헤더 설정
   * @param headers 설정할 헤더
   */
  public setHeaders(headers: Record<string, string>): void {
    Object.entries(headers).forEach(([key, value]) => {
      this.instance.defaults.headers.common[key] = value;
    });
  }
}