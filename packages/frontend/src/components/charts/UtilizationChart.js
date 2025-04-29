import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * 차량 활용률 차트 컴포넌트
 */
const UtilizationChart = ({ data, height = 300, isLoading = false, title = '차량 활용률' }) => {
    // 데이터가 없거나 로딩 중인 경우
    if (isLoading) {
        return (_jsx("div", { className: "bg-white rounded-lg shadow p-4 h-full flex items-center justify-center", children: _jsx("div", { className: "animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" }) }));
    }
    if (!data) {
        return (_jsxs("div", { className: "bg-white rounded-lg shadow p-4 h-full flex flex-col", children: [_jsx("h3", { className: "text-lg font-medium text-gray-800 mb-2", children: title }), _jsx("div", { className: "flex-grow flex items-center justify-center", children: _jsx("p", { className: "text-gray-500", children: "\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" }) })] }));
    }
    // 활용률 변화에 따른 색상과 아이콘
    const getChangeColor = () => {
        if (!data.change)
            return 'text-gray-500';
        return data.change > 0 ? 'text-green-500' : data.change < 0 ? 'text-red-500' : 'text-gray-500';
    };
    const getChangeIcon = () => {
        if (!data.change)
            return null;
        return data.change > 0 ? (_jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 10l7-7m0 0l7 7m-7-7v18" }) })) : data.change < 0 ? (_jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 14l-7 7m0 0l-7-7m7 7V3" }) })) : null;
    };
    // 게이지 색상
    const gaugeColor = data.color || '#3B82F6'; // 기본 파란색
    return (_jsxs("div", { className: "bg-white rounded-lg shadow p-4 h-full", children: [_jsx("h3", { className: "text-lg font-medium text-gray-800 mb-4", children: title }), _jsxs("div", { className: "mt-8", children: [_jsx("div", { className: "flex justify-center items-center mb-4", children: _jsxs("div", { className: "w-36 h-36 relative", children: [_jsxs("svg", { viewBox: "0 0 100 100", className: "w-full h-full", children: [_jsx("circle", { cx: "50", cy: "50", r: "45", fill: "none", stroke: "#F3F4F6", strokeWidth: "10" }), _jsx("circle", { cx: "50", cy: "50", r: "45", fill: "none", stroke: gaugeColor, strokeWidth: "10", strokeDasharray: `${data.value * 2.83} 283`, strokeDashoffset: "0", transform: "rotate(-90 50 50)" })] }), _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: [_jsxs("span", { className: "text-3xl font-bold text-gray-800", children: [data.value, "%"] }), data.label && _jsx("span", { className: "text-sm text-gray-500 mt-1", children: data.label })] })] }) }), data.previousValue !== undefined && (_jsxs("div", { className: "flex justify-center items-center mt-2", children: [_jsxs("span", { className: "text-sm text-gray-500 mr-2", children: ["\uC774\uC804: ", data.previousValue, "%"] }), data.change !== undefined && (_jsxs("div", { className: `flex items-center ${getChangeColor()}`, children: [getChangeIcon(), _jsxs("span", { className: "ml-1", children: [data.change > 0 ? '+' : '', data.change, "%"] })] }))] }))] }), _jsxs("div", { className: "mt-6", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("div", { className: "w-full bg-gray-200 rounded-full h-2.5", children: _jsx("div", { className: "h-2.5 rounded-full", style: {
                                        width: `${Math.min(100, data.value)}%`,
                                        backgroundColor: gaugeColor
                                    } }) }), _jsxs("span", { className: "text-sm font-medium text-gray-700 w-16 text-right", children: [data.value, "%"] })] }), data.change !== undefined && (_jsxs("p", { className: `text-sm ${getChangeColor()} mt-2 flex items-center`, children: [getChangeIcon(), _jsxs("span", { className: "ml-1", children: ["\uC804\uC6D4 \uB300\uBE44 ", data.change > 0 ? '+' : '', data.change, "%"] })] }))] })] }));
};
export default UtilizationChart;
