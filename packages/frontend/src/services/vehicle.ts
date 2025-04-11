/**
 * 차량 관련 API 서비스
 */

import { api, apiRequest } from './api';

/**
 * 차량 상태 타입 별칭
 */
export type VehicleStatusType = 'active' | 'maintenance' | 'outOfService';

/**
 * 정렬 방향 타입 별칭
 */
export type SortOrderType = 'asc' | 'desc';

/**
 * 차량 통계 데이터 인터페이스
 */
export interface VehicleStats {
  totalVehicles: number;
  activeVehicles: number;
  inMaintenanceVehicles: number;
  outOfServiceVehicles: number;
}

/**
 * 차량 인터페이스
 */
export interface Vehicle {
  id: string;
  name: string;
  model: string;
  make?: string;
  year: number;
  licensePlate: string;
  vin: string;
  status: VehicleStatusType;
  currentMileage: number;
  lastServiceDate: string;
  nextServiceDue: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  fuelType: string;
  fuelLevel: number;
  location?: {
    latitude: number;
    longitude: number;
    lastUpdated: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 차량 생성 데이터
 */
export interface VehicleCreate {
  name: string;
  model: string;
  make?: string;
  year: number;
  licensePlate: string;
  vin: string;
  status: VehicleStatusType;
  currentMileage: number;
  fuelType: string;
  fuelLevel?: number;
  assignedDriverId?: string;
}

/**
 * 차량 업데이트 데이터
 */
export interface VehicleUpdate {
  name?: string;
  model?: string;
  make?: string;
  year?: number;
  licensePlate?: string;
  vin?: string;
  status?: VehicleStatusType;
  currentMileage?: number;
  fuelType?: string;
  fuelLevel?: number;
  assignedDriverId?: string;
}

/**
 * 차량 필터링 옵션
 */
export interface VehicleFilter {
  status?: string;
  make?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  driverId?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrderType;
}

/**
 * 차량 문서 인터페이스
 */
export interface VehicleDocument {
  id: string;
  vehicleId: string;
  name: string;
  type: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
}

/**
 * 차량 서비스 객체
 */
export const vehicleService = {
  /**
   * 차량 통계 데이터 조회
   */
  async getVehicleStats(): Promise<VehicleStats> {
    try {
      return await apiRequest<VehicleStats>({
        method: 'GET',
        url: '/vehicles/stats'
      });
    } catch (error) {
      console.error('[vehicleService] 차량 통계 데이터 조회 실패:', error);
      // 기본값 반환
      return {
        totalVehicles: 0,
        activeVehicles: 0,
        inMaintenanceVehicles: 0,
        outOfServiceVehicles: 0
      };
    }
  },

  /**
   * 차량 목록 조회
   * @param filter 필터 옵션
   * @returns 차량 목록
   */
  async getVehicles(filter?: VehicleFilter): Promise<Vehicle[]> {
    try {
      const params = filter ? { ...filter } : {};
      const response = await api.get('/vehicles', { params });
      return response.data;
    } catch (error) {
      console.error('[vehicleService] 차량 목록 조회 실패:', error);
      return [];
    }
  },

  /**
   * 특정 차량 조회
   * @param vehicleId 차량 ID
   * @returns 차량 정보
   */
  async getVehicleById(vehicleId: string): Promise<Vehicle | null> {
    try {
      const response = await api.get(`/vehicles/${vehicleId}`);
      return response.data;
    } catch (error) {
      console.error(`[vehicleService] 차량 정보 조회 실패 (ID: ${vehicleId}):`, error);
      return null;
    }
  },

  /**
   * 새 차량 등록
   * @param vehicleData 차량 데이터
   * @returns 생성된 차량 정보
   */
  async createVehicle(vehicleData: VehicleCreate): Promise<Vehicle | null> {
    try {
      const response = await api.post('/vehicles', vehicleData);
      return response.data;
    } catch (error) {
      console.error('[vehicleService] 차량 등록 실패:', error);
      return null;
    }
  },

  /**
   * 차량 정보 업데이트
   * @param vehicleId 차량 ID
   * @param updateData 업데이트할 데이터
   * @returns 업데이트된 차량 정보
   */
  async updateVehicle(vehicleId: string, updateData: VehicleUpdate): Promise<Vehicle | null> {
    try {
      const response = await api.put(`/vehicles/${vehicleId}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`[vehicleService] 차량 정보 업데이트 실패 (ID: ${vehicleId}):`, error);
      return null;
    }
  },

  /**
   * 차량 삭제
   * @param vehicleId 차량 ID
   * @returns 성공 여부
   */
  async deleteVehicle(vehicleId: string): Promise<boolean> {
    try {
      const response = await api.delete(`/vehicles/${vehicleId}`);
      return response.status === 200 || response.status === 204;
    } catch (error) {
      console.error(`[vehicleService] 차량 삭제 실패 (ID: ${vehicleId}):`, error);
      return false;
    }
  },

  /**
   * 차량 정비 이력 조회
   * @param vehicleId 차량 ID
   * @returns 정비 이력
   */
  async getMaintenanceHistory(vehicleId: string): Promise<any[]> {
    try {
      const response = await api.get(`/vehicles/${vehicleId}/maintenance`);
      return response.data;
    } catch (error) {
      console.error(`[vehicleService] 정비 이력 조회 실패 (ID: ${vehicleId}):`, error);
      return [];
    }
  },

  /**
   * 원격 진단 수행
   * @param vehicleId 차량 ID
   * @returns 진단 결과
   */
  async performDiagnostics(vehicleId: string): Promise<any> {
    try {
      const response = await api.post(`/vehicles/${vehicleId}/diagnostics`);
      return response.data;
    } catch (error) {
      console.error(`[vehicleService] 원격 진단 실패 (ID: ${vehicleId}):`, error);
      return null;
    }
  },

  /**
   * 텔레메트리 데이터 조회
   * @param vehicleId 차량 ID
   * @param startDate 시작일 (옵션)
   * @param endDate 종료일 (옵션)
   * @returns 텔레메트리 데이터
   */
  async getTelemetryData(vehicleId: string, startDate?: string, endDate?: string): Promise<any> {
    try {
      const params = { startDate, endDate };
      const response = await api.get(`/vehicles/${vehicleId}/telemetry`, { params });
      return response.data;
    } catch (error) {
      console.error(`[vehicleService] 텔레메트리 데이터 조회 실패 (ID: ${vehicleId}):`, error);
      return null;
    }
  },

  /**
   * 소프트웨어 업데이트 이력 조회
   * @param vehicleId 차량 ID
   * @returns 소프트웨어 업데이트 이력
   */
  async getSoftwareUpdateHistory(vehicleId: string): Promise<any[]> {
    try {
      const response = await api.get(`/vehicles/${vehicleId}/software-updates`);
      return response.data;
    } catch (error) {
      console.error(
        `[vehicleService] 소프트웨어 업데이트 이력 조회 실패 (ID: ${vehicleId}):`,
        error
      );
      return [];
    }
  },

  /**
   * 보험 정보 조회
   * @param vehicleId 차량 ID
   * @returns 보험 정보
   */
  async getInsuranceInfo(vehicleId: string): Promise<any> {
    try {
      const response = await api.get(`/vehicles/${vehicleId}/insurance`);
      return response.data;
    } catch (error) {
      console.error(`[vehicleService] 보험 정보 조회 실패 (ID: ${vehicleId}):`, error);
      return null;
    }
  },

  /**
   * 차량 문서 목록 조회
   * @param vehicleId 차량 ID
   * @returns 문서 목록
   */
  async getVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]> {
    try {
      const response = await api.get(`/vehicles/${vehicleId}/documents`);
      return response.data;
    } catch (error) {
      console.error(`[vehicleService] 차량 문서 목록 조회 실패 (ID: ${vehicleId}):`, error);
      return [];
    }
  },

  /**
   * 차량 문서 업로드
   * @param vehicleId 차량 ID
   * @param file 첨부 파일
   * @param metadata 문서 메타데이터 (옵션)
   * @returns 첨부된 문서 정보
   */
  async uploadVehicleDocument(
    vehicleId: string,
    file: File,
    metadata?: any
  ): Promise<VehicleDocument | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      const response = await api.post(`/vehicles/${vehicleId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`[vehicleService] 차량 문서 업로드 실패 (ID: ${vehicleId}):`, error);
      return null;
    }
  },

  /**
   * 차량 문서 삭제
   * @param vehicleId 차량 ID
   * @param documentId 문서 ID
   * @returns 삭제 성공 여부
   */
  async removeVehicleDocument(vehicleId: string, documentId: string): Promise<boolean> {
    try {
      await api.delete(`/vehicles/${vehicleId}/documents/${documentId}`);
      return true;
    } catch (error) {
      console.error(
        `[vehicleService] 차량 문서 삭제 실패 (ID: ${vehicleId}, 문서: ${documentId}):`,
        error
      );
      return false;
    }
  },

  /**
   * 차량 유형별 통계 조회
   * @returns 유형별 차량 수
   */
  async getVehicleStatsByType(): Promise<Record<string, number>> {
    try {
      const response = await api.get(`/vehicles/stats/by-type`);
      return response.data;
    } catch (error) {
      console.error('[vehicleService] 차량 유형별 통계 조회 실패:', error);
      return {};
    }
  },

  /**
   * 차량 상태별 통계 조회
   * @returns 상태별 차량 수
   */
  async getVehicleStatsByStatus(): Promise<Record<string, number>> {
    try {
      const response = await api.get(`/vehicles/stats/by-status`);
      return response.data;
    } catch (error) {
      console.error('[vehicleService] 차량 상태별 통계 조회 실패:', error);
      return {};
    }
  }
};
