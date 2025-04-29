import React, { useState } from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { PasswordResetForm, NewPasswordForm } from '../components/auth/PasswordResetForm';
import { AuthProvider } from '../contexts/AuthContext';
import { getAuthService } from '../services/auth/AuthService';

/**
 * 인증 예제 탭 유형
 */
type AuthTab = 'login' | 'register' | 'reset' | 'new-password';

/**
 * 인증 컴포넌트 예제 페이지
 */
export function AuthExample() {
  // 현재 활성화된 탭
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  // 알림 메시지
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  
  /**
   * 성공 핸들러
   */
  const handleSuccess = (message: string) => {
    setNotification({
      type: 'success',
      message
    });
    
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };
  
  /**
   * 오류 핸들러
   */
  const handleError = (message: string) => {
    setNotification({
      type: 'error',
      message
    });
    
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };
  
  /**
   * 로그인 성공 핸들러
   */
  const handleLoginSuccess = () => {
    handleSuccess('로그인에 성공했습니다.');
  };
  
  /**
   * 회원가입 성공 핸들러
   */
  const handleRegisterSuccess = () => {
    handleSuccess('회원가입에 성공했습니다. 이메일을 확인해주세요.');
    setActiveTab('login');
  };
  
  /**
   * 비밀번호 재설정 요청 성공 핸들러
   */
  const handleResetSuccess = (email: string) => {
    handleSuccess(`${email}로 비밀번호 재설정 링크가 전송되었습니다.`);
  };
  
  /**
   * 비밀번호 변경 성공 핸들러
   */
  const handleNewPasswordSuccess = () => {
    handleSuccess('비밀번호가 성공적으로 변경되었습니다.');
    setTimeout(() => {
      setActiveTab('login');
    }, 2000);
  };
  
  return (
    <div className="auth-example">
      <h1 className="example-title">인증 컴포넌트 예제</h1>
      
      {/* 알림 메시지 */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      {/* 탭 네비게이션 */}
      <div className="auth-tabs">
        <button
          className={`tab-button ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => setActiveTab('login')}
        >
          로그인
        </button>
        <button
          className={`tab-button ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          회원가입
        </button>
        <button
          className={`tab-button ${activeTab === 'reset' ? 'active' : ''}`}
          onClick={() => setActiveTab('reset')}
        >
          비밀번호 재설정
        </button>
        <button
          className={`tab-button ${activeTab === 'new-password' ? 'active' : ''}`}
          onClick={() => setActiveTab('new-password')}
        >
          새 비밀번호 설정
        </button>
      </div>
      
      {/* 인증 서비스 제공자 */}
      <AuthProvider
        authService={getAuthService('https://api.example.com')}
        onLoginSuccess={handleLoginSuccess}
        onLoginError={handleError}
        onLogoutSuccess={() => handleSuccess('로그아웃되었습니다.')}
        onLogoutError={handleError}
      >
        <div className="auth-container">
          {/* 로그인 폼 */}
          {activeTab === 'login' && (
            <LoginForm
              onSuccess={handleLoginSuccess}
              onError={handleError}
              className="example-form"
            />
          )}
          
          {/* 회원가입 폼 */}
          {activeTab === 'register' && (
            <RegisterForm
              onSuccess={handleRegisterSuccess}
              onError={handleError}
              className="example-form"
            />
          )}
          
          {/* 비밀번호 재설정 요청 폼 */}
          {activeTab === 'reset' && (
            <PasswordResetForm
              onSuccess={handleResetSuccess}
              onError={handleError}
              className="example-form"
            />
          )}
          
          {/* 새 비밀번호 설정 폼 */}
          {activeTab === 'new-password' && (
            <NewPasswordForm
              token="valid-token" // 예제용 토큰
              onSuccess={handleNewPasswordSuccess}
              onError={handleError}
              redirectUrl="#/login"
              className="example-form"
            />
          )}
        </div>
      </AuthProvider>
      
      <div className="component-description">
        <h2>컴포넌트 설명</h2>
        <p>
          이 예제는 인증 관련 컴포넌트를 모두 보여줍니다. 각 컴포넌트는 실제 서비스에서 독립적으로 사용할 수 있으며,
          <code>AuthProvider</code>와 함께 사용하여 인증 상태를 전체 애플리케이션과 공유할 수 있습니다.
        </p>
        
        <h3>사용 방법</h3>
        <pre>
          {`
// 애플리케이션 루트에 AuthProvider 추가
<AuthProvider authService={getAuthService()}>
  <App />
</AuthProvider>

// 컴포넌트에서 인증 컨텍스트 사용
import { useAuthContext } from '../contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuthContext();
  
  // 인증 상태에 따른 렌더링 및 동작 처리
  // ...
}
          `}
        </pre>
      </div>
    </div>
  );
} 