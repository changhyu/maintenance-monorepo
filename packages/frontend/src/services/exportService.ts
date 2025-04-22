import axios from 'axios';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import FileSaver from 'file-saver';
import { format } from 'date-fns';
import logger from '../utils/logger';

import { Report, ReportFormat, ExportOptions } from './reportService';
import { reportApi } from './api/reportApi';
import { 
  convertToCSV, 
  extractTableData,
  downloadFile 
} from '../utils/reportUtils';
import * as indexedDBUtils from '../utils/indexedDBUtils';
import { ReportData, ReportRow } from '../types/reports';

/**
 * 내보내기 서비스 클래스
 * 보고서 및 기타 데이터를 다양한 형식으로 내보내는 기능 제공
 */
export class ExportService {
  private apiUrl = '/api/exports';

  /**
   * 보고서 데이터를 내보내고 다운로드
   * @param report 내보낼 보고서 데이터
   * @param options 내보내기 옵션
   */
  async exportReport(report: Report, options: ExportOptions): Promise<void> {
    try {
      // PDF 형식은 서버에서 생성
      if (options.format === ReportFormat.PDF) {
        await this.exportReportToPDF(report.id, options);
        return;
      }

      // 다른 형식은 클라이언트에서 처리
      const exportData = this.processReportData(report, options);
      downloadFile(exportData, `${report.title}_${new Date().toISOString().split('T')[0]}`, options.format);
    } catch (error) {
      console.error('보고서 내보내기 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 클라이언트 측에서 보고서 데이터 처리
   * @param report 보고서 데이터
   * @param options 내보내기 옵션
   */
  private processReportData(report: Report, options: ExportOptions): Blob | string {
    const { data, columns } = extractTableData(report);

    switch (options.format) {
      case ReportFormat.CSV:
        return convertToCSV(data, columns);
      case ReportFormat.EXCEL:
        return this.convertToExcel(data, columns, report.title);
      case ReportFormat.JSON:
        return JSON.stringify({
          title: report.title,
          generatedAt: report.createdAt,
          type: report.type,
          data: report.data
        }, null, 2);
      default:
        throw new Error(`지원하지 않는 내보내기 형식: ${options.format}`);
    }
  }

  /**
   * PDF 형식으로 보고서 내보내기 (서버 API 호출)
   * @param reportId 보고서 ID
   * @param options 내보내기 옵션
   */
  private async exportReportToPDF(reportId: string, options: ExportOptions): Promise<void> {
    try {
      const response = await axios.post(`/api/reports/export/${reportId}`, options, {
        responseType: 'blob'
      });
      
      // 파일 다운로드
      const fileName = `report_${reportId}_${new Date().toISOString().split('T')[0]}`;
      saveAs(response.data, `${fileName}.pdf`);
    } catch (error) {
      console.error('PDF 내보내기 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 차량 정비 기록을 CSV로 내보내기
   * @param vehicleId 차량 ID
   * @param startDate 시작 날짜
   * @param endDate 종료 날짜
   */
  async exportVehicleMaintenanceHistory(
    vehicleId: string,
    startDate?: string,
    endDate?: string
  ): Promise<void> {
    try {
      // 정비 기록 데이터 가져오기
      const params = { startDate, endDate };
      const response = await axios.get(`/api/vehicles/${vehicleId}/maintenance-history`, { params });
      
      const fileName = `vehicle_${vehicleId}_maintenance_history`;
      const columns = [
        { key: 'date', title: '날짜' },
        { key: 'type', title: '유형' },
        { key: 'description', title: '설명' },
        { key: 'cost', title: '비용' },
        { key: 'technicianName', title: '정비사' },
        { key: 'status', title: '상태' }
      ];
      
      // CSV로 변환 및 다운로드
      const csvData = convertToCSV(response.data, columns);
      downloadFile(csvData, fileName, ReportFormat.CSV);
    } catch (error) {
      console.error('차량 정비 기록 내보내기 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 차량 목록을 Excel로 내보내기
   * @param filters 필터 조건
   */
  async exportVehicleList(filters?: Record<string, any>): Promise<void> {
    try {
      // 차량 목록 데이터 가져오기
      const response = await axios.get('/api/vehicles', { params: filters });
      
      const fileName = `vehicle_list_${new Date().toISOString().split('T')[0]}`;
      const columns = [
        { key: 'id', title: '차량 ID' },
        { key: 'name', title: '차량명' },
        { key: 'model', title: '모델' },
        { key: 'year', title: '연식' },
        { key: 'mileage', title: '주행거리' },
        { key: 'status', title: '상태' },
        { key: 'lastMaintenanceDate', title: '최근 정비일' }
      ];
      
      // Excel로 변환 및 다운로드
      const excelData = await this.convertToExcel(response.data, columns, '차량 목록');
      downloadFile(excelData, fileName, ReportFormat.EXCEL);
    } catch (error) {
      console.error('차량 목록 내보내기 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 여러 보고서를 한 번에 내보내기 (서버 API 호출)
   * @param reports 내보낼 보고서 목록
   * @param options 내보내기 옵션
   */
  async exportMultipleReports(reports: Report[], options: ExportOptions): Promise<void> {
    try {
      if (!reports || reports.length === 0) {
        throw new Error('내보낼 보고서가 없습니다');
      }

      const reportIds = reports.map(r => r.id);
      const exportDate = new Date().toISOString().split('T')[0];
      const fileName = `reports_export_${exportDate}`;

      // 서버 API를 통해 여러 보고서를 내보내기
      const response = await axios.post(
        `/api/reports/export-multiple`, 
        { reportIds, options },
        { responseType: 'blob' }
      );
      
      // 파일 다운로드
      let fileExtension = '';
      switch (options.format) {
        case ReportFormat.PDF:
          fileExtension = 'pdf';
          break;
        case ReportFormat.EXCEL:
          fileExtension = 'xlsx';
          break;
        case ReportFormat.CSV:
          fileExtension = 'csv';
          break;
        case ReportFormat.JSON:
          fileExtension = 'json';
          break;
        default:
          fileExtension = 'zip';
      }
      
      // 보고서가 하나인 경우 개별 파일로, 여러 개인 경우 ZIP 파일로 다운로드
      const finalFileName = reports.length === 1 
        ? `${reports[0].title}.${fileExtension}`
        : `${fileName}.zip`;
        
      saveAs(response.data, finalFileName);
    } catch (error) {
      console.error('다중 보고서 내보내기 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 템플릿 기반으로 보고서 생성 및 내보내기
   * @param data 원본 데이터
   * @param template 보고서 템플릿
   * @param options 내보내기 옵션
   */
  async exportTemplateReport(
    data: any[],
    template: {
      id: string;
      name: string;
      type: string;
      fields: string[];
      paperSize?: string;
      orientation?: string;
      includeCharts?: boolean;
    },
    options: ExportOptions
  ): Promise<void> {
    try {
      if (!data || data.length === 0) {
        throw new Error('내보낼 데이터가 없습니다');
      }

      // 데이터를 템플릿 필드로 필터링
      const filteredData = data.map(item => {
        const result: Record<string, any> = {};
        template.fields.forEach(field => {
          if (item[field] !== undefined) {
            result[field] = item[field];
          }
        });
        return result;
      });

      // 보고서 객체 생성
      const report: Report = {
        id: `template_${template.id}_${Date.now()}`,
        title: template.name,
        type: template.type as any,
        createdAt: new Date().toISOString(),
        data: filteredData
      };

      // 내보내기 옵션 업데이트
      const updatedOptions: ExportOptions = {
        ...options,
        paperSize: template.paperSize as any || options.paperSize,
        landscape: template.orientation === 'landscape' || options.landscape,
        includeCharts: template.includeCharts || options.includeCharts
      };

      // 보고서 내보내기
      await this.exportReport(report, updatedOptions);
    } catch (error) {
      console.error('템플릿 기반 보고서 내보내기 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 보고서 미리보기 생성
   * @param report 미리볼 보고서 데이터
   * @param options 내보내기 옵션
   * @returns 미리보기 URL 또는 Blob
   */
  async previewReport(report: Report, options: ExportOptions): Promise<Blob> {
    try {
      if (options.format !== ReportFormat.PDF) {
        throw new Error('미리보기는 PDF 형식만 지원합니다.');
      }

      // reportApi를 사용하여 미리보기 요청
      return await reportApi.previewReport(report.id, options);
    } catch (error) {
      console.error('보고서 미리보기 생성 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 템플릿과 데이터로 보고서 미리보기 생성
   * @param data 원본 데이터
   * @param template 보고서 템플릿
   * @param options 내보내기 옵션
   * @returns 미리보기 URL 또는 Blob
   */
  async previewTemplateReport(
    data: any[],
    template: {
      id: string;
      name: string;
      type: string;
      fields: string[];
      paperSize?: string;
      orientation?: string;
      includeCharts?: boolean;
    },
    options: ExportOptions
  ): Promise<Blob> {
    try {
      if (!data || data.length === 0) {
        throw new Error('미리볼 데이터가 없습니다');
      }

      if (options.format !== ReportFormat.PDF) {
        throw new Error('미리보기는 PDF 형식만 지원합니다.');
      }

      // reportApi를 사용하여 미리보기 요청
      return await reportApi.previewTemplateReport(template, data, options);
    } catch (error) {
      console.error('템플릿 기반 보고서 미리보기 생성 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 보고서 데이터를 IndexedDB에 저장
   * @param reportData 저장할 보고서 데이터
   * @returns Promise<string> 저장된 보고서의 ID
   */
  async saveReportToIndexedDB(reportData: any): Promise<string> {
    try {
      // 보고서를 저장할 저장소 이름
      const storeName = indexedDBUtils.STORES.REPORTS;
      
      // IndexedDB에 저장
      const reportId = await indexedDBUtils.saveData(storeName, reportData);
      console.log(`보고서가 IndexedDB에 저장되었습니다. ID: ${reportId}`);
      
      return reportId;
    } catch (error) {
      console.error('보고서 IndexedDB 저장 중 오류 발생:', error);
      throw new Error(`보고서 데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * IndexedDB에서 저장된 보고서 목록 조회
   * @returns Promise<any[]> 보고서 목록
   */
  async getReportsFromIndexedDB(): Promise<any[]> {
    try {
      // 보고서를 저장한 저장소 이름
      const storeName = indexedDBUtils.STORES.REPORTS;
      
      // IndexedDB에서 보고서 목록 조회
      return await indexedDBUtils.getAllData(storeName);
    } catch (error) {
      console.error('IndexedDB에서 보고서 목록 조회 중 오류 발생:', error);
      return [];
    }
  }

  /**
   * IndexedDB에서 특정 보고서 삭제
   * @param reportId 삭제할 보고서 ID
   * @returns Promise<void>
   */
  async deleteReportFromIndexedDB(reportId: string): Promise<void> {
    try {
      // 보고서를 저장한 저장소 이름
      const storeName = indexedDBUtils.STORES.REPORTS;
      
      // IndexedDB에서 보고서 삭제
      await indexedDBUtils.deleteData(storeName, reportId);
      console.log(`보고서가 IndexedDB에서 삭제되었습니다. ID: ${reportId}`);
    } catch (error) {
      console.error('IndexedDB에서 보고서 삭제 중 오류 발생:', error);
      throw new Error(`보고서 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 보고서 데이터를 Excel 파일로 변환하여 다운로드
   * @param reportData 내보낼 보고서 데이터
   * @param filename 파일 이름 (확장자 제외)
   */
  public static async exportReportToExcel(reportData: ReportData, filename: string): Promise<void> {
    try {
      logger.info(`보고서 데이터를 Excel로 내보내기 시작: ${filename}`);
      
      // 새 워크북 생성
      const workbook = new ExcelJS.Workbook();
      workbook.creator = '차량 관리 시스템';
      workbook.lastModifiedBy = '차량 관리 시스템';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      // 워크시트 추가
      const worksheet = workbook.addWorksheet('보고서');
      
      // 헤더 설정
      const { headers, rows } = reportData;
      
      // 헤더 행 추가
      const headerRow = worksheet.addRow(headers.map(h => h.label));
      
      // 헤더 스타일 설정
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4B8BBE' } // 파란색 배경
      };
      
      // 데이터 행 추가
      rows.forEach((row: ReportRow) => {
        worksheet.addRow(headers.map(header => row[header.key] || ''));
      });
      
      // 컬럼 너비 자동 설정
      worksheet.columns.forEach((column, i) => {
        let maxLength = headers[i].label.length;
        rows.forEach((row: ReportRow) => {
          const value = row[headers[i].key];
          const cellLength = value ? String(value).length : 0;
          if (cellLength > maxLength) {
            maxLength = cellLength;
          }
        });
        
        // 최대 너비 설정 (최소 10, 최대 50)
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
      });
      
      // 테두리 스타일 적용
      for (let i = 1; i <= worksheet.rowCount; i++) {
        for (let j = 1; j <= worksheet.columnCount; j++) {
          worksheet.getCell(i, j).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
      }
      
      // 발행일 추가
      worksheet.addRow([]);
      worksheet.addRow([`발행일: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`]);
      
      // 엑셀 파일 생성 및 다운로드
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      FileSaver.saveAs(blob, `${filename}.xlsx`);
      logger.info(`보고서 Excel 내보내기 완료: ${filename}.xlsx`);
    } catch (error) {
      logger.error('Excel 내보내기 중 오류가 발생했습니다:', error);
      throw new Error('Excel 파일 생성 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 템플릿 기반 보고서 Excel 파일 생성
   * @param template 사용할 템플릿 (base64 인코딩된 문자열)
   * @param data 삽입할 데이터
   * @param filename 파일 이름 (확장자 제외)
   */
  public static async exportFromTemplate(
    template: string,
    data: Record<string, any>[],
    filename: string
  ): Promise<void> {
    try {
      logger.info('템플릿 기반 Excel 내보내기 시작');
      
      // base64 문자열을 ArrayBuffer로 변환
      const binary = atob(template.replace(/^data:.*?;base64,/, ''));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      // ArrayBuffer로 워크북 로드
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(bytes.buffer);
      
      // 첫 번째 워크시트 가져오기
      const worksheet = workbook.worksheets[0];
      
      // 시작 행 (헤더 이후)
      const startRow = 2;
      
      // 데이터 추가
      data.forEach((item, index) => {
        const rowIndex = startRow + index;
        
        // 행이 없으면 추가
        let row = worksheet.getRow(rowIndex);
        
        // 데이터 칼럼별로 입력
        Object.entries(item).forEach(([key, value], colIndex) => {
          row.getCell(colIndex + 1).value = value;
        });
      });
      
      // 엑셀 파일 생성 및 다운로드
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      FileSaver.saveAs(blob, `${filename}.xlsx`);
      logger.info(`템플릿 기반 Excel 내보내기 완료: ${filename}.xlsx`);
    } catch (error) {
      logger.error('템플릿 기반 Excel 내보내기 중 오류가 발생했습니다:', error);
      throw new Error('템플릿 기반 Excel 파일 생성 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 시트 여러 개로 구성된 통합 보고서 생성
   * @param sheetData 시트별 데이터
   * @param filename 파일 이름 (확장자 제외)
   */
  public static async exportMultipleSheetsToExcel(
    sheetData: { name: string; data: ReportData }[],
    filename: string
  ): Promise<void> {
    try {
      logger.info('다중 시트 Excel 내보내기 시작');
      
      // 새 워크북 생성
      const workbook = new ExcelJS.Workbook();
      workbook.creator = '차량 관리 시스템';
      workbook.lastModifiedBy = '차량 관리 시스템';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      // 각 시트 데이터를 워크시트로 추가
      sheetData.forEach(({ name, data }) => {
        const { headers, rows } = data;
        
        // 워크시트 추가
        const worksheet = workbook.addWorksheet(name);
        
        // 헤더 행 추가
        const headerRow = worksheet.addRow(headers.map(h => h.label));
        
        // 헤더 스타일 설정
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4B8BBE' }
        };
        
        // 데이터 행 추가
        rows.forEach((row: ReportRow) => {
          worksheet.addRow(headers.map(header => row[header.key] || ''));
        });
        
        // 컬럼 너비 자동 설정
        worksheet.columns.forEach((column, i) => {
          let maxLength = headers[i].label.length;
          rows.forEach((row: ReportRow) => {
            const value = row[headers[i].key];
            const cellLength = value ? String(value).length : 0;
            if (cellLength > maxLength) {
              maxLength = cellLength;
            }
          });
          
          // 최대 너비 설정 (최소 10, 최대 50)
          column.width = Math.min(Math.max(maxLength + 2, 10), 50);
        });
        
        // 테두리 스타일 적용
        for (let i = 1; i <= worksheet.rowCount; i++) {
          for (let j = 1; j <= worksheet.columnCount; j++) {
            worksheet.getCell(i, j).border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          }
        }
      });
      
      // 엑셀 파일 생성 및 다운로드
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      FileSaver.saveAs(blob, `${filename}.xlsx`);
      logger.info(`다중 시트 Excel 내보내기 완료: ${filename}.xlsx`);
    } catch (error) {
      logger.error('다중 시트 Excel 내보내기 중 오류가 발생했습니다:', error);
      throw new Error('다중 시트 Excel 파일 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * 데이터를 Excel 파일로 변환
   * @param data 데이터 배열
   * @param columns 컬럼 정의
   * @param title 파일 제목
   * @returns Blob
   */
  private async convertToExcel(data: any[], columns: any[], title: string): Promise<Blob> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

    // 헤더 추가
    const headerRow = worksheet.addRow(columns.map(col => col.title));
    headerRow.font = { bold: true };

    // 데이터 추가
    data.forEach(row => {
      worksheet.addRow(columns.map(col => row[col.key]));
    });

    // 컬럼 너비 자동 설정
    worksheet.columns.forEach((column, index) => {
      const maxLength = Math.max(
        ...data.map(row => (row[columns[index].key] || '').toString().length),
        columns[index].title.length
      );
      column.width = maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
}

// 내보내기 서비스 인스턴스 생성
export const exportService = new ExportService();

export default exportService;