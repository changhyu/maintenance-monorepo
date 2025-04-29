import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Pie } from '@ant-design/plots';
/**
 * 차량 유형 분포를 시각화하는 파이 차트 컴포넌트
 */
const VehicleTypeChart = ({ data, isLoading = false, title }) => {
    const config = {
        data,
        angleField: 'value',
        colorField: 'label',
        radius: 0.8,
        label: {
            type: 'outer',
            content: '{name}: {percentage}'
        },
        interactions: [
            {
                type: 'element-active'
            }
        ],
        legend: {
            position: 'bottom',
            layout: 'horizontal'
        },
        tooltip: {
            formatter: (datum) => {
                return {
                    name: datum.label,
                    value: `${datum.value}대 (${((datum.value / data.reduce((acc, item) => acc + item.value, 0)) * 100).toFixed(1)}%)`
                };
            }
        }
    };
    if (isLoading) {
        return _jsx("div", { className: "h-64 flex items-center justify-center", children: "\uB85C\uB529 \uC911..." });
    }
    return (_jsxs("div", { children: [title && _jsx("div", { className: "text-lg font-medium mb-4", children: title }), _jsx(Pie, { ...config })] }));
};
export default VehicleTypeChart;
