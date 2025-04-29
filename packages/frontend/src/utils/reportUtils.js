import { saveAs } from 'file-saver';
// Replace xlsx with ExcelJS
import ExcelJS from 'exceljs';
import { ReportFormat } from '../services/reportService';
/**
 * 데이터를 CSV 형식으로 변환
 * @param data 변환할 데이터 배열
 * @param columns 열 설정
 */
export const convertToCSV = (data, columns) => {
    if (!data || !data.length)
        return '';
    // 헤더 행 생성
    const header = columns.map(col => `"${col.title}"`).join(',');
    // 데이터 행 생성
    const rows = data.map(item => {
        return columns
            .map(col => {
            const value = item[col.key];
            // 따옴표가 포함된 문자열은 이스케이프 처리
            if (typeof value === 'string') {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return `"${value}"`;
        })
            .join(',');
    });
    // 헤더와 데이터 행 결합
    return [header, ...rows].join('\n');
};
/**
 * 데이터를 Excel 형식으로 변환
 * @param data 변환할 데이터 배열
 * @param columns 열 설정
 * @param sheetName 시트 이름
 */
export const convertToExcel = async (data, columns, sheetName = 'Sheet1') => {
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);
    
    // 헤더 행 생성
    const headers = columns.map(col => col.title);
    worksheet.addRow(headers);
    
    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    
    // 데이터 행 추가
    data.forEach(item => {
        const rowData = columns.map(col => item[col.key]);
        worksheet.addRow(rowData);
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = maxLength + 2;
    });
    
    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Return as blob
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};
/**
 * 보고서 데이터를 지정된 형식으로 내보내기
 * @param report 보고서 데이터
 * @param options 내보내기 옵션
 */
export const exportReportData = (report, options) => {
    // 테이블 데이터 및 열 정보 추출
    const { data, columns } = extractTableData(report);
    // 형식에 따라 적절한 변환 함수 호출
    switch (options.format) {
        case ReportFormat.CSV:
            return convertToCSV(data, columns);
        case ReportFormat.EXCEL:
            return convertToExcel(data, columns, report.title);
        case ReportFormat.JSON:
            return JSON.stringify(report.data, null, 2);
        default:
            throw new Error(`Unsupported export format: ${options.format}`);
    }
};
/**
 * 보고서 유형에 따라 테이블 데이터와 열 정보 추출
 * @param report 보고서 데이터
 */
