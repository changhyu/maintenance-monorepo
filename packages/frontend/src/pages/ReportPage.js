import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FileTextOutlined, HomeOutlined } from '@ant-design/icons';
import { Typography, Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';
import ReportDashboard from '../components/ReportDashboard';
import '../components/reports/styles.css';
const { Title } = Typography;
/**
 * 정비 보고서 페이지
 */
const ReportPage = () => {
    return (_jsxs("div", { className: "report-page", children: [_jsxs(Breadcrumb, { style: { marginBottom: 16 }, children: [_jsx(Breadcrumb.Item, { children: _jsx(Link, { to: "/", children: _jsx(HomeOutlined, {}) }) }), _jsxs(Breadcrumb.Item, { children: [_jsx(FileTextOutlined, {}), _jsx("span", { style: { marginLeft: 8 }, children: "\uBCF4\uACE0\uC11C" })] })] }), _jsx(Title, { level: 2, style: { marginBottom: 24 }, children: "\uC815\uBE44 \uBCF4\uACE0\uC11C" }), _jsx(ReportDashboard, {})] }));
};
export default ReportPage;
