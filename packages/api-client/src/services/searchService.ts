import { ApiClient } from '../client';

// 검색 엔티티의 기본 데이터 타입
export type SearchEntityData = Record<string, unknown>;
// 검색 필터의 추가 속성 타입
export type SearchFilterAdditionalProps = Record<string, unknown>;

export enum SearchEntityType {
  VEHICLE = 'vehicle',
  MAINTENANCE = 'maintenance',
  SHOP = 'shop',
  USER = 'user',
  REPORT = 'report',
  INVOICE = 'invoice',
  BOOKING = 'booking',
  FILE = 'file',
  NOTE = 'note',
  TASK = 'task',
  ALL = 'all'
}

export enum SearchSortOption {
  RELEVANCE = 'relevance',
  DATE_ASC = 'date_asc',
  DATE_DESC = 'date_desc',
  ALPHABETICAL_ASC = 'alphabetical_asc',
  ALPHABETICAL_DESC = 'alphabetical_desc'
}

export interface SearchResult<T = SearchEntityData> {
  id: string;
  type: SearchEntityType;
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  highlights?: {
    field: string;
    snippets: string[];
  }[];
  score: number;
  data: T;
}

export interface SearchFilter extends SearchFilterAdditionalProps {
  types?: SearchEntityType[];
  startDate?: string;
  endDate?: string;
  status?: string[];
  tags?: string[];
  userId?: string;
  vehicleId?: string;
  shopId?: string;
  maintenanceId?: string;
}

export interface SearchAggregation {
  name: string;
  buckets: Array<{
    key: string;
    count: number;
    selected?: boolean;
  }>;
}

export interface SearchOptions {
  page?: number;
  limit?: number;
  sortBy?: SearchSortOption;
  includeAggregations?: boolean;
  highlightResults?: boolean;
  minScore?: number;
}

export interface SearchResponse<T = SearchEntityData> {
  query: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  results: SearchResult<T>[];
  processingTimeMs: number;
  aggregations?: {
    types?: SearchAggregation;
    status?: SearchAggregation;
    tags?: SearchAggregation;
    dates?: SearchAggregation;
    [key: string]: SearchAggregation | undefined;
  };
  suggestions?: string[];
}

export interface RecentSearch {
  id: string;
  query: string;
  timestamp: string;
  filters?: SearchFilter;
  userId: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilter;
  options?: SearchOptions;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutocompleteResponse {
  query: string;
  suggestions: Array<{
    text: string;
    type: 'query' | 'entity' | 'tag' | 'filter';
    entityType?: SearchEntityType;
    id?: string;
    data?: SearchEntityData;
  }>;
}

export class SearchService {
  private client: ApiClient;
  private basePath = '/search';
  private savedSearchPath = '/saved-searches';
  private recentSearchPath = '/recent-searches';

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  // 기본 검색 기능
  async search<T = SearchEntityData>(
    query: string,
    filters?: SearchFilter,
    options?: SearchOptions
  ): Promise<SearchResponse<T>> {
    return this.client.get<SearchResponse<T>>(this.basePath, {
      params: {
        q: query,
        ...filters,
        ...options
      }
    });
  }

  // 특정 엔티티 타입 검색
  async searchByType<T = SearchEntityData>(
    type: SearchEntityType,
    query: string,
    filters?: Omit<SearchFilter, 'types'>,
    options?: SearchOptions
  ): Promise<SearchResponse<T>> {
    return this.search<T>(query, { ...filters, types: [type] }, options);
  }

  // 차량 검색
  async searchVehicles(
    query: string,
    filters?: Omit<SearchFilter, 'types'>,
    options?: SearchOptions
  ): Promise<SearchResponse> {
    return this.searchByType(SearchEntityType.VEHICLE, query, filters, options);
  }

  // 정비 기록 검색
  async searchMaintenance(
    query: string,
    filters?: Omit<SearchFilter, 'types'>,
    options?: SearchOptions
  ): Promise<SearchResponse> {
    return this.searchByType(SearchEntityType.MAINTENANCE, query, filters, options);
  }

