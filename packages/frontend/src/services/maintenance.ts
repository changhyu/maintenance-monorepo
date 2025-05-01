/**
 * 정비 관련 API 서비스
 */

import api from './apiClient';
import {
  MaintenanceRecord,
  MaintenanceRecordCreate,
  MaintenanceRecordUpdate,
  MaintenanceFilter,
  MaintenanceStats
} from '../types/maintenance';

/**
 * 정비 서비스 객체
 */
export const maintenanceService = {
  /**
   * 정비 기록 목록 조회
   * @param filter 필터 옵션
   * @returns 정비 기록 목록
   */
  async getMaintenanceRecords(filter?: MaintenanceFilter): Promise<MaintenanceRecord[]> {
    try {
      const response = await api.get<{ data: MaintenanceRecord[] }>('/maintenance/records', filter);
      return response.data || [];
    } catch (error) {
      console.error('정비 기록 목록 조회 실패:', error);
      return [];
    }
  },

  /**
   * 특정 정비 기록 조회
   * @param recordId 정비 기록 ID
   * @returns 정비 기록 정보
   */
  async getMaintenanceById(recordId: string): Promise<MaintenanceRecord | null> {
    try {
      const response = await api.get<{ data: MaintenanceRecord }>(`/maintenance/records/${recordId}`);
      return response.data || null;
    } catch (error) {
      console.error('정비 기록 조회 실패:', error);
      return null;
    }
  },

  /**
   * 특정 차량의 정비 이력 조회
   * @param vehicleId 차량 ID
   * @param filter 필터 옵션
   * @returns 정비 이력 목록
   */
  async getVehicleMaintenanceHistory(
    vehicleId: string,
    filter?: MaintenanceFilter
  ): Promise<MaintenanceRecord[]> {
    try {
      const response = await api.get<{ data: MaintenanceRecord[] }>(
        `/maintenance/vehicles/${vehicleId}/history`,
        filter
      );
      return response.data || [];
    } catch (error) {
      console.error('차량 정비 이력 조회 실패:', error);
      return [];
    }
  },

  /**
   * 새 정비 기록 생성
   * @param maintenanceData 정비 기록 데이터
   * @returns 생성된 정비 기록
   */
  async createMaintenanceRecord(
    maintenanceData: MaintenanceRecordCreate
  ): Promise<MaintenanceRecord | null> {
    try {
      const response = await api.post<{ data: MaintenanceRecord }>('/maintenance/records', maintenanceData);
      return response.data || null;
    } catch (error) {
      console.error('정비 기록 생성 실패:', error);
      return null;
    }
  },

  /**
   * 정비 기록 업데이트
   * @param recordId 정비 기록 ID
   * @param updateData 업데이트할 데이터
   * @returns 업데이트된 정비 기록
   */
  async updateMaintenanceRecord(
    recordId: string,
    updateData: MaintenanceRecordUpdate
  ): Promise<MaintenanceRecord | null> {
    try {
      const response = await api.put<{ data: MaintenanceRecord }>(`/maintenance/records/${recordId}`, updateData);
      return response.data || null;
    } catch (error) {
      console.error('정비 기록 업데이트 실패:', error);
      return null;
    }
  },

  /**
   * 정비 기록 삭제
   * @param recordId 정비 기록 ID
   * @returns 성공 여부
   */
  async deleteMaintenanceRecord(recordId: string): Promise<boolean> {
    try {
      await api.delete(`/maintenance/records/${recordId}`);
      return true;
    } catch (error) {
      console.error('정비 기록 삭제 실패:', error);
      return false;
    }
  },

  /**
   * 정비 기록에 문서 첨부
   * @param recordId 정비 기록 ID
   * @param file 업로드할 파일
   * @returns 첨부된 문서 정보
   */
  async attachDocument(recordId: string, file: File): Promise<any> {
    try {
      return await api.upload(`/maintenance/records/${recordId}/documents`, file);
    } catch (error) {
      console.error('문서 첨부 실패:', error);
      return null;
    }
  },

  /**
   * 정비 기록에서 문서 제거
   * @param recordId 정비 기록 ID
   * @param documentId 문서 ID
   * @returns 성공 여부
   */
  async removeDocument(recordId: string, documentId: string): Promise<boolean> {
    try {
      await api.delete(`/maintenance/records/${recordId}/documents/${documentId}`);
      return true;
    } catch (error) {
      console.error('문서 제거 실패:', error);
      return false;
    }
  },

  /**
   * 예정된 정비 일정 조회
   * @param days 앞으로의 일수 (기본값: 30일)
   * @returns 예정된 정비 목록
   */
  async getUpcomingMaintenance(days: number = 30): Promise<any[]> {
    try {
      const response = await api.get<{ data: any[] }>('/maintenance/records/upcoming', { days });
      return response.data || [];
    } catch (error) {
      console.error('예정된 정비 조회 실패:', error);
      return [];
    }
  },

  /**
   * 특정 차량에 권장되는 정비 항목 조회
   * @param vehicleId 차량 ID
   * @returns 권장 정비 항목 목록
   */
  async getRecommendedMaintenance(vehicleId: string): Promise<any[]> {
    try {
      const response = await api.get<{ data: any[] }>(`/maintenance/vehicles/${vehicleId}/recommended-maintenance`);
      return response.data || [];
    } catch (error) {
      console.error('권장 정비 조회 실패:', error);
      return [];
    }
  },

  /**
   * 정비 통계 조회
   * @param startDate 시작일
   * @param endDate 종료일
   * @returns 정비 통계 정보
   */
  async getMaintenanceStats(
    startDate?: string,
    endDate?: string
  ): Promise<MaintenanceStats | null> {
    try {
      const response = await api.get<{ data: MaintenanceStats }>('/maintenance/statistics', {
        startDate,
        endDate
      });
      return response.data || null;
    } catch (error) {
      console.error('정비 통계 조회 실패:', error);
      return null;
    }
  }
};
