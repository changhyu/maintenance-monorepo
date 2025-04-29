import React, { useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';

/**
 * 회원가입 요청 인터페이스
 */
interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string; // 클라이언트측 유효성 검사용
  name?: string;
  agreeToTerms: boolean;
}

/**
 * 회원가입 폼 속성 인터페이스
 */
interface RegisterFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  redirectUrl?: string;
  className?: string;
}

/**
 * 회원가입 폼 컴포넌트
 */
export function RegisterForm({
  onSuccess,
  onError,
  redirectUrl,
  className = ''
}: RegisterFormProps) {
  // 상태 관리
  const [formData, setFormData] = useState<RegisterRequest>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    agreeToTerms: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 인증 컨텍스트 사용
  const { error } = useAuthContext();
  
  /**
   * 입력 필드 변경 처리
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
    
    // 사용자 이름 검사
    if (!formData.username.trim()) {
      newErrors.username = '사용자 이름을 입력하세요';
    } else if (formData.username.length < 4) {
      newErrors.username = '사용자 이름은 4자 이상이어야 합니다';
    }
    
    // 이메일 검사
    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력하세요';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '유효한 이메일 주소를 입력하세요';
    }
    
    // 비밀번호 검사
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력하세요';
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다';
    }
    
    // 비밀번호 확인 검사
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }
    
    // 이용약관 동의 검사
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = '이용약관에 동의해야 합니다';
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
      // 실제 회원가입 API 호출은 AuthContext를 통해 제공될 수 있음
      // 지금은 API 호출을 모의 구현
      await new Promise<void>((resolve, _reject) => {
        setTimeout(() => {
          // 가상의 성공 응답
          resolve();
          // 가상의 오류 응답
          // _reject(new Error('사용자 이름이 이미 사용 중입니다'));
        }, 1500);
      });
      
      // 성공 처리
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      // 오류 처리
      const errorMessage = err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다';
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className={`register-form ${className}`}>
      <h2 className="register-title">회원가입</h2>
      
      {/* 오류 메시지 표시 */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* 사용자 이름 입력 필드 */}
        <div className="form-group">
          <label htmlFor="username">사용자 이름 *</label>
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="사용자 이름 입력"
            autoComplete="username"
            required
          />
          {errors.username && (
            <div className="field-error">{errors.username}</div>
          )}
        </div>
        
        {/* 이메일 입력 필드 */}
        <div className="form-group">
          <label htmlFor="email">이메일 *</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="이메일 입력"
            autoComplete="email"
            required
          />
          {errors.email && (
            <div className="field-error">{errors.email}</div>
          )}
        </div>
        
        {/* 이름 입력 필드 (선택 사항) */}
        <div className="form-group">
          <label htmlFor="name">이름 (선택사항)</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="이름 입력"
            autoComplete="name"
          />
        </div>
        
        {/* 비밀번호 입력 필드 */}
        <div className="form-group">
          <label htmlFor="password">비밀번호 *</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="비밀번호 입력 (8자 이상)"
            autoComplete="new-password"
            required
          />
          {errors.password && (
            <div className="field-error">{errors.password}</div>
          )}
        </div>
        
        {/* 비밀번호 확인 입력 필드 */}
        <div className="form-group">
          <label htmlFor="confirmPassword">비밀번호 확인 *</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="비밀번호 다시 입력"
            autoComplete="new-password"
            required
          />
          {errors.confirmPassword && (
            <div className="field-error">{errors.confirmPassword}</div>
          )}
        </div>
        
        {/* 이용약관 동의 체크박스 */}
        <div className="form-group checkbox">
          <input
            id="agreeToTerms"
            name="agreeToTerms"
            type="checkbox"
            checked={formData.agreeToTerms}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          />
          <label htmlFor="agreeToTerms">
            <span>이용약관 및 개인정보 처리방침에 동의합니다 *</span>
          </label>
          {errors.agreeToTerms && (
            <div className="field-error">{errors.agreeToTerms}</div>
          )}
        </div>
        
        {/* 가입 버튼 */}
        <button
          type="submit"
          className="register-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? '처리 중...' : '가입하기'}
        </button>
      </form>
    </div>
  );
} 