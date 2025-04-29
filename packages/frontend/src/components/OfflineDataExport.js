import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Select, message, Spin, Card, Typography, Space, Divider } from 'antd';
import { DownloadOutlined, DatabaseOutlined, SyncOutlined } from '@ant-design/icons';
import { useExport } from '../hooks/useExport';
const { Title, Text } = Typography;
const { Option } = Select;
/**
 * 오프라인 데이터 내보내기 컴포넌트
 */
const OfflineDataExport = ({ className }) => {
    const [format, setFormat] = useState('json');
    const { isExporting, exportTodoCache, exportVehicleCache, exportPendingOperations, exportAllOfflineData } = useExport();
    const formatOptions = [
        { value: 'json', label: 'JSON 형식' },
        { value: 'csv', label: 'CSV 형식' },
        { value: 'excel', label: 'Excel 형식' },
    ];
    const handleFormatChange = (value) => {
        setFormat(value);
    };
    const handleExportTodos = async () => {
        const success = await exportTodoCache(format);
        if (success) {
            message.success('투두 데이터 내보내기 완료');
        }
        else {
            message.error('투두 데이터 내보내기 실패');
        }
    };
    const handleExportVehicles = async () => {
        const success = await exportVehicleCache(format);
        if (success) {
            message.success('차량 데이터 내보내기 완료');
        }
        else {
            message.error('차량 데이터 내보내기 실패');
        }
    };
    const handleExportPendingOperations = async () => {
        const success = await exportPendingOperations(format);
        if (success) {
            message.success('대기 중인 작업 내보내기 완료');
        }
        else {
            message.error('대기 중인 작업 내보내기 실패');
        }
    };
    const handleExportAllData = async () => {
        const success = await exportAllOfflineData(format);
        if (success) {
            message.success('모든 오프라인 데이터 내보내기 완료');
        }
        else {
            message.error('오프라인 데이터 내보내기 실패');
        }
    };
    return (_jsx(Card, { className: className, title: _jsxs(Space, { children: [_jsx(DatabaseOutlined, {}), _jsx("span", { children: "\uC624\uD504\uB77C\uC778 \uB370\uC774\uD130 \uB0B4\uBCF4\uB0B4\uAE30" })] }), children: _jsxs(Spin, { spinning: isExporting, children: [_jsx("div", { style: { marginBottom: 20 }, children: _jsx(Text, { children: "\uC624\uD504\uB77C\uC778 \uBAA8\uB4DC\uC5D0\uC11C \uCE90\uC2DC\uB41C \uB370\uC774\uD130\uB97C \uB0B4\uBCF4\uB0B4\uACE0 \uBC31\uC5C5\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }) }), _jsxs("div", { style: { marginBottom: 20 }, children: [_jsx(Text, { strong: true, children: "\uB0B4\uBCF4\uB0B4\uAE30 \uD615\uC2DD:" }), _jsx(Select, { style: { width: 150, marginLeft: 10 }, value: format, onChange: handleFormatChange, options: formatOptions })] }), _jsx(Divider, {}), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: [_jsx(Button, { type: "default", icon: _jsx(DownloadOutlined, {}), onClick: handleExportTodos, disabled: isExporting, children: "\uD22C\uB450 \uB370\uC774\uD130 \uB0B4\uBCF4\uB0B4\uAE30" }), _jsx(Button, { type: "default", icon: _jsx(DownloadOutlined, {}), onClick: handleExportVehicles, disabled: isExporting, children: "\uCC28\uB7C9 \uB370\uC774\uD130 \uB0B4\uBCF4\uB0B4\uAE30" }), _jsx(Button, { type: "default", icon: _jsx(SyncOutlined, {}), onClick: handleExportPendingOperations, disabled: isExporting, children: "\uB300\uAE30 \uC911\uC778 \uC791\uC5C5 \uB0B4\uBCF4\uB0B4\uAE30" }), _jsx(Divider, {}), _jsx(Button, { type: "primary", icon: _jsx(DownloadOutlined, {}), onClick: handleExportAllData, disabled: isExporting, children: "\uBAA8\uB4E0 \uC624\uD504\uB77C\uC778 \uB370\uC774\uD130 \uB0B4\uBCF4\uB0B4\uAE30" })] })] }) }));
};
export default OfflineDataExport;