  // 정비소 검색
  async searchShops(
    query: string,
    filters?: Omit<SearchFilter, 'types'>,
    options?: SearchOptions
  ): Promise<SearchResponse> {
    return this.searchByType(SearchEntityType.SHOP, query, filters, options);
  }

  // 사용자 검색
  async searchUsers(
    query: string,
    filters?: Omit<SearchFilter, 'types'>,
    options?: SearchOptions
  ): Promise<SearchResponse> {
    return this.searchByType(SearchEntityType.USER, query, filters, options);
  }

  // 파일 검색
  async searchFiles(
    query: string,
    filters?: Omit<SearchFilter, 'types'>,
    options?: SearchOptions
  ): Promise<SearchResponse> {
    return this.searchByType(SearchEntityType.FILE, query, filters, options);
  }

  // 자동완성
  async autocomplete(
    query: string,
    type?: SearchEntityType,
    limit: number = 10
  ): Promise<AutocompleteResponse> {
    return this.client.get<AutocompleteResponse>(`${this.basePath}/autocomplete`, {
      params: {
        q: query,
        type,
        limit
      }
    });
  }

  // 태그 자동완성
  async autocompleteTags(
    query: string,
    limit: number = 10
  ): Promise<string[]> {
    return this.client.get<string[]>(`${this.basePath}/autocomplete-tags`, {
      params: {
        q: query,
        limit
      }
    });
  }

  // 최근 검색어 관련 메서드

  // 최근 검색어 가져오기
  async getRecentSearches(limit: number = 10): Promise<RecentSearch[]> {
    return this.client.get<RecentSearch[]>(this.recentSearchPath, {
      params: { limit }
    });
  }

  // 최근 검색어 삭제
  async deleteRecentSearch(id: string): Promise<void> {
    return this.client.delete(`${this.recentSearchPath}/${id}`);
  }

  // 모든 최근 검색어 삭제
  async clearRecentSearches(): Promise<void> {
    return this.client.delete(this.recentSearchPath);
  }

  // 저장된 검색어 관련 메서드

  // 저장된 검색어 목록 가져오기
  async getSavedSearches(): Promise<SavedSearch[]> {
    return this.client.get<SavedSearch[]>(this.savedSearchPath);
  }

  // 검색어 저장하기
  async saveSearch(
    name: string,
    query: string,
    filters: SearchFilter,
    options?: SearchOptions
  ): Promise<SavedSearch> {
    return this.client.post<SavedSearch>(this.savedSearchPath, {
      name,
      query,
      filters,
      options
    });
  }

  // 저장된 검색어 조회
  async getSavedSearch(id: string): Promise<SavedSearch> {
    return this.client.get<SavedSearch>(`${this.savedSearchPath}/${id}`);
  }

  // 저장된 검색어 실행
  async executeSavedSearch<T = any>(id: string): Promise<SearchResponse<T>> {
    return this.client.get<SearchResponse<T>>(`${this.savedSearchPath}/${id}/execute`);
  }

  // 저장된 검색어 업데이트
  async updateSavedSearch(
    id: string,
    updates: Partial<Pick<SavedSearch, 'name' | 'query' | 'filters' | 'options'>>
  ): Promise<SavedSearch> {
    return this.client.put<SavedSearch>(`${this.savedSearchPath}/${id}`, updates);
  }

  // 저장된 검색어 삭제
  async deleteSavedSearch(id: string): Promise<void> {
    return this.client.delete(`${this.savedSearchPath}/${id}`);
  }

  // 페이스트 검색 (실시간 검색)
  async instantSearch<T = any>(
    query: string,
    limit: number = 5
  ): Promise<SearchResponse<T>> {
    return this.client.get<SearchResponse<T>>(`${this.basePath}/instant`, {
      params: {
        q: query,
        limit
      }
    });
  }

