/**
 * API 서비스에서 사용하는 타입 정의
 */

/**
 * API 연결 상태 타입
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

/**
 * 인증 상태 타입
 */
export type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading';

/**
 * 로그인 요청 타입
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * 로그인 응답 타입
 */
export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: UserInfo;
  expiresAt: number;
}

/**
 * 사용자 정보 타입
 */
export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profileImageUrl?: string;
  lastLogin?: string;
}

/**
 * 사용자 역할 타입
 */
export type UserRole = 'admin' | 'manager' | 'user';

/**
 * 페이지네이션 요청 타입
 */
export interface PaginationRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 페이지네이션 응답 타입
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
}

/**
 * API 에러 응답 타입
 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
  path?: string;
}

/**
 * 알림 타입
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * 알림 메시지 타입
 */
export interface NotificationMessage {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  isRead?: boolean;
  createdAt?: string;
}