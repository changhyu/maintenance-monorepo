import axios from 'axios';
// @ts-ignore - axios 타입 호환성 이슈 회피
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
// isAxiosError 함수 타입 호환을 위한 가져오기
import { isAxiosError } from 'axios';
import { jwtDecode } from 'jwt-decode';

// 기본 API URL
const DEFAULT_API_URL = process.env.API_URL || 'http://localhost:3001';

/**
 * 사용자 정보 인터페이스
 */
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  fullName?: string;
  avatar?: string;
}

/**
 * JWT 토큰 인터페이스
 */
export interface JwtToken {
  sub: string;
  roles: string[];
  permissions: string[];
  exp: number;
  iat: number;
}

/**
 * 로그인 요청 인터페이스
 */
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * 인증 응답 인터페이스
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * 사용자 정보 인터페이스
 */
export interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
  metadata?: Record<string, unknown>;
}

/**
 * 인증 서비스 인터페이스
 */
export interface AuthService {
  /**
   * 사용자 로그인
   * @param credentials 로그인 자격 증명
   * @returns 로그인 응답 프로미스
   */
  login(credentials: LoginRequest): Promise<AuthResponse>;

  /**
   * 사용자 로그아웃
   * @returns 작업 완료 프로미스
   */
  logout(): Promise<void>;

  /**
   * 현재 인증 상태 확인
   * @returns 인증 상태 유효 여부
   */
  checkAuthStatus(): Promise<boolean>;

  /**
   * 현재 로그인한 사용자 정보 가져오기
   * @returns 사용자 정보
   */
  getCurrentUser(): Promise<User>;

  /**
   * 토큰 갱신
   * @returns 갱신된 인증 응답
   */
  refreshToken(): Promise<AuthResponse>;
  
  /**
   * 현재 액세스 토큰 반환
   * @returns 액세스 토큰 또는 null
   */
  getAccessToken(): string | null;
  
  /**
   * 특정 역할 보유 여부 확인
   * @param role 확인할 역할
   * @returns 역할 보유 여부
   */
  hasRole(role: string): boolean;
  
  /**
   * 특정 권한 보유 여부 확인
   * @param permission 확인할 권한
   * @returns 권한 보유 여부
   */
  hasPermission(permission: string): boolean;
}

/**
 * HTTP 인증 서비스 구현
 */
export class HttpAuthService implements AuthService {
  private api: AxiosInstance;
  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;
  private tokenExpiry = 0;
  private localStoragePrefix = 'auth_';
  private currentUser: User | null = null;

  /**
   * 생성자
   * @param baseURL API 기본 URL
   */
  constructor(baseURL: string = DEFAULT_API_URL) {
    this.api = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // 로컬 스토리지에서 토큰 복원
    this.loadTokensFromStorage();
    
    // 요청 인터셉터 설정
    this.api.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // 응답 인터셉터 설정
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        // 401 에러 및 refreshToken이 있을 경우 토큰 재발급 시도
        if (
          error.response?.status === 401 &&
          this.refreshTokenValue &&
          error.config &&
          !error.config.__isRetry
        ) {
          try {
            await this.refreshToken();
            const newConfig = { ...error.config, __isRetry: true };
            newConfig.headers = newConfig.headers || {};
            newConfig.headers.Authorization = `Bearer ${this.accessToken}`;
            return axios(newConfig);
          } catch (refreshError) {
            console.error('토큰 갱신 실패:', refreshError);
            this.clearTokensFromStorage();
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 로컬 스토리지에서 토큰 로드
   */
  private loadTokensFromStorage(): void {
    if (typeof window === 'undefined') return;

    this.accessToken = localStorage.getItem(`${this.localStoragePrefix}access_token`);
    this.refreshTokenValue = localStorage.getItem(`${this.localStoragePrefix}refresh_token`);
    
    const expiryStr = localStorage.getItem(`${this.localStoragePrefix}token_expiry`);
    this.tokenExpiry = expiryStr ? parseInt(expiryStr, 10) : 0;
  }

  /**
   * 토큰을 로컬 스토리지에 저장
   * @param authResponse 인증 응답
   */
  private saveTokensToStorage(authResponse: AuthResponse): void {
    if (typeof window === 'undefined') return;

    const { accessToken, refreshToken, expiresIn } = authResponse;
    const expiryTime = Date.now() + expiresIn * 1000;

    localStorage.setItem(`${this.localStoragePrefix}access_token`, accessToken);
    localStorage.setItem(`${this.localStoragePrefix}refresh_token`, refreshToken);
    localStorage.setItem(`${this.localStoragePrefix}token_expiry`, expiryTime.toString());

    this.accessToken = accessToken;
    this.refreshTokenValue = refreshToken;
    this.tokenExpiry = expiryTime;
  }

  /**
   * 로컬 스토리지에서 토큰 제거
   */
  private clearTokensFromStorage(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(`${this.localStoragePrefix}access_token`);
    localStorage.removeItem(`${this.localStoragePrefix}refresh_token`);
    localStorage.removeItem(`${this.localStoragePrefix}token_expiry`);

    this.accessToken = null;
    this.refreshTokenValue = null;
    this.tokenExpiry = 0;
    this.currentUser = null;
  }

  /**
   * 토큰 디코딩
   * @param token JWT 토큰
   * @returns 디코딩된 토큰 또는 null
   */
  private decodeToken(token: string): JwtToken | null {
    try {
      return jwtDecode<JwtToken>(token);
    } catch (error) {
      console.error('토큰 디코딩 실패:', error);
      return null;
    }
  }

  /**
   * 토큰 만료 여부 확인
   * @param tokenInfo 토큰 정보
   * @returns 만료 여부
   */
  private isTokenExpired(tokenInfo: JwtToken): boolean {
    if (!tokenInfo.exp) return true;
    // 10초 버퍼 추가 (토큰이 10초 이내에 만료되는 경우도 만료된 것으로 처리)
    return tokenInfo.exp * 1000 < Date.now() + 10000;
  }

  /**
   * 사용자 로그인
   * @param credentials 로그인 자격 증명
   * @returns 인증 응답
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/auth/login', credentials);
      const authResponse = response.data;
      
      this.saveTokensToStorage(authResponse);
      
      // 사용자 정보 로드
      await this.getCurrentUser();
      
      return authResponse;
    } catch (error) {
      const axiosErr = error as any;
      throw (axiosErr.response?.data?.message)
        ? new Error(axiosErr.response.data.message)
        : new Error('로그인 중 오류가 발생했습니다.');
    }
  }

  /**
   * 사용자 로그아웃
   */
  async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        await this.api.post('/auth/logout');
      }
    } catch (error) {
      console.error('로그아웃 요청 중 오류:', error);
    } finally {
      this.clearTokensFromStorage();
    }
  }

