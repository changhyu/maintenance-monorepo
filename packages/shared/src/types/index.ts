/**
 * 공통 타입 정의 인덱스 파일
 * 
 * 모든 공유 타입들을 한 곳에서 export하여 사용 편의성을 높입니다.
 * 다른 패키지에서는 '@maintenance/shared/types'로 접근 가능합니다.
 */

export * from './vehicle';
export * from './maintenance';
export * from './user';
export * from './shop';

// 공통 API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
    lastPage?: number;
  };
}

// 공통 페이지네이션 파라미터 타입
export interface PaginationParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 공통 필터 타입
export interface FilterParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  [key: string]: unknown;
} 