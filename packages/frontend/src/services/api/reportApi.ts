import axios from 'axios';
import { Report, ReportFormat, ExportOptions } from '../reportService';

/**
 * 보고서 API 클래스
 * 보고서 관련 백엔드 API 요청을 처리하는 메서드 제공
 */
export class ReportApi {
  private apiUrl = '/api/reports';

  /**
   * 보고서 목록 조회
   * @param filter 필터 조건
   * @returns 보고서 목록
   */
  async getReports(filter?: {
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Report[]> {
    try {
      const response = await axios.get(this.apiUrl, { params: filter });
      return response.data;
    } catch (error) {
      console.error('보고서 목록 조회 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 보고서 상세 조회
   * @param reportId 보고서 ID
   * @returns 보고서 상세 정보
   */
  async getReport(reportId: string): Promise<Report> {
    try {
      const response = await axios.get(`${this.apiUrl}/${reportId}`);
      return response.data;
    } catch (error) {
      console.error('보고서 상세 조회 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 보고서 생성
   * @param reportData 보고서 데이터
   * @returns 생성된 보고서
   */
  async createReport(reportData: Omit<Report, 'id' | 'createdAt'>): Promise<Report> {
    try {
      const response = await axios.post(this.apiUrl, reportData);
      return response.data;
    } catch (error) {
      console.error('보고서 생성 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 보고서 내보내기
   * @param reportId 보고서 ID
   * @param options 내보내기 옵션
   * @returns PDF Blob 데이터
   */
  async exportReport(reportId: string, options: ExportOptions): Promise<Blob> {
    try {
      const response = await axios.post(`${this.apiUrl}/export/${reportId}`, options, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('보고서 내보내기 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 여러 보고서 내보내기
   * @param reportIds 보고서 ID 목록
   * @param options 내보내기 옵션
   * @returns Blob 데이터
   */
  async exportMultipleReports(reportIds: string[], options: ExportOptions): Promise<Blob> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/export-multiple`,
        { reportIds, options },
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      console.error('다중 보고서 내보내기 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 보고서 미리보기
   * @param reportId 보고서 ID
   * @param options 내보내기 옵션
   * @returns 미리보기 PDF Blob
   */
  async previewReport(reportId: string, options: ExportOptions): Promise<Blob> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/preview/${reportId}`,
        { ...options, preview: true },
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      console.error('보고서 미리보기 생성 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 템플릿 기반 보고서 미리보기
   * @param templateData 템플릿 정보
   * @param data 데이터
   * @param options 내보내기 옵션
   * @returns 미리보기 PDF Blob
   */
  async previewTemplateReport(
    templateData: {
      id: string;
      name: string;
      type: string;
      fields: string[];
      [key: string]: any;
    },
    data: any[],
    options: ExportOptions
  ): Promise<Blob> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/preview-template`,
        {
          template: templateData,
          data,
          options: { ...options, preview: true }
        },
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      console.error('템플릿 기반 보고서 미리보기 생성 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 보고서 삭제
   * @param reportId 삭제할 보고서 ID
   */
  async deleteReport(reportId: string): Promise<void> {
    try {
      await axios.delete(`${this.apiUrl}/${reportId}`);
    } catch (error) {
      console.error('보고서 삭제 중 오류 발생:', error);
      throw error;
    }
  }
}

// API 인스턴스 생성
export const reportApi = new ReportApi();

export default reportApi; 