import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, Checkbox, List, ListItem, ListItemText, ListItemIcon, CircularProgress, Alert, Paper, Divider } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { exportService } from '../../services/exportService';
import ExportOptionsForm from './ExportOptionsForm';
/**
 * 여러 보고서를 한꺼번에 내보내기 위한 컴포넌트
 */
const ReportBatchExport = ({ reports, isOpen, onClose }) => {
    const [selectedReports, setSelectedReports] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);
    // 모든 보고서 선택/해제
    const handleSelectAll = () => {
        if (selectedReports.length === reports.length) {
            setSelectedReports([]);
        }
        else {
            setSelectedReports([...reports]);
        }
    };
    // 개별 보고서 선택/해제
    const handleToggleReport = (report) => {
        const currentIndex = selectedReports.findIndex(r => r.id === report.id);
        const newSelected = [...selectedReports];
        if (currentIndex === -1) {
            newSelected.push(report);
        }
        else {
            newSelected.splice(currentIndex, 1);
        }
        setSelectedReports(newSelected);
    };
    // 보고서 유형에 따라 표시 이름 반환
    const getReportTypeName = (type) => {
        const typeMap = {
            completion_rate: '완료율 보고서',
            vehicle_history: '차량 정비 이력 보고서',
            cost_analysis: '비용 분석 보고서',
            maintenance_summary: '정비 요약 보고서',
            maintenance_forecast: '정비 예측 보고서',
            vehicle_utilization: '차량 활용도 보고서',
            maintenance_completion_rate: '정비 완료율 보고서',
            predictive_maintenance: '예측 정비 보고서',
            parts_usage: '부품 사용 보고서'
        };
        return typeMap[type] || '알 수 없는 보고서';
    };
    // 내보내기 실행
    const handleExport = async (options) => {
        if (selectedReports.length === 0) {
            setError('내보낼 보고서를 하나 이상 선택해주세요.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setIsSuccess(false);
        try {
            await exportService.exportMultipleReports(selectedReports, options);
            setIsSuccess(true);
            setTimeout(() => {
                onClose();
                setIsSuccess(false);
            }, 1500);
        }
        catch (error) {
            console.error('보고서 내보내기 실패:', error);
            setError('보고서 내보내기 중 오류가 발생했습니다.');
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsxs(Dialog, { open: isOpen, onClose: onClose, fullWidth: true, maxWidth: "md", children: [_jsx(DialogTitle, { children: _jsxs(Typography, { variant: "h6", children: [_jsx(DownloadIcon, { sx: { verticalAlign: 'middle', mr: 1 } }), "\uB2E4\uC911 \uBCF4\uACE0\uC11C \uB0B4\uBCF4\uB0B4\uAE30"] }) }), _jsxs(DialogContent, { children: [error && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, children: error })), isSuccess && (_jsx(Alert, { severity: "success", sx: { mb: 2 }, children: "\uBCF4\uACE0\uC11C \uB0B4\uBCF4\uB0B4\uAE30\uAC00 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4." })), _jsxs(Paper, { elevation: 1, sx: { p: 2, mb: 3 }, children: [_jsxs(Typography, { variant: "subtitle1", gutterBottom: true, children: ["\uB0B4\uBCF4\uB0BC \uBCF4\uACE0\uC11C \uC120\uD0DD", _jsx(Button, { size: "small", onClick: handleSelectAll, sx: { ml: 2 }, children: selectedReports.length === reports.length ? '모두 해제' : '모두 선택' })] }), _jsxs(List, { sx: { maxHeight: '250px', overflow: 'auto', bgcolor: 'background.paper' }, children: [reports.map((report) => (_jsxs(ListItem, { dense: true, component: "div", onClick: () => handleToggleReport(report), sx: { cursor: 'pointer' }, children: [_jsx(ListItemIcon, { children: _jsx(Checkbox, { edge: "start", checked: selectedReports.some(r => r.id === report.id), tabIndex: -1, disableRipple: true }) }), _jsx(ListItemText, { primary: report.title, secondary: `${getReportTypeName(report.type)} - ${new Date(report.createdAt).toLocaleDateString()}` })] }, report.id))), reports.length === 0 && (_jsx(ListItem, { component: "div", children: _jsx(ListItemText, { primary: "\uB0B4\uBCF4\uB0BC \uC218 \uC788\uB294 \uBCF4\uACE0\uC11C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }) }))] })] }), _jsx(Divider, { sx: { my: 2 } }), _jsx(ExportOptionsForm, { onExport: handleExport, isLoading: isLoading, multipleReports: true })] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: onClose, color: "inherit", disabled: isLoading, children: "\uCDE8\uC18C" }), isLoading && _jsx(CircularProgress, { size: 24, sx: { ml: 2 } })] })] }));
};
export default ReportBatchExport;