  // 유사 항목 검색
  async findSimilar<T = any>(
    entityType: SearchEntityType,
    entityId: string,
    limit: number = 10
  ): Promise<SearchResponse<T>> {
    return this.client.get<SearchResponse<T>>(`${this.basePath}/similar`, {
      params: {
        entityType,
        entityId,
        limit
      }
    });
  }

  // 검색 쿼리 추천
  async suggestQueries(
    partialQuery: string,
    limit: number = 5
  ): Promise<string[]> {
    return this.client.get<string[]>(`${this.basePath}/suggest`, {
      params: {
        q: partialQuery,
        limit
      }
    });
  }

  // 고급 검색 (JSON으로 정의된 복잡한 쿼리)
  async advancedSearch<T = any>(searchConfig: {
    query?: string;
    filters?: any;
    aggregations?: any;
    boost?: any;
    sort?: any;
    page?: number;
    limit?: number;
  }): Promise<SearchResponse<T>> {
    return this.client.post<SearchResponse<T>>(`${this.basePath}/advanced`, searchConfig);
  }

  // 전체 재색인
  async reindexAll(): Promise<{
    success: boolean;
    message: string;
    jobId?: string;
  }> {
    return this.client.post<{
      success: boolean;
      message: string;
      jobId?: string;
    }>(`${this.basePath}/reindex`, {});
  }

  // 특정 엔티티 타입 재색인
  async reindexType(type: SearchEntityType): Promise<{
    success: boolean;
    message: string;
    jobId?: string;
  }> {
    return this.client.post<{
      success: boolean;
      message: string;
      jobId?: string;
    }>(`${this.basePath}/reindex/${type}`, {});
  }

  // 색인 상태 확인
  async getIndexStatus(): Promise<{
    status: 'idle' | 'indexing' | 'error';
    lastIndexed: string;
    entitiesCounts: Record<SearchEntityType, number>;
    currentJob?: {
      id: string;
      type: SearchEntityType | 'all';
      progress: number;
      startedAt: string;
      estimatedCompletion: string;
    };
  }> {
    return this.client.get<{
      status: 'idle' | 'indexing' | 'error';
      lastIndexed: string;
      entitiesCounts: Record<SearchEntityType, number>;
      currentJob?: {
        id: string;
        type: SearchEntityType | 'all';
        progress: number;
        startedAt: string;
        estimatedCompletion: string;
      };
    }>(`${this.basePath}/status`);
  }

  // 검색 내역
  async getSearchHistory(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    history: Array<{
      id: string;
      query: string;
      filters: SearchFilter;
      options: SearchOptions;
      resultsCount: number;
      timestamp: string;
      duration: number;
    }>;
  }> {
    return this.client.get<{
      total: number;
      page: number;
      limit: number;
      history: Array<{
        id: string;
        query: string;
        filters: SearchFilter;
        options: SearchOptions;
        resultsCount: number;
        timestamp: string;
        duration: number;
      }>;
    }>(`${this.basePath}/history`, {
      params: { page, limit }
    });
  }

  // 검색 통계
  async getSearchStats(
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalSearches: number;
    uniqueQueries: number;
    averageResultsPerSearch: number;
    topQueries: Array<{
      query: string;
      count: number;
    }>;
    searchesByEntityType: Record<SearchEntityType, number>;
    searchesByHour: Array<{
      hour: number;
      count: number;
    }>;
    zeroResultQueries: Array<{
      query: string;
      count: number;
    }>;
  }> {
    return this.client.get<{
      totalSearches: number;
      uniqueQueries: number;
      averageResultsPerSearch: number;
      topQueries: Array<{
        query: string;
        count: number;
      }>;
      searchesByEntityType: Record<SearchEntityType, number>;
      searchesByHour: Array<{
        hour: number;
        count: number;
      }>;
      zeroResultQueries: Array<{
        query: string;
        count: number;
      }>;
    }>(`${this.basePath}/stats`, {
      params: { startDate, endDate }
    });
  }
} 