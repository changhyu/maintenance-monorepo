import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn, hasRole } from '../../services/api/auth-helpers';

interface ProtectedRouteProps {
  /** 자식 컴포넌트 */
  children: React.ReactNode;
  /** 필요한 역할 (선택적) */
  requiredRole?: string | string[];
  /** 인증 여부, 주로 상위 컴포넌트에서 전달 */
  isAuthenticated?: boolean;
  /** 권한 없을 때 리디렉션 경로 */
  redirectPath?: string;
}

/**
 * 인증 및 권한 기반 라우트 보호 컴포넌트
 * 사용자가 로그인되어 있지 않거나 필요한 권한이 없으면 리디렉션
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  isAuthenticated: propIsAuthenticated,
  redirectPath = '/login'
}) => {
  // 현재 위치 정보 가져오기
  const location = useLocation();
  
  // 인증 상태 확인
  const isUserAuthenticated = propIsAuthenticated !== undefined 
    ? propIsAuthenticated 
    : isLoggedIn();
  
  // 역할 기반 권한 확인
  let hasRequiredRole = true;
  if (requiredRole && isUserAuthenticated) {
    hasRequiredRole = hasRole(requiredRole);
  }
  
  // 인증되지 않은 경우 로그인 페이지로 리디렉션
  if (!isUserAuthenticated) {
    return (
      <Navigate
        to={redirectPath}
        state={{ from: location }} // 원래 목적지 저장
        replace
      />
    );
  }
  
  // 권한이 없는 경우 접근 거부 페이지로 리디렉션
  if (!hasRequiredRole) {
    return <Navigate to="/access-denied" replace />;
  }
  
  // 인증 및 권한 확인이 완료되면 원래 컴포넌트 렌더링
  return <>{children}</>;
};

export default ProtectedRoute;