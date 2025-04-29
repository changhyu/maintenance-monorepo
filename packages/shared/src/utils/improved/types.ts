/**
 * 공통 타입 정의
 */

// 날짜 관련 타입
export type { DateInput } from './dateUtils';

// API 클라이언트 관련 타입
export type {
  ApiClientConfig,
  RetryConfig,
  OfflineStorage,
  OfflineRequest
} from './apiClient';

/**
 * 공통 API 응답 인터페이스
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
  timestamp?: string;
  errors?: Record<string, string[]>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

/**
 * 페이지네이션 파라미터 인터페이스
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  [key: string]: any;
}

/**
 * 페이지네이션 응답 인터페이스
 */
export interface PaginationResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * ID 타입
 */
export type ID = string | number;

/**
 * 정렬 방향 타입
 */
export type SortDirection = 'asc' | 'desc';