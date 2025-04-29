import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Card, Switch, Typography, Divider, Badge, Space, Tabs } from 'antd';
import { CloudOutlined, DisconnectOutlined, CloudDownloadOutlined, WarningOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useOfflineMode, usePendingOperations } from '../hooks/useIndexedDB';
import OfflineDataExport from './OfflineDataExport';
import useNetwork from '../hooks/useNetwork';
const { Text, Title } = Typography;
const { TabPane } = Tabs;
/**
 * 오프라인 모드 설정 및 상태 컴포넌트
 */
const OfflineMode = ({ className }) => {
    const { isOffline, setOfflineMode, isNetworkOnline } = useOfflineMode();
    const { pendingOperations, isLoading } = usePendingOperations();
    const network = useNetwork();
    // 네트워크 상태가 변경되면 오프라인 모드 설정 업데이트
    useEffect(() => {
        if (!network.isOnline && !isOffline) {
            setOfflineMode(true);
        }
    }, [network.isOnline, isOffline, setOfflineMode]);
    const handleToggleOfflineMode = async (checked) => {
        await setOfflineMode(checked);
    };
    const pendingCount = pendingOperations?.length || 0;
    return (_jsx(Card, { className: className, title: _jsxs(Space, { children: [isOffline ? _jsx(DisconnectOutlined, {}) : _jsx(CloudOutlined, {}), _jsx("span", { children: "\uC624\uD504\uB77C\uC778 \uBAA8\uB4DC" }), pendingCount > 0 && (_jsx(Badge, { count: pendingCount, size: "small" }))] }), children: _jsxs(Tabs, { defaultActiveKey: "settings", children: [_jsxs(TabPane, { tab: _jsxs("span", { children: [_jsx(CloudOutlined, {}), "\uC124\uC815"] }), children: [_jsx("div", { style: { marginBottom: 16 }, children: _jsxs(Space, { direction: "vertical", children: [_jsxs(Space, { children: [_jsx(Text, { children: "\uC624\uD504\uB77C\uC778 \uBAA8\uB4DC:" }), _jsx(Switch, { checked: isOffline, onChange: handleToggleOfflineMode, checkedChildren: "\uD65C\uC131\uD654", unCheckedChildren: "\uBE44\uD65C\uC131\uD654" })] }), _jsxs(Text, { type: isNetworkOnline ? "success" : "danger", children: ["\uB124\uD2B8\uC6CC\uD06C \uC0C1\uD0DC: ", isNetworkOnline ? "온라인" : "오프라인"] }), network.connectionType && (_jsxs(Text, { type: "secondary", children: ["\uC5F0\uACB0 \uC720\uD615: ", network.connectionType, " (", network.effectiveType, ")"] }))] }) }), _jsx(Divider, {}), _jsxs("div", { children: [_jsx(Title, { level: 5, children: _jsxs(Space, { children: [_jsx(CloudDownloadOutlined, {}), _jsx("span", { children: "\uB300\uAE30 \uC911\uC778 \uC791\uC5C5" }), _jsx(Badge, { count: pendingCount, style: { backgroundColor: pendingCount > 0 ? '#ff4d4f' : '#52c41a' } })] }) }), _jsx("div", { style: { marginTop: 8 }, children: pendingCount > 0 ? (_jsxs(Text, { children: [pendingCount, "\uAC1C\uC758 \uBCC0\uACBD\uC0AC\uD56D\uC774 \uC800\uC7A5\uB418\uC5B4 \uC788\uC73C\uBA70, \uC628\uB77C\uC778 \uC0C1\uD0DC\uAC00 \uB418\uBA74 \uB3D9\uAE30\uD654\uB429\uB2C8\uB2E4."] })) : (_jsx(Text, { type: "secondary", children: "\uB300\uAE30 \uC911\uC778 \uC791\uC5C5\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })) }), !isNetworkOnline && isOffline && (_jsx("div", { style: { marginTop: 16 }, children: _jsx(Badge, { status: "warning", text: _jsxs(Text, { type: "warning", children: [_jsx(WarningOutlined, {}), " \uC624\uD504\uB77C\uC778 \uC0C1\uD0DC\uC785\uB2C8\uB2E4. \uB370\uC774\uD130\uAC00 \uC11C\uBC84\uC5D0 \uB3D9\uAE30\uD654\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."] }) }) }))] })] }, "settings"), _jsx(TabPane, { tab: _jsxs("span", { children: [_jsx(DatabaseOutlined, {}), "\uB370\uC774\uD130 \uB0B4\uBCF4\uB0B4\uAE30"] }), children: _jsx(OfflineDataExport, {}) }, "export")] }) }));
};
export default OfflineMode;
