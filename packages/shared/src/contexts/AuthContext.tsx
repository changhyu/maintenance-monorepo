import React, { createContext, useState, useContext, useReducer, useEffect } from 'react';
import { User, UserInfo, LoginRequest } from '../hooks/useAuth';

/**
 * 인증 컨텍스트에서 사용할 콜백 인터페이스
 */
export interface AuthCallbacks {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * 인증 컨텍스트 타입 정의
 */
export interface AuthContextType {
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

// 기본 컨텍스트 값
const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
  refreshToken: async () => {},
  hasRole: () => false,
  hasPermission: () => false,
  clearError: () => {},
};

// 인증 액션 타입
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: UserInfo }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_SUCCESS'; payload: UserInfo }
  | { type: 'REFRESH_FAILURE'; payload: string }
  | { type: 'CLEAR_ERROR' };

// 인증 상태 타입
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  error: string | null;
}

// 초기 인증 상태
const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,
};

// 인증 상태 리듀서
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
    case 'REFRESH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
    case 'REFRESH_SUCCESS':
      return {
        isAuthenticated: true,
        isLoading: false,
        user: action.payload,
        error: null,
      };
    case 'LOGIN_FAILURE':
    case 'REFRESH_FAILURE':
      return {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

// 인증 컨텍스트 생성
export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

/**
 * 인증 프로바이더 속성
 */
export interface AuthProviderProps {
  children: React.ReactNode;
  // 추가 속성들
  autoLogin?: boolean;
  storageKey?: string;
  // AuthProvider.tsx에서 전달하는 속성들
  authService?: any; // 타입을 any로 임시 설정 (나중에 정확한 타입으로 변경 가능)
  onLoginSuccess?: () => void;
  onLoginError?: (error: string) => void;
  onLogoutSuccess?: () => void;
  onLogoutError?: (error: string) => void;
}

/**
 * 인증 프로바이더 컴포넌트
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  autoLogin = true,
  storageKey = 'auth_token',
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 브라우저 환경 확인
  const isBrowser = typeof window !== 'undefined';
  
  // 토큰 저장 함수
  const saveToken = (token: string) => {
    if (!isBrowser) return;
    localStorage.setItem(storageKey, token);
  };

  // 토큰 불러오기 함수
  const getToken = (): string | null => {
    if (!isBrowser) return null;
    return localStorage.getItem(storageKey);
  };

  // 토큰 삭제 함수
  const removeToken = () => {
    if (!isBrowser) return;
    localStorage.removeItem(storageKey);
  };

  // 자동 로그인 시도
  useEffect(() => {
    if (!autoLogin || !isBrowser) {
      dispatch({ type: 'LOGIN_FAILURE', payload: '자동 로그인이 비활성화되었습니다.' });
      return;
    }

    const token = getToken();
    if (!token) {
      dispatch({ type: 'LOGIN_FAILURE', payload: '로그인 토큰이 없습니다.' });
      return;
    }

    // 토큰으로 세션 복구 로직
    const validateToken = async () => {
      try {
        dispatch({ type: 'REFRESH_START' });
        
        // 여기서 토큰 검증 API 호출
        const response = await fetch('/api/auth/validate', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('토큰이 유효하지 않습니다.');
        }
        
        const data = await response.json();
        dispatch({ 
          type: 'REFRESH_SUCCESS', 
          payload: {
            user: data.user,
            token: token
          }
        });
      } catch (error) {
        removeToken();
        dispatch({ 
          type: 'REFRESH_FAILURE', 
          payload: error instanceof Error ? error.message : '세션 복구 중 오류가 발생했습니다.' 
        });
      }
    };

    validateToken();
  }, [autoLogin, isBrowser, storageKey]);

  // 로그인 함수
  const login = async (credentials: LoginRequest, callbacks?: AuthCallbacks) => {
    if (!isBrowser) {
      if (callbacks?.onError) callbacks.onError('브라우저 환경이 아닌 곳에서는 로그인이 불가능합니다.');
      return;
    }
    
    dispatch({ type: 'LOGIN_START' });
    try {
      // 로그인 API 호출
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '로그인 중 오류가 발생했습니다.');
      }
      
      const data = await response.json();
      
      // 토큰 저장
      saveToken(data.token);
      
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: {
          user: data.user,
          token: data.token
        }
      });
      
      if (callbacks?.onSuccess) callbacks.onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      if (callbacks?.onError) callbacks.onError(errorMessage);
    }
  };

  // 로그아웃 함수
  const logout = async (callbacks?: AuthCallbacks) => {
    if (!isBrowser) {
      if (callbacks?.onError) callbacks.onError('브라우저 환경이 아닌 곳에서는 로그아웃이 불가능합니다.');
      return;
    }
    
    try {
      // 토큰 초기화
      removeToken();
      
      // 서버에 로그아웃 알림 (선택적)
      if (state.isAuthenticated && state.user?.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${state.user.token}`,
          },
        });
      }
      
      dispatch({ type: 'LOGOUT' });
      if (callbacks?.onSuccess) callbacks.onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '로그아웃 중 오류가 발생했습니다.';
      if (callbacks?.onError) callbacks.onError(errorMessage);
    }
  };

  // 토큰 갱신 함수
  const refreshToken = async () => {
    if (!isBrowser || !state.isAuthenticated || !state.user?.token) {
      return;
    }
    
    dispatch({ type: 'REFRESH_START' });
    try {
      // 토큰 갱신 API 호출
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${state.user.token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('토큰 갱신에 실패했습니다.');
      }
      
      const data = await response.json();
      
      // 새 토큰 저장
      saveToken(data.token);
      
      dispatch({ 
        type: 'REFRESH_SUCCESS', 
        payload: {
          user: data.user,
          token: data.token
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '토큰 갱신 중 오류가 발생했습니다.';
      dispatch({ type: 'REFRESH_FAILURE', payload: errorMessage });
      // 인증 정보 초기화
      logout();
    }
  };

  // 역할 확인 함수
  const hasRole = (role: string): boolean => {
    if (!state.isAuthenticated || !state.user?.user.roles) {
      return false;
    }
    return state.user.user.roles.includes(role);
  };

  // 권한 확인 함수
  const hasPermission = (permission: string): boolean => {
    if (!state.isAuthenticated || !state.user?.user.permissions) {
      return false;
    }
    return state.user.user.permissions.includes(permission);
  };

  // 오류 초기화 함수
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // 컨텍스트 값
  const contextValue: AuthContextType = {
    user: state.user?.user || null,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
    refreshToken,
    hasRole,
    hasPermission,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 인증 컨텍스트 사용 훅
 */
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext는 AuthProvider 내에서 사용해야 합니다.');
  }
  return context;
};

