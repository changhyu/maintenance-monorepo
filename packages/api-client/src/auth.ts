/**
 * 인증 관련 유틸리티 모듈
 * 
 * 토큰 관리, 인증 상태 확인, 토큰 디코딩 등의 기능을 제공합니다.
 */

import axios from 'axios';
import { jwtDecode, JwtPayload as BaseJwtPayload } from 'jwt-decode';

// JWT 페이로드 타입 정의
export interface JwtPayload extends BaseJwtPayload {
  id?: string;
  username?: string;
  email?: string;
  role?: string | string[];
  roles?: string[];
  name?: string;
  [key: string]: any;
}

// 인증 토큰 저장 키
export const AUTH_TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'auth_refresh_token';
export const TOKEN_TYPE_KEY = 'auth_token_type';
export const USER_INFO_KEY = 'userInfo';
export const AUTH_TOKEN_EXPIRES_KEY = 'auth_token_expires';

// 사용자 정보 인터페이스
export interface UserInfo {
  id: string;
  username?: string;
  email?: string;
  role?: string;
  roles?: string[];
  name?: string;
  [key: string]: any;
}

// 인증 토큰 정보 인터페이스
export interface TokenInfo {
  token: string;
  tokenType: string;
  refreshToken?: string;
  expiresAt?: number;
  expiresIn?: number;
  user?: UserInfo;
}

// 토큰 갱신 결과 타입
export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
}

// 토큰 갱신 응답 타입 정의 (추가)
interface TokenRefreshResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  status?: string;
  message?: string;
}

/**
 * JWT 토큰을 디코딩해서 페이로드를 반환합니다.
 * @param token JWT 토큰
 * @returns 디코딩된 페이로드
 * @deprecated parseJwt 함수와 동일한 기능을 하므로 parseJwt 사용을 권장합니다.
 */
export function decodeToken(token: string): JwtPayload | null {
  // 이 함수는 deprecated 함수이므로 새 함수 호출로 대체
  return parseJwt(token);
}

/**
 * 토큰에서 만료 시간 추출
 * @param token JWT 토큰
 * @returns 만료 시간(초) 또는 null (추출 실패 시)
 */
export function getTokenExpiration(token: string): number | null {
  const payload = parseJwt(token);
  return payload?.exp ?? null;
}

/**
 * 토큰 만료 여부 확인
 * @param token JWT 토큰
 * @returns 만료 여부 (true/false)
 */
export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return true;
  }
  
  // 현재 시간(초)과 만료 시간(초) 비교
  const currentTime = Math.floor(Date.now() / 1000);
  return currentTime >= expiration;
}

/**
 * 인증 토큰 저장
 * @param tokenInfo 토큰 정보
 */
export function saveToken(tokenInfo: TokenInfo): void {
  if (typeof window === 'undefined') {
    return; // SSR 환경에서는 동작하지 않음
  }
  
  localStorage.setItem(AUTH_TOKEN_KEY, tokenInfo.token);
  
  if (tokenInfo.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokenInfo.refreshToken);
  }
  
  if (tokenInfo.tokenType) {
    localStorage.setItem(TOKEN_TYPE_KEY, tokenInfo.tokenType);
  } else {
    localStorage.setItem(TOKEN_TYPE_KEY, 'Bearer');
  }
  
  if (tokenInfo.expiresAt) {
    localStorage.setItem(AUTH_TOKEN_EXPIRES_KEY, tokenInfo.expiresAt.toString());
  }
}

/**
 * 저장된 인증 토큰 가져오기
 * @returns 토큰 정보 또는 null (토큰이 없는 경우)
 */
export function getStoredToken(): TokenInfo | null {
  if (typeof window === 'undefined') {
    return null; // SSR 환경에서는 동작하지 않음
  }
  
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  
  if (!token) {
    return null;
  }
  
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) ?? undefined;
  const tokenType = localStorage.getItem(TOKEN_TYPE_KEY) ?? 'Bearer';
  const expiresAtStr = localStorage.getItem(AUTH_TOKEN_EXPIRES_KEY);
  const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : undefined;
  
  return {
    token,
    tokenType,
    refreshToken,
    expiresAt,
  };
}

/**
 * 토큰에서 사용자 정보 추출
 * @param token JWT 토큰
 * @returns 사용자 정보 또는 null (추출 실패 시)
 */
export function getUserInfoFromToken(token: string): UserInfo | null {
  const payload = parseJwt(token);
  if (!payload) {
    return null;
  }
  
  let roles: string[] | undefined;
  let role: string | undefined;
  
  // 역할(role) 정보 처리 로직 개선
  if (Array.isArray(payload.role)) {
    roles = payload.role;
    role = payload.role[0];
  } else if (payload.role) {
    // 수정: 불필요한 타입 단언 제거 (S4325)
    role = payload.role;
    roles = [role];
  }
  
  // JWT 페이로드에서 사용자 정보 필드 추출
  return {
    id: payload.sub ?? payload.id ?? '',
    username: payload.username,
    email: payload.email,
    role,
    roles,
    name: payload.name
  };
}

/**
 * 저장된 사용자 정보 가져오기
 * @returns 사용자 정보 또는 null (정보가 없는 경우)
 */
export function getStoredUserInfo(): UserInfo | null {
  try {
    if (typeof window === 'undefined') {
      return null; // SSR 환경에서는 동작하지 않음
    }
    
    const userJson = localStorage.getItem(USER_INFO_KEY);
    if (!userJson) {
      // 저장된 정보가 없으면 토큰에서 추출 시도
      const tokenInfo = getStoredToken();
      if (tokenInfo?.token) {
        return getUserInfoFromToken(tokenInfo.token);
      }
      return null;
    }
    
    return JSON.parse(userJson);
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error);
    return null;
  }
}

