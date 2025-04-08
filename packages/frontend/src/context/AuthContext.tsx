import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 사용자 역할 정의
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ENTERPRISE_ADMIN = 'ENTERPRISE_ADMIN',
  SHOP_OWNER = 'SHOP_OWNER',
  TECHNICIAN = 'TECHNICIAN',
  VEHICLE_OWNER = 'VEHICLE_OWNER',
}

// 사용자 정보 인터페이스
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profileImage?: string;
  phone?: string;
  companyId?: string;
  shopId?: string;
  createdAt: string;
  updatedAt: string;
}

// 인증 컨텍스트 타입
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

// 회원가입 데이터 인터페이스
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  companyId?: string;
  shopId?: string;
  phone?: string;
}

// 인증 컨텍스트 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  // 초기 인증 상태 확인
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
          return;
        }
        
        // TODO: 실제 API 구현 시 토큰 검증 로직 추가
        // const response = await api.get('/auth/me');
        // setUser(response.data);
        
        // 임시 사용자 데이터 (개발용)
        const tempUser: User = {
          id: '1',
          email: 'user@example.com',
          name: '사용자',
          role: UserRole.SHOP_OWNER,
          profileImage: 'https://via.placeholder.com/150',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        setUser(tempUser);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('인증 상태 확인 중 오류 발생:', err);
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        setUser(null);
        setError('인증 세션이 만료되었습니다. 다시 로그인해주세요.');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);
  
  // 로그인 함수
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: 실제 API 구현 시 로그인 로직 추가
      // const response = await api.post('/auth/login', { email, password });
      // localStorage.setItem('authToken', response.data.token);
      
      // 임시 로그인 로직 (개발용)
      await new Promise(resolve => setTimeout(resolve, 1000));
      localStorage.setItem('authToken', 'temp-auth-token');
      
      const tempUser: User = {
        id: '1',
        email,
        name: '사용자',
        role: UserRole.SHOP_OWNER,
        profileImage: 'https://via.placeholder.com/150',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setUser(tempUser);
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('로그인 중 오류 발생:', err);
      setError(err.message || '로그인 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 로그아웃 함수
  const logout = async () => {
    try {
      setLoading(true);
      
      // TODO: 실제 API 구현 시 로그아웃 로직 추가
      // await api.post('/auth/logout');
      
      localStorage.removeItem('authToken');
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('로그아웃 중 오류 발생:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // 회원가입 함수
  const register = async (userData: RegisterData) => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: 실제 API 구현 시 회원가입 로직 추가
      // await api.post('/auth/register', userData);
      
      // 임시 회원가입 로직 (개발용)
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err: any) {
      console.error('회원가입 중 오류 발생:', err);
      setError(err.message || '회원가입 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 비밀번호 재설정 요청 함수
  const forgotPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: 실제 API 구현 시 비밀번호 재설정 요청 로직 추가
      // await api.post('/auth/forgot-password', { email });
      
      // 임시 로직 (개발용)
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err: any) {
      console.error('비밀번호 재설정 요청 중 오류 발생:', err);
      setError(err.message || '비밀번호 재설정 요청 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 비밀번호 재설정 함수
  const resetPassword = async (token: string, newPassword: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: 실제 API 구현 시 비밀번호 재설정 로직 추가
      // await api.post('/auth/reset-password', { token, newPassword });
      
      // 임시 로직 (개발용)
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err: any) {
      console.error('비밀번호 재설정 중 오류 발생:', err);
      setError(err.message || '비밀번호 재설정 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 프로필 업데이트 함수
  const updateProfile = async (userData: Partial<User>) => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: 실제 API 구현 시 프로필 업데이트 로직 추가
      // const response = await api.put('/auth/profile', userData);
      // setUser(response.data);
      
      // 임시 로직 (개발용)
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUser(prev => prev ? { ...prev, ...userData } : null);
    } catch (err: any) {
      console.error('프로필 업데이트 중 오류 발생:', err);
      setError(err.message || '프로필 업데이트 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 권한 확인 함수
  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    
    return user.role === roles;
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        register,
        forgotPassword,
        resetPassword,
        updateProfile,
        isAuthenticated,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 인증 컨텍스트를 사용하기 위한 커스텀 훅
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 