/**
 * 보호된 라우트를 만들기 위한 HOC
 * @param Component 렌더링할 컴포넌트
 * @param requiredRoles 필요한 역할 목록 (선택사항)
 * @param requiredPermissions 필요한 권한 목록 (선택사항)
 * @returns 인증 상태에 따라 처리되는 컴포넌트
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: string[],
  requiredPermissions?: string[]
) {
  return function WithAuth(props: P) {
    const { isAuthenticated, isLoading, hasRole, hasPermission } = useAuthContext();
    
    if (isLoading) {
      // 로딩 중일 때 처리
      return <div>로딩 중...</div>;
    }
    
    if (!isAuthenticated) {
      // 인증되지 않았을 때 처리
      return <div>로그인이 필요합니다.</div>;
    }
    
    // 역할 검사
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some(role => hasRole(role));
      if (!hasRequiredRole) {
        return <div>접근 권한이 없습니다.</div>;
      }
    }
    
    // 권한 검사
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasRequiredPermission = requiredPermissions.some(permission => 
        hasPermission(permission)
      );
      if (!hasRequiredPermission) {
        return <div>필요한 권한이 없습니다.</div>;
      }
    }
    
    // 모든 검사를 통과하면 원래 컴포넌트 렌더링
    return <Component {...props} />;
  };
}