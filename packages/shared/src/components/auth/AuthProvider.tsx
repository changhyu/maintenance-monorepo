import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LoginRequest, User, AuthService } from '../../services/auth/AuthService';
import { AuthProvider as ContextAuthProvider } from '../../contexts/AuthContext';

/**
 * 인증 프로바이더 속성 인터페이스
 */
export interface AuthProviderProps {
  /**
   * 자식 컴포넌트
   */
  children: ReactNode;
  
  /**
   * 인증 서비스 인스턴스
   */
  authService: AuthService;
  
  /**
   * 로그인 성공 시 콜백
   */
  onLoginSuccess?: () => void;
  
  /**
   * 로그인 실패 시 콜백
   */
  onLoginError?: (error: string) => void;
  
  /**
   * 로그아웃 성공 시 콜백
   */
  onLogoutSuccess?: () => void;
  
  /**
   * 로그아웃 실패 시 콜백
   */
  onLogoutError?: (error: string) => void;
}

/**
 * 인증 프로바이더 컴포넌트
 * AuthContext의 AuthProvider를 래핑하여 사용하기 쉽게 제공합니다.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ 
  children, 
  authService,
  onLoginSuccess,
  onLoginError,
  onLogoutSuccess,
  onLogoutError,
}) => {
  return (
    <ContextAuthProvider
      authService={authService}
      onLoginSuccess={onLoginSuccess}
      onLoginError={onLoginError}
      onLogoutSuccess={onLogoutSuccess}
      onLogoutError={onLogoutError}
    >
      {children}
    </ContextAuthProvider>
  );
};

export default AuthProvider;