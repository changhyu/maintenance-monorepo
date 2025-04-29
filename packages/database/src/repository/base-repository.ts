/**
 * 기본 Repository 인터페이스
 * 모든 리포지토리가 구현해야 하는 기본 메서드 정의
 */
export interface IBaseRepository<T, ID, CreateInput, UpdateInput> {
  findAll(params?: any): Promise<{ data: T[]; total: number }>;
  findById(id: ID): Promise<T | null>;
  create(data: CreateInput): Promise<T>;
  update(id: ID, data: UpdateInput): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
  count(where?: any): Promise<number>;
}

/**
 * 페이지네이션 옵션 인터페이스
 */
export interface PaginationOptions {
  skip?: number;
  take?: number;
}

/**
 * 정렬 옵션 인터페이스
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * 기본 쿼리 파라미터 인터페이스
 */
export interface BaseQueryParams extends PaginationOptions {
  sort?: SortOptions;
  include?: Record<string, boolean | object>;
  select?: Record<string, boolean>;
}