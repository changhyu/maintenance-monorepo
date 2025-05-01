import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import XLSX from 'xlsx';

interface ExcelOptions {
  title: string;
  subtitle?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  orientation?: 'portrait' | 'landscape';
}

const defaultOptions: ExcelOptions = {
  title: '정비 예약 보고서',
  showHeader: true,
  showFooter: true,
  orientation: 'portrait',
};

export const generateExcel = async (
  data: any[],
  options: ExcelOptions = defaultOptions,
  groupBy?: string
) => {
  try {
    // 워크북 생성
    const wb = XLSX.utils.book_new();

    // 데이터 그룹화
    if (groupBy) {
      const grouped: { [key: string]: any[] } = {};
      data.forEach(item => {
        const key = item[groupBy] || '미분류';
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(item);
      });

      // 각 그룹별로 시트 생성
      Object.entries(grouped).forEach(([group, items]) => {
        const ws = XLSX.utils.json_to_sheet(items);
        XLSX.utils.book_append_sheet(wb, ws, group);
      });
    } else {
      // 단일 시트 생성
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, '보고서');
    }

    // 파일 저장
    const fileName = `report_${Date.now()}.xlsx`;
    const path = `${FileSystem.documentDirectory}${fileName}`;
    
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    await FileSystem.writeAsStringAsync(path, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return path;
  } catch (error) {
    throw new Error('Excel 생성 중 오류가 발생했습니다.');
  }
};

export const generateSummaryExcel = async (
  summary: any,
  options: ExcelOptions = { ...defaultOptions, title: '정비 예약 요약 보고서' }
) => {
  try {
    const wb = XLSX.utils.book_new();

    // 전체 통계 시트
    const summaryData = [
      ['통계 항목', '값'],
      ['총 예약 수', summary.총_예약_수],
      ['평균 소요시간', `${Math.round(summary.평균_소요시간)}분`],
      ['총 비용', `${summary.총_비용.toLocaleString()}원`],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, '전체 통계');

    // 상태별 통계 시트
    const statusData = [
      ['상태', '건수'],
      ...Object.entries(summary.상태별_통계).map(([key, value]) => [key, value]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(statusData);
    XLSX.utils.book_append_sheet(wb, ws2, '상태별 통계');

    // 서비스 유형별 통계 시트
    const serviceData = [
      ['서비스 유형', '건수'],
      ...Object.entries(summary.서비스_유형별_통계).map(([key, value]) => [key, value]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(serviceData);
    XLSX.utils.book_append_sheet(wb, ws3, '서비스 유형별 통계');

    // 우선순위별 통계 시트
    const priorityData = [
      ['우선순위', '건수'],
      ...Object.entries(summary.우선순위별_통계).map(([key, value]) => [key, value]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(priorityData);
    XLSX.utils.book_append_sheet(wb, ws4, '우선순위별 통계');

    // 파일 저장
    const fileName = `summary_report_${Date.now()}.xlsx`;
    const path = `${FileSystem.documentDirectory}${fileName}`;
    
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    await FileSystem.writeAsStringAsync(path, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return path;
  } catch (error) {
    throw new Error('Excel 생성 중 오류가 발생했습니다.');
  }
};

export const generateTechnicianExcel = async (
  report: any,
  options: ExcelOptions = { ...defaultOptions, title: '기술자 성과 보고서' }
) => {
  try {
    const wb = XLSX.utils.book_new();

    // 기술자 정보 시트
    const infoData = [
      ['항목', '값'],
      ['기술자 ID', report.기술자_ID],
      ['총 예약 수', report.총_예약_수],
      ['완료 예약 수', report.완료_예약_수],
      ['평균 소요시간', `${Math.round(report.평균_소요시간)}분`],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(infoData);
    XLSX.utils.book_append_sheet(wb, ws1, '기술자 정보');

    // 서비스 유형별 통계 시트
    const serviceData = [
      ['서비스 유형', '건수'],
      ...Object.entries(report.서비스_유형별_통계).map(([key, value]) => [key, value]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(serviceData);
    XLSX.utils.book_append_sheet(wb, ws2, '서비스 유형별 통계');

    // 예약 목록 시트
    const ws3 = XLSX.utils.json_to_sheet(report.예약_목록);
    XLSX.utils.book_append_sheet(wb, ws3, '예약 목록');

    // 파일 저장
    const fileName = `technician_report_${report.기술자_ID}_${Date.now()}.xlsx`;
    const path = `${FileSystem.documentDirectory}${fileName}`;
    
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    await FileSystem.writeAsStringAsync(path, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return path;
  } catch (error) {
    throw new Error('Excel 생성 중 오류가 발생했습니다.');
  }
}; 