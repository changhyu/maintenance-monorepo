/**
 * 데이터 내보내기 유틸리티 함수들
 */

import FileSaver from 'file-saver';
import jsPDF from 'jspdf';
// XLSX 라이브러리를 ExcelJS로 교체
import ExcelJS from 'exceljs';

import 'jspdf-autotable';
import logger from './logger';
import * as indexedDBUtils from './indexedDBUtils';

// 내보내기 형식 정의
export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

/**
 * 객체 배열을 CSV 문자열로 변환
 */
export const convertToCSV = (data: any[]): string => {
  if (!data || !data.length) {
    return '';
  }

  // 헤더 추출
  const headers = Object.keys(data[0]);

  // 헤더 행 생성
  const headerRow = headers.join(',');

  // 데이터 행 생성
  const rows = data.map(obj => {
    return headers
      .map(header => {
        const value = obj[header] === null || obj[header] === undefined ? '' : obj[header];
        // 문자열이고 쉼표나 쌍따옴표를 포함하면 쌍따옴표로 감싸고 내부 쌍따옴표는 두 번 반복
        if (typeof value === 'string') {
          if (value.includes(',') || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }
        return value;
      })
      .join(',');
  });

  // 헤더와 행 결합
  return [headerRow, ...rows].join('\n');
};

/**
 * CSV 데이터를 파일로 다운로드
 */
export const downloadCSV = (data: any[], filename: string = 'export'): void => {
  const csvContent = convertToCSV(data);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
};

/**
 * 객체 배열을 Excel용 XML 문자열로 변환 (간단한 구현)
 */
export const convertToExcelXML = (data: any[]): string => {
  if (!data || !data.length) {
    return '';
  }

  // 헤더 추출
  const headers = Object.keys(data[0]);

  // XML 헤더
  let xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
  xml +=
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
  xml += '<Worksheet ss:Name="Sheet1"><Table>';

  // 헤더 행 추가
  xml += '<Row>';
  headers.forEach(header => {
    xml += `<Cell><Data ss:Type="String">${header}</Data></Cell>`;
  });
  xml += '</Row>';

  // 데이터 행 추가
  data.forEach(obj => {
    xml += '<Row>';
    headers.forEach(header => {
      const value = obj[header] === null || obj[header] === undefined ? '' : obj[header];
      const type = typeof value === 'number' ? 'Number' : 'String';
      xml += `<Cell><Data ss:Type="${type}">${value}</Data></Cell>`;
    });
    xml += '</Row>';
  });

  // XML 닫기
  xml += '</Table></Worksheet></Workbook>';

  return xml;
};

/**
 * Excel 데이터를 파일로 다운로드
 * 참고: 실제 Excel 내보내기는 일반적으로 라이브러리(예: xlsx, exceljs)를 사용합니다.
 * 이 함수는 간단한 XML 기반 Excel 형식으로 내보냅니다.
 */
export const downloadExcel = (data: any[], filename: string = 'export'): void => {
  const excelContent = convertToExcelXML(data);
  const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, `${filename}.xml`);
};

/**
 * 데이터를 PDF 형식으로 내보내는 함수
 * @param data 내보낼 데이터 (객체 배열)
 * @param filename 파일 이름
 */
const exportToPdf = (data: any[], filename: string): void => {
  if (data.length === 0) return;

  try {
    const doc = new jsPDF();

    // 컬럼 헤더 추출
    const headers = Object.keys(data[0]);

    // 데이터 행 생성
    const rows = data.map(item => headers.map(key => item[key]?.toString() || ''));

    // jspdf-autotable 사용
    (doc as any).autoTable({
      head: [headers],
      body: rows,
      startY: 20,
      margin: { top: 20 },
      styles: { overflow: 'linebreak' },
      headStyles: { fillColor: [41, 128, 185] }
    });

    // 제목 추가
    doc.setFontSize(16);
    doc.text(filename, 14, 15);

    // PDF 저장
    doc.save(`${filename}.pdf`);
    logger.info(`PDF 내보내기 완료: ${filename}.pdf`);
  } catch (error) {
    logger.error('PDF 내보내기 중 오류가 발생했습니다.', error);
  }
};

/**
 * JSON 데이터를 파일로 다운로드
 */