export const extractTableData = (report) => {
    switch (report.type) {
        case 'completion_rate':
            return {
                data: report.data.trend || [],
                columns: [
                    { key: 'date', title: '날짜' },
                    { key: 'completionRate', title: '완료율 (%)' }
                ]
            };
        case 'vehicle_history':
            return {
                data: report.data.maintenanceHistory || [],
                columns: [
                    { key: 'date', title: '날짜' },
                    { key: 'type', title: '유형' },
                    { key: 'description', title: '설명' },
                    { key: 'cost', title: '비용 (원)' },
                    { key: 'technicianName', title: '정비사' },
                    { key: 'status', title: '상태' }
                ]
            };
        case 'cost_analysis':
            return {
                data: report.data.vehicleCostComparison || [],
                columns: [
                    { key: 'vehicleId', title: '차량 ID' },
                    { key: 'vehicleName', title: '차량명' },
                    { key: 'totalCost', title: '총 비용 (원)' }
                ]
            };
        case 'maintenance_summary':
            return {
                data: report.data.byType || [],
                columns: [
                    { key: 'type', title: '정비 유형' },
                    { key: 'count', title: '건수' },
                    { key: 'percentage', title: '비율 (%)' }
                ]
            };
        case 'maintenance_forecast':
            return {
                data: report.data.upcoming || [],
                columns: [
                    { key: 'vehicleId', title: '차량 ID' },
                    { key: 'vehicleName', title: '차량명' },
                    { key: 'maintenanceType', title: '정비 유형' },
                    { key: 'estimatedDate', title: '예상 일자' },
                    { key: 'confidence', title: '신뢰도 (%)' }
                ]
            };
        case 'vehicle_utilization':
            return {
                data: report.data?.utilizationData || [],
                columns: [
                    { key: 'vehicleId', title: '차량 ID' },
                    { key: 'vehicleName', title: '차량명' },
                    { key: 'totalDistance', title: '총 주행거리 (km)' },
                    { key: 'utilizationRate', title: '활용률 (%)' },
                    { key: 'operationHours', title: '운행 시간' },
                    { key: 'fuelEfficiency', title: '연비 (km/L)' }
                ]
            };
        case 'maintenance_completion_rate':
            return {
                data: report.data?.completionByVehicle || [],
                columns: [
                    { key: 'vehicleId', title: '차량 ID' },
                    { key: 'vehicleName', title: '차량명' },
                    { key: 'totalTasks', title: '총 정비 건수' },
                    { key: 'completedTasks', title: '완료 건수' },
                    { key: 'completionRate', title: '완료율 (%)' },
                    { key: 'averageCompletionTime', title: '평균 완료 시간 (일)' }
                ]
            };
        case 'predictive_maintenance':
            return {
                data: report.data?.predictions || [],
                columns: [
                    { key: 'vehicleId', title: '차량 ID' },
                    { key: 'vehicleName', title: '차량명' },
                    { key: 'component', title: '부품명' },
                    { key: 'failureProbability', title: '고장 확률 (%)' },
                    { key: 'estimatedReplaceDate', title: '예상 교체 일자' },
                    { key: 'recommendedAction', title: '권장 조치' }
                ]
            };
        case 'parts_usage':
            return {
                data: report.data?.partsUsage || [],
                columns: [
                    { key: 'partId', title: '부품 ID' },
                    { key: 'partName', title: '부품명' },
                    { key: 'usageCount', title: '사용 횟수' },
                    { key: 'totalCost', title: '총 비용 (원)' },
                    { key: 'averageCostPerUse', title: '건당 평균 비용 (원)' },
                    { key: 'mostUsedVehicle', title: '가장 많이 사용된 차량' }
                ]
            };
        default:
            return { data: [], columns: [] };
    }
};
/**
 * 파일 다운로드
 * @param data 파일 데이터
 * @param fileName 파일 이름
 * @param format 파일 형식
 */
export const downloadFile = (data, fileName, format) => {
    let blob;
    let fileExtension;
    // 형식에 따라 MIME 타입 및 파일 확장자 설정
    switch (format) {
        case ReportFormat.PDF:
            blob = data;
            fileExtension = 'pdf';
            break;
        case ReportFormat.EXCEL:
            blob = data;
            fileExtension = 'xlsx';
            break;
        case ReportFormat.CSV:
            blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
            fileExtension = 'csv';
            break;
        case ReportFormat.JSON:
            blob = new Blob([data], { type: 'application/json;charset=utf-8;' });
            fileExtension = 'json';
            break;
        default:
            throw new Error(`Unsupported download format: ${format}`);
    }
    // 파일 저장
    saveAs(blob, `${fileName}.${fileExtension}`);
};
/**
 * 날짜를 문자열로 포맷팅
 * @param date 날짜 객체 또는 문자열
 * @param formatString 포맷 문자열 (기본값: yyyy-MM-dd)
 */
export const formatDate = (date, formatString = 'yyyy-MM-dd') => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    // 간단한 포맷팅 (date-fns 없이)
    if (formatString === 'yyyy-MM-dd') {
        return `${year}-${month}-${day}`;
    }
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    if (formatString === 'yyyy-MM-dd HH:mm') {
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    return `${year}-${month}-${day}`;
};
/**
 * 숫자를 통화 형식으로 포맷팅
 * @param value 숫자 값
 * @param locale 로케일 (기본값: ko-KR)
 * @param currency 통화 유형 (기본값: KRW)
 */
export const formatCurrency = (value, locale = 'ko-KR', currency = 'KRW') => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};
/**
 * 퍼센트 값 포맷팅
 * @param value 숫자 값 (0-1 또는 0-100)
 * @param decimals 소수점 자릿수
 */
export const formatPercent = (value, decimals = 1) => {
    // 값이 0-1 범위인 경우 100을 곱해서 퍼센트로 변환
    const percentValue = value > 1 ? value : value * 100;
    return `${percentValue.toFixed(decimals)}%`;
};
