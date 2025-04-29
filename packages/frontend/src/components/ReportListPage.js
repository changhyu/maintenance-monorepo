import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Grid, Card, CardContent, Divider, Button, CircularProgress, Chip, Paper } from '@mui/material';
import { Storage as StorageIcon, CloudDownload as CloudIcon, Report as ReportIcon } from '@mui/icons-material';
import { exportService } from '../services/exportService';
import { reportService, ReportType } from '../services/reportService';
import { DataManagementSection } from './DataManagementSection';
// 탭 패널 컴포넌트
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (_jsx("div", { role: "tabpanel", hidden: value !== index, id: `report-tabpanel-${index}`, "aria-labelledby": `report-tab-${index}`, ...other, children: value === index && _jsx(Box, { sx: { p: 3 }, children: children }) }));
}
// 보고서 카드 컴포넌트
const ReportCard = ({ report, onView, onExport, onDelete }) => {
    return (_jsx(Card, { sx: { mb: 2 }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: report.title || report.name }), _jsxs(Box, { sx: { display: 'flex', mb: 2 }, children: [_jsx(Chip, { label: getReportTypeName(report.type), color: "primary", size: "small", sx: { mr: 1 } }), _jsx(Chip, { label: new Date(report.createdAt).toLocaleDateString(), size: "small", variant: "outlined" })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'flex-end', gap: 1 }, children: [_jsx(Button, { size: "small", onClick: () => onView(report), children: "\uC0C1\uC138 \uBCF4\uAE30" }), _jsx(Button, { size: "small", onClick: () => onExport(report), children: "\uB0B4\uBCF4\uB0B4\uAE30" }), _jsx(Button, { size: "small", color: "error", onClick: () => onDelete(report), children: "\uC0AD\uC81C" })] })] }) }));
};
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
 * 보고서 목록 페이지 컴포넌트
 */
const ReportListPage = () => {
    const [tabValue, setTabValue] = useState(0);
    const [onlineReports, setOnlineReports] = useState([]);
    const [offlineReports, setOfflineReports] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // 탭 변경 핸들러
    const handleTabChange = (_, newValue) => {
        setTabValue(newValue);
    };
    // 온라인 보고서 로드
    const loadOnlineReports = async () => {
        setIsLoading(true);
        try {
            const reports = await reportService.getReports();
            setOnlineReports(reports);
        }
        catch (error) {
            console.error('온라인 보고서 로드 실패:', error);
            setError('온라인 보고서를 불러오는 중 오류가 발생했습니다.');
        }
        finally {
            setIsLoading(false);
        }
    };
    // 오프라인 보고서 로드
    const loadOfflineReports = async () => {
        setIsLoading(true);
        try {
            const reports = await exportService.getReportsFromIndexedDB();
            setOfflineReports(reports);
        }
        catch (error) {
            console.error('오프라인 보고서 로드 실패:', error);
            setError('오프라인 보고서를 불러오는 중 오류가 발생했습니다.');
        }
        finally {
            setIsLoading(false);
        }
    };
    // 페이지 로드 시 보고서 데이터 로드
    useEffect(() => {
        loadOnlineReports();
        loadOfflineReports();
    }, []);
    // 보고서 상세 보기
    const handleViewReport = (report) => {
        // 상세 보기 구현
        console.log('보고서 상세 보기:', report);
    };
    // 보고서 내보내기
    const handleExportReport = (report) => {
        // 내보내기 구현
        console.log('보고서 내보내기:', report);
    };
    // 온라인 보고서 삭제
    const handleDeleteOnlineReport = async (report) => {
        try {
            await reportService.deleteReport(report.id);
            await loadOnlineReports();
        }
        catch (error) {
            console.error('보고서 삭제 실패:', error);
            setError('보고서 삭제 중 오류가 발생했습니다.');
        }
    };
    // 오프라인 보고서 삭제
    const handleDeleteOfflineReport = async (report) => {
        try {
            await exportService.deleteReportFromIndexedDB(report.id);
            await loadOfflineReports();
        }
        catch (error) {
            console.error('오프라인 보고서 삭제 실패:', error);
            setError('오프라인 보고서 삭제 중 오류가 발생했습니다.');
        }
    };
    return (_jsxs(Box, { sx: { width: '100%', p: 3 }, children: [_jsxs(Typography, { variant: "h4", gutterBottom: true, children: [_jsx(ReportIcon, { sx: { mr: 1, verticalAlign: 'middle' } }), "\uBCF4\uACE0\uC11C \uAD00\uB9AC"] }), _jsx(Divider, { sx: { mb: 3 } }), _jsxs(Tabs, { value: tabValue, onChange: handleTabChange, sx: { mb: 2 }, children: [_jsx(Tab, { label: "\uC628\uB77C\uC778 \uBCF4\uACE0\uC11C", icon: _jsx(CloudIcon, {}), iconPosition: "start" }), _jsx(Tab, { label: "\uC624\uD504\uB77C\uC778 \uC800\uC7A5 \uBCF4\uACE0\uC11C", icon: _jsx(StorageIcon, {}), iconPosition: "start" }), _jsx(Tab, { label: "\uB370\uC774\uD130 \uAD00\uB9AC", iconPosition: "start" })] }), error && (_jsx(Paper, { sx: {
                    p: 2,
                    mb: 2,
                    bgcolor: 'error.light',
                    color: 'error.contrastText'
                }, children: error })), _jsxs(TabPanel, { value: tabValue, index: 0, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uC628\uB77C\uC778 \uBCF4\uACE0\uC11C \uBAA9\uB85D" }), isLoading ? (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', p: 3 }, children: _jsx(CircularProgress, {}) })) : onlineReports.length > 0 ? (_jsx(Grid, { container: true, spacing: 2, children: onlineReports.map(report => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsx(ReportCard, { report: report, onView: handleViewReport, onExport: handleExportReport, onDelete: handleDeleteOnlineReport }) }, report.id))) })) : (_jsx(Box, { sx: { p: 3, textAlign: 'center' }, children: _jsx(Typography, { variant: "body1", children: "\uC800\uC7A5\uB41C \uC628\uB77C\uC778 \uBCF4\uACE0\uC11C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }) }))] }), _jsxs(TabPanel, { value: tabValue, index: 1, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uC624\uD504\uB77C\uC778 \uC800\uC7A5 \uBCF4\uACE0\uC11C \uBAA9\uB85D" }), isLoading ? (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', p: 3 }, children: _jsx(CircularProgress, {}) })) : offlineReports.length > 0 ? (_jsx(Grid, { container: true, spacing: 2, children: offlineReports.map(report => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsx(ReportCard, { report: report, onView: handleViewReport, onExport: handleExportReport, onDelete: handleDeleteOfflineReport }) }, report.id))) })) : (_jsx(Box, { sx: { p: 3, textAlign: 'center' }, children: _jsxs(Typography, { variant: "body1", children: ["\uC800\uC7A5\uB41C \uC624\uD504\uB77C\uC778 \uBCF4\uACE0\uC11C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.", _jsx("br", {}), "\uBCF4\uACE0\uC11C \uC0DD\uC131 \uC2DC 'IndexedDB\uC5D0 \uC800\uC7A5' \uC635\uC158\uC744 \uC120\uD0DD\uD558\uBA74 \uC624\uD504\uB77C\uC778\uC5D0\uC11C\uB3C4 \uC870\uD68C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."] }) }))] }), _jsx(TabPanel, { value: tabValue, index: 2, children: _jsx(DataManagementSection, {}) })] }));
};
export default ReportListPage;
