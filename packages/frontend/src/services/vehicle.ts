/**
 * 차량 관련 API 서비스
 */

import axios from 'axios';
import {
  Vehicle,
  VehicleCreate,
  VehicleUpdate,
  VehicleFilter,
  VehicleTelemetry,
  VehicleDocument
} from '../types/vehicle';

// API 기본 설정
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 차량 서비스 객체
 */
export const vehicleService = {
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
      console.error('차량 목록 조회 실패:', error);
      throw error;
    }
  },

  /**
   * 특정 차량 조회
   * @param vehicleId 차량 ID
   * @returns 차량 정보
   */
  async getVehicleById(vehicleId: string): Promise<Vehicle> {
    try {
      const response = await api.get(`/vehicles/${vehicleId}`);
      return response.data;
    } catch (error) {
      console.error('차량 정보 조회 실패:', error);
      throw error;
    }
  },

  /**
   * 새 차량 등록
   * @param vehicleData 차량 데이터
   * @returns 생성된 차량 정보
   */
  async createVehicle(vehicleData: VehicleCreate): Promise<Vehicle> {
    try {
      const response = await api.post('/vehicles', vehicleData);
      return response.data;
    } catch (error) {
      console.error('차량 등록 실패:', error);
      throw error;
    }
  },

  /**
   * 차량 정보 업데이트
   * @param vehicleId 차량 ID
   * @param updateData 업데이트할 데이터
   * @returns 업데이트된 차량 정보
   */
  async updateVehicle(vehicleId: string, updateData: VehicleUpdate): Promise<Vehicle> {
    try {
      const response = await api.put(`/vehicles/${vehicleId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('차량 정보 업데이트 실패:', error);
      throw error;
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
      console.error('차량 삭제 실패:', error);
      throw error;
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
      console.error('정비 이력 조회 실패:', error);
      throw error;
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
      console.error('원격 진단 실패:', error);
      throw error;
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
      console.error('텔레메트리 데이터 조회 실패:', error);
      throw error;
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
      console.error('소프트웨어 업데이트 이력 조회 실패:', error);
      throw error;
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
      console.error('보험 정보 조회 실패:', error);
      throw error;
    }
  },

  /**
   * 차량 문서 목록 조회
   * @param vehicleId 차량 ID
   * @returns 문서 목록
   */
  async getVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]> {
    return api.get<VehicleDocument[]>(`/vehicles/${vehicleId}/documents`);
  },

  /**
   * 차량 문서 첨부
   * @param vehicleId 차량 ID
   * @param file 첨부 파일
   * @returns 첨부된 문서 정보
   */
  async attachVehicleDocument(vehicleId: string, file: File, documentName?: string): Promise<VehicleDocument> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (documentName) {
      formData.append('name', documentName);
    }
    
    return api.post<VehicleDocument>(`/vehicles/${vehicleId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * 차량 문서 삭제
   * @param vehicleId 차량 ID
   * @param documentId 문서 ID
   * @returns 삭제 성공 여부
   */
  async removeVehicleDocument(vehicleId: string, documentId: string): Promise<boolean> {
    await api.delete(`/vehicles/${vehicleId}/documents/${documentId}`);
    return true;
  },

  /**
   * 차량 유형별 통계 조회
   * @returns 유형별 차량 수
   */
  async getVehicleStatsByType(): Promise<Record<string, number>> {
    return api.get<Record<string, number>>(`/vehicles/stats/by-type`);
  },

  /**
   * 차량 상태별 통계 조회
   * @returns 상태별 차량 수
   */
  async getVehicleStatsByStatus(): Promise<Record<string, number>> {
    return api.get<Record<string, number>>(`/vehicles/stats/by-status`);
  }
}; 