import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { MaintenanceReservation } from '../types/maintenance';

interface PDFOptions {
  title: string;
  subtitle?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  showPageNumbers?: boolean;
  orientation?: 'portrait' | 'landscape';
}

const defaultOptions: PDFOptions = {
  title: '정비 예약 보고서',
  showHeader: true,
  showFooter: true,
  showPageNumbers: true,
  orientation: 'portrait',
};

const generateTableStyles = () => `
  <style>
    body {
      font-family: 'Helvetica', sans-serif;
      margin: 0;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .subtitle {
      font-size: 16px;
      color: #666;
      margin-bottom: 20px;
    }
    .date {
      font-size: 14px;
      color: #888;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #fafafa;
    }
    .group-header {
      background-color: #eee;
      font-weight: bold;
      padding: 10px;
      margin: 20px 0 10px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 12px;
      color: #888;
    }
    .page-number {
      position: absolute;
      bottom: 20px;
      right: 20px;
      font-size: 12px;
      color: #888;
    }
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: white;
    }
    .status-pending { background-color: #ffd700; }
    .status-confirmed { background-color: #4169e1; }
    .status-in-progress { background-color: #32cd32; }
    .status-completed { background-color: #228b22; }
    .status-cancelled { background-color: #dc143c; }
    .priority-high { color: #dc143c; }
    .priority-medium { color: #ffa500; }
    .priority-low { color: #228b22; }
  </style>
`;

const generateHeader = (options: PDFOptions) => `
  <div class="header">
    <div class="title">${options.title}</div>
    ${options.subtitle ? `<div class="subtitle">${options.subtitle}</div>` : ''}
    <div class="date">생성일: ${new Date().toLocaleString()}</div>
  </div>
`;

const generateFooter = () => `
  <div class="footer">
    본 보고서는 자동으로 생성되었습니다.
    <br>
    © ${new Date().getFullYear()} 정비 관리 시스템
  </div>
`;

const getStatusText = (status: string) => {
  const statusMap: { [key: string]: string } = {
    pending: '대기',
    confirmed: '확정',
    in_progress: '진행',
    completed: '완료',
    cancelled: '취소',
  };
  return statusMap[status] || status;
};

const getStatusClass = (status: string) => {
  return `status-${status.replace('_', '-')}`;
};

const getPriorityClass = (priority: string) => {
  return `priority-${priority}`;
};

const generateTableHeader = (data: any[]) => {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  return `
    <tr>
      ${headers.map(header => `<th>${header}</th>`).join('')}
    </tr>
  `;
};

const generateTableRow = (item: any) => {
  return `
    <tr>
      ${Object.entries(item).map(([key, value]) => {
        if (key === '상태') {
          return `<td><span class="status-badge ${getStatusClass(value as string)}">${getStatusText(value as string)}</span></td>`;
        }
        if (key === '우선순위') {
          return `<td><span class="${getPriorityClass(value as string)}">${value}</span></td>`;
        }
        return `<td>${value}</td>`;
      }).join('')}
    </tr>
  `;
};

const generateTable = (data: any[]) => {
  if (data.length === 0) return '<p>데이터가 없습니다.</p>';
  return `
    <table>
      ${generateTableHeader(data)}
      ${data.map(item => generateTableRow(item)).join('')}
    </table>
  `;
};

const generateGroupedTable = (data: any[], groupField: string) => {
  const grouped: { [key: string]: any[] } = {};
  data.forEach(item => {
    const key = item[groupField] || '미분류';
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });

  return Object.entries(grouped).map(([group, items]) => `
    <div class="group-header">${group}</div>
    ${generateTable(items)}
  `).join('');
};

