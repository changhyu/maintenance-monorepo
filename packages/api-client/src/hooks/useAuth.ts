import { useState, useEffect, useCallback } from 'react';
import { ApiClient } from '../client';
import * as auth from '../auth';
import { UserInfo } from '../auth';

// 인증 상태 인터페이스
export interface AuthState {
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  user: UserInfo | null;
  error: string | null;
}

// 로그인 요청 인터페이스
export interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
  rememberMe?: boolean;
}

// 로그인 응답 인터페이스
export interface LoginResponse {
  token: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  expiresAt?: number;
  user?: UserInfo;
}

// Auth Hook의 반환 타입
export interface UseAuthReturn {
  state: AuthState;
  login: (data: LoginRequest) => Promise<LoginResponse>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  initialized: boolean;
}

/**
 * 인증 관련 React Hook
 * @param apiClient API 클라이언트 인스턴스
 */
export const useAuth = (apiClient: ApiClient): UseAuthReturn => {
  // 인증 상태
  const [state, setState] = useState<AuthState>({
    status: 'idle',
    user: null,
    error: null
  });
  
  // 초기화 완료 상태
  const [initialized, setInitialized] = useState<boolean>(false);
  
  // 초기 인증 상태 확인
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setState(prev => ({ ...prev, status: 'loading' }));
        
        // 저장된 토큰 확인
        const tokenInfo = auth.getStoredToken();
        
        // 토큰이 없으면 비인증 상태로 설정
        if (!tokenInfo) {
          setState({
            status: 'unauthenticated',
            user: null,
            error: null
          });
          setInitialized(true);
          return;
        }
        
        // 토큰이 만료되었으면 갱신 시도
        if (auth.isTokenExpired(tokenInfo.token)) {
          try {
            const success = await refreshToken();
            if (!success) {
              // 갱신 실패 시 로그아웃 처리
              logout();
              return;
            }
          } catch (error) {
            console.warn('토큰 갱신 중 오류 발생:', error);
            logout();
            return;
          }
        }
        
        // 토큰이 유효하면 API 클라이언트에 설정
        apiClient.setAuthToken(tokenInfo.token, tokenInfo.tokenType);
        
        // 사용자 정보 설정
        let userInfo = tokenInfo.user;
        
        // 저장된 사용자 정보가 없으면 토큰에서 추출
        if (!userInfo) {
          userInfo = auth.getUserInfoFromToken(tokenInfo.token);
        }
        
        setState({
          status: 'authenticated',
          user: userInfo || null,
          error: null
        });
      } catch (error) {
        console.error('인증 상태 확인 실패:', error);
        setState({
          status: 'error',
          user: null,
          error: error instanceof Error ? error.message : '인증 상태 확인 중 오류가 발생했습니다.'
        });
      } finally {
        setInitialized(true);
      }
    };
    
    checkAuthStatus();
  }, [apiClient]);
  
  // 토큰 갱신 함수
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, status: 'loading' }));
      
      // API를 통한 토큰 갱신 요청
      const refreshTokenValue = localStorage.getItem(auth.REFRESH_TOKEN_KEY);
      if (!refreshTokenValue) {
        return false;
      }
      
      const response = await apiClient.post<LoginResponse>('/auth/refresh', {
        refreshToken: refreshTokenValue
      });
      
      // 새 토큰 저장
      if (response.token) {
        auth.saveToken({
          token: response.token,
          refreshToken: response.refreshToken,
          tokenType: response.tokenType,
          expiresIn: response.expiresIn,
          user: response.user
        });
        
        // API 클라이언트에 새 토큰 설정
        apiClient.setAuthToken(response.token, response.tokenType);
        
        // 상태 업데이트
        setState({
          status: 'authenticated',
          user: response.user || auth.getUserInfoFromToken(response.token) || null,
          error: null
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('토큰 갱신 실패:', error);
      setState({
        status: 'error',
        user: null,
        error: error instanceof Error ? error.message : '토큰 갱신 중 오류가 발생했습니다.'
      });
      return false;
    }
  }, [apiClient]);
  
  // 로그인 함수
  const login = useCallback(async (data: LoginRequest): Promise<LoginResponse> => {
    try {
      setState(prev => ({ ...prev, status: 'loading' }));
      
      // 로그인 API 요청
      const response = await apiClient.post<LoginResponse>('/auth/login', data);
      
      // 토큰 저장
      auth.saveToken({
        token: response.token,
        refreshToken: response.refreshToken,
        tokenType: response.tokenType,
        expiresIn: response.expiresIn,
        user: response.user
      });
      
      // API 클라이언트에 토큰 설정
      apiClient.setAuthToken(response.token, response.tokenType);
      
      // 사용자 정보 설정
      let userInfo = response.user;
      
      // 응답에 사용자 정보가 없으면 토큰에서 추출
      if (!userInfo) {
        userInfo = auth.getUserInfoFromToken(response.token);
      }
      
      setState({
        status: 'authenticated',
        user: userInfo || null,
        error: null
      });
      
      return response;
    } catch (error) {
      console.error('로그인 실패:', error);
      setState({
        status: 'error',
        user: null,
        error: error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.'
      });
      throw error;
    }
  }, [apiClient]);
  
  // 로그아웃 함수
  const logout = useCallback((): void => {
    // 인증 정보 삭제
    auth.removeAuthInfo();
    
    // API 클라이언트에서 토큰 제거
    apiClient.removeAuthToken();
    
    // 상태 업데이트
    setState({
      status: 'unauthenticated',
      user: null,
      error: null
    });
    
    // 로그아웃 API 호출 (실패해도 로컬 로그아웃은 성공)
    apiClient.post('/auth/logout').catch((err) => {
      console.warn('로그아웃 API 호출 실패 (무시됨):', err);
    });
  }, [apiClient]);
  
  // 인증 관련 이벤트 리스너 추가
  useEffect(() => {
    // 로그아웃 강제 이벤트 리스너
    const handleLogoutEvent = (event: CustomEvent) => {
      const reason = event.detail?.reason;
      if (reason === 'token_refresh_failed') {
        setState(prev => ({
          ...prev,
          error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.'
        }));
      }
      logout();
    };
    
    // 이벤트 리스너 등록
    window.addEventListener('auth:logout-required', handleLogoutEvent as EventListener);
    
    // 클린업 함수
    return () => {
      window.removeEventListener('auth:logout-required', handleLogoutEvent as EventListener);
    };
  }, [logout]);
  
  return {
    state,
    login,
    logout,
    refreshToken,
    initialized
  };
};