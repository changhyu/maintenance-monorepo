import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Paper, Divider, Chip, CircularProgress, Tabs, Tab } from '@mui/material';
import { Download as DownloadIcon, PictureAsPdf as PdfIcon, DataObject as JsonIcon, TableChart as TableIcon } from '@mui/icons-material';
import { ReportType, ReportFormat } from '../services/reportService';
// 탭 패널 컴포넌트
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (_jsx("div", { role: "tabpanel", hidden: value !== index, id: `report-viewer-tabpanel-${index}`, "aria-labelledby": `report-viewer-tab-${index}`, ...other, children: value === index && _jsx(Box, { sx: { pt: 2 }, children: children }) }));
}
// 보고서 유형 이름 변환 함수
const getReportTypeName = (type) => {
    const reportTypes = {
        [ReportType.COMPLETION_RATE]: '완료율 보고서',
        [ReportType.VEHICLE_HISTORY]: '차량 이력 보고서',
        [ReportType.COST_ANALYSIS]: '비용 분석 보고서',
        [ReportType.MAINTENANCE_SUMMARY]: '정비 요약 보고서',
        [ReportType.MAINTENANCE_FORECAST]: '정비 예측 보고서',
        [ReportType.VEHICLE_UTILIZATION]: '차량 활용도 보고서',
        [ReportType.MAINTENANCE_COMPLETION_RATE]: '정비 완료율 보고서',
        [ReportType.PREDICTIVE_MAINTENANCE]: '예측 정비 보고서',
        [ReportType.PARTS_USAGE]: '부품 사용 보고서'
    };
    return reportTypes[type] || '알 수 없는 보고서';
};
/**
 * 보고서 조회 다이얼로그 컴포넌트
 */
