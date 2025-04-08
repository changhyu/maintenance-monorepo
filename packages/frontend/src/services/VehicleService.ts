import { apiClient } from './api';

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
  year: number;
  licensePlate: string;
  vin: string;
  status: 'active' | 'maintenance' | 'outOfService';
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
}

/**
 * 차량 서비스 클래스
 * 차량 데이터 관리와 API 요청 처리
 */
export class VehicleService {
  private basePath: string = '/vehicles';
  
  /**
   * 차량 통계 데이터 조회
   * @returns 차량 통계 데이터
   */
  async getVehicleStats(): Promise<VehicleStats> {
    try {
      const response = await apiClient.get(`${this.basePath}/stats`);
      return response.data;
    } catch (error) {
      console.error('차량 통계 데이터 조회 실패:', error);
      // 오류 발생 시 기본 데이터 반환
      return {
        totalVehicles: 0,
        activeVehicles: 0,
        inMaintenanceVehicles: 0,
        outOfServiceVehicles: 0
      };
    }
  }
  
  /**
   * 차량 목록 조회
   * @param params 검색 및 필터링 파라미터
   * @returns 차량 목록
   */
  async getVehicles(params?: any): Promise<Vehicle[]> {
    try {
      const response = await apiClient.get(this.basePath, { params });
      return response.data;
    } catch (error) {
      console.error('차량 목록 조회 실패:', error);
      return [];
    }
  }
  
  /**
   * 특정 차량 정보 조회
   * @param id 차량 ID
   * @returns 차량 정보
   */
  async getVehicleById(id: string): Promise<Vehicle | null> {
    try {
      const response = await apiClient.get(`${this.basePath}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`차량 정보 조회 실패 (ID: ${id}):`, error);
      return null;
    }
  }
  
  /**
   * 차량 정보 저장
   * @param vehicle 저장할 차량 정보
   * @returns 저장된 차량 정보
   */
  async saveVehicle(vehicle: Partial<Vehicle>): Promise<Vehicle | null> {
    try {
      let response;
      
      if (vehicle.id) {
        // 기존 차량 업데이트
        response = await apiClient.put(`${this.basePath}/${vehicle.id}`, vehicle);
      } else {
        // 새 차량 생성
        response = await apiClient.post(this.basePath, vehicle);
      }
      
      return response.data;
    } catch (error) {
      console.error('차량 정보 저장 실패:', error);
      return null;
    }
  }
  
  /**
   * 차량 삭제
   * @param id 삭제할 차량 ID
   * @returns 삭제 성공 여부
   */
  async deleteVehicle(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`${this.basePath}/${id}`);
      return true;
    } catch (error) {
      console.error(`차량 삭제 실패 (ID: ${id}):`, error);
      return false;
    }
  }
} 