export const downloadJSON = (data: any[], filename: string = 'export'): void => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
};

/**
 * Blob 객체를 파일로 다운로드
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * 데이터를 지정된 형식으로 내보내는 함수
 * @param data 내보낼 데이터 (객체 배열)
 * @param filename 파일 이름 (확장자 제외)
 * @param format 내보내기 형식 (csv, excel, pdf, json)
 */
export const exportData = (data: any[], filename: string, format: ExportFormat): void => {
  if (!data || data.length === 0) {
    logger.error('내보낼 데이터가 없습니다.');
    return;
  }

  // 파일명에서 확장자 제거
  const baseFilename = filename.replace(/\.(csv|xlsx|pdf|json)$/, '');

  switch (format) {
    case 'csv':
      exportToCsv(data, baseFilename);
      break;
    case 'excel':
      exportToExcel(data, baseFilename);
      break;
    case 'pdf':
      exportToPdf(data, baseFilename);
      break;
    case 'json':
      exportToJson(data, baseFilename);
      break;
    default:
      logger.error('지원되지 않는 내보내기 형식입니다.');
  }
};

/**
 * 데이터를 CSV 형식으로 내보내는 함수
 * @param data 내보낼 데이터 (객체 배열)
 * @param filename 파일 이름
 */
const exportToCsv = (data: any[], filename: string): void => {
  const csvContent = convertArrayToCsv(data);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  FileSaver.saveAs(blob, `${filename}.csv`);
};

/**
 * 데이터를 Excel 형식으로 내보내는 함수 (ExcelJS 사용)
 * @param data 내보낼 데이터 (객체 배열)
 * @param filename 파일 이름
 */
const exportToExcel = async (data: any[], filename: string): Promise<void> => {
  try {
    // 새 워크북 생성
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '차량 관리 시스템';
    workbook.lastModifiedBy = '차량 관리 시스템';
    workbook.created = new Date();
    workbook.modified = new Date();

    // 워크시트 생성
    const worksheet = workbook.addWorksheet('Sheet1');

    if (data.length > 0) {
      // 헤더 추가
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      // 헤더 스타일 지정
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
      };
      headerRow.font = {
        name: 'Arial',
        size: 12,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };

      // 데이터 행 추가
      data.forEach(item => {
        worksheet.addRow(Object.values(item));
      });

      // 컬럼 너비 설정
      worksheet.columns.forEach((column) => {
        column.width = 15;
      });
    }

    // 엑셀 파일 생성 및 저장
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    FileSaver.saveAs(blob, `${filename}.xlsx`);
    logger.info(`Excel 내보내기 완료: ${filename}.xlsx`);
  } catch (error) {
    logger.error('Excel 내보내기 중 오류 발생:', error);
    throw error;
  }
};

/**
 * 데이터를 JSON 형식으로 내보내는 함수
 * @param data 내보낼 데이터 (객체 배열)
 * @param filename 파일 이름
 */
const exportToJson = (data: any[], filename: string): void => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  FileSaver.saveAs(blob, `${filename}.json`);
  logger.info(`JSON 내보내기 완료: ${filename}.json`);
};

/**
 * 객체 배열을 CSV 문자열로 변환하는 함수
 * @param data 변환할 데이터 (객체 배열)
 * @returns CSV 문자열
 */
const convertArrayToCsv = (data: any[]): string => {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);

  // 헤더 행
  let csvContent = headers.map(header => `"${header.replace(/"/g, '""')}"`).join(',') + '\n';

  // 데이터 행
  data.forEach(item => {
    const row = headers
      .map(header => {
        const cell = item[header] === null || item[header] === undefined ? '' : item[header];
        // 문자열이면 따옴표로 감싸고 내부 따옴표는 이스케이프
        if (typeof cell === 'string') {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      })
      .join(',');

    csvContent += row + '\n';
  });

  return csvContent;
};

/**
 * IndexedDB 데이터를 내보내기 위한 인터페이스
 */
export interface ExportIndexedDBOptions {
  storeName: string;
  filename?: string;
  format?: ExportFormat;
}

/**
 * IndexedDB 저장소의 모든 데이터를 파일로 내보내는 함수
 * @param options 내보내기 옵션 (저장소 이름, 파일명, 포맷)
 * @returns Promise<boolean> 성공 여부
 */
