import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

// 인증 상태를 확인하기 위한 임시 함수 (실제로는 AuthContext에서 제공)
const useAuth = () => {
  // 임시 인증 상태
  return {
    isAuthenticated: true, // 실제 구현에서는 토큰 검증이나 상태 확인을 통해 설정
    user: {
      id: 'user1',
      role: 'technician',
      name: '김정비',
    },
    loading: false,
  };
};

interface TodoAuthWrapperProps {
  children: ReactNode;
  requiredRoles?: string[]; // 접근에 필요한 역할 배열
}

/**
 * Todo 컴포넌트 인증 래퍼
 * 사용자 인증 상태와 권한을 확인하여 접근 제어
 */
const TodoAuthWrapper: React.FC<TodoAuthWrapperProps> = ({ 
  children, 
  requiredRoles = [] 
}) => {
  const { isAuthenticated, user, loading } = useAuth();

  // 인증 정보 로딩 중
  if (loading) {
    return <div className="p-4">인증 정보를 확인하는 중...</div>;
  }

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 역할 기반 접근 제어 (RBAC)
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return (
      <div className="p-4 bg-red-100 text-red-800 rounded">
        <h3 className="font-bold">접근 권한이 없습니다</h3>
        <p>이 기능을 사용하려면 다음 역할 중 하나가 필요합니다:</p>
        <ul className="list-disc list-inside">
          {requiredRoles.map(role => (
            <li key={role}>{role}</li>
          ))}
        </ul>
      </div>
    );
  }

  // 인증 및 권한 확인 완료, 자식 컴포넌트 렌더링
  return <>{children}</>;
};

export default TodoAuthWrapper; 