import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';  // 올바른 경로로 수정

export interface ProtectedRouteProps {
  /** 보호된 경로에 표시할 컴포넌트 */
  children: React.ReactNode;
  /** 필요한 역할(들) */
  requiredRoles?: string[];
  /** 필요한 권한(들) */
  requiredPermissions?: string[];
  /** 인증되지 않은 사용자가 리디렉션될 경로 */
  redirectTo?: string;
}

/**
 * 인증된 사용자만 접근할 수 있는 보호된 라우트 컴포넌트
 * 역할 및 권한 기반 접근 제어를 지원합니다.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  redirectTo = '/login',
}) => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // 사용자가 인증되지 않은 경우
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 역할 확인
  if (requiredRoles.length > 0 && user?.roles) {
    const hasRequiredRole = requiredRoles.some(role => 
      user.roles?.includes(role)
    );
    
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // 권한 확인
  if (requiredPermissions.length > 0 && user?.permissions) {
    const hasRequiredPermission = requiredPermissions.some(permission => 
      user.permissions?.includes(permission)
    );
    
    if (!hasRequiredPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // 모든 검사를 통과하면 자식 컴포넌트 렌더링
  return <>{children}</>;
};

/**
 * 역할 기반 접근 제어를 위한 고차 컴포넌트
 * @param Component 보호할 컴포넌트
 * @param requiredRoles 필요한 역할 배열
 * @returns 보호된 컴포넌트
 */
export function withRoleProtection<P>(
  Component: React.ComponentType<P>,
  requiredRoles: string[]
) {
  return (props: P) => (
    <ProtectedRoute requiredRoles={requiredRoles}>
      <Component {...props} />
    </ProtectedRoute>
  );
}

/**
 * 권한 기반 접근 제어를 위한 고차 컴포넌트
 * @param Component 보호할 컴포넌트
 * @param requiredPermissions 필요한 권한 배열
 * @returns 보호된 컴포넌트
 */
export function withPermissionProtection<P>(
  Component: React.ComponentType<P>, 
  requiredPermissions: string[]
) {
  return (props: P) => (
    <ProtectedRoute requiredPermissions={requiredPermissions}>
      <Component {...props} />
    </ProtectedRoute>
  );
}