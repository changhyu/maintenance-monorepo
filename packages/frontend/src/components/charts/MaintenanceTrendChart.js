import { jsx as _jsx } from "react/jsx-runtime";
import { Line } from '@ant-design/plots';
/**
 * 정비 추세를 시각화하는 선 차트 컴포넌트
 */
const MaintenanceTrendChart = ({ data }) => {
    // 데이터 가공: 월별 그룹화
    const processData = () => {
        const map = new Map();
        data.forEach(item => {
            const date = new Date(item.date);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!map.has(yearMonth)) {
                map.set(yearMonth, { completed: 0, pending: 0 });
            }
            const current = map.get(yearMonth);
            current.completed += item.completed;
            current.pending += item.pending;
        });
        // 날짜순 정렬
        return Array.from(map.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .flatMap(([month, values]) => [
            { month, category: '완료', value: values.completed },
            { month, category: '대기', value: values.pending }
        ]);
    };
    const processedData = processData();
    const config = {
        data: processedData,
        xField: 'month',
        yField: 'value',
        seriesField: 'category',
        legend: {
            position: 'top'
        },
        smooth: true,
        animation: {
            appear: {
                animation: 'path-in',
                duration: 1000
            }
        },
        color: ['#52c41a', '#faad14'],
        point: {
            size: 5,
            shape: 'diamond'
        }
    };
    return _jsx(Line, { ...config });
};
export default MaintenanceTrendChart;
