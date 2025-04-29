import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { User } from '../../services/auth/AuthService';

/**
 * 프로필 업데이트 데이터 인터페이스
 */
interface ProfileUpdateData {
  name?: string;
  email?: string;
  avatar?: string;
}

/**
 * 사용자 프로필 속성 인터페이스
 */
interface UserProfileProps {
  onUpdate?: (user: User) => void;
  onError?: (error: string) => void;
  className?: string;
  readOnly?: boolean;
}

/**
 * 사용자 프로필 컴포넌트
 * 사용자 정보를 표시하고 편집할 수 있는 컴포넌트입니다.
 */
export function UserProfile({
  onUpdate,
  onError,
  className = '',
  readOnly = false
}: UserProfileProps) {
  // 인증 컨텍스트 사용
  const { user, isLoading, error } = useAuthContext();
  
  // 상태 관리
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileUpdateData>({
    name: '',
    email: '',
    avatar: ''
  });
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // 사용자 정보로 폼 초기화
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email,
        avatar: user.avatar || ''
      });
    }
  }, [user]);
  
  /**
   * 입력 필드 변경 처리
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 성공 및 오류 메시지 초기화
    setIsSuccess(false);
    setUpdateError(null);
  };
  
  /**
   * 폼 제출 처리
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setIsSubmitting(true);
    setUpdateError(null);
    setIsSuccess(false);
    
    try {
      // 실제 프로필 업데이트 API 호출을 모의 구현
      await new Promise<User>((resolve, reject) => {
        setTimeout(() => {
          // 유효성 검사 (이메일 형식 등)
          if (profileData.email && !/\S+@\S+\.\S+/.test(profileData.email)) {
            reject(new Error('유효한 이메일 주소를 입력하세요'));
            return;
          }
          
          // 가상의 성공 응답
          const updatedUser: User = {
            ...user,
            name: profileData.name,
            email: profileData.email,
            avatar: profileData.avatar
          };
          
          resolve(updatedUser);
        }, 1500);
      });
      
      // 성공 처리
      setIsSuccess(true);
      setIsEditing(false);
      
      if (onUpdate) {
        onUpdate({
          ...user,
          name: profileData.name,
          email: profileData.email,
          avatar: profileData.avatar
        });
      }
    } catch (err) {
      // 오류 처리
      const message = err instanceof Error ? err.message : '프로필 업데이트 중 오류가 발생했습니다';
      setUpdateError(message);
      
      if (onError) {
        onError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  /**
   * 편집 모드 토글
   */
  const toggleEditMode = () => {
    if (isEditing) {
      // 편집 취소
      if (user) {
        setProfileData({
          name: user.name || '',
          email: user.email,
          avatar: user.avatar || ''
        });
      }
      setUpdateError(null);
    }
    
    setIsEditing(!isEditing);
  };
  
  // 로딩 중이거나 사용자가 없으면 로딩 상태 표시
  if (isLoading) {
    return (
      <div className={`user-profile ${className}`}>
        <div className="loading-spinner">로딩 중...</div>
      </div>
    );
  }
  
  // 사용자 정보가 없으면 로그인 안내
  if (!user) {
    return (
      <div className={`user-profile ${className}`}>
        <div className="no-user-message">
          <p>사용자 정보를 표시하려면 로그인해주세요.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`user-profile ${className}`}>
      <h2 className="profile-title">사용자 프로필</h2>
      
      {/* 오류 메시지 표시 */}
      {(error || updateError) && (
        <div className="error-message">
          {error || updateError}
        </div>
      )}
      
      {/* 성공 메시지 표시 */}
      {isSuccess && (
        <div className="success-message">
          프로필이 성공적으로 업데이트되었습니다.
        </div>
      )}
      
      <div className="profile-container">
        {/* 프로필 이미지 */}
        <div className="profile-image-container">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={`${user.name || user.username}의 프로필 이미지`}
              className="profile-image"
            />
          ) : (
            <div className="profile-image-placeholder">
              {(user.name || user.username).charAt(0).toUpperCase()}
            </div>
          )}
          
          {isEditing && (
            <div className="profile-image-edit">
              <input
                type="text"
                name="avatar"
                value={profileData.avatar || ''}
                onChange={handleChange}
                placeholder="프로필 이미지 URL 입력"
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>
        
        {/* 프로필 정보 */}
        {isEditing ? (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label htmlFor="name">이름</label>
              <input
                id="name"
                name="name"
                type="text"
                value={profileData.name || ''}
                onChange={handleChange}
                placeholder="이름 입력"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">이메일</label>
              <input
                id="email"
                name="email"
                type="email"
                value={profileData.email}
                onChange={handleChange}
                placeholder="이메일 입력"
                disabled={isSubmitting}
                required
              />
            </div>
            
            <div className="form-group">
              <label>사용자 이름</label>
              <div className="static-field">{user.username}</div>
              <p className="field-note">사용자 이름은 변경할 수 없습니다.</p>
            </div>
            
            <div className="form-actions">
              <button
                type="submit"
                className="save-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                className="cancel-button"
                onClick={toggleEditMode}
                disabled={isSubmitting}
              >
                취소
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-info">
            <div className="info-item">
              <span className="info-label">사용자 이름:</span>
              <span className="info-value">{user.username}</span>
            </div>
            
            <div className="info-item">
              <span className="info-label">이름:</span>
              <span className="info-value">{user.name || '-'}</span>
            </div>
            
            <div className="info-item">
              <span className="info-label">이메일:</span>
              <span className="info-value">{user.email}</span>
            </div>
            
            <div className="info-item">
              <span className="info-label">권한:</span>
              <span className="info-value">
                {user.roles.join(', ') || '일반 사용자'}
              </span>
            </div>
            
            {!readOnly && (
              <div className="profile-actions">
                <button
                  className="edit-button"
                  onClick={toggleEditMode}
                >
                  프로필 수정
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 