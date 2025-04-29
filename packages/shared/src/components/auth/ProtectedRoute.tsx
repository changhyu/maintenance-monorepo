import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { User } from '../../services/auth/AuthService';

/**
 * 보호된 라우트 컴포넌트 Props
 */
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  redirectPath?: string;
}

/**
 * 접근 거부 페이지 Props
 */
interface ForbiddenPageProps {
  message?: string;
}

/**
 * 인증 상태 컨텍스트 불러오기
 */
function useAuthContext() {
  // 예제 페이지에서는 ProtectedRouteExample.tsx에 정의된 useAuthContext 사용
  // 실제 애플리케이션에서는 AuthContext에서 제공하는 useAuth 훅 사용
  // import { useAuth } from '../../contexts/AuthContext';
  // return useAuth();
  
  // 여기서는 예제 컴포넌트만 제공하기 위한 목업 함수
  const location = useLocation();
  const user = location.state?.user as User | null;
  const isAuthenticated = !!user;
  
  const hasRole = (role: string) => {
    return user?.roles?.includes(role) || false;
  };
  
  const hasPermission = (permission: string) => {
    return user?.permissions?.includes(permission) || false;
  };
  
  return {
    user,
    isAuthenticated,
    isLoading: false,
    hasRole,
    hasPermission
  };
}

/**
 * 보호된 라우트 컴포넌트
 * 
 * 특정 라우트에 인증 또는 권한 제한을 적용합니다.
 * - 인증되지 않은 사용자는 로그인 페이지로 리디렉션
 * - 인증되었지만 필요한 역할/권한이 없는 경우 접근 거부 페이지로 리디렉션
 */
export function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  redirectPath = '/login'
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole, hasPermission } = useAuthContext();
  const location = useLocation();
  
  // 로딩 중일 때 로딩 인디케이터 표시
  if (isLoading) {
    return <div className="loading">로딩 중...</div>;
  }
  
  // 인증되지 않은 경우 로그인 페이지로 리디렉션
  if (!isAuthenticated) {
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }
  
  // 필요한 역할 확인
  const hasRequiredRoles = requiredRoles.length === 0 || 
    requiredRoles.some(role => hasRole(role));
  
  // 필요한 권한 확인
  const hasRequiredPermissions = requiredPermissions.length === 0 || 
    requiredPermissions.some(permission => hasPermission(permission));
  
  // 필요한 역할 또는 권한이 없는 경우 접근 거부 페이지로 리디렉션
  if (!hasRequiredRoles || !hasRequiredPermissions) {
    return <Navigate to="/forbidden" replace />;
  }
  
  // 조건을 모두 만족하면 자식 컴포넌트 렌더링
  return <>{children}</>;
}

/**
 * 접근 거부 페이지 컴포넌트
 */
export function ForbiddenPage({ message }: ForbiddenPageProps) {
  const defaultMessage = "이 페이지에 접근할 권한이 없습니다.";
  
  return (
    <div className="forbidden-page py-10 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-16 w-16 mx-auto text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      
      <h1 className="text-3xl font-bold mt-4 mb-2">접근 거부됨</h1>
      <p className="text-gray-600 mb-6">{message || defaultMessage}</p>
      
      <div className="flex justify-center space-x-4">
        <a
          href="/"
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          홈으로 돌아가기
        </a>
        <a
          href="/login"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          로그인
        </a>
      </div>
    </div>
  );
} 