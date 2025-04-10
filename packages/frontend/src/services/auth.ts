/**
 * 인증 및 사용자 관련 API 서비스
 */

import { api } from './api';
import { jwtDecode } from "jwt-decode";
import { 
  User, 
  UserCreate, 
  UserUpdate,
  AuthToken,
  AuthResponse,
  LoginCredentials,
  PasswordChangeRequest,
  PasswordResetRequest,
  UserFilter,
  UserRole,
  JwtPayload
} from '../types/user';

/**
 * 인증 서비스 객체
 */
export const authService = {
  /**
   * 로그인 처리
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('auth/login', credentials);
    
    // 타입 안전하게 처리
    const authResponse = response.data as AuthResponse;
    
    if (authResponse.accessToken) {
      this.setToken(authResponse.accessToken);
    }
    
    return authResponse;
  },

  /**
   * 로그아웃 처리
   */
  async logout(): Promise<boolean> {
    try {
      await api.post('auth/logout');
      this.clearToken();
      return true;
    } catch (error) {
      console.error('로그아웃 실패:', error);
      return false;
    }
  },

  /**
   * 토큰 갱신
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await api.post('auth/refresh', { refreshToken });
    
    // 타입 안전하게 처리
    const authResponse = response.data as AuthResponse;
    
    if (authResponse.accessToken) {
      this.setToken(authResponse.accessToken);
    }
    
    return authResponse;
  },

  /**
   * 현재 저장된 액세스 토큰 조회
   */
  getToken(): string | null {
    return localStorage.getItem('authToken');
  },

  /**
   * 액세스 토큰 저장
   */
  setToken(token: string): void {
    localStorage.setItem('authToken', token);
  },

  /**
   * 토큰 삭제
   */
  clearToken(): void {
    localStorage.removeItem('authToken');
  },

  /**
   * 로그인 상태 확인
   */
  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded: JwtPayload = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    } catch (error) {
      return false;
    }
  },

  /**
   * JWT 토큰 디코딩
   */
  decodeToken(token: string): JwtPayload {
    return jwtDecode(token);
  },

  /**
   * 현재 사용자 역할 조회
   */
  getUserRole(): UserRole | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const decoded: JwtPayload = jwtDecode(token);
      return decoded.role;
    } catch (error) {
      return null;
    }
  }
};

/**
 * 사용자 서비스 객체
 */
export const userService = {
  /**
   * 사용자 목록 조회
   */
  async getUsers(filter?: UserFilter): Promise<User[]> {
    const response = await api.get('users', { params: filter });
    return response.data as User[];
  },

  /**
   * 특정 사용자 조회
   */
  async getUserById(userId: string): Promise<User> {
    const response = await api.get(`users/${userId}`);
    return response.data as User;
  },

  /**
   * 새 사용자 생성
   */
  async createUser(userData: UserCreate): Promise<User> {
    const response = await api.post('users', userData);
    return response.data as User;
  },

  /**
   * 사용자 정보 업데이트
   */
  async updateUser(userId: string, updateData: UserUpdate): Promise<User> {
    const response = await api.put(`users/${userId}`, updateData);
    return response.data as User;
  },

  /**
   * 사용자 삭제
   */
  async deleteUser(userId: string): Promise<boolean> {
    const response = await api.delete(`users/${userId}`);
    // success나 status 필드가 있는지 확인
    return (
      (response.data && response.data.success) ||
      response.status === 200 ||
      response.status === 204
    );
  },

  /**
   * 비밀번호 변경
   */
  async changePassword(userId: string, passwordData: PasswordChangeRequest): Promise<boolean> {
    const response = await api.post(`users/${userId}/change-password`, passwordData);
    return (
      (response.data && response.data.success) ||
      response.status === 200 ||
      response.status === 204
    );
  },

  /**
   * 비밀번호 재설정 요청
   */
  async resetPassword(resetData: PasswordResetRequest): Promise<boolean> {
    const response = await api.post('auth/reset-password', resetData);
    return (
      (response.data && response.data.success) ||
      response.status === 200 ||
      response.status === 204
    );
  },

  /**
   * 현재 로그인한 사용자 정보 조회
   */
  async getCurrentUser(): Promise<User> {
    const response = await api.get('users/me');
    return response.data as User;
  },

  /**
   * 사용자 권한 확인
   */
  checkPermission(permission: string): boolean {
    const token = authService.getToken();
    if (!token) return false;

    try {
      const decoded: JwtPayload = jwtDecode(token);
      return Boolean(decoded.permissions && decoded.permissions.includes(permission));
    } catch (error) {
      return false;
    }
  }
};

/**
 * 권한 관련 유틸리티
 */
export const permissionUtils = {
  /**
   * 특정 권한 보유 여부 확인
   */
  hasPermission(requiredRole: UserRole | UserRole[]): boolean {
    const currentRole = authService.getUserRole();
    if (!currentRole) return false;

    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(currentRole);
    }
    
    return currentRole === requiredRole;
  },

  /**
   * 차량 접근 권한 확인
   */
  async checkVehicleAccess(vehicleId: string): Promise<boolean> {
    try {
      const response = await api.get(`vehicles/${vehicleId}/access`);
      return response.data && response.data.hasAccess === true;
    } catch (error) {
      return false;
    }
  },

  /**
   * 정비 기록 접근 권한 확인
   */
  async checkMaintenanceAccess(maintenanceId: string): Promise<boolean> {
    try {
      const response = await api.get(`maintenance/${maintenanceId}/access`);
      return response.data && response.data.hasAccess === true;
    } catch (error) {
      return false;
    }
  }
}; 