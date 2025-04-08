/**
 * 사용자 관련 공통 타입 정의
 */

/**
 * 사용자 역할 열거형
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ENTERPRISE_ADMIN = 'ENTERPRISE_ADMIN', 
  SHOP_OWNER = 'SHOP_OWNER',
  SHOP_MANAGER = 'SHOP_MANAGER',
  TECHNICIAN = 'TECHNICIAN',
  DRIVER = 'DRIVER',
  CUSTOMER = 'CUSTOMER'
}

/**
 * 사용자 인터페이스
 */
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  phoneNumber?: string;
  organizationId?: string;
  shopId?: string;
  profileImage?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 사용자 생성 인터페이스
 */
export interface UserCreate {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  phoneNumber?: string;
  organizationId?: string;
  shopId?: string;
}

/**
 * 사용자 업데이트 인터페이스
 */
export interface UserUpdate {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  phoneNumber?: string;
  organizationId?: string;
  shopId?: string;
  profileImage?: string;
}

/**
 * 로그인 자격 증명 인터페이스
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * 인증 응답 인터페이스
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

/**
 * 인증 토큰 인터페이스
 */
export interface AuthToken {
  access_token: string;
  token_type: string;
}

/**
 * 인증 정보 인터페이스
 */
export interface AuthCredentials {
  email: string;
  password: string;
}

/**
 * 비밀번호 변경 인터페이스
 */
export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

/**
 * 비밀번호 변경 요청 인터페이스
 */
export interface PasswordChangeRequest {
  oldPassword: string;
  newPassword: string;
}

/**
 * 비밀번호 재설정 요청 인터페이스
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * 사용자 필터 인터페이스
 */
export interface UserFilter {
  role?: UserRole;
  shopId?: string;
  organizationId?: string;
  isActive?: boolean;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
} 