/**
 * 인증 정보 (토큰 및 사용자 정보) 삭제
 */
export function removeAuthInfo(): void {
  try {
    if (typeof window === 'undefined') {
      return; // SSR 환경에서는 동작하지 않음
    }
    
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_TYPE_KEY);
    localStorage.removeItem(USER_INFO_KEY);
  } catch (error) {
    console.error('인증 정보 삭제 실패:', error);
  }
}

/**
 * 로그인 상태 확인
 * @returns 로그인 여부 (true/false)
 */
export function isLoggedIn(): boolean {
  const tokenInfo = getStoredToken();
  if (!tokenInfo?.token) {
    return false;
  }
  
  // 토큰 만료 여부 확인
  return !isTokenExpired(tokenInfo.token);
}

/**
 * 토큰에서 역할(role) 정보 추출
 * @returns 역할 정보 또는 null (정보가 없는 경우)
 * @deprecated 다중 역할 지원을 위해 getUserRoles 함수 사용을 권장합니다.
 */
export function getUserRole(): string | null {
  return getUserRoles()[0] ?? null;
}

/**
 * 특정 역할을 가지고 있는지 확인
 * @param requiredRoles 필요한 역할 (단일 문자열 또는 배열)
 * @returns 역할 보유 여부 (true/false)
 */
export function hasRole(requiredRoles: string | string[]): boolean {
  const userRoles = getUserRoles();
  if (userRoles.length === 0) {
    return false;
  }
  
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.some(role => userRoles.includes(role));
  }
  
  return userRoles.includes(requiredRoles);
}

/**
 * 토큰 삭제 (로그아웃)
 */
export function removeToken(): void {
  if (typeof window === 'undefined') {
    return; // SSR 환경에서는 동작하지 않음
  }
  
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_TYPE_KEY);
  localStorage.removeItem(AUTH_TOKEN_EXPIRES_KEY);
}

/**
 * 토큰 갱신
 */
export async function refreshToken(
  refreshEndpoint: string = '/auth/refresh'
): Promise<TokenRefreshResult> {
  const tokenInfo = getStoredToken();
  
  // 수정: 논리 오류 수정 - 갱신 토큰이 없을 때 오류 반환
  if (!tokenInfo?.refreshToken) {
    return {
      success: false,
      error: '갱신 토큰이 없습니다. 다시 로그인해주세요.',
    };
  }
  
  try {
    // 토큰 갱신 요청 - 응답 타입 명시
    const response = await axios.post<TokenRefreshResponse>(refreshEndpoint, {
      refreshToken: tokenInfo.refreshToken,
    });
    
    const { accessToken, refreshToken, expiresIn } = response.data;
    
    if (!accessToken) {
      return {
        success: false,
        error: '토큰 갱신에 실패했습니다.',
      };
    }
    
    // 만료 시간 계산 (현재 시간 + expiresIn 초)
    const expiresAt = Date.now() + ((expiresIn || 3600) * 1000);
    
    // 새 토큰 저장
    saveToken({
      token: accessToken,
      tokenType: 'Bearer',
      refreshToken: refreshToken ?? tokenInfo.refreshToken,
      expiresAt,
    });
    
    return {
      success: true,
      accessToken,
      refreshToken: refreshToken ?? tokenInfo.refreshToken,
      expiresAt,
    };
  } catch (error) {
    console.error('토큰 갱신 오류:', error);
    
    return {
      success: false,
      error: '토큰 갱신 중 오류가 발생했습니다.',
    };
  }
}

/**
 * JWT 토큰을 디코딩해서 페이로드를 반환합니다.
 * @param token JWT 토큰
 * @returns 디코딩된 페이로드
 */
export function parseJwt(token: string): JwtPayload | null {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch (e) {
    console.error('Failed to parse token:', e);
    return null;
  }
}

/**
 * 현재 사용자의 권한 목록 가져오기
 * @returns 사용자의 권한 목록 (배열)
 */
export function getUserRoles(): string[] {
  const userInfo = getStoredUserInfo();
  if (!userInfo) {
    return [];
  }
  
  // 역할 정보가 있는 필드 확인 및 처리
  if (Array.isArray(userInfo.roles)) {
    return userInfo.roles;
  }
  
  if (Array.isArray(userInfo.role)) {
    return userInfo.role;
  }
  
  // 옵셔널 체이닝 표현식 개선 (S6582)
  return userInfo.role ? [userInfo.role] : [];
}

/**
 * 현재 사용자 ID 가져오기
 */
export function getUserId(): string | null {
  return getStoredUserInfo()?.id ?? null;
}

/**
 * 현재 사용자 정보 가져오기
 * @returns 사용자 정보 또는 null (정보가 없는 경우)
 * @deprecated getStoredUserInfo와 동일한 기능을 하므로 getStoredUserInfo 사용을 권장합니다.
 */
// @ts-ignore - 이 함수는 의도적으로 deprecated 처리됨
export function getUserInfo(): UserInfo | null {
  // 이 함수는 deprecated 함수이므로 새 함수 호출로 대체
  return getStoredUserInfo();
}

export default {
  saveToken,
  getStoredToken,
  removeToken,
  isTokenExpired,
  refreshToken,
  parseJwt,
  getUserRoles,
  getUserId,
  getStoredUserInfo, // getUserInfo 대신 getStoredUserInfo 내보냄
};