import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Typography, Box, Alert, FormControl, InputLabel, Select, MenuItem, Tabs, Tab, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import { useExport } from '../hooks/useExport';
import { STORES } from '../utils/indexedDBUtils';
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (_jsx("div", { role: "tabpanel", hidden: value !== index, id: `export-tabpanel-${index}`, "aria-labelledby": `export-tab-${index}`, ...other, children: value === index && (_jsx(Box, { sx: { p: 3 }, children: children })) }));
}
function a11yProps(index) {
    return {
        id: `export-tab-${index}`,
        'aria-controls': `export-tabpanel-${index}`,
    };
}
export const ExportDialog = ({ open, onClose }) => {
    const [tabValue, setTabValue] = useState(0);
    const [selectedStore, setSelectedStore] = useState('');
    const [exportFormat, setExportFormat] = useState('json');
    const [success, setSuccess] = useState(null);
    const { isExporting, exportStore, exportAllOfflineData, error } = useExport();
    const handleTabChange = (_event, newValue) => {
        setTabValue(newValue);
        setSuccess(null);
    };
    const handleFormatChange = (event) => {
        setExportFormat(event.target.value);
    };
    const handleExportStore = async () => {
        if (selectedStore) {
            const result = await exportStore(selectedStore, `${selectedStore}_export`, exportFormat);
            if (result) {
                setSuccess(`${selectedStore} 스토어를 ${exportFormat} 형식으로 내보내기 완료했습니다.`);
            }
        }
    };
    const handleExportAllData = async () => {
        const result = await exportAllOfflineData(exportFormat);
        if (result) {
            setSuccess(`모든 오프라인 데이터를 ${exportFormat} 형식으로 내보내기 완료했습니다.`);
        }
    };
    const stores = Object.values(STORES);
    return (_jsxs(Dialog, { open: open, onClose: onClose, maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: "\uB370\uC774\uD130 \uB0B4\uBCF4\uB0B4\uAE30" }), _jsxs(DialogContent, { children: [_jsxs(Tabs, { value: tabValue, onChange: handleTabChange, "aria-label": "export options tabs", children: [_jsx(Tab, { label: "\uD2B9\uC815 \uC2A4\uD1A0\uC5B4 \uB0B4\uBCF4\uB0B4\uAE30", ...a11yProps(0) }), _jsx(Tab, { label: "\uBAA8\uB4E0 \uB370\uC774\uD130 \uB0B4\uBCF4\uB0B4\uAE30", ...a11yProps(1) })] }), error && (_jsx(Alert, { severity: "error", sx: { mt: 2 }, children: error.message })), success && (_jsx(Alert, { severity: "success", sx: { mt: 2 }, children: success })), _jsxs(Box, { sx: { mt: 2, mb: 2 }, children: [_jsx(Typography, { variant: "subtitle1", gutterBottom: true, children: "\uB0B4\uBCF4\uB0B4\uAE30 \uD615\uC2DD \uC120\uD0DD" }), _jsxs(RadioGroup, { row: true, name: "export-format", value: exportFormat, onChange: handleFormatChange, children: [_jsx(FormControlLabel, { value: "json", control: _jsx(Radio, {}), label: "JSON" }), _jsx(FormControlLabel, { value: "csv", control: _jsx(Radio, {}), label: "CSV" }), _jsx(FormControlLabel, { value: "excel", control: _jsx(Radio, {}), label: "Excel" }), _jsx(FormControlLabel, { value: "pdf", control: _jsx(Radio, {}), label: "PDF" })] })] }), _jsxs(TabPanel, { value: tabValue, index: 0, children: [_jsx(Typography, { variant: "body1", gutterBottom: true, children: "\uD2B9\uC815 IndexedDB \uC2A4\uD1A0\uC5B4\uC758 \uB370\uC774\uD130\uB97C \uB0B4\uBCF4\uB0C5\uB2C8\uB2E4." }), _jsx(Box, { sx: { mt: 2 }, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\uC2A4\uD1A0\uC5B4 \uC120\uD0DD" }), _jsx(Select, { value: selectedStore, label: "\uC2A4\uD1A0\uC5B4 \uC120\uD0DD", onChange: (e) => setSelectedStore(e.target.value), children: stores.map((store) => (_jsx(MenuItem, { value: store, children: store }, store))) })] }) }), _jsx(Box, { sx: { mt: 2 }, children: _jsx(Button, { variant: "contained", onClick: handleExportStore, disabled: isExporting || !selectedStore, children: isExporting ? _jsx(CircularProgress, { size: 24 }) : '스토어 내보내기' }) })] }), _jsxs(TabPanel, { value: tabValue, index: 1, children: [_jsx(Typography, { variant: "body1", gutterBottom: true, children: "\uBAA8\uB4E0 IndexedDB \uC2A4\uD1A0\uC5B4 \uB370\uC774\uD130\uC640 \uC9C4\uB2E8 \uC815\uBCF4\uB97C \uD558\uB098\uC758 \uD30C\uC77C\uB85C \uB0B4\uBCF4\uB0C5\uB2C8\uB2E4." }), _jsx(Box, { sx: { mt: 2 }, children: _jsx(Button, { variant: "contained", onClick: handleExportAllData, disabled: isExporting, children: isExporting ? _jsx(CircularProgress, { size: 24 }) : '모든 데이터 내보내기' }) })] })] }), _jsx(DialogActions, { children: _jsx(Button, { onClick: onClose, children: "\uB2EB\uAE30" }) })] }));
};
