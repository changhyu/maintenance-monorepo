import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * 데이터 대시보드 컴포넌트
 *
 * 데이터 항목을 그리드 형태로 표시하는 스크롤 가능한 대시보드
 */
const ScrDataDashboard = ({ title, data, loading = false, columns = 2, headerContent, className = '' }) => {
    const gridCols = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    };
    return (_jsxs("div", { className: `bg-white rounded-lg shadow p-5 ${className}`, children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h2", { className: "text-lg font-medium text-gray-800", children: title }), headerContent && _jsx("div", { children: headerContent })] }), loading ? (_jsx("div", { className: "flex justify-center items-center h-40", children: _jsx("div", { className: "animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" }) })) : (_jsx("div", { className: `grid ${gridCols[columns]} gap-4`, children: data.map((item, index) => (_jsxs("div", { className: "bg-gray-50 rounded-lg p-4 border border-gray-100", children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 mb-1", children: item.label || item.title }), _jsxs("div", { className: "flex justify-between items-end", children: [_jsxs("div", { className: "text-2xl font-semibold text-gray-800 flex items-baseline", children: [typeof item.value === 'number' ? item.value.toLocaleString() : item.value, item.color && (_jsx("span", { className: "ml-2 h-2 w-2 rounded-full inline-block", style: { backgroundColor: getColorValue(item.color) } }))] }), item.change !== undefined && (_jsxs("div", { className: `text-sm font-medium ${item.change > 0
                                        ? 'text-green-500'
                                        : item.change < 0
                                            ? 'text-red-500'
                                            : 'text-gray-500'}`, children: [item.change > 0 ? '+' : '', item.change, "%", item.changeLabel && (_jsx("span", { className: "text-xs text-gray-400 block", children: item.changeLabel }))] }))] })] }, item.id || `dashboard-item-${index}`))) }))] }));
};
const getColorValue = (color) => {
    switch (color) {
        case 'red':
            return '#ef4444';
        case 'green':
            return '#10b981';
        case 'blue':
            return '#3b82f6';
        case 'yellow':
            return '#f59e0b';
        case 'purple':
            return '#9333ea';
        case 'gray':
            return '#6b7280';
        default:
            return '#6b7280';
    }
};
export default ScrDataDashboard;