export const generatePDF = async (
  data: any[],
  options: PDFOptions = defaultOptions,
  groupBy?: string
) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        ${generateTableStyles()}
      </head>
      <body>
        ${options.showHeader ? generateHeader(options) : ''}
        ${groupBy ? generateGroupedTable(data, groupBy) : generateTable(data)}
        ${options.showFooter ? generateFooter() : ''}
      </body>
    </html>
  `;

  const pdfOptions = {
    html,
    fileName: `report_${Date.now()}`,
    directory: 'Documents',
    height: options.orientation === 'landscape' ? 792 : 1122,
    width: options.orientation === 'landscape' ? 1122 : 792,
  };

  try {
    const file = await RNHTMLtoPDF.convert(pdfOptions);
    return file.filePath;
  } catch (error) {
    throw new Error('PDF 생성 중 오류가 발생했습니다.');
  }
};

export const generateSummaryPDF = async (
  summary: any,
  options: PDFOptions = { ...defaultOptions, title: '정비 예약 요약 보고서' }
) => {
  const formatSection = (section: { [key: string]: number }) => {
    return Object.entries(section)
      .map(([key, value]) => `
        <tr>
          <td>${key}</td>
          <td>${value}</td>
        </tr>
      `)
      .join('');
  };

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        ${generateTableStyles()}
      </head>
      <body>
        ${options.showHeader ? generateHeader(options) : ''}
        
        <div class="group-header">전체 통계</div>
        <table>
          <tr>
            <td>총 예약 수</td>
            <td>${summary.총_예약_수}</td>
          </tr>
          <tr>
            <td>평균 소요시간</td>
            <td>${Math.round(summary.평균_소요시간)}분</td>
          </tr>
          <tr>
            <td>총 비용</td>
            <td>${summary.총_비용.toLocaleString()}원</td>
          </tr>
        </table>

        <div class="group-header">상태별 통계</div>
        <table>
          ${formatSection(summary.상태별_통계)}
        </table>

        <div class="group-header">서비스 유형별 통계</div>
        <table>
          ${formatSection(summary.서비스_유형별_통계)}
        </table>

        <div class="group-header">우선순위별 통계</div>
        <table>
          ${formatSection(summary.우선순위별_통계)}
        </table>

        ${options.showFooter ? generateFooter() : ''}
      </body>
    </html>
  `;

  const pdfOptions = {
    html,
    fileName: `summary_report_${Date.now()}`,
    directory: 'Documents',
    height: options.orientation === 'landscape' ? 792 : 1122,
    width: options.orientation === 'landscape' ? 1122 : 792,
  };

  try {
    const file = await RNHTMLtoPDF.convert(pdfOptions);
    return file.filePath;
  } catch (error) {
    throw new Error('PDF 생성 중 오류가 발생했습니다.');
  }
};

export const generateTechnicianPDF = async (
  report: any,
  options: PDFOptions = { ...defaultOptions, title: '기술자 성과 보고서' }
) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        ${generateTableStyles()}
      </head>
      <body>
        ${options.showHeader ? generateHeader(options) : ''}
        
        <div class="group-header">기술자 정보</div>
        <table>
          <tr>
            <td>기술자 ID</td>
            <td>${report.기술자_ID}</td>
          </tr>
          <tr>
            <td>총 예약 수</td>
            <td>${report.총_예약_수}</td>
          </tr>
          <tr>
            <td>완료 예약 수</td>
            <td>${report.완료_예약_수}</td>
          </tr>
          <tr>
            <td>평균 소요시간</td>
            <td>${Math.round(report.평균_소요시간)}분</td>
          </tr>
        </table>

        <div class="group-header">서비스 유형별 통계</div>
        <table>
          ${formatSection(report.서비스_유형별_통계)}
        </table>

        <div class="group-header">예약 목록</div>
        ${generateTable(report.예약_목록)}

        ${options.showFooter ? generateFooter() : ''}
      </body>
    </html>
  `;

  const pdfOptions = {
    html,
    fileName: `technician_report_${report.기술자_ID}_${Date.now()}`,
    directory: 'Documents',
    height: options.orientation === 'landscape' ? 792 : 1122,
    width: options.orientation === 'landscape' ? 1122 : 792,
  };

  try {
    const file = await RNHTMLtoPDF.convert(pdfOptions);
    return file.filePath;
  } catch (error) {
    throw new Error('PDF 생성 중 오류가 발생했습니다.');
  }
}; 