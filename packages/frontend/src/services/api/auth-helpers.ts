/**
 * 인증 관련 헬퍼 함수
 */
import { jwtDecode } from 'jwt-decode';
import type { JwtPayload } from 'jwt-decode';

// 토큰 저장 키
const TOKEN_STORAGE_KEY = 'authToken';
const REFRESH_TOKEN_STORAGE_KEY = 'refreshToken';

// 사용자 정보 저장 키
const USER_STORAGE_KEY = 'user';

/**
 * 사용자 정보 인터페이스
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  [key: string]: any;
}

/**
 * 확장된 JWT 페이로드 인터페이스
 */
interface AuthTokenPayload extends JwtPayload {
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
}

/**
 * 토큰을 로컬 스토리지에 저장
 * @param token JWT 토큰
 */
export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  
  // 토큰으로부터 사용자 정보 추출하여 저장
  try {
    const decodedToken = jwtDecode<AuthTokenPayload>(token);
    
    if (!decodedToken) {
      return;
    }
    
    const user: User = {
      id: decodedToken.userId || decodedToken.sub || '',
      email: decodedToken.email || '',
      name: decodedToken.name || '',
      role: decodedToken.role || 'user',
      exp: decodedToken.exp
    };
    
    storeUser(user);
  } catch (error) {
    console.error('토큰 디코딩 중 오류 발생:', error);
  }
}

/**
 * 리프레시 토큰을 로컬 스토리지에 저장
 * @param token 리프레시 토큰
 */
export function storeRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
}

/**
 * 로컬 스토리지에서 토큰 가져오기
 * @returns 저장된 토큰 또는 null
 */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * 로컬 스토리지에서 리프레시 토큰 가져오기
 * @returns 저장된 리프레시 토큰 또는 null
 */
export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

/**
 * 모든 인증 관련 데이터 삭제
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * 사용자 정보 저장
 * @param user 사용자 정보 객체
 */
export function storeUser(user: User): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

/**
 * 저장된 사용자 정보 가져오기
 * @returns 사용자 정보 또는 null
 */
export function getStoredUser(): User | null {
  const userData = localStorage.getItem(USER_STORAGE_KEY);
  
  if (!userData) {
    return null;
  }
  
  try {
    return JSON.parse(userData) as User;
  } catch (error) {
    console.error('사용자 정보 파싱 중 오류 발생:', error);
    return null;
  }
}

/**
 * 토큰 만료 여부 확인
 * @param token JWT 토큰 (없으면 저장된 토큰 사용)
 * @returns 토큰 만료 여부
 */
export function isTokenExpired(token?: string): boolean {
  try {
    const tokenToCheck = token || getStoredToken();
    
    if (!tokenToCheck) {
      return true;
    }
    
    const decodedToken = jwtDecode<JwtPayload>(tokenToCheck);
    
    if (!decodedToken.exp) {
      return false;
    }
    
    // 현재 시간 (초 단위)
    const currentTime = Math.floor(Date.now() / 1000);
    
    // 토큰이 만료됐는지 확인 (5분 안전 마진 적용)
    return decodedToken.exp <= currentTime + 300;
  } catch (error) {
    console.error('토큰 만료 확인 중 오류 발생:', error);
    return true;
  }
}

/**
 * 사용자 로그인 여부 확인
 * @returns 로그인 여부
 */
export function isLoggedIn(): boolean {
  const token = getStoredToken();
  return !!token && !isTokenExpired(token);
}

/**
 * 사용자 권한 확인
 * @param requiredRole 필요한 권한
 * @returns 권한 보유 여부
 */
export function hasRole(requiredRole: string): boolean {
  const user = getStoredUser();
  
  if (!user || !isLoggedIn()) {
    return false;
  }
  
  if (requiredRole === 'admin' && user.role === 'admin') {
    return true;
  }
  
  if (requiredRole === 'manager' && ['admin', 'manager'].includes(user.role)) {
    return true;
  }
  
  if (requiredRole === 'user') {
    return true;
  }
  
  return false;
} 