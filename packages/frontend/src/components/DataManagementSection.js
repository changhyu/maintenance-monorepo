import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Button, Card, CardContent, CardHeader, Divider, Grid, Typography, Alert, Tooltip } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import CachedIcon from '@mui/icons-material/Cached';
import { ImportDialog } from './ImportDialog';
import { ExportDialog } from './ExportDialog';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { STORES } from '../utils/indexedDBUtils';
/**
 * 데이터 관리 섹션 컴포넌트
 * IndexedDB 데이터 가져오기, 내보내기, 초기화 등의 기능 제공
 */
export const DataManagementSection = () => {
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);
    // 각 주요 스토어에 대한 IndexedDB 훅 사용
    const todosStore = useIndexedDB(STORES.TODOS);
    const vehiclesStore = useIndexedDB(STORES.VEHICLES);
    const settingsStore = useIndexedDB(STORES.USER_SETTINGS);
    // 성공/오류 메시지 리셋
    const resetMessages = () => {
        setSuccess(null);
        setError(null);
    };
    // 특정 저장소 초기화
    const handleClearStore = async (storeName) => {
        resetMessages();
        try {
            let store;
            switch (storeName) {
                case STORES.TODOS:
                    store = todosStore;
                    break;
                case STORES.VEHICLES:
                    store = vehiclesStore;
                    break;
                case STORES.USER_SETTINGS:
                    store = settingsStore;
                    break;
                default:
                    throw new Error('지원되지 않는 저장소입니다.');
            }
            await store.clearAll();
            setSuccess(`${storeName} 데이터가 성공적으로 초기화되었습니다.`);
        }
        catch (err) {
            setError(`${storeName} 초기화 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
        }
    };
    // 새로고침 기능
    const handleRefresh = async () => {
        resetMessages();
        try {
            await Promise.all([
                todosStore.fetchAll(),
                vehiclesStore.fetchAll(),
                settingsStore.fetchAll()
            ]);
            setSuccess('데이터가 성공적으로 새로고침되었습니다.');
        }
        catch (err) {
            setError(`데이터 새로고침 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
        }
    };
    return (_jsxs(Card, { children: [_jsx(CardHeader, { title: "\uB370\uC774\uD130 \uAD00\uB9AC", subheader: "\uC624\uD504\uB77C\uC778 \uB370\uC774\uD130 \uAC00\uC838\uC624\uAE30, \uB0B4\uBCF4\uB0B4\uAE30 \uBC0F \uCD08\uAE30\uD654" }), _jsx(Divider, {}), _jsxs(CardContent, { children: [success && (_jsx(Alert, { severity: "success", sx: { mb: 2 }, onClose: () => setSuccess(null), children: success })), error && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, onClose: () => setError(null), children: error })), _jsxs(Grid, { container: true, spacing: 2, children: [_jsxs(Grid, { item: true, xs: 12, children: [_jsx(Typography, { variant: "subtitle1", gutterBottom: true, children: "\uB370\uC774\uD130 \uAC00\uC838\uC624\uAE30/\uB0B4\uBCF4\uB0B4\uAE30" }), _jsxs(Box, { sx: { display: 'flex', gap: 2 }, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(UploadIcon, {}), onClick: () => setImportDialogOpen(true), children: "\uB370\uC774\uD130 \uAC00\uC838\uC624\uAE30" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(DownloadIcon, {}), onClick: () => setExportDialogOpen(true), children: "\uB370\uC774\uD130 \uB0B4\uBCF4\uB0B4\uAE30" }), _jsx(Tooltip, { title: "\uBAA8\uB4E0 \uB370\uC774\uD130\uB97C \uC0C8\uB85C\uACE0\uCE68\uD569\uB2C8\uB2E4", children: _jsx(Button, { variant: "outlined", startIcon: _jsx(CachedIcon, {}), onClick: handleRefresh, children: "\uC0C8\uB85C\uACE0\uCE68" }) })] })] }), _jsxs(Grid, { item: true, xs: 12, sx: { mt: 2 }, children: [_jsx(Typography, { variant: "subtitle1", gutterBottom: true, children: "\uB370\uC774\uD130 \uCD08\uAE30\uD654" }), _jsxs(Box, { sx: { display: 'flex', gap: 2 }, children: [_jsx(Tooltip, { title: "\uBAA8\uB4E0 \uD560 \uC77C \uD56D\uBAA9 \uB370\uC774\uD130\uB97C \uC0AD\uC81C\uD569\uB2C8\uB2E4", children: _jsx(Button, { variant: "outlined", color: "error", startIcon: _jsx(DeleteIcon, {}), onClick: () => handleClearStore(STORES.TODOS), children: "\uD560 \uC77C \uD56D\uBAA9 \uCD08\uAE30\uD654" }) }), _jsx(Tooltip, { title: "\uBAA8\uB4E0 \uCC28\uB7C9 \uC815\uBCF4 \uB370\uC774\uD130\uB97C \uC0AD\uC81C\uD569\uB2C8\uB2E4", children: _jsx(Button, { variant: "outlined", color: "error", startIcon: _jsx(DeleteIcon, {}), onClick: () => handleClearStore(STORES.VEHICLES), children: "\uCC28\uB7C9 \uC815\uBCF4 \uCD08\uAE30\uD654" }) }), _jsx(Tooltip, { title: "\uBAA8\uB4E0 \uC0AC\uC6A9\uC790 \uC124\uC815\uC744 \uC0AD\uC81C\uD569\uB2C8\uB2E4", children: _jsx(Button, { variant: "outlined", color: "error", startIcon: _jsx(DeleteIcon, {}), onClick: () => handleClearStore(STORES.USER_SETTINGS), children: "\uC124\uC815 \uCD08\uAE30\uD654" }) })] })] }), _jsx(Grid, { item: true, xs: 12, sx: { mt: 2 }, children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\uCC38\uACE0: \uB370\uC774\uD130 \uCD08\uAE30\uD654 \uC2DC \uD574\uB2F9 \uD56D\uBAA9\uC758 \uBAA8\uB4E0 \uC815\uBCF4\uAC00 \uC601\uAD6C\uC801\uC73C\uB85C \uC0AD\uC81C\uB429\uB2C8\uB2E4. \uC911\uC694\uD55C \uB370\uC774\uD130\uB294 \uBBF8\uB9AC \uB0B4\uBCF4\uB0B4\uAE30 \uAE30\uB2A5\uC744 \uD1B5\uD574 \uBC31\uC5C5\uD558\uC138\uC694." }) })] })] }), _jsx(ImportDialog, { open: importDialogOpen, onClose: () => setImportDialogOpen(false) }), _jsx(ExportDialog, { open: exportDialogOpen, onClose: () => setExportDialogOpen(false) })] }));
};
