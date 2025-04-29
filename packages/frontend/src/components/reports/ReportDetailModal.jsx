import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useRef } from 'react';
import { DownloadOutlined, FileTextOutlined, TableOutlined, BarChartOutlined, PrinterOutlined } from '@ant-design/icons';
import { Modal, Table, Typography, Descriptions, Space, Button, Tabs, message } from 'antd';
import dayjs from 'dayjs';
import ReportChart from './ReportChart';
import { ReportType, ReportFormat } from '../../services/reportService';
import './styles.css';
const { Title, Text } = Typography;
const { TabPane } = Tabs;
/**
 * 보고서 상세 보기 모달 컴포넌트
 */
const ReportDetailModal = ({ visible, report, onClose, onExport, loading = false }) => {
    const [activeTab, setActiveTab] = React.useState('overview');
    const [exportLoading, setExportLoading] = React.useState(false);
    const [printLoading, setPrintLoading] = React.useState(false);
    const chartRef = useRef(null);
    // 보고서 내보내기
    const handleExport = async (format) => {
        if (!report)
            return;
        setExportLoading(true);
        try {
            await onExport(report.id, {
                format,
                includeCharts: true,
                includeRawData: true
            });
        }
        finally {
            setExportLoading(false);
        }
    };
    // 차트 이미지 캡처 함수
    const captureChart = async () => {
        if (!chartRef.current)
            return null;
        try {
            // 동적으로 html2canvas 라이브러리 로드
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(chartRef.current, {
                scale: 2, // 고해상도 출력
                useCORS: true, // 외부 이미지 로드 허용
                logging: false // 콘솔 로그 비활성화
            });
            return canvas.toDataURL('image/png');
        }
        catch (error) {
            console.error('차트 캡처 중 오류 발생:', error);
            message.error('차트 캡처 중 오류가 발생했습니다.');
            return null;
        }
    };
    // 보고서 인쇄
    const handlePrint = async () => {
        if (!report)
            return;
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
                  <title>${report?.title ?? '보고서'}</title>
                  ${printStyles}
                </head>
                <body>
                  <div class="print-header">
                    <h1>${report?.title ?? '보고서'}</h1>
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
                    }
                    else {
                        window.alert('새 창을 열 수 없습니다. 팝업 차단을 확인해주세요.');
                        setPrintLoading(false);
                    }
                }
                else {
                    setPrintLoading(false);
                }
            }, 500);
        }
        catch (error) {
            console.error('인쇄 준비 중 오류 발생:', error);
            message.error('인쇄 준비 중 오류가 발생했습니다.');
            setPrintLoading(false);
        }
    };
    // 보고서 유형에 따른 개요 섹션 렌더링
    const renderOverview = () => {
        if (!report)
            return null;
        switch (report.type) {
            case ReportType.COMPLETION_RATE:
                return (_jsxs(Descriptions, { bordered: true, column: 2, children: [_jsx(Descriptions.Item, { label: "\uCD1D \uC791\uC5C5 \uC218", children: report.data.totalTasks }), _jsx(Descriptions.Item, { label: "\uC644\uB8CC\uB41C \uC791\uC5C5 \uC218", children: report.data.completedTasks }), _jsx(Descriptions.Item, { label: "\uC644\uB8CC\uC728", children: `${report.data.completionRate.toFixed(1)}%` }), _jsx(Descriptions.Item, { label: "\uB192\uC740 \uC6B0\uC120\uC21C\uC704", children: `${report.data.byPriority.high.completed}/${report.data.byPriority.high.total} (${report.data.byPriority.high.rate.toFixed(1)}%)` }), _jsx(Descriptions.Item, { label: "\uC911\uAC04 \uC6B0\uC120\uC21C\uC704", children: `${report.data.byPriority.medium.completed}/${report.data.byPriority.medium.total} (${report.data.byPriority.medium.rate.toFixed(1)}%)` }), _jsx(Descriptions.Item, { label: "\uB0AE\uC740 \uC6B0\uC120\uC21C\uC704", children: `${report.data.byPriority.low.completed}/${report.data.byPriority.low.total} (${report.data.byPriority.low.rate.toFixed(1)}%)` })] }));
            case ReportType.VEHICLE_HISTORY:
                return (_jsxs(Descriptions, { bordered: true, column: 2, children: [_jsx(Descriptions.Item, { label: "\uCC28\uB7C9 ID", span: 2, children: report.data.vehicleInfo.id }), _jsx(Descriptions.Item, { label: "\uCC28\uB7C9\uBA85", children: report.data.vehicleInfo.name }), _jsx(Descriptions.Item, { label: "\uBAA8\uB378", children: report.data.vehicleInfo.model }), _jsx(Descriptions.Item, { label: "\uC5F0\uC2DD", children: report.data.vehicleInfo.year }), _jsx(Descriptions.Item, { label: "\uB4F1\uB85D\uBC88\uD638", children: report.data.vehicleInfo.registrationNumber }), _jsx(Descriptions.Item, { label: "\uCD1D \uC815\uBE44 \uBE44\uC6A9", children: `${report.data.totalCost.toLocaleString()}원` }), _jsx(Descriptions.Item, { label: "\uD3C9\uADE0 \uC815\uBE44 \uAC04\uACA9", children: `${report.data.averageInterval}일` })] }));
            case ReportType.COST_ANALYSIS:
                return (_jsxs(Descriptions, { bordered: true, column: 2, children: [_jsx(Descriptions.Item, { label: "\uCD1D \uBE44\uC6A9", children: `${report.data.totalCost.toLocaleString()}원` }), _jsx(Descriptions.Item, { label: "\uCC28\uB7C9 \uB2F9 \uD3C9\uADE0 \uBE44\uC6A9", children: `${report.data.averageCostPerVehicle.toLocaleString()}원` }), _jsx(Descriptions.Item, { label: "\uBD80\uD488 \uBE44\uC6A9", children: `${report.data.costBreakdown.parts.toLocaleString()}원` }), _jsx(Descriptions.Item, { label: "\uC778\uAC74\uBE44", children: `${report.data.costBreakdown.labor.toLocaleString()}원` }), _jsx(Descriptions.Item, { label: "\uAE30\uD0C0 \uBE44\uC6A9", children: `${report.data.costBreakdown.etc.toLocaleString()}원` })] }));
            case ReportType.MAINTENANCE_SUMMARY:
                return (_jsxs(Descriptions, { bordered: true, column: 2, children: [_jsx(Descriptions.Item, { label: "\uAE30\uAC04", children: `${report.data.period.start} ~ ${report.data.period.end}` }), _jsx(Descriptions.Item, { label: "\uCD1D \uCC28\uB7C9 \uC218", children: report.data.overview.totalVehicles }), _jsx(Descriptions.Item, { label: "\uCD1D \uC815\uBE44 \uAC74\uC218", children: report.data.overview.totalMaintenances }), _jsx(Descriptions.Item, { label: "\uCC28\uB7C9 \uB2F9 \uD3C9\uADE0 \uC815\uBE44 \uAC74\uC218", children: report.data.overview.averagePerVehicle.toFixed(1) }), _jsx(Descriptions.Item, { label: "\uC644\uB8CC\uB41C \uC815\uBE44", children: report.data.byStatus.completed }), _jsx(Descriptions.Item, { label: "\uB300\uAE30 \uC911\uC778 \uC815\uBE44", children: report.data.byStatus.pending }), _jsx(Descriptions.Item, { label: "\uC608\uC815\uB41C \uC815\uBE44", children: report.data.byStatus.scheduled }), _jsx(Descriptions.Item, { label: "\uC9C0\uC5F0\uB41C \uC815\uBE44", children: report.data.byStatus.overdue })] }));
            case ReportType.MAINTENANCE_FORECAST:
                return (_jsxs(Descriptions, { bordered: true, column: 1, children: [_jsx(Descriptions.Item, { label: "\uC608\uCE21 \uAE30\uAC04", children: `${report.data.upcoming[0]?.estimatedDate} ~ ${report.data.upcoming[report.data.upcoming.length - 1]?.estimatedDate}` }), _jsx(Descriptions.Item, { label: "\uC608\uC0C1 \uC815\uBE44 \uAC74\uC218", children: report.data.upcoming.length }), _jsx(Descriptions.Item, { label: "\uC7A0\uC7AC\uC801 \uBB38\uC81C \uAC74\uC218", children: report.data.potentialIssues.length })] }));
            default:
                return _jsx(Text, { children: "\uBCF4\uACE0\uC11C \uC0C1\uC138 \uC815\uBCF4\uB97C \uD45C\uC2DC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." });
        }
    };
    // 보고서 유형에 따른 테이블 데이터 및 컬럼 가져오기
    const getTableData = () => {
        if (!report)
            return { data: [], columns: [] };
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
                        {
                            title: '비용',
                            dataIndex: 'cost',
                            key: 'cost',
                            render: (cost) => `${cost.toLocaleString()}원`
                        },
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
                        {
                            title: '총 비용',
                            dataIndex: 'totalCost',
                            key: 'totalCost',
                            render: (cost) => `${cost.toLocaleString()}원`
                        }
                    ]
                };
            case ReportType.MAINTENANCE_SUMMARY:
                return {
                    data: report.data.byType,
                    columns: [
                        { title: '정비 유형', dataIndex: 'type', key: 'type' },
                        { title: '건수', dataIndex: 'count', key: 'count' },
                        {
                            title: '비율',
                            dataIndex: 'percentage',
                            key: 'percentage',
                            render: (percentage) => `${percentage.toFixed(1)}%`
                        }
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
                        {
                            title: '신뢰도',
                            dataIndex: 'confidence',
                            key: 'confidence',
                            render: (confidence) => `${(confidence * 100).toFixed(1)}%`
                        }
                    ]
                };
            default:
                return { data: [], columns: [] };
        }
    };
    const { data: tableData, columns } = getTableData();
    // 보고서 유형에 따른 차트 데이터 가져오기
    const getChartData = () => {
        if (!report)
            return null;
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
    const getRowKey = (record) => {
        return (record.id || record.date || record.vehicleId || Math.random().toString(36).substring(2, 9));
    };
    return (_jsx(Modal, { title: report?.title ?? '보고서 상세', visible: visible && report !== null, onCancel: onClose, width: 800, footer: [
            _jsx(Button, { onClick: onClose, children: "\uB2EB\uAE30" }, "close"),
            _jsx(Button, { icon: _jsx(PrinterOutlined, {}), loading: printLoading, onClick: handlePrint, children: "\uC778\uC1C4" }, "print"),
            _jsx(Button, { type: "primary", icon: _jsx(FileTextOutlined, {}), loading: exportLoading, onClick: () => handleExport(ReportFormat.PDF), children: "PDF \uB0B4\uBCF4\uB0B4\uAE30" }, "export-pdf"),
            _jsx(Button, { icon: _jsx(DownloadOutlined, {}), loading: exportLoading, onClick: () => handleExport(ReportFormat.EXCEL), children: "Excel \uB0B4\uBCF4\uB0B4\uAE30" }, "export-excel")
        ], children: report && (_jsxs(_Fragment, { children: [_jsx("div", { className: "report-detail-header", children: _jsxs(Space, { direction: "vertical", size: "small", children: [_jsx(Title, { level: 4, children: report.title }), _jsxs(Text, { type: "secondary", children: ["\uC0DD\uC131\uC77C: ", dayjs(report.createdAt).format('YYYY년 MM월 DD일 HH:mm')] })] }) }), _jsxs(Tabs, { activeKey: activeTab, onChange: setActiveTab, children: [_jsx(TabPane, { tab: "\uAC1C\uC694", children: renderOverview() }, "overview"), _jsx(TabPane, { tab: _jsxs(_Fragment, { children: [_jsx(TableOutlined, {}), " \uB370\uC774\uD130"] }), children: _jsx(Table, { dataSource: tableData, columns: columns, pagination: { pageSize: 5 }, rowKey: getRowKey, size: "small", scroll: { x: 'max-content' } }) }, "data"), _jsx(TabPane, { tab: _jsxs(_Fragment, { children: [_jsx(BarChartOutlined, {}), " \uCC28\uD2B8"] }), children: _jsx("div", { ref: chartRef, children: _jsx(ReportChart, { type: report.type, data: getChartData(), loading: loading, height: 400 }) }) }, "chart")] }), _jsxs("div", { id: "report-print-content", style: { display: 'none' }, children: [_jsxs("div", { className: "print-section", children: [_jsx("h2", { children: "\uAC1C\uC694" }), renderOverview()] }), _jsxs("div", { className: "print-section page-break", children: [_jsx("h2", { children: "\uB370\uC774\uD130" }), _jsxs("table", { children: [_jsx("thead", { children: _jsx("tr", { children: columns.map((column) => (_jsx("th", { children: column.title }, column.key))) }) }), _jsx("tbody", { children: tableData.map((item, index) => (_jsx("tr", { children: columns.map((column) => (_jsx("td", { children: column.render
                                                        ? column.render(item[column.dataIndex], item)
                                                        : item[column.dataIndex] }, `${index}-${column.key}`))) }, getRowKey(item)))) })] })] }), _jsxs("div", { className: "print-section page-break", children: [_jsx("h2", { children: "\uCC28\uD2B8" }), _jsx("div", { id: "print-chart-container", className: "chart-section" })] })] })] })) }));
};
export default ReportDetailModal;
