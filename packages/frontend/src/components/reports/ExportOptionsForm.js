import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Checkbox, Button, Grid, MenuItem, Select, Typography, Paper } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { ReportFormat } from '../../services/reportService';
/**
 * 보고서 내보내기 옵션 폼 컴포넌트
 */
const ExportOptionsForm = ({ onExport, isLoading = false, multipleReports = false }) => {
    // 내보내기 옵션 상태
    const [options, setOptions] = useState({
        format: ReportFormat.PDF,
        includeCharts: true,
        includeRawData: true,
        paperSize: 'a4',
        landscape: false,
        saveToIndexedDB: false
    });
    // 옵션 변경 핸들러
    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;
        setOptions(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };
    // 내보내기 형식 변경 핸들러
    const handleFormatChange = (e) => {
        const format = e.target.value;
        setOptions(prev => ({
            ...prev,
            format
        }));
    };
    // 내보내기 실행 핸들러
    const handleExport = () => {
        onExport(options);
    };
    return (_jsxs(Paper, { elevation: 2, sx: { p: 3, maxWidth: '600px', mx: 'auto', my: 2 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uBCF4\uACE0\uC11C \uB0B4\uBCF4\uB0B4\uAE30 \uC635\uC158" }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { size: { xs: 12 }, children: _jsxs(FormControl, { component: "fieldset", children: [_jsx(FormLabel, { component: "legend", children: "\uB0B4\uBCF4\uB0B4\uAE30 \uD615\uC2DD" }), _jsxs(RadioGroup, { row: true, name: "format", value: options.format, onChange: handleFormatChange, children: [_jsx(FormControlLabel, { value: ReportFormat.PDF, control: _jsx(Radio, {}), label: "PDF" }), _jsx(FormControlLabel, { value: ReportFormat.EXCEL, control: _jsx(Radio, {}), label: "Excel" }), _jsx(FormControlLabel, { value: ReportFormat.CSV, control: _jsx(Radio, {}), label: "CSV" }), _jsx(FormControlLabel, { value: ReportFormat.JSON, control: _jsx(Radio, {}), label: "JSON" })] })] }) }), options.format === ReportFormat.PDF && (_jsxs(_Fragment, { children: [_jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { fullWidth: true, variant: "outlined", children: [_jsx(FormLabel, { component: "legend", children: "\uC6A9\uC9C0 \uD06C\uAE30" }), _jsxs(Select, { name: "paperSize", value: options.paperSize, onChange: handleChange, children: [_jsx(MenuItem, { value: "a4", children: "A4" }), _jsx(MenuItem, { value: "letter", children: "Letter" }), _jsx(MenuItem, { value: "legal", children: "Legal" })] })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6 }, children: _jsxs(FormControl, { component: "fieldset", children: [_jsx(FormLabel, { component: "legend", children: "\uBC29\uD5A5" }), _jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: options.landscape, onChange: handleChange, name: "landscape" }), label: "\uAC00\uB85C \uBC29\uD5A5" })] }) })] })), _jsx(Grid, { size: { xs: 12 }, children: _jsxs(FormControl, { component: "fieldset", children: [_jsx(FormLabel, { component: "legend", children: "\uD3EC\uD568 \uD56D\uBAA9" }), _jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: options.includeCharts, onChange: handleChange, name: "includeCharts" }), label: "\uCC28\uD2B8 \uD3EC\uD568" }), _jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: options.includeRawData, onChange: handleChange, name: "includeRawData" }), label: "\uC6D0\uBCF8 \uB370\uC774\uD130 \uD3EC\uD568" }), _jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: options.saveToIndexedDB, onChange: handleChange, name: "saveToIndexedDB" }), label: "IndexedDB\uC5D0 \uC800\uC7A5 (\uC624\uD504\uB77C\uC778 \uC870\uD68C\uC6A9)" })] }) }), _jsx(Grid, { size: { xs: 12 }, children: _jsx(Box, { display: "flex", justifyContent: "flex-end", children: _jsx(Button, { variant: "contained", color: "primary", startIcon: _jsx(DownloadIcon, {}), onClick: handleExport, disabled: isLoading, children: isLoading
                                    ? '내보내는 중...'
                                    : multipleReports
                                        ? '선택한 보고서 내보내기'
                                        : '보고서 내보내기' }) }) })] })] }));
};
export default ExportOptionsForm;
