import axios from 'axios';
import { Maintenance, MaintenanceFilters, MaintenanceCreateInput, MaintenanceUpdateInput, PaginatedResponse, PaginationInfo } from '../types/maintenance';
import { extractErrorMessage, measurePerformance, devLog } from '../utils/errorHandling';

const API_BASE_URL = '/api';

/**
 * 정비 목록을 조회합니다.
 * @param filters 필터링 조건
 * @param page 페이지 번호 (1부터 시작)
 * @param pageSize 페이지당 항목 수
 * @param sortBy 정렬 기준 필드
 * @param sortOrder 정렬 방향
 * @returns 페이지네이션된 정비 목록 응답
 */
export const getMaintenances = async (
  filters?: MaintenanceFilters,
  page = 1,
  pageSize = 10,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Promise<{ items: Maintenance[]; pagination: PaginationInfo }> => {
  return measurePerformance('getMaintenances', async () => {
    try {
      const params = new URLSearchParams();
      
      // 페이지네이션 파라미터 추가
      params.append('page', page.toString());
      params.append('size', pageSize.toString());
      
      // 정렬 파라미터 추가
      if (sortBy) params.append('sort_by', sortBy);
      if (sortOrder) params.append('sort_order', sortOrder);
      
      if (filters) {
        if (filters.status) params.append('status', filters.status);
        if (filters.type) params.append('type', filters.type);
        if (filters.startDate) params.append('from_date', filters.startDate.toString());
        if (filters.endDate) params.append('to_date', filters.endDate.toString());
        if (filters.searchQuery) params.append('search', filters.searchQuery);
        if (filters.minCost !== undefined) params.append('min_cost', filters.minCost.toString());
        if (filters.maxCost !== undefined) params.append('max_cost', filters.maxCost.toString());
        if (filters.vehicleId) params.append('vehicle_id', filters.vehicleId);
      }
      
      devLog('정비 목록 요청 파라미터:', Object.fromEntries(params.entries()));
      
      const response = await axios.get(`${API_BASE_URL}/maintenances`, { 
        params,
        timeout: 10000 // 10초 타임아웃
      });
      
      const paginatedResponse = response.data as PaginatedResponse<Maintenance>;
      
      if (!paginatedResponse.data || !paginatedResponse.pagination) {
        console.error('서버 응답이 예상된 형식이 아닙니다:', paginatedResponse);
        throw new Error('서버에서 올바른 형식의 데이터를 받지 못했습니다.');
      }
      
      return {
        items: paginatedResponse.data,
        pagination: paginatedResponse.pagination
      };
    } catch (error) {
      console.error('정비 목록을 불러오는데 실패했습니다:', error);
      const errorMessage = extractErrorMessage(error);
      throw new Error(errorMessage);
    }
  });
};

/**
 * 정비 상세 정보를 조회합니다.
 * @param id 정비 ID
 * @returns 정비 상세 정보
 */
export const getMaintenance = async (id: string): Promise<Maintenance> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/maintenances/${id}`);
    return response.data;
  } catch (error) {
    console.error(`정비 ID ${id}의 상세 정보를 불러오는데 실패했습니다:`, error);
    throw error;
  }
};

/**
 * 새 정비를 생성합니다.
 * @param data 생성할 정비 데이터
 * @returns 생성된 정비 정보
 */
export const createMaintenance = async (data: MaintenanceCreateInput): Promise<Maintenance> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/maintenances`, data);
    return response.data;
  } catch (error) {
    console.error('정비 생성에 실패했습니다:', error);
    throw error;
  }
};

/**
 * 정비 정보를 수정합니다.
 * @param id 정비 ID
 * @param data 수정할 정비 데이터
 * @returns 수정된 정비 정보
 */
export const updateMaintenance = async (id: string, data: MaintenanceUpdateInput): Promise<Maintenance> => {
  try {
    const response = await axios.put(`${API_BASE_URL}/maintenances/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`정비 ID ${id} 수정에 실패했습니다:`, error);
    throw error;
  }
};

/**
 * 정비를 삭제합니다.
 * @param id 정비 ID
 */
export const deleteMaintenance = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/maintenances/${id}`);
  } catch (error) {
    console.error(`정비 ID ${id} 삭제에 실패했습니다:`, error);
    throw error;
  }
};

/**
 * 정비를 완료 처리합니다.
 * @param id 정비 ID
 * @param data 완료 처리에 필요한 데이터
 * @returns 수정된 정비 정보
 */
export const completeMaintenance = async (id: string, data: { completedDate: string; mileage: number }): Promise<Maintenance> => {
  try {
    const response = await axios.patch(`${API_BASE_URL}/maintenances/${id}/complete`, data);
    return response.data;
  } catch (error) {
    console.error(`정비 ID ${id} 완료 처리에 실패했습니다:`, error);
    throw error;
  }
};

/**
 * 정비를 취소 처리합니다.
 * @param id 정비 ID
 * @returns 수정된 정비 정보
 */
export const cancelMaintenance = async (id: string): Promise<Maintenance> => {
  try {
    const response = await axios.patch(`${API_BASE_URL}/maintenances/${id}/cancel`, {});
    return response.data;
  } catch (error) {
    console.error(`정비 ID ${id} 취소 처리에 실패했습니다:`, error);
    throw error;
  }
};

/**
 * 정비 비용 세부 정보를 추가합니다.
 * @param id 정비 ID
 * @param data 비용 데이터
 * @returns 수정된 정비 정보
 */
export const addMaintenanceCost = async (id: string, data: any): Promise<Maintenance> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/maintenances/${id}/costs`, data);
    return response.data;
  } catch (error) {
    console.error(`정비 ID ${id}에 비용 추가 실패:`, error);
    throw error;
  }
};

/**
 * 특정 차량의 정비 기록을 조회합니다.
 * @param vehicleId 차량 ID
 * @returns 차량의 정비 기록 목록
 */
export const getMaintenancesByVehicle = async (vehicleId: string): Promise<Maintenance[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/vehicles/${vehicleId}/maintenances`);
    return response.data.items || [];
  } catch (error) {
    console.error(`차량 ID ${vehicleId}의 정비 기록을 불러오는데 실패했습니다:`, error);
    throw error;
  }
};

/**
 * 예정된 정비 목록을 조회합니다.
 * @returns 예정된 정비 목록
 */
export const getUpcomingMaintenances = async (): Promise<Maintenance[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/maintenances/upcoming`);
    return response.data.items || [];
  } catch (error) {
    console.error('예정된 정비 목록을 불러오는데 실패했습니다:', error);
    throw error;
  }
};

/**
 * 정비 통계를 조회합니다.
 * @returns 정비 통계 정보
 */
export const getMaintenanceStatistics = async (): Promise<any> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/maintenances/statistics`);
    return response.data;
  } catch (error) {
    console.error('정비 통계를 불러오는데 실패했습니다:', error);
    throw error;
  }
};

const maintenanceService = {
  getMaintenances,
  getMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  completeMaintenance,
  cancelMaintenance,
  addMaintenanceCost,
  getMaintenancesByVehicle,
  getUpcomingMaintenances,
  getMaintenanceStatistics,
};

export default maintenanceService;