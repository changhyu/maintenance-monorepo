import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * 스크롤 가능한 대시보드 컴포넌트
 *
 * 제목, 컨텐츠, 그리고 스크롤이 가능한 영역을 제공합니다.
 */
const ScrDashboard = ({ title, children, loading = false, headerContent, footerContent, maxHeight = '500px', className = '' }) => {
    return (_jsxs("div", { className: `bg-white rounded-lg shadow overflow-hidden ${className}`, children: [_jsx("div", { className: "p-4 border-b border-gray-200", children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-800", children: title }), headerContent && _jsx("div", { children: headerContent })] }) }), _jsx("div", { className: "overflow-auto", style: { maxHeight }, children: loading ? (_jsx("div", { className: "flex justify-center items-center p-8", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" }) })) : (_jsx("div", { className: "p-4", children: children })) }), footerContent && (_jsx("div", { className: "p-3 bg-gray-50 border-t border-gray-200", children: footerContent }))] }));
};
export default ScrDashboard;
