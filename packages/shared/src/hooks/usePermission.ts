import { useAuthContext } from '../contexts/AuthContext';

/**
 * 권한 확인 훅 반환 타입
 */
interface UsePermissionResult {
  /**
   * 현재 사용자가 지정된 권한을 가지고 있는지 확인
   * @param permission 확인할 권한
   * @returns 권한 보유 여부
   */
  hasPermission: (permission: string) => boolean;
  
  /**
   * 현재 사용자가 지정된 권한 중 하나라도 가지고 있는지 확인
   * @param permissions 확인할 권한 목록
   * @returns 하나 이상의 권한 보유 여부
   */
  hasAnyPermission: (permissions: string[]) => boolean;
  
  /**
   * 현재 사용자가 지정된 권한을 모두 가지고 있는지 확인
   * @param permissions 확인할 권한 목록
   * @returns 모든 권한 보유 여부
   */
  hasAllPermissions: (permissions: string[]) => boolean;
  
  /**
   * 현재 사용자의 모든 권한 목록 반환
   * @returns 권한 목록 또는 빈 배열
   */
  permissions: string[];
}

/**
 * 권한 확인 편의 훅
 * 인증된 사용자의 권한 확인을 위한 유틸리티 함수를 제공합니다.
 * 
 * @returns 권한 확인 유틸리티 함수들
 */
export function usePermission(): UsePermissionResult {
  const { user, hasPermission } = useAuthContext();
  
  /**
   * 여러 권한 중 하나라도 가지고 있는지 확인
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.some(permission => hasPermission(permission));
  };
  
  /**
   * 모든 권한을 가지고 있는지 확인
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.every(permission => hasPermission(permission));
  };
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions: user?.permissions || []
  };
} 