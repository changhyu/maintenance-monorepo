import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Typography, Box, Alert, FormControl, InputLabel, Select, MenuItem, Tabs, Tab, TextField } from '@mui/material';
import { useImport } from '../hooks/useImport';
import { STORES } from '../utils/indexedDBUtils';
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (_jsx("div", { role: "tabpanel", hidden: value !== index, id: `import-tabpanel-${index}`, "aria-labelledby": `import-tab-${index}`, ...other, children: value === index && (_jsx(Box, { sx: { p: 3 }, children: children })) }));
}
function a11yProps(index) {
    return {
        id: `import-tab-${index}`,
        'aria-controls': `import-tabpanel-${index}`,
    };
}
export const ImportDialog = ({ open, onClose }) => {
    const [tabValue, setTabValue] = useState(0);
    const [sourceStore, setSourceStore] = useState('');
    const [targetStore, setTargetStore] = useState('');
    const [success, setSuccess] = useState(null);
    const fileInputRef = useRef(null);
    const { isImporting, importFromFile, importFromLocalStorage, mergeStores, error } = useImport();
    const handleTabChange = (_event, newValue) => {
        setTabValue(newValue);
        setSuccess(null);
    };
    const handleFileImport = async () => {
        if (fileInputRef.current?.files?.length) {
            const file = fileInputRef.current.files[0];
            const result = await importFromFile(file);
            if (result) {
                setSuccess(`파일에서 데이터를 성공적으로 가져왔습니다: ${file.name}`);
            }
        }
    };
    const handleLocalStorageImport = async () => {
        const result = await importFromLocalStorage();
        if (result) {
            setSuccess('LocalStorage에서 데이터를 성공적으로 가져왔습니다.');
        }
    };
    const handleMergeStores = async () => {
        if (sourceStore && targetStore) {
            try {
                const count = await mergeStores(sourceStore, targetStore);
                setSuccess(`${count}개 항목이 성공적으로 병합되었습니다.`);
            }
            catch (err) {
                // 오류는 useImport 훅에서 처리됨
            }
        }
    };
    const stores = Object.values(STORES).filter(store => ![STORES.OFFLINE_MODE, STORES.PENDING_OPERATIONS].includes(store));
    return (_jsxs(Dialog, { open: open, onClose: onClose, maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: "\uB370\uC774\uD130 \uAC00\uC838\uC624\uAE30" }), _jsxs(DialogContent, { children: [_jsxs(Tabs, { value: tabValue, onChange: handleTabChange, "aria-label": "import options tabs", children: [_jsx(Tab, { label: "\uD30C\uC77C\uC5D0\uC11C \uAC00\uC838\uC624\uAE30", ...a11yProps(0) }), _jsx(Tab, { label: "LocalStorage\uC5D0\uC11C \uAC00\uC838\uC624\uAE30", ...a11yProps(1) }), _jsx(Tab, { label: "\uC2A4\uD1A0\uC5B4 \uBCD1\uD569", ...a11yProps(2) })] }), error && (_jsx(Alert, { severity: "error", sx: { mt: 2 }, children: error.message })), success && (_jsx(Alert, { severity: "success", sx: { mt: 2 }, children: success })), _jsxs(TabPanel, { value: tabValue, index: 0, children: [_jsx(Typography, { variant: "body1", gutterBottom: true, children: "JSON \uD30C\uC77C\uC5D0\uC11C \uB370\uC774\uD130\uB97C \uAC00\uC838\uC635\uB2C8\uB2E4. \uD30C\uC77C\uC740 IndexedDB \uC2A4\uD1A0\uC5B4 \uAD6C\uC870\uC640 \uC77C\uCE58\uD574\uC57C \uD569\uB2C8\uB2E4." }), _jsx(Box, { sx: { mt: 2 }, children: _jsx(TextField, { type: "file", inputRef: fileInputRef, fullWidth: true, InputLabelProps: { shrink: true }, inputProps: { accept: 'application/json' } }) }), _jsx(Box, { sx: { mt: 2 }, children: _jsx(Button, { variant: "contained", onClick: handleFileImport, disabled: isImporting, children: isImporting ? _jsx(CircularProgress, { size: 24 }) : '파일에서 가져오기' }) })] }), _jsxs(TabPanel, { value: tabValue, index: 1, children: [_jsx(Typography, { variant: "body1", gutterBottom: true, children: "LocalStorage\uC5D0 \uC800\uC7A5\uB41C \uBAA8\uB4E0 \uC560\uD50C\uB9AC\uCF00\uC774\uC158 \uB370\uC774\uD130\uB97C IndexedDB\uB85C \uAC00\uC838\uC635\uB2C8\uB2E4." }), _jsx(Box, { sx: { mt: 2 }, children: _jsx(Button, { variant: "contained", onClick: handleLocalStorageImport, disabled: isImporting, children: isImporting ? _jsx(CircularProgress, { size: 24 }) : 'LocalStorage에서 가져오기' }) })] }), _jsxs(TabPanel, { value: tabValue, index: 2, children: [_jsx(Typography, { variant: "body1", gutterBottom: true, children: "\uD55C \uC2A4\uD1A0\uC5B4\uC758 \uB370\uC774\uD130\uB97C \uB2E4\uB978 \uC2A4\uD1A0\uC5B4\uB85C \uBCD1\uD569\uD569\uB2C8\uB2E4. \uAE30\uC874 \uB370\uC774\uD130\uB294 \uB36E\uC5B4\uC4F0\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." }), _jsxs(Box, { sx: { mt: 2, display: 'flex', gap: 2 }, children: [_jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\uC6D0\uBCF8 \uC2A4\uD1A0\uC5B4" }), _jsx(Select, { value: sourceStore, label: "\uC6D0\uBCF8 \uC2A4\uD1A0\uC5B4", onChange: (e) => setSourceStore(e.target.value), children: stores.map((store) => (_jsx(MenuItem, { value: store, children: store }, `source-${store}`))) })] }), _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\uB300\uC0C1 \uC2A4\uD1A0\uC5B4" }), _jsx(Select, { value: targetStore, label: "\uB300\uC0C1 \uC2A4\uD1A0\uC5B4", onChange: (e) => setTargetStore(e.target.value), children: stores.map((store) => (_jsx(MenuItem, { value: store, children: store }, `target-${store}`))) })] })] }), _jsx(Box, { sx: { mt: 2 }, children: _jsx(Button, { variant: "contained", onClick: handleMergeStores, disabled: isImporting || !sourceStore || !targetStore || sourceStore === targetStore, children: isImporting ? _jsx(CircularProgress, { size: 24 }) : '스토어 병합' }) })] })] }), _jsx(DialogActions, { children: _jsx(Button, { onClick: onClose, children: "\uB2EB\uAE30" }) })] }));
};
