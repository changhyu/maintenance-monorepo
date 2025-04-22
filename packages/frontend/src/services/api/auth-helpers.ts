import { jwtDecode } from 'jwt-decode';
import { UserInfo } from './types';
import { notifyError } from './notifications';

// 로컬 스토리지 키 상수
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_INFO_KEY = 'auth_user_info';

/**
 * 토큰을 로컬 스토리지에 저장
 * @param token JWT 토큰
 * @param refreshToken 리프레시 토큰
 * @param userInfo 사용자 정보
 */
export function saveToken(token: string, refreshToken: string, userInfo?: UserInfo): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  
  if (userInfo) {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
  } else {
    try {
      // 토큰에서 사용자 정보 추출
      const decodedToken = jwtDecode<{ user: UserInfo }>(token);
      if (decodedToken.user) {
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(decodedToken.user));
      }
    } catch (error) {
      console.error('토큰에서 사용자 정보를 추출하는데 실패했습니다:', error);
    }
  }
}

/**
 * 로컬 스토리지에서 인증 토큰 가져오기
 * @returns 저장된 토큰 또는 null
 */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 로컬 스토리지에서 리프레시 토큰 가져오기
 * @returns 저장된 리프레시 토큰 또는 null
 */
export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * 로컬 스토리지에서 사용자 정보 가져오기
 * @returns 저장된 사용자 정보 또는 null
 */
export function getStoredUserInfo(): UserInfo | null {
  const userInfoString = localStorage.getItem(USER_INFO_KEY);
  
  if (!userInfoString) {
    return null;
  }
  
  try {
    return JSON.parse(userInfoString);
  } catch (error) {
    console.error('사용자 정보 파싱 중 오류 발생:', error);
    return null;
  }
}

/**
 * 로컬 스토리지에서 인증 관련 정보 제거
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
}

/**
 * 토큰이 만료되었는지 확인
 * @param token JWT 토큰
 * @returns 만료 여부
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    const currentTime = Date.now() / 1000;
    
    // 만료 시간이 없거나 현재 시간이 만료 시간을 지났으면 만료된 것으로 처리
    if (!decoded.exp || currentTime >= decoded.exp) {
      return true;
    }
    
    // 만료 10분 전인 경우에도 리프레시 필요로 처리
    return currentTime >= decoded.exp - 600;
  } catch (error) {
    console.error('토큰 디코딩 중 오류 발생:', error);
    return true;
  }
}

/**
 * 현재 사용자의 로그인 상태 확인
 * @returns 로그인 상태
 */
export function isLoggedIn(): boolean {
  const token = getStoredToken();
  return !!token && !isTokenExpired(token);
}

/**
 * 토큰 리프레시 함수
 * @returns 새 토큰 또는 null (실패 시)
 */
export async function refreshToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  
  if (!refreshToken) {
    console.error('리프레시 토큰이 없습니다.');
    return null;
  }
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      throw new Error(`리프레시 요청 실패: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.token || !data.refreshToken) {
      throw new Error('응답에 토큰이 포함되어 있지 않습니다.');
    }
    
    // 새 토큰 저장
    saveToken(data.token, data.refreshToken, data.user);
    
    return data.token;
  } catch (error) {
    console.error('토큰 리프레시 중 오류 발생:', error);
    notifyError('인증 오류', '세션이 만료되었습니다. 다시 로그인해 주세요.');
    return null;
  }
}

/**
 * 사용자 역할 확인
 * @param requiredRole 필요한 역할
 * @returns 역할 충족 여부
 */
export function hasRole(requiredRole: string | string[]): boolean {
  const userInfo = getStoredUserInfo();
  
  if (!userInfo || !userInfo.role) {
    return false;
  }
  
  // 관리자는 모든 권한 가짐
  if (userInfo.role === 'admin') {
    return true;
  }
  
  // 단일 역할 체크
  if (typeof requiredRole === 'string') {
    return userInfo.role === requiredRole;
  }
  
  // 여러 역할 중 하나라도 충족하는지 체크
  return requiredRole.includes(userInfo.role);
}