  /**
   * 현재 인증 상태 확인
   * @returns 인증 상태 유효 여부
   */
  async checkAuthStatus(): Promise<boolean> {
    // 토큰이 없으면 인증되지 않음
    if (!this.accessToken) {
      return false;
    }

    // 토큰 정보 확인
    const tokenInfo = this.decodeToken(this.accessToken);
    if (!tokenInfo || this.isTokenExpired(tokenInfo)) {
      // 리프레시 토큰이 없으면 인증 실패
      if (!this.refreshTokenValue) {
        this.clearTokensFromStorage();
        return false;
      }
      
      // 토큰 갱신 시도
      try {
        await this.refreshToken();
      } catch (error) {
        this.clearTokensFromStorage();
        return false;
      }
    }

    try {
      // 사용자 정보 가져오기 (토큰 유효성 검증)
      if (!this.currentUser) {
        await this.getCurrentUser();
      }
      return true;
    } catch (error) {
      this.clearTokensFromStorage();
      return false;
    }
  }

  /**
   * 현재 로그인한 사용자 정보 가져오기
   * @returns 사용자 정보
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.api.get<User>('/auth/me');
      this.currentUser = response.data;
      return this.currentUser;
    } catch (error) {
      const axiosErr = error as any;
      throw (axiosErr.response?.data?.message)
        ? new Error(axiosErr.response.data.message)
        : new Error('사용자 정보를 가져오는 중 오류가 발생했습니다.');
    }
  }

  /**
   * 토큰 갱신
   * @returns 갱신된 인증 응답
   */
  async refreshToken(): Promise<AuthResponse> {
    // 리프레시 토큰이 없으면 오류
    if (!this.refreshTokenValue) {
      throw new Error('리프레시 토큰이 없습니다.');
    }

    try {
      const response = await this.api.post<AuthResponse>('/auth/refresh', {
        refreshToken: this.refreshTokenValue,
      });
      
      const authResponse = response.data;
      this.saveTokensToStorage(authResponse);
      
      return authResponse;
    } catch (error) {
      this.clearTokensFromStorage();
      const axiosErr = error as any;
      throw (axiosErr.response?.data?.message)
        ? new Error(axiosErr.response.data.message)
        : new Error('토큰 갱신 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 현재 액세스 토큰 반환
   * @returns 액세스 토큰 또는 null
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }
  
  /**
   * 특정 역할 보유 여부 확인
   * @param role 확인할 역할
   * @returns 역할 보유 여부
   */
  hasRole(role: string): boolean {
    if (!this.accessToken) return false;
    
    const tokenInfo = this.decodeToken(this.accessToken);
    if (!tokenInfo) return false;
    
    return tokenInfo.roles.includes(role);
  }
  
  /**
   * 특정 권한 보유 여부 확인
   * @param permission 확인할 권한
   * @returns 권한 보유 여부
   */
  hasPermission(permission: string): boolean {
    if (!this.accessToken) return false;
    
    const tokenInfo = this.decodeToken(this.accessToken);
    if (!tokenInfo) return false;
    
    return tokenInfo.permissions.includes(permission);
  }
}

/**
 * 인증 서비스 인스턴스 생성 함수
 * @param baseURL API 기본 URL
 * @returns AuthService 인스턴스
 */
export function getAuthService(baseURL?: string): AuthService {
  return new HttpAuthService(baseURL);
}