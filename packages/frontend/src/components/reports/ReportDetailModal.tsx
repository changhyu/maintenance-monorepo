import React, { useRef } from 'react';
import { Modal, Table, Typography, Descriptions, Space, Button, Tabs, message } from 'antd';
import { DownloadOutlined, FileTextOutlined, TableOutlined, BarChartOutlined, PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Report, ReportType, ReportFormat, ExportOptions } from '../../services/reportService';
import ReportChart from './ReportChart';
import './styles.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

export interface ReportDetailModalProps {
  visible: boolean;
  report: Report | null;
  onClose: () => void;
  onExport: (reportId: string, options: ExportOptions) => Promise<void>;
  loading?: boolean;
}

/**
 * 보고서 상세 보기 모달 컴포넌트
 */
const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  visible,
  report,
  onClose,
  onExport,
  loading = false
}) => {
  const [activeTab, setActiveTab] = React.useState<string>('overview');
  const [exportLoading, setExportLoading] = React.useState<boolean>(false);
  const [printLoading, setPrintLoading] = React.useState<boolean>(false);
  const chartRef = useRef<HTMLDivElement>(null);
  
  // 보고서 내보내기
  const handleExport = async (format: ReportFormat) => {
    if (!report) return;

    setExportLoading(true);
    try {
      await onExport(report.id, {
        format,
        includeCharts: true,
        includeRawData: true
      });
    } finally {
      setExportLoading(false);
    }
  };

  // 차트 이미지 캡처 함수
  const captureChart = async (): Promise<string | null> => {
    if (!chartRef.current) return null;
    
    try {
      // 동적으로 html2canvas 라이브러리 로드
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartRef.current, {
        scale: 2, // 고해상도 출력
        useCORS: true, // 외부 이미지 로드 허용
        logging: false, // 콘솔 로그 비활성화
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('차트 캡처 중 오류 발생:', error);
      message.error('차트 캡처 중 오류가 발생했습니다.');
      return null;
    }
  };

  // 보고서 인쇄
  const handlePrint = async () => {
    if (!report) return;
    
    setPrintLoading(true);
    
    try {
      // 차트 캡처 시도
      let chartImageUrl = null;
      if (chartRef.current) {
        chartImageUrl = await captureChart();
      }
      
      setTimeout(() => {
        const printContent = document.getElementById('report-print-content');
        
        if (printContent) {
          // 차트 이미지 요소 추가
          const chartContainer = document.getElementById('print-chart-container');
          if (chartContainer && chartImageUrl) {
            chartContainer.innerHTML = `<img src="${chartImageUrl}" style="max-width:100%; height:auto;" alt="보고서 차트" />`;
          }
          
          const printStyles = `
            <style>
              @media print {
                @page {
                  size: A4;
                  margin: 1.5cm;
                }
                body {
                  font-family: Arial, sans-serif;
                  color: #333;
                  line-height: 1.5;
                }
                h1 {
                  font-size: 24px;
                  margin-bottom: 16px;
                  color: #1890ff;
                  text-align: center;
                }
                h2 {
                  font-size: 18px;
                  margin-top: 20px;
                  margin-bottom: 10px;
                  color: #333;
                  border-bottom: 1px solid #eee;
                  padding-bottom: 5px;
                }
                p {
                  margin-bottom: 8px;
                }
                .print-header {
                  text-align: center;
                  margin-bottom: 24px;
                }
                .print-date {
                  font-size: 12px;
                  color: #666;
                  margin-bottom: 16px;
                  text-align: center;
                }
                .print-section {
                  margin-bottom: 30px;
                  page-break-inside: avoid;
                }
                .chart-section {
                  text-align: center;
                  margin: 30px 0;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 24px;
                }
                table, th, td {
                  border: 1px solid #ddd;
                }
                th, td {
                  padding: 8px;
                  text-align: left;
                }
                th {
                  background-color: #f2f2f2;
                }
                .page-break {
                  page-break-before: always;
                }
                footer {
                  position: fixed;
                  bottom: 0;
                  left: 0;
                  right: 0;
                  text-align: center;
                  font-size: 10px;
                  color: #999;
                  padding: 5px;
                }
              }
            </style>
          `;
          
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <html>
                <head>
                  <title>${report?.title || '보고서'}</title>
                  ${printStyles}
                </head>
                <body>
                  <div class="print-header">
                    <h1>${report?.title || '보고서'}</h1>
                    <p class="print-date">생성일: ${dayjs(report?.createdAt).format('YYYY년 MM월 DD일 HH:mm')}</p>
                  </div>
                  ${printContent.innerHTML}
                  <footer>
                    © ${new Date().getFullYear()} 차량 정비 관리 시스템 - 인쇄일: ${dayjs().format('YYYY년 MM월 DD일 HH:mm')}
                  </footer>
                </body>
              </html>
            `);
            
            printWindow.document.close();
            printWindow.focus();
            
            // 잠시 후 인쇄 다이얼로그 표시
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
              setPrintLoading(false);
            }, 1000);
          } else {
            window.alert('새 창을 열 수 없습니다. 팝업 차단을 확인해주세요.');
            setPrintLoading(false);
          }
        } else {
          setPrintLoading(false);
        }
      }, 500);
    } catch (error) {
      console.error('인쇄 준비 중 오류 발생:', error);
      message.error('인쇄 준비 중 오류가 발생했습니다.');
      setPrintLoading(false);
    }
  };

  // 보고서 유형에 따른 개요 섹션 렌더링
  const renderOverview = () => {
    if (!report) return null;

    switch (report.type) {
      case ReportType.COMPLETION_RATE:
        return (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="총 작업 수">{report.data.totalTasks}</Descriptions.Item>
            <Descriptions.Item label="완료된 작업 수">{report.data.completedTasks}</Descriptions.Item>
            <Descriptions.Item label="완료율">{`${report.data.completionRate.toFixed(1)}%`}</Descriptions.Item>
            <Descriptions.Item label="높은 우선순위">
              {`${report.data.byPriority.high.completed}/${report.data.byPriority.high.total} (${report.data.byPriority.high.rate.toFixed(1)}%)`}
            </Descriptions.Item>
            <Descriptions.Item label="중간 우선순위">
              {`${report.data.byPriority.medium.completed}/${report.data.byPriority.medium.total} (${report.data.byPriority.medium.rate.toFixed(1)}%)`}
            </Descriptions.Item>
            <Descriptions.Item label="낮은 우선순위">
              {`${report.data.byPriority.low.completed}/${report.data.byPriority.low.total} (${report.data.byPriority.low.rate.toFixed(1)}%)`}
            </Descriptions.Item>
          </Descriptions>
        );
      case ReportType.VEHICLE_HISTORY:
        return (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="차량 ID" span={2}>{report.data.vehicleInfo.id}</Descriptions.Item>
            <Descriptions.Item label="차량명">{report.data.vehicleInfo.name}</Descriptions.Item>
            <Descriptions.Item label="모델">{report.data.vehicleInfo.model}</Descriptions.Item>
            <Descriptions.Item label="연식">{report.data.vehicleInfo.year}</Descriptions.Item>
            <Descriptions.Item label="등록번호">{report.data.vehicleInfo.registrationNumber}</Descriptions.Item>
            <Descriptions.Item label="총 정비 비용">{`${report.data.totalCost.toLocaleString()}원`}</Descriptions.Item>
            <Descriptions.Item label="평균 정비 간격">{`${report.data.averageInterval}일`}</Descriptions.Item>
          </Descriptions>
        );
      case ReportType.COST_ANALYSIS:
        return (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="총 비용">{`${report.data.totalCost.toLocaleString()}원`}</Descriptions.Item>
            <Descriptions.Item label="차량 당 평균 비용">{`${report.data.averageCostPerVehicle.toLocaleString()}원`}</Descriptions.Item>
            <Descriptions.Item label="부품 비용">{`${report.data.costBreakdown.parts.toLocaleString()}원`}</Descriptions.Item>
            <Descriptions.Item label="인건비">{`${report.data.costBreakdown.labor.toLocaleString()}원`}</Descriptions.Item>
            <Descriptions.Item label="기타 비용">{`${report.data.costBreakdown.etc.toLocaleString()}원`}</Descriptions.Item>
          </Descriptions>
        );
      case ReportType.MAINTENANCE_SUMMARY:
        return (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="기간">{`${report.data.period.start} ~ ${report.data.period.end}`}</Descriptions.Item>
            <Descriptions.Item label="총 차량 수">{report.data.overview.totalVehicles}</Descriptions.Item>
            <Descriptions.Item label="총 정비 건수">{report.data.overview.totalMaintenances}</Descriptions.Item>
            <Descriptions.Item label="차량 당 평균 정비 건수">{report.data.overview.averagePerVehicle.toFixed(1)}</Descriptions.Item>
            <Descriptions.Item label="완료된 정비">{report.data.byStatus.completed}</Descriptions.Item>
            <Descriptions.Item label="대기 중인 정비">{report.data.byStatus.pending}</Descriptions.Item>
            <Descriptions.Item label="예정된 정비">{report.data.byStatus.scheduled}</Descriptions.Item>
            <Descriptions.Item label="지연된 정비">{report.data.byStatus.overdue}</Descriptions.Item>
          </Descriptions>
        );
      case ReportType.MAINTENANCE_FORECAST:
        return (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="예측 기간">{`${report.data.upcoming[0]?.estimatedDate} ~ ${report.data.upcoming[report.data.upcoming.length - 1]?.estimatedDate}`}</Descriptions.Item>
            <Descriptions.Item label="예상 정비 건수">{report.data.upcoming.length}</Descriptions.Item>
            <Descriptions.Item label="잠재적 문제 건수">{report.data.potentialIssues.length}</Descriptions.Item>
          </Descriptions>
        );
      default:
        return <Text>보고서 상세 정보를 표시할 수 없습니다.</Text>;
    }
  };

  // 보고서 유형에 따른 테이블 데이터 및 컬럼 가져오기
  const getTableData = () => {
    if (!report) return { data: [], columns: [] };

    switch (report.type) {
      case ReportType.COMPLETION_RATE:
        return {
          data: report.data.trend,
          columns: [
            { title: '날짜', dataIndex: 'date', key: 'date' },
            { title: '완료율 (%)', dataIndex: 'completionRate', key: 'completionRate' }
          ]
        };
      case ReportType.VEHICLE_HISTORY:
        return {
          data: report.data.maintenanceHistory,
          columns: [
            { title: '날짜', dataIndex: 'date', key: 'date' },
            { title: '유형', dataIndex: 'type', key: 'type' },
            { title: '설명', dataIndex: 'description', key: 'description' },
            { title: '비용', dataIndex: 'cost', key: 'cost', render: (cost: number) => `${cost.toLocaleString()}원` },
            { title: '정비사', dataIndex: 'technicianName', key: 'technicianName' },
            { title: '상태', dataIndex: 'status', key: 'status' }
          ]
        };
      case ReportType.COST_ANALYSIS:
        return {
          data: report.data.vehicleCostComparison,
          columns: [
            { title: '차량 ID', dataIndex: 'vehicleId', key: 'vehicleId' },
            { title: '차량명', dataIndex: 'vehicleName', key: 'vehicleName' },
            { title: '총 비용', dataIndex: 'totalCost', key: 'totalCost', render: (cost: number) => `${cost.toLocaleString()}원` }
          ]
        };
      case ReportType.MAINTENANCE_SUMMARY:
        return {
          data: report.data.byType,
          columns: [
            { title: '정비 유형', dataIndex: 'type', key: 'type' },
            { title: '건수', dataIndex: 'count', key: 'count' },
            { title: '비율', dataIndex: 'percentage', key: 'percentage', render: (percentage: number) => `${percentage.toFixed(1)}%` }
          ]
        };
      case ReportType.MAINTENANCE_FORECAST:
        return {
          data: report.data.upcoming,
          columns: [
            { title: '차량 ID', dataIndex: 'vehicleId', key: 'vehicleId' },
            { title: '차량명', dataIndex: 'vehicleName', key: 'vehicleName' },
            { title: '정비 유형', dataIndex: 'maintenanceType', key: 'maintenanceType' },
            { title: '예상 일자', dataIndex: 'estimatedDate', key: 'estimatedDate' },
            { title: '신뢰도', dataIndex: 'confidence', key: 'confidence', render: (confidence: number) => `${(confidence * 100).toFixed(1)}%` }
          ]
        };
      default:
        return { data: [], columns: [] };
    }
  };

  const { data: tableData, columns } = getTableData();

  // 보고서 유형에 따른 차트 데이터 가져오기
  const getChartData = () => {
    if (!report) return null;

    switch (report.type) {
      case ReportType.COMPLETION_RATE:
        return report.data;
      case ReportType.VEHICLE_HISTORY:
        return report.data;
      case ReportType.COST_ANALYSIS:
        return report.data;
      case ReportType.MAINTENANCE_SUMMARY:
        return report.data;
      case ReportType.MAINTENANCE_FORECAST:
        return report.data;
      default:
        return null;
    }
  };

  // 테이블 행 키 생성 함수
  const getRowKey = (record: any) => {
    return record.id || record.date || record.vehicleId || Math.random().toString(36).substring(2, 9);
  };

  return (
    <Modal
      title={report?.title || '보고서 상세'}
      visible={visible && report !== null}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="close" onClick={onClose}>
          닫기
        </Button>,
        <Button
          key="print"
          icon={<PrinterOutlined />}
          loading={printLoading}
          onClick={handlePrint}
        >
          인쇄
        </Button>,
        <Button
          key="export-pdf"
          type="primary"
          icon={<FileTextOutlined />}
          loading={exportLoading}
          onClick={() => handleExport(ReportFormat.PDF)}
        >
          PDF 내보내기
        </Button>,
        <Button
          key="export-excel"
          icon={<DownloadOutlined />}
          loading={exportLoading}
          onClick={() => handleExport(ReportFormat.EXCEL)}
        >
          Excel 내보내기
        </Button>
      ]}
    >
      {report && (
        <>
          <div className="report-detail-header">
            <Space direction="vertical" size="small">
              <Title level={4}>{report.title}</Title>
              <Text type="secondary">생성일: {dayjs(report.createdAt).format('YYYY년 MM월 DD일 HH:mm')}</Text>
            </Space>
          </div>

          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="개요" key="overview">
              {renderOverview()}
            </TabPane>

            <TabPane tab={<><TableOutlined /> 데이터</>} key="data">
              <Table
                dataSource={tableData}
                columns={columns}
                pagination={{ pageSize: 5 }}
                rowKey={getRowKey}
                size="small"
                scroll={{ x: 'max-content' }}
              />
            </TabPane>

            <TabPane tab={<><BarChartOutlined /> 차트</>} key="chart">
              <div ref={chartRef}>
                <ReportChart
                  type={report.type}
                  data={getChartData()}
                  loading={loading}
                  height={400}
                />
              </div>
            </TabPane>
          </Tabs>

          {/* 인쇄용 컨텐츠 (숨김) */}
          <div id="report-print-content" style={{ display: 'none' }}>
            <div className="print-section">
              <h2>개요</h2>
              {renderOverview()}
            </div>

            <div className="print-section page-break">
              <h2>데이터</h2>
              <table>
                <thead>
                  <tr>
                    {columns.map((column: any) => (
                      <th key={column.key}>{column.title}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((item: any, index: number) => (
                    <tr key={getRowKey(item)}>
                      {columns.map((column: any) => (
                        <td key={`${index}-${column.key}`}>
                          {column.render
                            ? column.render(item[column.dataIndex], item)
                            : item[column.dataIndex]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="print-section page-break">
              <h2>차트</h2>
              <div id="print-chart-container" className="chart-section">
                {/* 차트 이미지가 여기에 삽입됩니다 */}
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
};

export default ReportDetailModal; 