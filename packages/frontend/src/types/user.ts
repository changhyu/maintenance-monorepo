/**
 * 사용자 관련 타입 정의
 */

// 사용자 역할
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  TECHNICIAN = 'technician',
  DRIVER = 'driver',
  USER = 'user'
}

// 사용자 상태
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  BLOCKED = 'blocked'
}

// 기본 사용자 인터페이스
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  phoneNumber?: string;
  avatar?: string;
  address?: string;
  department?: string;
  position?: string;
  lastLoginAt?: string;
}

// 사용자 생성 요청
export interface UserCreate {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNumber?: string;
  avatar?: string;
  address?: string;
  department?: string;
  position?: string;
}

// 사용자 업데이트 요청
export interface UserUpdate {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  phoneNumber?: string;
  avatar?: string;
  address?: string;
  department?: string;
  position?: string;
}

// 로그인 자격 증명
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// 인증 토큰
export interface AuthToken {
  token: string;
  expiresIn: number;
}

// 인증 응답
export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
  expiresIn: number;
}

// 비밀번호 변경 요청
export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// 비밀번호 재설정 요청
export interface PasswordResetRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// 사용자 필터
export interface UserFilter {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  department?: string;
}

// 회원가입 데이터
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  acceptTerms: boolean;
}

// JWT 디코딩 결과
export interface JwtPayload {
  sub: string;
  userId: string;
  exp: number;
  iat: number;
  role: UserRole;
  permissions?: string[];
}
