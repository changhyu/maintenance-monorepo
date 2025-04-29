import axios from 'axios';
// @ts-ignore - axios 타입 호환성 이슈 회피
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * GraphQL 클라이언트 인터페이스
 */
export interface GraphQLClient {
  /**
   * GraphQL 쿼리 실행
   * @param query GraphQL 쿼리 문자열
   * @param variables 쿼리 변수 (선택 사항)
   * @returns Promise 결과
   */
  query<T>(query: string, variables?: Record<string, unknown>): Promise<{ data: T, errors?: unknown[] }>;
  
  /**
   * GraphQL 뮤테이션 실행
   * @param mutation GraphQL 뮤테이션 문자열
   * @param variables 뮤테이션 변수 (선택 사항)
   * @returns Promise 결과
   */
  mutate<T>(mutation: string, variables?: Record<string, unknown>): Promise<{ data: T, errors?: unknown[] }>;
}

/**
 * GraphQL 서비스 설정 옵션
 */
export interface GraphQLServiceOptions {
  /** GraphQL 엔드포인트 URL */
  endpoint: string;
  /** HTTP 요청 타임아웃(ms) */
  timeout?: number;
  /** 헤더 생성 함수 */
  getHeaders?: () => Record<string, string>;
  /** 에러 핸들러 */
  onError?: (error: unknown) => void;
}

/**
 * Axios를 사용한 GraphQL 클라이언트 구현
 */
export class AxiosGraphQLClient implements GraphQLClient {
  private axios: AxiosInstance;
  private options: GraphQLServiceOptions;

  constructor(options: GraphQLServiceOptions) {
    this.options = options;
    
    const config: AxiosRequestConfig = {
      baseURL: options.endpoint,
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    this.axios = axios.create(config);
  }

  /**
   * GraphQL 요청 실행
   * @param operation 작업 문자열 (쿼리 또는 뮤테이션)
   * @param variables 변수 객체
   * @returns 응답 데이터
   */
  private async request<T>(operation: string, variables?: Record<string, unknown>): Promise<{ data: T, errors?: unknown[] }> {
    try {
      const headers = this.options.getHeaders ? this.options.getHeaders() : {};
      
      const response = await this.axios.post('', {
        query: operation,
        variables: variables || {},
      }, { headers });
      
      if (response.data.errors && response.data.errors.length > 0) {
        if (this.options.onError) {
          this.options.onError(response.data.errors);
        }
        return response.data;
      }
      
      return response.data;
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(error);
      }
      throw error;
    }
  }

  /**
   * GraphQL 쿼리 실행
   */
  async query<T>(query: string, variables?: Record<string, unknown>): Promise<{ data: T, errors?: unknown[] }> {
    return this.request<T>(query, variables);
  }

  /**
   * GraphQL 뮤테이션 실행
   */
  async mutate<T>(mutation: string, variables?: Record<string, unknown>): Promise<{ data: T, errors?: unknown[] }> {
    return this.request<T>(mutation, variables);
  }
}

/**
 * GraphQL 클라이언트 생성 팩토리 함수
 * @param options GraphQL 서비스 옵션
 * @returns GraphQL 클라이언트 인스턴스
 */
export function createGraphQLClient(options: GraphQLServiceOptions): GraphQLClient {
  return new AxiosGraphQLClient(options);
}