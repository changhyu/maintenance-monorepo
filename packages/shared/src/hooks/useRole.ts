import { useAuthContext } from '../contexts/AuthContext';

/**
 * 역할 확인 훅 반환 타입
 */
interface UseRoleResult {
  /**
   * 현재 사용자가 지정된 역할을 가지고 있는지 확인
   * @param role 확인할 역할
   * @returns 역할 보유 여부
   */
  hasRole: (role: string) => boolean;
  
  /**
   * 현재 사용자가 지정된 역할 중 하나라도 가지고 있는지 확인
   * @param roles 확인할 역할 목록
   * @returns 하나 이상의 역할 보유 여부
   */
  hasAnyRole: (roles: string[]) => boolean;
  
  /**
   * 현재 사용자가 지정된 역할을 모두 가지고 있는지 확인
   * @param roles 확인할 역할 목록
   * @returns 모든 역할 보유 여부
   */
  hasAllRoles: (roles: string[]) => boolean;
  
  /**
   * 현재 사용자의 모든 역할 목록 반환
   * @returns 역할 목록 또는 빈 배열
   */
  roles: string[];
}

/**
 * 역할 확인 편의 훅
 * 인증된 사용자의 역할 확인을 위한 유틸리티 함수를 제공합니다.
 * 
 * @returns 역할 확인 유틸리티 함수들
 */
export function useRole(): UseRoleResult {
  const { user, hasRole } = useAuthContext();
  
  /**
   * 여러 역할 중 하나라도 가지고 있는지 확인
   */
  const hasAnyRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.some(role => hasRole(role));
  };
  
  /**
   * 모든 역할을 가지고 있는지 확인
   */
  const hasAllRoles = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.every(role => hasRole(role));
  };
  
  return {
    hasRole,
    hasAnyRole,
    hasAllRoles,
    roles: user?.roles || []
  };
} 