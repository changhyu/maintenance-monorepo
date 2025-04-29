import React, { useState } from 'react';
import { LoginRequest } from '../../services/auth/AuthService';
import { useAuthContext } from '../../contexts/AuthContext';

/**
 * 로그인 폼 속성 인터페이스
 */
interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  redirectUrl?: string;
  className?: string;
}

/**
 * 로그인 폼 컴포넌트
 * 사용자 인증을 위한 입력 폼을 제공합니다.
 */
export function LoginForm({ 
  onSuccess, 
  onError, 
  redirectUrl,
  className = '' 
}: LoginFormProps) {
  // 상태 관리
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // 인증 컨텍스트 사용
  const { login, isLoading, error, clearError } = useAuthContext();
  
  /**
   * 폼 제출 처리
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!username.trim()) {
      onError?.('사용자 이름을 입력하세요.');
      return;
    }
    
    if (!password) {
      onError?.('비밀번호를 입력하세요.');
      return;
    }
    
    // 로그인 시도 전 오류 초기화
    clearError();
    
    try {
      // 로그인 요청
      const credentials: LoginRequest = {
        username,
        password,
        rememberMe
      };
      
      await login(credentials, {
        onSuccess: () => {
          // 리다이렉트 또는 성공 콜백 처리
          if (redirectUrl) {
            window.location.href = redirectUrl;
          } else if (onSuccess) {
            onSuccess();
          }
        },
        onError: (errorMessage: string) => {
          if (onError) {
            onError(errorMessage);
          }
        }
      });
    } catch (err) {
      // 오류는 이미 login 함수 내부에서 처리됨
    }
  };
  
  return (
    <div className={`login-form ${className}`}>
      <h2 className="login-title">로그인</h2>
      
      {/* 오류 메시지 표시 */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* 사용자 이름 입력 필드 */}
        <div className="form-group">
          <label htmlFor="username">사용자 이름</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            placeholder="사용자 이름 입력"
            autoComplete="username"
            required
          />
        </div>
        
        {/* 비밀번호 입력 필드 */}
        <div className="form-group">
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            placeholder="비밀번호 입력"
            autoComplete="current-password"
            required
          />
        </div>
        
        {/* 로그인 유지 옵션 */}
        <div className="form-group checkbox">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
          />
          <label htmlFor="remember-me">로그인 상태 유지</label>
        </div>
        
        {/* 로그인 버튼 */}
        <button
          type="submit"
          className="login-button"
          disabled={isLoading}
        >
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
} 