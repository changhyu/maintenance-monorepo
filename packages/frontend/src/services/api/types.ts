/**
 * API 서비스 관련 타입 정의
 */

/**
 * API 연결 상태 타입
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

/**
 * 오프라인 작업 타입
 */
export enum OfflineOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  UPLOAD = 'upload'
}

/**
 * 오프라인 작업 저장 형식
 */
export interface OfflineOperation {
  id: string;
  type: OfflineOperationType;
  url: string;
  method: string;
  data?: any;
  timestamp: number;
  synced: boolean;
}

/**
 * API 응답 기본 형식
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
}

/**
 * 페이지네이션 응답 형식
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  page: number;
  totalPages: number;
  itemsPerPage: number;
}

/**
 * 페이지네이션 요청 파라미터
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

/**
 * API 에러 응답 형식
 */
export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: Record<string, any>;
  timestamp?: string;
} 