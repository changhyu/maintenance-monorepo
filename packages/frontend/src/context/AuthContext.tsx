import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { UserInfo, AuthStatus } from '../services/api/types';
import { getStoredUserInfo, isLoggedIn, removeToken } from '../services/api/auth-helpers';
import { authApi } from '../services/api/domain/auth-api';
import { useNotifications } from './AppContext';

// 인증 상태 타입
interface AuthState {
  status: AuthStatus; // 'authenticated' | 'unauthenticated' | 'loading'
  user: UserInfo | null;
  error: string | null;
}

// 액션 타입
type AuthAction = 
  | { type: 'AUTH_LOGIN_SUCCESS', payload: UserInfo }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_ERROR', payload: string }
  | { type: 'AUTH_RESET_ERROR' }
  | { type: 'AUTH_LOADING' }
  | { type: 'AUTH_USER_UPDATE', payload: Partial<UserInfo> };

// 초기 상태
const initialState: AuthState = {
  status: 'loading',
  user: null,
  error: null,
};

// 리듀서 함수
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_LOGIN_SUCCESS':
      return { 
        ...state, 
        status: 'authenticated', 
        user: action.payload,
        error: null 
      };
    
    case 'AUTH_LOGOUT':
      return { 
        ...state, 
        status: 'unauthenticated', 
        user: null,
        error: null 
      };
    
    case 'AUTH_ERROR':
      return { 
        ...state, 
        status: 'unauthenticated', 
        error: action.payload 
      };
    
    case 'AUTH_RESET_ERROR':
      return { 
        ...state, 
        error: null 
      };
    
    case 'AUTH_LOADING':
      return { 
        ...state, 
        status: 'loading',
        error: null 
      };
      
    case 'AUTH_USER_UPDATE':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null
      };
    
    default:
      return state;
  }
}

// Context 생성
interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  resetError: () => void;
  updateUserProfile: (userData: Partial<UserInfo>) => void;
}

const AuthContext = createContext<AuthContextType>({
  state: initialState,
  login: async () => false,
  logout: async () => {},
  resetError: () => {},
  updateUserProfile: () => {},
});

// Provider 컴포넌트
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const { addNotification } = useNotifications();
  
  // 로그인 상태 초기화
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 로컬 스토리지에서 토큰 확인
        if (isLoggedIn()) {
          // 저장된 사용자 정보 가져오기
          const userInfo = getStoredUserInfo();
          
          if (userInfo) {
            dispatch({ type: 'AUTH_LOGIN_SUCCESS', payload: userInfo });
            
            // 백그라운드에서 최신 사용자 정보 갱신 (선택적)
            try {
              const latestUserInfo = await authApi.getCurrentUser();
              dispatch({ type: 'AUTH_LOGIN_SUCCESS', payload: latestUserInfo });
            } catch (error) {
              console.error('사용자 정보 갱신 실패:', error);
              // 심각한 오류가 아니므로 상태는 변경하지 않음
            }
          } else {
            dispatch({ type: 'AUTH_LOGOUT' });
          }
        } else {
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      } catch (error) {
        console.error('인증 초기화 오류:', error);
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    };
    
    initAuth();
  }, []);
  
  // 로그인 함수
  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<boolean> => {
    try {
      dispatch({ type: 'AUTH_LOADING' });
      
      const response = await authApi.login({ email, password, rememberMe });
      dispatch({ type: 'AUTH_LOGIN_SUCCESS', payload: response.user });
      
      addNotification(`환영합니다, ${response.user.name}님`, 'success');
      return true;
    } catch (error) {
      console.error('로그인 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '로그인에 실패했습니다';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      
      addNotification(errorMessage, 'error');
      return false;
    }
  };
  
  // 로그아웃 함수
  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('로그아웃 API 호출 오류:', error);
      // API 호출이 실패해도 로컬에서는 로그아웃 처리
    }
    
    // 로컬 토큰 제거
    removeToken();
    dispatch({ type: 'AUTH_LOGOUT' });
    addNotification('로그아웃되었습니다', 'info');
  };
  
  // 오류 초기화
  const resetError = (): void => {
    dispatch({ type: 'AUTH_RESET_ERROR' });
  };
  
  // 사용자 프로필 업데이트
  const updateUserProfile = (userData: Partial<UserInfo>): void => {
    dispatch({ type: 'AUTH_USER_UPDATE', payload: userData });
  };
  
  return (
    <AuthContext.Provider value={{ state, login, logout, resetError, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// 커스텀 훅
export function useAuth() {
  return useContext(AuthContext);
}

// 인증 상태 확인을 위한 커스텀 훅
export function useAuthStatus() {
  const { state } = useAuth();
  return state.status;
}

// 인증된 사용자 정보를 위한 커스텀 훅
export function useAuthUser() {
  const { state } = useAuth();
  return state.user;
}

// 인증 오류 확인을 위한 커스텀 훅
export function useAuthError() {
  const { state, resetError } = useAuth();
  return { error: state.error, resetError };
}
