/**
 * 데이터 내보내기 유틸리티 함수들
 */

import FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

import 'jspdf-autotable';
import logger from './logger';

// 내보내기 형식 정의
export type ExportFormat = 'csv' | 'excel' | 'pdf';

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
 * 데이터를 PDF로 변환하여 다운로드
 * 참고: 실제 PDF 생성은 일반적으로 라이브러리(예: jsPDF, pdfmake)를 사용합니다.
 * 이 함수는 PDF 변환 라이브러리 통합이 필요합니다.
 */
export const downloadPDF = (data: any[], filename: string = 'export'): void => {
  // PDF 생성 라이브러리를 사용한 구현이 필요합니다.
  // 예시로만 함수 구조를 제공합니다.
  console.log('PDF 내보내기가 라이브러리 통합 후 구현될 예정입니다.', data);
  alert('PDF 내보내기 준비 중입니다. 라이브러리가 추가되면 이용 가능합니다.');
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
 * @param format 내보내기 형식 (csv, excel, pdf)
 */
export const exportData = (data: any[], filename: string, format: ExportFormat): void => {
  if (!data || data.length === 0) {
    logger.error('내보낼 데이터가 없습니다.');
    return;
  }

  // 파일명에서 확장자 제거
  const baseFilename = filename.replace(/\.(csv|xlsx|pdf)$/, '');

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
 * 데이터를 Excel 형식으로 내보내는 함수
 * @param data 내보낼 데이터 (객체 배열)
 * @param filename 파일 이름
 */
const exportToExcel = (data: any[], filename: string): void => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  // Excel 파일 생성 및 다운로드
  XLSX.writeFile(workbook, `${filename}.xlsx`);
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
