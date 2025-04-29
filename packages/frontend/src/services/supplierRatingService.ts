import { AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import apiClient from '../utils/apiClient';

export interface RatingCriteria {
  quality: number;
  delivery: number;
  price: number;
  communication: number;
  support: number;
}

export interface SupplierRating {
  id: string;
  supplierId: string;
  overallRating: number;
  criteria: RatingCriteria;
  review: string;
  recommendationLevel: 'highly' | 'moderately' | 'not';
  createdAt: string;
  createdBy: string;
}

export interface RatingStats {
  averageOverallRating: number;
  totalRatings: number;
  recommendationBreakdown: {
    highly: number;
    moderately: number;
    not: number;
  };
  criteriaAverages: RatingCriteria;
}

export interface RatingFilters {
  startDate?: string;
  endDate?: string;
  recommendationLevel?: 'highly' | 'moderately' | 'not';
  minRating?: number;
  maxRating?: number;
  page?: number;
  limit?: number;
}

export enum ApiErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  UNKNOWN = 'UNKNOWN',
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code: ApiErrorCode = ApiErrorCode.UNKNOWN,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestConfig extends Omit<AxiosRequestConfig, 'method' | 'url'> {
  params?: Record<string, string | number | boolean | undefined>;
  data?: unknown;
  responseType?: 'json' | 'blob' | 'text';
}

class SupplierRatingService {
  private baseUrl = '/api/v1/maintenance/suppliers';
  private defaultTimeout = 10000; // 10초

  private validateRatingData(data: unknown): data is SupplierRating {
    if (!data || typeof data !== 'object') return false;
    const rating = data as Partial<SupplierRating>;
    
    return (
      typeof rating.id === 'string' &&
      typeof rating.supplierId === 'string' &&
      typeof rating.overallRating === 'number' &&
      typeof rating.review === 'string' &&
      this.validateRatingCriteria(rating.criteria) &&
      ['highly', 'moderately', 'not'].includes(rating.recommendationLevel as string) &&
      typeof rating.createdAt === 'string' &&
      typeof rating.createdBy === 'string'
    );
  }

  private validateRatingCriteria(criteria: unknown): criteria is RatingCriteria {
    if (!criteria || typeof criteria !== 'object') return false;
    const c = criteria as Partial<RatingCriteria>;
    
    return (
      typeof c.quality === 'number' &&
      typeof c.delivery === 'number' &&
      typeof c.price === 'number' &&
      typeof c.communication === 'number' &&
      typeof c.support === 'number'
    );
  }

  private handleError(error: unknown): never {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      const details = error.response?.data;
      
      // 네트워크 오류
      if (error.code === 'ECONNABORTED') {
        throw new ApiError('요청 시간이 초과되었습니다.', status, ApiErrorCode.TIMEOUT);
      }
      if (!error.response) {
        throw new ApiError('네트워크 연결에 실패했습니다.', status, ApiErrorCode.NETWORK_ERROR);
      }

      // HTTP 상태 코드별 처리
      switch (status) {
        case 401:
          throw new ApiError('인증이 필요합니다.', status, ApiErrorCode.UNAUTHORIZED, details);
        case 403:
          throw new ApiError('접근 권한이 없습니다.', status, ApiErrorCode.FORBIDDEN, details);
        case 404:
          throw new ApiError(message || '요청한 리소스를 찾을 수 없습니다.', status, ApiErrorCode.NOT_FOUND, details);
        case 400:
          throw new ApiError(message || '잘못된 요청입니다.', status, ApiErrorCode.VALIDATION_ERROR, details);
        case 500:
          throw new ApiError(message || '서버 오류가 발생했습니다.', status, ApiErrorCode.SERVER_ERROR, details);
        default:
          throw new ApiError(message || '알 수 없는 오류가 발생했습니다.', status, ApiErrorCode.UNKNOWN, details);
      }
    }
    throw new ApiError('알 수 없는 오류가 발생했습니다.');
  }

  private async request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    config: RequestConfig = {}
  ): Promise<T> {
    try {
      const response = await apiClient.request<T>({
        method,
        url,
        timeout: this.defaultTimeout,
        ...config,
      });

      // 응답 데이터 검증
      if (config.responseType === 'blob') {
        if (!(response.data instanceof Blob)) {
          throw new Error('잘못된 응답 데이터 형식입니다.');
        }
      } else if (Array.isArray(response.data)) {
        if (!response.data.every(item => this.validateRatingData(item))) {
          throw new Error('잘못된 평가 데이터 형식입니다.');
        }
      } else if (!this.validateRatingData(response.data)) {
        throw new Error('잘못된 평가 데이터 형식입니다.');
      }

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getSupplierRatings(
    supplierId: string,
    filters?: RatingFilters
  ): Promise<SupplierRating[]> {
    return this.request<SupplierRating[]>('get', `${this.baseUrl}/${supplierId}/ratings`, {
      params: filters,
    });
  }

  async getRatingStats(supplierId: string): Promise<RatingStats> {
    return this.request<RatingStats>('get', `${this.baseUrl}/${supplierId}/ratings/stats`);
  }

  async createRating(
    supplierId: string,
    rating: Omit<SupplierRating, 'id' | 'supplierId' | 'createdAt' | 'createdBy'>
  ): Promise<SupplierRating> {
    return this.request<SupplierRating>('post', `${this.baseUrl}/${supplierId}/ratings`, {
      data: rating,
    });
  }

  async updateRating(
    supplierId: string,
    ratingId: string,
    rating: Partial<Omit<SupplierRating, 'id' | 'supplierId' | 'createdAt' | 'createdBy'>>
  ): Promise<SupplierRating> {
    return this.request<SupplierRating>('put', `${this.baseUrl}/${supplierId}/ratings/${ratingId}`, {
      data: rating,
    });
  }

  async deleteRating(supplierId: string, ratingId: string): Promise<void> {
    return this.request<void>('delete', `${this.baseUrl}/${supplierId}/ratings/${ratingId}`);
  }

  async getRatingHistory(
    supplierId: string,
    startDate: string,
    endDate: string
  ): Promise<SupplierRating[]> {
    return this.request<SupplierRating[]>('get', `${this.baseUrl}/${supplierId}/ratings/history`, {
      params: {
        startDate,
        endDate,
      },
    });
  }

  async exportRatings(
    supplierId: string,
    format: 'csv' | 'excel' | 'pdf'
  ): Promise<Blob> {
    return this.request<Blob>('get', `${this.baseUrl}/${supplierId}/ratings/export`, {
      params: { format },
      responseType: 'blob',
    });
  }
}

export const supplierRatingService = new SupplierRatingService();
export default supplierRatingService; 