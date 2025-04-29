import { AxiosRequestConfig, AxiosError } from 'axios';
import { ApiClientCore } from './core';
import { getStoredToken, removeToken, isTokenExpired, refreshToken } from './auth-helpers';

/**
 * 인증 기능이 추가된 API 클라이언트
 * 토큰 처리, 인증 헤더, 토큰 만료 처리 등 인증 관련 기능 담당
 */
export class AuthApiClient extends ApiClientCore {
  private readonly tokenHeaderName: string;
  private readonly tokenPrefix: string;
  private refreshPromise: Promise<string | null> | null = null;

  /**
   * AuthApiClient 생성자
   * @param baseURL API 기본 URL
   * @param config Axios 설정
   * @param tokenHeaderName 인증 토큰 헤더 이름 (기본값: 'Authorization')
   * @param tokenPrefix 인증 토큰 접두사 (기본값: 'Bearer ')
   */
  constructor(
    baseURL: string = '/api',
    config: AxiosRequestConfig = {},
    tokenHeaderName: string = 'Authorization',
    tokenPrefix: string = 'Bearer '
  ) {
    super(baseURL, config);
    this.tokenHeaderName = tokenHeaderName;
    this.tokenPrefix = tokenPrefix;
    
    // 인증 관련 인터셉터 설정을 위해 부모 클래스의 메소드 재정의
    this.setupInterceptors();
  }

  /**
   * 인증 관련 인터셉터 설정
   * 기본 인터셉터에 인증 기능 추가
   */
  protected override setupInterceptors(): void {
    // 부모 클래스의 인터셉터 설정 호출
    super.setupInterceptors();
    
    // 요청 인터셉터에 토큰 추가 기능 설정
    this.instance.interceptors.request.use(
      async (config) => {
        // 인증이 필요하지 않은 경로는 토큰 처리 생략
        if (config.url && this.isPublicPath(config.url)) {
          return config;
        }
        
        let token = getStoredToken();
        
        // 토큰이 만료되었는지 확인하고 리프레시 시도
        if (token && isTokenExpired(token)) {
          token = await this.handleTokenRefresh();
          
          // 토큰 리프레시 실패 시 로그인 페이지로 이동
          if (!token) {
            this.redirectToLogin();
            return Promise.reject(new Error('인증 토큰이 만료되었습니다.'));
          }
        }
        
        // 토큰이 있으면 요청 헤더에 추가
        if (token && config.headers) {
          config.headers[this.tokenHeaderName] = `${this.tokenPrefix}${token}`;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // 응답 인터셉터에 인증 에러 처리 기능 추가
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // 401 에러 처리 (인증 실패)
        if (error.response && error.response.status === 401) {
          // 토큰 리프레시 엔드포인트에서 401 발생 시 로그인 페이지로 리다이렉트
          if (error.config?.url?.includes('/auth/refresh')) {
            this.redirectToLogin();
            return Promise.reject(error);
          }
          
          // 토큰 리프레시 시도
          const token = await this.handleTokenRefresh();
          
          // 리프레시 성공 시 원래 요청 재시도
          if (token && error.config) {
            // 헤더에 새 토큰 적용
            error.config.headers[this.tokenHeaderName] = `${this.tokenPrefix}${token}`;
            // 원래 요청 재시도
            return this.instance(error.config);
          }
          
          // 리프레시 실패 시 로그인 페이지로 이동
          this.redirectToLogin();
        }
        
        // 다른 오류는 부모 클래스의 핸들러로 전달
        return super.handleResponseError(error);
      }
    );
  }

  /**
   * 토큰 리프레시 처리
   * 여러 요청이 동시에 리프레시를 시도하는 것을 방지하기 위해 Promise 재사용
   * @returns 새로운 토큰 또는 null (실패 시)
   */
  private async handleTokenRefresh(): Promise<string | null> {
    // 이미 리프레시 진행 중인 경우 기존 Promise 반환
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    // 새로운 리프레시 작업 시작
    this.refreshPromise = refreshToken();
    
    try {
      // 리프레시 작업 완료 후 Promise 초기화
      const token = await this.refreshPromise;
      this.refreshPromise = null;
      return token;
    } catch (error) {
      // 오류 발생 시 Promise 초기화 및 null 반환
      this.refreshPromise = null;
      return null;
    }
  }

  /**
   * 인증이 필요 없는 공개 경로인지 확인
   * @param url 요청 URL
   * @returns 인증이 필요 없는 경로이면 true
   */
  private isPublicPath(url: string): boolean {
    const publicPaths = [
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/health',
      '/api/health',
    ];
    
    return publicPaths.some(path => url.includes(path));
  }

  /**
   * 로그인 페이지로 리다이렉트
   */
  private redirectToLogin(): void {
    // 토큰 제거
    removeToken();
    
    // 현재 페이지 URL 저장 (로그인 후 복귀용)
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    
    // 로그인 페이지로 이동
    window.location.href = `/login?returnUrl=${returnUrl}`;
  }
}