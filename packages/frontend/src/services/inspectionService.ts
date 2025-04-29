import type { AxiosResponse } from 'axios';
import apiClient from '../utils/apiClient';
import {
  Inspection,
  InspectionCreateRequest,
  InspectionUpdateRequest,
  InspectionCompleteRequest,
  InspectionFilter,
  UpcomingInspection,
} from '../types/inspection';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  count?: number;
  total?: number;
}

/**
 * 차량 법정검사 관련 서비스 클래스
 */
export class InspectionService {
  private static instance: InspectionService;
  private readonly baseUrl = '/api/vehicle-inspections';

  private constructor() {}

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): InspectionService {
    if (!InspectionService.instance) {
      InspectionService.instance = new InspectionService();
    }
    return InspectionService.instance;
  }

  /**
   * 모든 법정검사 목록을 조회합니다.
   */
  async getAllInspections(filters?: InspectionFilter): Promise<Inspection[]> {
    try {
      const response: AxiosResponse<ApiResponse<Inspection[]>> = await apiClient.get(
        this.baseUrl,
        { params: filters }
      );
      return response.data.data;
    } catch (error) {
      console.error('[inspectionService] 법정검사 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * 특정 법정검사를 조회합니다.
   */
  async getInspectionById(id: string): Promise<Inspection | null> {
    try {
      const response: AxiosResponse<ApiResponse<Inspection>> = await apiClient.get(
        `${this.baseUrl}/${id}`
      );
      return response.data.data;
    } catch (error) {
      console.error(`[inspectionService] 법정검사 조회 실패 (ID: ${id}):`, error);
      return null;
    }
  }

  /**
   * 특정 차량의 법정검사 이력을 조회합니다.
   */
  async getInspectionsForVehicle(vehicleId: string): Promise<Inspection[]> {
    try {
      const response: AxiosResponse<ApiResponse<Inspection[]>> = await apiClient.get(
        this.baseUrl,
        { params: { vehicleId } }
      );
      return response.data.data;
    } catch (error) {
      console.error(`[inspectionService] 차량 검사 이력 조회 실패 (vehicleId: ${vehicleId}):`, error);
      return [];
    }
  }

  /**
   * 곧 다가오는 법정검사 일정을 조회합니다.
   */
  async getUpcomingInspections(days: number = 30): Promise<UpcomingInspection[]> {
    try {
      const response: AxiosResponse<ApiResponse<UpcomingInspection[]>> = await apiClient.get(
        `${this.baseUrl}/upcoming`,
        { params: { days } }
      );
      return response.data.data;
    } catch (error) {
      console.error(`[inspectionService] 다가오는 법정검사 조회 실패:`, error);
      return [];
    }
  }

  /**
   * 새 법정검사 일정을 등록합니다.
   */
  async createInspection(data: InspectionCreateRequest): Promise<Inspection | null> {
    try {
      const response: AxiosResponse<ApiResponse<Inspection>> = await apiClient.post(
        this.baseUrl,
        data
      );
      return response.data.data;
    } catch (error) {
      console.error('[inspectionService] 법정검사 등록 실패:', error);
      return null;
    }
  }

  /**
   * 법정검사 정보를 업데이트합니다.
   */
  async updateInspection(id: string, data: InspectionUpdateRequest): Promise<Inspection | null> {
    try {
      const response: AxiosResponse<ApiResponse<Inspection>> = await apiClient.put(
        `${this.baseUrl}/${id}`,
        data
      );
      return response.data.data;
    } catch (error) {
      console.error(`[inspectionService] 법정검사 업데이트 실패 (ID: ${id}):`, error);
      return null;
    }
  }

  /**
   * 법정검사 완료 처리를 합니다.
   */
  async completeInspection(id: string, data: InspectionCompleteRequest): Promise<Inspection | null> {
    try {
      const response: AxiosResponse<ApiResponse<Inspection>> = await apiClient.post(
        `${this.baseUrl}/${id}/complete`,
        data
      );
      return response.data.data;
    } catch (error) {
      console.error(`[inspectionService] 법정검사 완료 처리 실패 (ID: ${id}):`, error);
      return null;
    }
  }

  /**
   * 법정검사 일정을 삭제합니다.
   */
  async deleteInspection(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}`);
      return true;
    } catch (error) {
      console.error(`[inspectionService] 법정검사 삭제 실패 (ID: ${id}):`, error);
      return false;
    }
  }
}

// 싱글톤 인스턴스를 export
export const inspectionService = InspectionService.getInstance();