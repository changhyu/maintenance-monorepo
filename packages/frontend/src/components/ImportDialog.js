import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useMemo, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Typography, Box, Alert, FormControl, InputLabel, Select, MenuItem, Tabs, Tab, TextField } from '@mui/material';
import { useImport } from '../hooks/useImport';
import { STORES } from '../utils/indexedDBUtils';

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (_jsx("div", { 
        role: "tabpanel", 
        hidden: value !== index, 
        id: `import-tabpanel-${index}`, 
        "aria-labelledby": `import-tab-${index}`,
        tabIndex: 0,
        ...other, 
        children: value === index && (_jsx(Box, { sx: { p: 3 }, children: children })) 
    }));
}

function a11yProps(index) {
    return {
        id: `import-tab-${index}`,
        'aria-controls': `import-tabpanel-${index}`,
        'aria-selected': false,
    };
}

export const ImportDialog = ({ open, onClose }) => {
    const [tabValue, setTabValue] = useState(0);
    const [sourceStore, setSourceStore] = useState('');
    const [targetStore, setTargetStore] = useState('');
    const [success, setSuccess] = useState(null);
    const fileInputRef = useRef(null);
    const { isImporting, importFromFile, importFromLocalStorage, mergeStores, error } = useImport();

    // 메모이제이션된 stores 배열
    const stores = useMemo(() => 
        Object.values(STORES).filter(store => 
            ![STORES.OFFLINE_MODE, STORES.PENDING_OPERATIONS].includes(store)
        ),
        []
    );

    const handleTabChange = useCallback((_event, newValue) => {
        setTabValue(newValue);
        setSuccess(null);
    }, []);

    const handleSourceStoreChange = useCallback((event) => {
        setSourceStore(event.target.value);
    }, []);

    const handleTargetStoreChange = useCallback((event) => {
        setTargetStore(event.target.value);
    }, []);

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
        if (!sourceStore || !targetStore) {
            return;
        }

        try {
            const count = await mergeStores(sourceStore, targetStore);
            setSuccess(`${count}개 항목이 성공적으로 병합되었습니다.`);
        } catch (err) {
            console.error('스토어 병합 중 오류 발생:', err);
        }
    };

    return (_jsxs(Dialog, { 
        open: open, 
        onClose: onClose, 
        maxWidth: "md", 
        fullWidth: true,
        "aria-labelledby": "import-dialog-title",
        children: [
            _jsx(DialogTitle, { id: "import-dialog-title", children: "데이터 가져오기" }), 
            _jsxs(DialogContent, { 
                children: [
                    _jsxs(Tabs, { 
                        value: tabValue, 
                        onChange: handleTabChange, 
                        "aria-label": "import options tabs",
                        variant: "fullWidth",
                        children: [
                            _jsx(Tab, { 
                                label: "파일에서 가져오기", 
                                ...a11yProps(0) 
                            }), 
                            _jsx(Tab, { 
                                label: "LocalStorage에서 가져오기", 
                                ...a11yProps(1) 
                            }), 
                            _jsx(Tab, { 
                                label: "스토어 병합", 
                                ...a11yProps(2) 
                            })
                        ] 
                    }), 
                    error && (_jsx(Alert, { 
                        severity: "error", 
                        sx: { mt: 2 }, 
                        children: error.message 
                    })), 
                    success && (_jsx(Alert, { 
                        severity: "success", 
                        sx: { mt: 2 }, 
                        children: success 
                    })), 
                    _jsxs(TabPanel, { 
                        value: tabValue, 
                        index: 0, 
                        children: [
                            _jsx(Typography, { 
                                variant: "body1", 
                                gutterBottom: true, 
                                children: "JSON 파일에서 데이터를 가져옵니다. 파일은 IndexedDB 스토어 구조와 일치해야 합니다." 
                            }), 
                            _jsx(Box, { 
                                sx: { mt: 2 }, 
                                children: _jsx(TextField, { 
                                    type: "file", 
                                    inputRef: fileInputRef, 
                                    fullWidth: true, 
                                    InputLabelProps: { shrink: true }, 
                                    inputProps: { accept: 'application/json' } 
                                }) 
                            }), 
                            _jsx(Box, { 
                                sx: { mt: 2 }, 
                                children: _jsx(Button, { 
                                    variant: "contained", 
                                    onClick: handleFileImport, 
                                    disabled: isImporting,
                                    "aria-label": "파일에서 데이터 가져오기",
                                    children: isImporting ? _jsx(CircularProgress, { size: 24 }) : '파일에서 가져오기' 
                                }) 
                            })
                        ] 
                    }), 
                    _jsxs(TabPanel, { 
                        value: tabValue, 
                        index: 1, 
                        children: [
                            _jsx(Typography, { 
                                variant: "body1", 
                                gutterBottom: true, 
                                children: "LocalStorage에 저장된 모든 애플리케이션 데이터를 IndexedDB로 가져옵니다." 
                            }), 
                            _jsx(Box, { 
                                sx: { mt: 2 }, 
                                children: _jsx(Button, { 
                                    variant: "contained", 
                                    onClick: handleLocalStorageImport, 
                                    disabled: isImporting,
                                    "aria-label": "LocalStorage에서 데이터 가져오기",
                                    children: isImporting ? _jsx(CircularProgress, { size: 24 }) : 'LocalStorage에서 가져오기' 
                                }) 
                            })
                        ] 
                    }), 
                    _jsxs(TabPanel, { 
                        value: tabValue, 
                        index: 2, 
                        children: [
                            _jsx(Typography, { 
                                variant: "body1", 
                                gutterBottom: true, 
                                children: "한 스토어의 데이터를 다른 스토어로 병합합니다. 기존 데이터는 덮어쓰지 않습니다." 
                            }), 
                            _jsxs(Box, { 
                                sx: { mt: 2, display: 'flex', gap: 2 }, 
                                children: [
                                    _jsxs(FormControl, { 
                                        fullWidth: true, 
                                        children: [
                                            _jsx(InputLabel, { children: "원본 스토어" }), 
                                            _jsx(Select, { 
                                                value: sourceStore, 
                                                label: "원본 스토어", 
                                                onChange: handleSourceStoreChange,
                                                "aria-label": "원본 스토어 선택",
                                                children: stores.map((store) => (_jsx(MenuItem, { value: store, children: store }, `source-${store}`))) 
                                            })
                                        ] 
                                    }), 
                                    _jsxs(FormControl, { 
                                        fullWidth: true, 
                                        children: [
                                            _jsx(InputLabel, { children: "대상 스토어" }), 
                                            _jsx(Select, { 
                                                value: targetStore, 
                                                label: "대상 스토어", 
                                                onChange: handleTargetStoreChange,
                                                "aria-label": "대상 스토어 선택",
                                                children: stores.map((store) => (_jsx(MenuItem, { value: store, children: store }, `target-${store}`))) 
                                            })
                                        ] 
                                    })
                                ] 
                            }), 
                            _jsx(Box, { 
                                sx: { mt: 2 }, 
                                children: _jsx(Button, { 
                                    variant: "contained", 
                                    onClick: handleMergeStores, 
                                    disabled: isImporting || !sourceStore || !targetStore || sourceStore === targetStore,
                                    "aria-label": "스토어 병합",
                                    children: isImporting ? _jsx(CircularProgress, { size: 24 }) : '스토어 병합' 
                                }) 
                            })
                        ] 
                    })
                ] 
            }), 
            _jsx(DialogActions, { 
                children: _jsx(Button, { 
                    onClick: onClose, 
                    children: "닫기" 
                }) 
            })
        ] 
    }));
};
