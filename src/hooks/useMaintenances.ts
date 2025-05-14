import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import maintenanceService from '../services/maintenanceService';
import { Maintenance, MaintenanceFilters, PaginationInfo } from '../types/maintenance';

// React Query 키
export const maintenanceKeys = {
  all: ['maintenances'] as const,
  lists: () => [...maintenanceKeys.all, 'list'] as const,
  list: (filters: MaintenanceFilters = {}, pagination?: { page: number; pageSize: number }, sorting?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }) => 
    [...maintenanceKeys.lists(), { filters, pagination, sorting }] as const,
  details: () => [...maintenanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...maintenanceKeys.details(), id] as const,
  statistics: () => [...maintenanceKeys.all, 'statistics'] as const,
  upcoming: () => [...maintenanceKeys.all, 'upcoming'] as const,
};

export interface UseMaintenancesResult {
  maintenances: Maintenance[];
  pagination: PaginationInfo;
  isLoading: boolean;
  isInitialLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * 정비 목록을 가져오는 React Query 훅
 * @param filters 필터 조건
 * @param page 페이지 번호 (1부터 시작)
 * @param pageSize 페이지당 항목 수
 * @param sortBy 정렬 기준 필드
 * @param sortOrder 정렬 방향
 * @param options 추가 React Query 옵션
 * @returns React Query 결과
 */
export const useMaintenances = (
  filters?: MaintenanceFilters,
  page = 1,
  pageSize = 10,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
  options?: Omit<UseQueryOptions<
    { items: Maintenance[]; pagination: PaginationInfo },
    Error,
    { items: Maintenance[]; pagination: PaginationInfo },
    ReturnType<typeof maintenanceKeys.list>
  >, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: maintenanceKeys.list(
      filters, 
      { page, pageSize }, 
      { sortBy, sortOrder }
    ),
    queryFn: () => maintenanceService.getMaintenances(filters, page, pageSize, sortBy, sortOrder),
    staleTime: 30 * 1000, // 30초 동안 데이터를 신선한 상태로 유지
    keepPreviousData: true, // 페이지 전환 시 이전 데이터 유지
    refetchOnWindowFocus: true, // 창이 포커스를 받을 때 자동 리프레시
    retry: 3, // 최대 3번 재시도
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // 지수 백오프
    ...options,
  });
};

/**
 * 특정 정비 정보를 가져오는 React Query 훅
 * @param id 정비 ID
 * @param options 추가 React Query 옵션
 * @returns React Query 결과
 */
export const useMaintenanceDetail = (
  id: string,
  options?: UseQueryOptions<Maintenance, Error, Maintenance, ReturnType<typeof maintenanceKeys.detail>>
) => {
  return useQuery({
    queryKey: maintenanceKeys.detail(id),
    queryFn: () => maintenanceService.getMaintenance(id),
    staleTime: 5 * 60 * 1000, // 5분 동안 데이터를 신선한 상태로 유지
    enabled: !!id, // id가 있을 때만 쿼리 실행
    ...options,
  });
};

/**
 * 예정된 정비 목록을 가져오는 React Query 훅
 * @param options 추가 React Query 옵션
 * @returns React Query 결과
 */
export const useUpcomingMaintenances = (
  options?: UseQueryOptions<Maintenance[], Error, Maintenance[], ReturnType<typeof maintenanceKeys.upcoming>>
) => {
  return useQuery({
    queryKey: maintenanceKeys.upcoming(),
    queryFn: () => maintenanceService.getUpcomingMaintenances(),
    staleTime: 5 * 60 * 1000, // 5분 동안 데이터를 신선한 상태로 유지
    ...options,
  });
};

/**
 * 정비 통계를 가져오는 React Query 훅
 * @param options 추가 React Query 옵션
 * @returns React Query 결과
 */
export const useMaintenanceStatistics = (
  options?: UseQueryOptions<any, Error, any, ReturnType<typeof maintenanceKeys.statistics>>
) => {
  return useQuery({
    queryKey: maintenanceKeys.statistics(),
    queryFn: () => maintenanceService.getMaintenanceStatistics(),
    staleTime: 10 * 60 * 1000, // 10분 동안 데이터를 신선한 상태로 유지
    ...options,
  });
};

export default useMaintenances; 