export const exportIndexedDBStore = async (options: ExportIndexedDBOptions): Promise<boolean> => {
  const { storeName, filename = storeName, format = 'json' } = options;
  
  try {
    logger.info(`${storeName} 저장소 데이터 내보내기 시작...`);
    
    // IndexedDB에서 데이터 가져오기
    const data = await indexedDBUtils.getAllData(storeName);
    
    if (!data || data.length === 0) {
      logger.warn(`${storeName} 저장소에 내보낼 데이터가 없습니다.`);
      return false;
    }
    
    // 데이터 내보내기
    exportData(data, `${filename}_${new Date().toISOString().split('T')[0]}`, format);
    
    logger.info(`${storeName} 저장소 데이터 내보내기 완료 (${data.length}개 항목)`);
    return true;
  } catch (error) {
    logger.error(`${storeName} 저장소 데이터 내보내기 실패:`, error);
    return false;
  }
};

/**
 * 오프라인 캐시된 Todo 데이터를 내보내는 함수
 * @param format 내보내기 형식 (csv, excel, pdf, json)
 * @returns Promise<boolean> 성공 여부
 */
export const exportCachedTodos = async (format: ExportFormat = 'json'): Promise<boolean> => {
  return exportIndexedDBStore({
    storeName: indexedDBUtils.STORES.TODOS,
    filename: 'todos_offline_cache',
    format
  });
};

/**
 * 오프라인 캐시된 차량 데이터를 내보내는 함수
 * @param format 내보내기 형식 (csv, excel, pdf, json)
 * @returns Promise<boolean> 성공 여부
 */
export const exportCachedVehicles = async (format: ExportFormat = 'json'): Promise<boolean> => {
  return exportIndexedDBStore({
    storeName: indexedDBUtils.STORES.VEHICLES,
    filename: 'vehicles_offline_cache',
    format
  });
};

/**
 * 모든 오프라인 캐시 데이터를 하나의 파일로 내보내는 함수
 * @param format 내보내기 형식 (csv, excel, pdf, json)
 * @returns Promise<boolean> 성공 여부
 */
export const exportAllOfflineData = async (format: ExportFormat = 'json'): Promise<boolean> => {
  try {
    logger.info('모든 오프라인 데이터 내보내기 시작...');
    
    // 진단 정보 가져오기
    const diagnostics = await indexedDBUtils.getDiagnostics();
    
    // 모든 데이터 저장소 수집
    const allData: any = {};
    
    for (const storeName of Object.values(indexedDBUtils.STORES)) {
      try {
        const storeData = await indexedDBUtils.getAllData(storeName);
        allData[storeName] = storeData;
      } catch (error) {
        logger.error(`${storeName} 데이터 로드 실패:`, error);
        allData[storeName] = { error: '데이터 로드 실패' };
      }
    }
    
    // 진단 정보 추가
    allData._diagnostics = diagnostics;
    allData._exportedAt = new Date().toISOString();
    
    // 데이터 구조에 따라 내보내기 방식 결정
    if (format === 'json') {
      const jsonContent = JSON.stringify(allData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const timestamp = new Date().toISOString().split('T')[0];
      FileSaver.saveAs(blob, `vehicle_maintenance_offline_data_${timestamp}.json`);
    } else {
      // JSON이 아닌 형식으로 내보내기 위해 데이터 구조 평탄화 필요
      const flattenedData: any[] = [];
      
      // 각 저장소의 데이터를 플랫한 구조로 변환
      for (const [storeName, storeData] of Object.entries(allData)) {
        if (Array.isArray(storeData)) {
          storeData.forEach(item => {
            flattenedData.push({
              store: storeName,
              ...item
            });
          });
        }
      }
      
      // 평탄화된 데이터 내보내기
      const timestamp = new Date().toISOString().split('T')[0];
      exportData(
        flattenedData, 
        `vehicle_maintenance_offline_data_${timestamp}`, 
        format
      );
    }
    
    logger.info('모든 오프라인 데이터 내보내기 완료');
    return true;
  } catch (error) {
    logger.error('오프라인 데이터 내보내기 실패:', error);
    return false;
  }
};