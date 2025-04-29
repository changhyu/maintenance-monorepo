import { useAuthContext, AuthCallbacks } from '../contexts/AuthContext';

/**
 * 사용자 정보 타입
 */
export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  [key: string]: any;
}

/**
 * 사용자 및 토큰 정보 타입
 */
export interface UserInfo {
  user: User;
  token: string;
}

/**
 * 로그인 요청 타입
 */
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * 인증 상태 타입
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  error: string | null;
}

/**
 * useAuth 훅 반환 타입
 */
export interface UseAuthResult {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest, callbacks?: AuthCallbacks) => Promise<void>;
  logout: (callbacks?: AuthCallbacks) => Promise<void>;
  refreshToken: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  clearError: () => void;
}

/**
 * 인증 관련 기능을 제공하는 훅
 * @returns {UseAuthResult} 인증 상태와 메서드
 */
export function useAuth(): UseAuthResult {
  // 브라우저 환경 체크
  const isBrowser = typeof window !== 'undefined';
  
  // AuthContext 사용
  const auth = useAuthContext();
  
  // 로그인 함수
  const login = async (credentials: LoginRequest, callbacks?: AuthCallbacks): Promise<void> => {
    if (!isBrowser) {
      console.warn('브라우저 환경이 아닌 곳에서는 로그인이 불가능합니다.');
      if (callbacks?.onError) {
        callbacks.onError('브라우저 환경이 아닌 곳에서는 로그인이 불가능합니다.');
      }
      return;
    }
    
    return auth.login(credentials, callbacks);
  };
  
  // 로그아웃 함수
  const logout = async (callbacks?: AuthCallbacks): Promise<void> => {
    if (!isBrowser) {
      console.warn('브라우저 환경이 아닌 곳에서는 로그아웃이 불가능합니다.');
      if (callbacks?.onError) {
        callbacks.onError('브라우저 환경이 아닌 곳에서는 로그아웃이 불가능합니다.');
      }
      return;
    }
    
    return auth.logout(callbacks);
  };
  
  return {
    ...auth,
    login,
    logout
  };
}