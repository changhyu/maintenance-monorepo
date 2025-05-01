import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import GlobalErrorHandler from './GlobalErrorHandler';

// 네트워크 오류 타입 정의
export enum NetworkErrorType {
  NO_CONNECTION = 'NO_CONNECTION',
  TIMEOUT = 'TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',
  API_ERROR = 'API_ERROR',
  UNKNOWN = 'UNKNOWN',
}

// 네트워크 오류 처리 옵션 인터페이스
export interface NetworkErrorOptions {
  maxRetries?: number;
  retryDelay?: number;
  shouldRetry?: (error: any, retryCount: number) => boolean;
  onMaxRetriesExceeded?: (error: any) => void;
  onNetworkStateChange?: (isConnected: boolean) => void;
}

/**
 * 네트워크 요청 오류를 관리하고 처리하는 클래스
 */
class NetworkErrorManager {
  private static instance: NetworkErrorManager;
  private isNetworkConnected: boolean = true;
  private netInfoUnsubscribe: (() => void) | null = null;
  private networkListeners: Set<(isConnected: boolean) => void> = new Set();
  private errorListeners: Set<(error: any, type: NetworkErrorType) => void> = new Set();
  
  // 기본 재시도 옵션
  private defaultOptions: NetworkErrorOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    shouldRetry: (error, retryCount) => this.isNetworkConnected && retryCount < 3,
    onMaxRetriesExceeded: (error) => {
      // 기본적으로 GlobalErrorHandler에 전달
      GlobalErrorHandler.handleError(
        error instanceof Error ? error : new Error(JSON.stringify(error))
      );
    }
  };

  private constructor() {
    this.startNetworkListener();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): NetworkErrorManager {
    if (!NetworkErrorManager.instance) {
      NetworkErrorManager.instance = new NetworkErrorManager();
    }
    return NetworkErrorManager.instance;
  }

  /**
   * 네트워크 상태 모니터링 시작
   */
  private startNetworkListener(): void {
    // 이미 구독 중인 경우 제거
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
    }

    // 네트워크 상태 변경 구독
    this.netInfoUnsubscribe = NetInfo.addEventListener(this.handleNetworkChange);
    
    // 초기 네트워크 상태 확인
    NetInfo.fetch().then(this.handleNetworkChange);
  }

  /**
   * 네트워크 상태 변경 핸들러
   */
  private handleNetworkChange = (state: NetInfoState): void => {
    const isConnected = !!state.isConnected;
    
    // 상태가 변경된 경우에만 리스너 호출
    if (this.isNetworkConnected !== isConnected) {
      this.isNetworkConnected = isConnected;
      
      // 모든 네트워크 상태 리스너에게 알림
      this.networkListeners.forEach(listener => {
        try {
          listener(isConnected);
        } catch (error) {
          console.error('네트워크 상태 리스너 실행 중 오류:', error);
        }
      });
    }
  };

  /**
   * 네트워크 상태 리스너 추가
   */
  public addNetworkListener(listener: (isConnected: boolean) => void): () => void {
    this.networkListeners.add(listener);
    
    // 현재 상태로 즉시 호출
    try {
      listener(this.isNetworkConnected);
    } catch (error) {
      console.error('네트워크 리스너 초기 호출 중 오류:', error);
    }
    
    // 구독 해제 함수 반환
    return () => {
      this.networkListeners.delete(listener);
    };
  }

  /**
   * 오류 리스너 추가
   */
  public addErrorListener(
    listener: (error: any, type: NetworkErrorType) => void
  ): () => void {
    this.errorListeners.add(listener);
    
    // 구독 해제 함수 반환
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  /**
   * 네트워크 오류 타입 분류
   */
  public classifyError(error: any): NetworkErrorType {
    // 네트워크 연결 없음
    if (!this.isNetworkConnected || 
        error.message?.includes('network') || 
        error.message?.includes('connection')) {
      return NetworkErrorType.NO_CONNECTION;
    }
    
    // 타임아웃
    if (error.message?.includes('timeout') || 
        error.code === 'ETIMEDOUT') {
      return NetworkErrorType.TIMEOUT;
    }
    
    // 서버 오류 (5xx)
    if (error.status >= 500 || 
        error.statusCode >= 500) {
      return NetworkErrorType.SERVER_ERROR;
    }
    
    // API 오류 (4xx)
    if (error.status >= 400 || 
        error.statusCode >= 400) {
      return NetworkErrorType.API_ERROR;
    }
    
    // 기타 알 수 없는 오류
    return NetworkErrorType.UNKNOWN;
  }

  /**
   * 오류 발생 시 처리 및 알림
   */
  public handleError(error: any): NetworkErrorType {
    const errorType = this.classifyError(error);
    
    // 오류 기록
    console.error(`네트워크 오류 발생: ${errorType}`, error);
    
    // 오류 로깅
    GlobalErrorHandler.logErrorToFile(
      error instanceof Error ? error : new Error(JSON.stringify(error)),
      { errorType, isNetworkError: true }
    ).catch(e => console.error('네트워크 오류 로깅 실패:', e));
    
    // 모든 오류 리스너에게 알림
    this.errorListeners.forEach(listener => {
      try {
        listener(error, errorType);
      } catch (listenerError) {
        console.error('오류 리스너 실행 중 오류:', listenerError);
      }
    });
    
    return errorType;
  }

  /**
   * 네트워크 요청 함수에 재시도 로직 추가
   */
  public async withRetry<T>(
    requestFn: () => Promise<T>,
    options?: NetworkErrorOptions
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let retryCount = 0;
    
    while (true) {
      try {
        return await requestFn();
      } catch (error) {
        // 오류 처리
        const errorType = this.handleError(error);
        
        // 재시도 가능 여부 확인
        if (retryCount >= (opts.maxRetries || 3) || !opts.shouldRetry?.(error, retryCount)) {
          // 최대 재시도 횟수 초과 또는 재시도 불가능한 오류
          if (opts.onMaxRetriesExceeded) {
            opts.onMaxRetriesExceeded(error);
          }
          throw error;
        }
        
        // 재시도 횟수 증가
        retryCount++;
        
        // 재시도 전 지연
        await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
        
        // 오프라인 상태이면 네트워크 연결될 때까지 대기
        if (!this.isNetworkConnected) {
          await this.waitForNetworkConnection();
        }
      }
    }
  }
  
  /**
   * 네트워크 연결될 때까지 대기
   */
  private waitForNetworkConnection(): Promise<void> {
    return new Promise(resolve => {
      if (this.isNetworkConnected) {
        resolve();
        return;
      }
      
      const unsubscribe = this.addNetworkListener(isConnected => {
        if (isConnected) {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  /**
   * 네트워크 연결 여부 확인
   */
  public isConnected(): boolean {
    return this.isNetworkConnected;
  }

  /**
   * 사용자에게 네트워크 오류 알림
   */
  public showErrorAlert(type: NetworkErrorType, message?: string): void {
    let title = '네트워크 오류';
    let alertMessage = message || '알 수 없는 오류가 발생했습니다.';
    
    switch (type) {
      case NetworkErrorType.NO_CONNECTION:
        title = '인터넷 연결 없음';
        alertMessage = message || '인터넷 연결을 확인해주세요.';
        break;
        
      case NetworkErrorType.TIMEOUT:
        title = '요청 시간 초과';
        alertMessage = message || '서버 응답이 지연되고 있습니다. 나중에 다시 시도해주세요.';
        break;
        
      case NetworkErrorType.SERVER_ERROR:
        title = '서버 오류';
        alertMessage = message || '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
        break;
        
      case NetworkErrorType.API_ERROR:
        title = 'API 오류';
        alertMessage = message || '요청을 처리할 수 없습니다. 입력 정보를 확인해주세요.';
        break;
    }
    
    Alert.alert(title, alertMessage);
  }

  /**
   * 리소스 정리
   */
  public dispose(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    
    this.networkListeners.clear();
    this.errorListeners.clear();
  }
}

export default NetworkErrorManager.getInstance(); 