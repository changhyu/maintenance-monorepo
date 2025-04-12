import React from 'react';

import { Button, Select, message } from 'antd';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const { Option } = Select;

interface ReportExportProps {
  reportData: any; // 보고서 데이터
}

const ReportExport: React.FC<ReportExportProps> = ({ reportData }) => {
  const [exportType, setExportType] = React.useState<string>('pdf');

  const handleExport = () => {
    if (exportType === 'pdf') {
      exportToPDF();
    } else if (exportType === 'excel') {
      exportToExcel();
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      // 보고서 데이터를 간단히 텍스트로 출력
      doc.text(JSON.stringify(reportData, null, 2), 10, 10);
      doc.save('report.pdf');
      message.success('PDF 보고서가 생성되었습니다.');
    } catch (error) {
      console.error('PDF 내보내기 오류:', error);
      message.error('PDF 내보내기 오류 발생');
    }
  };

  const exportToExcel = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(
        Array.isArray(reportData) ? reportData : [reportData]
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      XLSX.writeFile(workbook, 'report.xlsx');
      message.success('Excel 보고서가 생성되었습니다.');
    } catch (error) {
      console.error('Excel 내보내기 오류:', error);
      message.error('Excel 내보내기 오류 발생');
    }
  };

  return (
    <div style={{ margin: '20px 0' }}>
      <Select
        value={exportType}
        onChange={value => setExportType(value)}
        style={{ width: 120, marginRight: 10 }}
      >
        <Option value="pdf">PDF</Option>
        <Option value="excel">Excel</Option>
      </Select>
      <Button type="primary" onClick={handleExport}>
        보고서 내보내기
      </Button>
    </div>
  );
};

export default ReportExport;
