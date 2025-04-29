import apiClient from '../api/apiClient';
import { Vehicle, VehicleDTO, VehicleFilter } from '../types/vehicle';

/**
 * 차량 서비스 클래스
 * 차량 관련 API 호출을 처리합니다.
 */
class VehicleService {
  private readonly baseUrl = '/vehicles';

  /**
   * 차량 목록을 조회합니다.
   * @param filters 필터링 조건
   * @returns 차량 목록 및 페이지네이션 정보
   */
  async getVehicleList(filters?: VehicleFilter): Promise<{ items: Vehicle[]; total: number; page: number; limit: number }> {
    const response = await apiClient.get(this.baseUrl, {
      params: filters,
    });
    return response.data;
  }

  /**
   * 단일 차량 정보를 조회합니다.
   * @param id 차량 ID
   * @returns 차량 정보
   */
  async getVehicle(id: string): Promise<Vehicle> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * 새로운 차량 정보를 생성합니다.
   * @param vehicleData 차량 데이터
   * @returns 생성된 차량 정보
   */
  async createVehicle(vehicleData: VehicleDTO): Promise<Vehicle> {
    const response = await apiClient.post(this.baseUrl, vehicleData);
    return response.data;
  }

  /**
   * 기존 차량 정보를 업데이트합니다.
   * @param id 차량 ID
   * @param vehicleData 업데이트할 차량 데이터
   * @returns 업데이트된 차량 정보
   */
  async updateVehicle(id: string, vehicleData: Partial<VehicleDTO>): Promise<Vehicle> {
    const response = await apiClient.put(`${this.baseUrl}/${id}`, vehicleData);
    return response.data;
  }

  /**
   * 차량 정보를 삭제합니다.
   * @param id 차량 ID
   * @returns 성공 여부
   */
  async deleteVehicle(id: string): Promise<boolean> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
    return true;
  }

  /**
   * 차량 상태를 업데이트합니다.
   * @param id 차량 ID
   * @param status 새로운 상태
   * @returns 업데이트된 차량 정보
   */
  async updateVehicleStatus(id: string, status: string): Promise<Vehicle> {
    const response = await apiClient.patch(`${this.baseUrl}/${id}/status`, { status });
    return response.data;
  }

  /**
   * 차량 이미지를 업로드합니다.
   * @param id 차량 ID
   * @param formData 이미지 파일 FormData
   * @returns 업데이트된 차량 정보
   */
  async uploadVehicleImage(id: string, formData: FormData): Promise<Vehicle> {
    const response = await apiClient.post(`${this.baseUrl}/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * 차량 통계 정보를 조회합니다.
   * @returns 차량 통계 정보
   */
  async getVehicleStats(): Promise<{
    totalCount: number;
    activeCount: number;
    maintenanceCount: number;
    retiredCount: number;
    rentedCount: number;
    byType: Record<string, number>;
    byFuelType: Record<string, number>;
    byDepartment: Record<string, number>;
  }> {
    const response = await apiClient.get(`${this.baseUrl}/stats`);
    return response.data;
  }

  /**
   * 부서별 차량 목록을 조회합니다.
   * @param departmentId 부서 ID
   * @returns 차량 목록
   */
  async getVehiclesByDepartment(departmentId: string): Promise<Vehicle[]> {
    const response = await apiClient.get(`/departments/${departmentId}/vehicles`);
    return response.data;
  }

  /**
   * 현재 사용 가능한 차량 목록을 조회합니다.
   * @returns 사용 가능한 차량 목록
   */
  async getAvailableVehicles(): Promise<Vehicle[]> {
    const response = await apiClient.get(`${this.baseUrl}/available`);
    return response.data;
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const vehicleService = new VehicleService();
export default vehicleService;