import React, { useState } from 'react';

/**
 * 비밀번호 재설정 요청 인터페이스
 */
interface _PasswordResetRequest {
  email: string;
}

/**
 * 비밀번호 재설정 폼 속성 인터페이스
 */
interface PasswordResetFormProps {
  onSuccess?: (email: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

/**
 * 비밀번호 재설정 폼 컴포넌트
 * 사용자가 이메일을 입력하여 비밀번호 재설정 링크를 요청할 수 있는 폼입니다.
 */
export function PasswordResetForm({
  onSuccess,
  onError,
  className = ''
}: PasswordResetFormProps) {
  // 상태 관리
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  /**
   * 폼 제출 처리
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!email.trim()) {
      setErrorMessage('이메일을 입력하세요');
      onError?.('이메일을 입력하세요');
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorMessage('유효한 이메일 주소를 입력하세요');
      onError?.('유효한 이메일 주소를 입력하세요');
      return;
    }
    
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      // 실제 비밀번호 재설정 요청 API 호출을 모의 구현
      await new Promise<void>((resolve, _reject) => {
        setTimeout(() => {
          // 가상의 성공 응답
          resolve();
          // 가상의 오류 응답
          // _reject(new Error('등록되지 않은 이메일입니다'));
        }, 1500);
      });
      
      // 성공 처리
      setSuccessMessage(`${email}로 비밀번호 재설정 링크가 전송되었습니다. 이메일을 확인해주세요.`);
      
      if (onSuccess) {
        onSuccess(email);
      }
    } catch (err) {
      // 오류 처리
      const message = err instanceof Error ? err.message : '비밀번호 재설정 요청 중 오류가 발생했습니다';
      setErrorMessage(message);
      
      if (onError) {
        onError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className={`password-reset-form ${className}`}>
      <h2 className="reset-title">비밀번호 재설정</h2>
      <p className="reset-description">
        가입 시 사용한 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.
      </p>
      
      {/* 성공 메시지 표시 */}
      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}
      
      {/* 오류 메시지 표시 */}
      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* 이메일 입력 필드 */}
        <div className="form-group">
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting || !!successMessage}
            placeholder="이메일 입력"
            autoComplete="email"
            required
          />
        </div>
        
        {/* 전송 버튼 */}
        <button
          type="submit"
          className="reset-button"
          disabled={isSubmitting || !!successMessage}
        >
          {isSubmitting ? '전송 중...' : '비밀번호 재설정 링크 전송'}
        </button>
      </form>
      
      {/* 로그인 페이지로 돌아가기 링크 */}
      <div className="back-to-login">
        <a href="/login" className="back-link">로그인 페이지로 돌아가기</a>
      </div>
    </div>
  );
}

/**
 * 새 비밀번호 설정 요청 인터페이스
 */
interface NewPasswordRequest {
  password: string;
  confirmPassword: string;
  token: string; // 재설정 토큰
}

/**
 * 새 비밀번호 설정 폼 속성 인터페이스
 */
interface NewPasswordFormProps {
  token: string; // URL에서 추출한 토큰
  onSuccess?: () => void;
  onError?: (error: string) => void;
  redirectUrl?: string;
  className?: string;
}

/**
 * 새 비밀번호 설정 폼 컴포넌트
 * 사용자가 이메일로 받은 링크를 통해 새로운 비밀번호를 설정할 수 있는 폼입니다.
 */
export function NewPasswordForm({
  token,
  onSuccess,
  onError,
  redirectUrl,
  className = ''
}: NewPasswordFormProps) {
  // 상태 관리
  const [formData, setFormData] = useState<NewPasswordRequest>({
    password: '',
    confirmPassword: '',
    token
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  /**
   * 입력 필드 변경 처리
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 해당 필드의 오류 초기화
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  /**
   * 폼 유효성 검사
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // 비밀번호 검사
    if (!formData.password) {
      newErrors.password = '새 비밀번호를 입력하세요';
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다';
    }
    
    // 비밀번호 확인 검사
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력하세요';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  /**
   * 폼 제출 처리
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 실제 비밀번호 변경 API 호출을 모의 구현
      await new Promise<void>((resolve, _reject) => {
        setTimeout(() => {
          // 토큰 검증
          if (token !== 'valid-token') {
            _reject(new Error('유효하지 않거나 만료된 토큰입니다'));
            return;
          }
          
          // 가상의 성공 응답
          resolve();
        }, 1500);
      });
      
      // 성공 처리
      setSuccessMessage('비밀번호가 성공적으로 변경되었습니다');
      
      // 리다이렉트 또는 성공 콜백
      if (redirectUrl) {
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 2000);
      } else if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      // 오류 처리
      const errorMessage = err instanceof Error ? err.message : '비밀번호 변경 중 오류가 발생했습니다';
      
      setErrors({
        general: errorMessage
      });
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className={`new-password-form ${className}`}>
      <h2 className="reset-title">새 비밀번호 설정</h2>
      
      {/* 성공 메시지 표시 */}
      {successMessage && (
        <div className="success-message">
          {successMessage}
          {redirectUrl && (
            <p>잠시 후 로그인 페이지로 이동합니다...</p>
          )}
        </div>
      )}
      
      {/* 일반 오류 메시지 표시 */}
      {errors.general && (
        <div className="error-message">
          {errors.general}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* 새 비밀번호 입력 필드 */}
        <div className="form-group">
          <label htmlFor="password">새 비밀번호</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            disabled={isSubmitting || !!successMessage}
            placeholder="새 비밀번호 입력 (8자 이상)"
            autoComplete="new-password"
            required
          />
          {errors.password && (
            <div className="field-error">{errors.password}</div>
          )}
        </div>
        
        {/* 비밀번호 확인 입력 필드 */}
        <div className="form-group">
          <label htmlFor="confirmPassword">비밀번호 확인</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isSubmitting || !!successMessage}
            placeholder="새 비밀번호 다시 입력"
            autoComplete="new-password"
            required
          />
          {errors.confirmPassword && (
            <div className="field-error">{errors.confirmPassword}</div>
          )}
        </div>
        
        {/* 비밀번호 변경 버튼 */}
        <button
          type="submit"
          className="reset-button"
          disabled={isSubmitting || !!successMessage}
        >
          {isSubmitting ? '처리 중...' : '비밀번호 변경'}
        </button>
      </form>
      
      {/* 로그인 페이지로 돌아가기 링크 */}
      <div className="back-to-login">
        <a href="/login" className="back-link">로그인 페이지로 돌아가기</a>
      </div>
    </div>
  );
} 