const ReportViewer = ({ report, open, onClose, isOfflineReport = false }) => {
    const [tabValue, setTabValue] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState(null);
    // 탭 변경 핸들러
    const handleTabChange = (_, newValue) => {
        setTabValue(newValue);
    };
    // 보고서 내보내기 핸들러
    const handleExportReport = async (format) => {
        setIsExporting(true);
        setError(null);
        try {
            // 오프라인 저장 보고서인 경우
            if (isOfflineReport) {
                // 보고서 데이터와 내보내기 옵션 가져오기
                const reportData = report.data || [];
                const exportOptions = {
                    ...report.exportOptions,
                    format
                };
                // 보고서 이름 설정
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
                const filename = `${report.name || 'report'}_${timestamp}`;
                // 데이터 내보내기
                switch (format) {
                    case ReportFormat.PDF:
                        // PDF 내보내기 로직
                        break;
                    case ReportFormat.EXCEL:
                        // Excel 내보내기 로직
                        break;
                    case ReportFormat.CSV:
                        // CSV 내보내기 로직
                        break;
                    case ReportFormat.JSON:
                        // JSON 내보내기 로직
                        const blob = new Blob([JSON.stringify(reportData, null, 2)], {
                            type: 'application/json'
                        });
                        saveAs(blob, `${filename}.json`);
                        break;
                }
            }
            else {
                // 온라인 보고서인 경우 API 호출
                // TODO: API를 통한 보고서 내보내기 구현
            }
        }
        catch (err) {
            console.error('보고서 내보내기 중 오류 발생:', err);
            setError('보고서 내보내기 중 오류가 발생했습니다.');
        }
        finally {
            setIsExporting(false);
        }
    };
    // 보고서 데이터 렌더링
    const renderReportData = () => {
        // 오프라인 보고서와 온라인 보고서의 데이터 구조가 다를 수 있음
        const data = isOfflineReport ? report.data : report.data;
        if (!data) {
            return _jsx(Typography, { children: "\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." });
        }
        // 보고서 유형에 따른 렌더링
        switch (report.type) {
            case ReportType.COMPLETION_RATE:
                return renderCompletionRateReport(data);
            case ReportType.VEHICLE_HISTORY:
                return renderVehicleHistoryReport(data);
            case ReportType.COST_ANALYSIS:
                return renderCostAnalysisReport(data);
            case ReportType.MAINTENANCE_SUMMARY:
                return renderMaintenanceSummaryReport(data);
            case ReportType.MAINTENANCE_FORECAST:
                return renderMaintenanceForecastReport(data);
            default:
                // 기본적으로 JSON으로 표시
                return (_jsx("pre", { style: {
                        overflow: 'auto',
                        maxHeight: '500px',
                        padding: '10px',
                        backgroundColor: '#f5f5f5'
                    }, children: JSON.stringify(data, null, 2) }));
        }
    };
    // 완료율 보고서 렌더링
    const renderCompletionRateReport = (data) => {
        return (_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uC644\uB8CC\uC728 \uAC1C\uC694" }), _jsx(Paper, { sx: { p: 2, mb: 2 }, children: _jsxs(Typography, { variant: "body1", children: ["\uC804\uCCB4 \uC791\uC5C5: ", data.totalTasks, "\uAC1C", _jsx("br", {}), "\uC644\uB8CC \uC791\uC5C5: ", data.completedTasks, "\uAC1C", _jsx("br", {}), "\uC644\uB8CC\uC728: ", (data.completionRate * 100).toFixed(1), "%"] }) })] }));
    };
    // 차량 이력 보고서 렌더링
    const renderVehicleHistoryReport = (data) => {
        return (_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uCC28\uB7C9 \uC815\uBCF4" }), _jsx(Paper, { sx: { p: 2, mb: 2 }, children: _jsxs(Typography, { variant: "body1", children: [data.vehicleInfo?.name || '차량명 없음', " (", data.vehicleInfo?.model, " ", data.vehicleInfo?.year, ")", _jsx("br", {}), "\uB4F1\uB85D\uBC88\uD638: ", data.vehicleInfo?.registrationNumber, _jsx("br", {}), "\uCD1D \uC815\uBE44 \uBE44\uC6A9: ", data.totalCost?.toLocaleString(), "\uC6D0"] }) })] }));
    };
    // 비용 분석 보고서 렌더링
    const renderCostAnalysisReport = (data) => {
        return (_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uBE44\uC6A9 \uBD84\uC11D" }), _jsx(Paper, { sx: { p: 2, mb: 2 }, children: _jsxs(Typography, { variant: "body1", children: ["\uCD1D \uBE44\uC6A9: ", data.totalCost?.toLocaleString(), "\uC6D0", _jsx("br", {}), "\uD3C9\uADE0 \uCC28\uB7C9\uB2F9 \uBE44\uC6A9: ", data.averageCostPerVehicle?.toLocaleString(), "\uC6D0"] }) })] }));
    };
    // 정비 요약 보고서 렌더링
    const renderMaintenanceSummaryReport = (data) => {
        return (_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uC815\uBE44 \uC694\uC57D" }), _jsx(Paper, { sx: { p: 2, mb: 2 }, children: _jsxs(Typography, { variant: "body1", children: ["\uAE30\uAC04: ", data.period?.start, " ~ ", data.period?.end, _jsx("br", {}), "\uCD1D \uCC28\uB7C9 \uC218: ", data.overview?.totalVehicles, "\uB300", _jsx("br", {}), "\uCD1D \uC815\uBE44 \uAC74\uC218: ", data.overview?.totalMaintenances, "\uAC74", _jsx("br", {}), "\uCC28\uB7C9\uB2F9 \uD3C9\uADE0 \uC815\uBE44 \uAC74\uC218: ", data.overview?.averagePerVehicle, "\uAC74"] }) })] }));
    };
    // 정비 예측 보고서 렌더링
    const renderMaintenanceForecastReport = (data) => {
        return (_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uC815\uBE44 \uC608\uCE21" }), _jsx(Paper, { sx: { p: 2, mb: 2 }, children: _jsxs(Typography, { variant: "body1", children: ["\uC608\uC815\uB41C \uC815\uBE44: ", data.upcoming?.length || 0, "\uAC74", _jsx("br", {}), "\uC7A0\uC7AC\uC801 \uBB38\uC81C: ", data.potentialIssues?.length || 0, "\uAC74"] }) })] }));
    };
    return (_jsxs(Dialog, { open: open, onClose: onClose, fullWidth: true, maxWidth: "md", children: [_jsxs(DialogTitle, { children: [_jsx(Typography, { variant: "h6", children: report.title || report.name || '보고서 상세' }), _jsxs(Box, { sx: { display: 'flex', mt: 1 }, children: [_jsx(Chip, { label: getReportTypeName(report.type), color: "primary", size: "small", sx: { mr: 1 } }), _jsx(Chip, { label: new Date(report.createdAt).toLocaleDateString(), size: "small", variant: "outlined" }), isOfflineReport && (_jsx(Chip, { label: "\uC624\uD504\uB77C\uC778 \uC800\uC7A5", color: "secondary", size: "small", sx: { ml: 1 } }))] })] }), _jsx(Divider, {}), _jsxs(DialogContent, { children: [error && (_jsx(Paper, { sx: {
                            p: 2,
                            mb: 2,
                            bgcolor: 'error.light',
                            color: 'error.contrastText'
                        }, children: error })), _jsxs(Tabs, { value: tabValue, onChange: handleTabChange, sx: { mb: 2 }, children: [_jsx(Tab, { label: "\uBCF4\uACE0\uC11C \uB0B4\uC6A9", icon: _jsx(TableIcon, {}), iconPosition: "start" }), _jsx(Tab, { label: "\uC6D0\uBCF8 \uB370\uC774\uD130", icon: _jsx(JsonIcon, {}), iconPosition: "start" })] }), _jsx(TabPanel, { value: tabValue, index: 0, children: renderReportData() }), _jsx(TabPanel, { value: tabValue, index: 1, children: _jsx("pre", { style: {
                                overflow: 'auto',
                                maxHeight: '500px',
                                padding: '10px',
                                backgroundColor: '#f5f5f5'
                            }, children: JSON.stringify(isOfflineReport ? report.data : report.data, null, 2) }) })] }), _jsxs(DialogActions, { children: [_jsxs(Box, { sx: { display: 'flex', gap: 1, flexGrow: 1 }, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(PdfIcon, {}), onClick: () => handleExportReport(ReportFormat.PDF), disabled: isExporting, children: "PDF" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(DownloadIcon, {}), onClick: () => handleExportReport(ReportFormat.EXCEL), disabled: isExporting, children: "Excel" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(DownloadIcon, {}), onClick: () => handleExportReport(ReportFormat.JSON), disabled: isExporting, children: "JSON" })] }), isExporting && _jsx(CircularProgress, { size: 24, sx: { ml: 2 } }), _jsx(Button, { onClick: onClose, color: "inherit", children: "\uB2EB\uAE30" })] })] }));
};
export default ReportViewer;
