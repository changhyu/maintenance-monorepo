import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 사용자 프로필 데이터 인터페이스
 */
interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  company?: string;
  phone?: string;
  address?: string;
  profileImage?: string;
  createdAt: string;
  lastLogin: string;
}

/**
 * 프로필 페이지 컴포넌트
 */
const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 프로필 데이터 로드
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 실제 API 호출은 향후 구현
        // 임시 데이터 사용
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockProfile: UserProfile = {
          id: 'user-123',
          name: '김정비',
          email: 'kimtech@example.com',
          role: 'technician',
          company: '정비왕 오토',
          phone: '010-1234-5678',
          address: '서울시 강남구',
          profileImage: 'https://placehold.co/300x300',
          createdAt: '2023-01-15',
          lastLogin: '2023-04-08T09:30:00',
        };
        
        setProfile(mockProfile);
        setFormData({
          name: mockProfile.name,
          phone: mockProfile.phone || '',
          address: mockProfile.address || '',
        });
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError('프로필 정보를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  /**
   * 입력 필드 변경 처리
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * 편집 모드 토글
   */
  const toggleEditMode = () => {
    if (isEditing) {
      // 편집 취소 시 원래 데이터로 복원
      if (profile) {
        setFormData({
          name: profile.name,
          phone: profile.phone || '',
          address: profile.address || '',
        });
      }
    }
    setIsEditing(!isEditing);
    setSaveError(null);
  };

  /**
   * 프로필 수정 제출 처리
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;
    
    setSaveLoading(true);
    setSaveError(null);
    
    try {
      // 실제 API 호출은 향후 구현
      console.log('Updating profile with:', formData);
      
      // 수정 성공 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 프로필 데이터 업데이트
      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
        };
      });
      
      // 편집 모드 종료
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setSaveError('프로필 수정에 실패했습니다.');
    } finally {
      setSaveLoading(false);
    }
  };

  /**
   * 로그아웃 처리
   */
  const handleLogout = () => {
    // 실제 구현에서는 토큰 삭제, 상태 초기화 등 수행
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  /**
   * 계정 삭제 처리
   */
  const handleDeleteAccount = () => {
    if (window.confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      // 실제 구현에서는 API 호출하여 계정 삭제
      console.log('Account deletion requested');
      alert('계정 삭제가 요청되었습니다. 관리자 승인 후 처리됩니다.');
    }
  };

  // 로딩 중 표시
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-gray-500">프로필 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 오류 표시
  if (error || !profile) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-red-500">{error || '프로필 정보를 불러올 수 없습니다.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">사용자 프로필</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              개인 정보 및 계정 설정
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={toggleEditMode}
              className={`px-3 py-1 rounded text-sm font-medium ${
                isEditing
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {isEditing ? '편집 취소' : '프로필 편집'}
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200"
            >
              로그아웃
            </button>
          </div>
        </div>
        
        {isEditing ? (
          <form onSubmit={handleSubmit} className="border-t border-gray-200">
            {saveError && (
              <div className="m-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
                <p>{saveError}</p>
              </div>
            )}
            
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    이름
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    이메일
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={profile.email}
                    disabled
                    className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md bg-gray-50"
                  />
                  <p className="mt-1 text-xs text-gray-500">이메일 주소는 변경할 수 없습니다.</p>
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    전화번호
                  </label>
                  <input
                    type="text"
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    주소
                  </label>
                  <input
                    type="text"
                    name="address"
                    id="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="sm:col-span-2 mt-4">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                  >
                    {saveLoading ? '저장 중...' : '변경사항 저장'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">이름</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{profile.name}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">이메일</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{profile.email}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">역할</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {profile.role === 'technician'
                    ? '정비사'
                    : profile.role === 'enterprise'
                    ? '기업 사용자'
                    : '개인 사용자'}
                </dd>
              </div>
              {profile.company && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">회사</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{profile.company}</dd>
                </div>
              )}
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">전화번호</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {profile.phone || '(등록된 전화번호가 없습니다)'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">주소</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {profile.address || '(등록된 주소가 없습니다)'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">가입일</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">마지막 로그인</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(profile.lastLogin).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        )}
        
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <h4 className="text-md font-medium text-gray-500 mb-4">계정 관리</h4>
          <div className="space-y-4">
            <button
              onClick={() => navigate('/change-password')}
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              비밀번호 변경
            </button>
            
            <div>
              <button
                onClick={handleDeleteAccount}
                className="text-sm font-medium text-red-600 hover:text-red-500"
              >
                계정 삭제 요청
              </button>
              <p className="mt-1 text-xs text-gray-500">
                계정을 삭제하면 모든 데이터가 영구적으로 제거됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 