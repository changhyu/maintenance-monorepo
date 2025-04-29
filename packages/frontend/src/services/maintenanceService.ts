import { httpClient, extractResponseData } from '../api/httpClient';
import { Maintenance, MaintenanceDTO, MaintenanceFilter, MaintenanceListResponse } from '../types/maintenance';

/**
 * 정비 관련 API 서비스
 */
export class MaintenanceService {
  private static instance: MaintenanceService;
  private readonly baseUrl: string = '/maintenances';
  
  private constructor() {}
  
  /**
   * 싱글톤 인스턴스 획득
   */
  public static getInstance(): MaintenanceService {
    if (!MaintenanceService.instance) {
      MaintenanceService.instance = new MaintenanceService();
    }
    return MaintenanceService.instance;
  }
  
  /**
   * 모든 정비 기록 목록 조회
   * @param filter 필터 옵션
   */
  public async getMaintenances(filter?: MaintenanceFilter): Promise<MaintenanceListResponse> {
    try {
      const response = await httpClient.get<MaintenanceListResponse>(this.baseUrl, {
        params: filter,
      });
      return extractResponseData(response);
    } catch (error) {
      console.error('정비 기록 목록 조회 에러:', error);
      throw error;
    }
  }
  
  /**
   * 특정 ID의 정비 기록 조회
   * @param id 정비 기록 ID
   */
  public async getMaintenanceById(id: string): Promise<Maintenance> {
    try {
      const response = await httpClient.get<Maintenance>(`${this.baseUrl}/${id}`);
      return extractResponseData(response);
    } catch (error) {
      console.error(`정비 기록(ID: ${id}) 조회 에러:`, error);
      throw error;
    }
  }
  
  /**
   * 정비 기록 생성
   * @param data 정비 기록 데이터
   */
  public async createMaintenance(data: MaintenanceDTO): Promise<Maintenance> {
    try {
      const response = await httpClient.post<Maintenance>(this.baseUrl, data);
      return extractResponseData(response);
    } catch (error) {
      console.error('정비 기록 생성 에러:', error);
      throw error;
    }
  }
  
  /**
   * 정비 기록 수정
   * @param id 정비 기록 ID
   * @param data 수정할 정비 기록 데이터
   */
  public async updateMaintenance(id: string, data: Partial<MaintenanceDTO>): Promise<Maintenance> {
    try {
      const response = await httpClient.put<Maintenance>(`${this.baseUrl}/${id}`, data);
      return extractResponseData(response);
    } catch (error) {
      console.error(`정비 기록(ID: ${id}) 수정 에러:`, error);
      throw error;
    }
  }
  
  /**
   * 정비 기록 삭제
   * @param id 정비 기록 ID
   */
  public async deleteMaintenance(id: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.delete(`${this.baseUrl}/${id}`);
      return { success: true, ...extractResponseData(response) };
    } catch (error) {
      console.error(`정비 기록(ID: ${id}) 삭제 에러:`, error);
      throw error;
    }
  }
  
  /**
   * 차량별 정비 기록 목록 조회
   * @param vehicleId 차량 ID
   * @param filter 필터 옵션
   */
  public async getMaintenancesByVehicle(
    vehicleId: string, 
    filter?: Omit<MaintenanceFilter, 'vehicleId'>
  ): Promise<MaintenanceListResponse> {
    try {
      const response = await httpClient.get<MaintenanceListResponse>(`/vehicles/${vehicleId}/maintenances`, {
        params: filter,
      });
      return extractResponseData(response);
    } catch (error) {
      console.error(`차량(ID: ${vehicleId})의 정비 기록 목록 조회 에러:`, error);
      throw error;
    }
  }
  
  /**
   * 정비 기록에 파일 첨부
   * @param id 정비 기록 ID
   * @param file 첨부할 파일
   */
  public async attachDocumentToMaintenance(id: string, file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await httpClient.post(`${this.baseUrl}/${id}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return extractResponseData(response);
    } catch (error) {
      console.error(`정비 기록(ID: ${id})에 문서 첨부 에러:`, error);
      throw error;
    }
  }
}