import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Card, Spin, Empty, Radio } from 'antd';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ReportType } from '../../services/reportService';
import './styles.css';
// 차트 색상
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
/**
 * 보고서 차트 컴포넌트
 */
const ReportChart = ({ type, data, loading = false, height = 300, title, chartType = 'auto' }) => {
    const [selectedChart, setSelectedChart] = React.useState(chartType === 'auto' ? getDefaultChartType(type) : chartType);
    // 보고서 유형에 따른 기본 차트 유형 설정
    function getDefaultChartType(reportType) {
        switch (reportType) {
            case ReportType.COMPLETION_RATE:
                return 'bar';
            case ReportType.COST_ANALYSIS:
                return 'line';
            case ReportType.MAINTENANCE_SUMMARY:
                return 'pie';
            default:
                return 'bar';
        }
    }
    // 보고서 유형에 따른 차트 데이터 가져오기
    const getChartData = () => {
        if (!data) {
            return [];
        }
        switch (type) {
            case ReportType.COMPLETION_RATE:
                return data.trend || [];
            case ReportType.COST_ANALYSIS:
                return data.costTrend || [];
            case ReportType.VEHICLE_HISTORY:
                return (data.maintenanceHistory?.map((item) => ({
                    name: item.type,
                    value: item.cost
                })) || []);
            case ReportType.MAINTENANCE_SUMMARY:
                return data.byType || [];
            case ReportType.MAINTENANCE_FORECAST:
                return (data.upcoming?.map((item) => ({
                    name: item.vehicleName,
                    value: item.confidence * 100
                })) || []);
            default:
                return [];
        }
    };
    // 차트 제목 가져오기
    const getChartTitle = () => {
        if (title) {
            return title;
        }
        switch (type) {
            case ReportType.COMPLETION_RATE:
                return '완료율 추이';
            case ReportType.COST_ANALYSIS:
                return '비용 추이';
            case ReportType.VEHICLE_HISTORY:
                return '정비 유형별 비용';
            case ReportType.MAINTENANCE_SUMMARY:
                return '정비 유형별 분포';
            case ReportType.MAINTENANCE_FORECAST:
                return '예측 신뢰도';
            default:
                return '보고서 차트';
        }
    };
    // X축, Y축 레이블 가져오기
    const getAxisLabels = () => {
        switch (type) {
            case ReportType.COMPLETION_RATE:
                return { x: '날짜', y: '완료율 (%)' };
            case ReportType.COST_ANALYSIS:
                return { x: '월', y: '비용 (만원)' };
            case ReportType.VEHICLE_HISTORY:
                return { x: '정비 유형', y: '비용 (만원)' };
            case ReportType.MAINTENANCE_SUMMARY:
                return { x: '정비 유형', y: '건수' };
            case ReportType.MAINTENANCE_FORECAST:
                return { x: '차량', y: '신뢰도 (%)' };
            default:
                return { x: 'X축', y: 'Y축' };
        }
    };
    const chartData = getChartData();
    const { x: xLabel, y: yLabel } = getAxisLabels();
    // 파이 차트 커스텀 라벨 렌더러
    const renderCustomizedPieLabel = (props) => {
        const { name, percent } = props;
        if (!name || percent === undefined)
            return null;
        return `${name}: ${(percent * 100).toFixed(0)}%`;
    };
    // 차트 내용 렌더링
    const renderChart = () => {
        if (loading) {
            return _jsx(Spin, { tip: "\uCC28\uD2B8 \uB85C\uB529 \uC911..." });
        }
        if (!chartData || chartData.length === 0) {
            return _jsx(Empty, { description: "\uD45C\uC2DC\uD560 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" });
        }
        switch (selectedChart) {
            case 'line':
                return (_jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsxs(LineChart, { data: chartData, margin: { top: 5, right: 30, left: 20, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "date", label: { value: xLabel, position: 'insideBottomRight', offset: -10 } }), _jsx(YAxis, { label: { value: yLabel, angle: -90, position: 'insideLeft' } }), _jsx(RechartsTooltip, {}), _jsx(Legend, {}), _jsx(Line, { type: "monotone", dataKey: "value", stroke: "#8884d8", activeDot: { r: 8 } })] }) }));
            case 'bar':
                return (_jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsxs(BarChart, { data: chartData, margin: { top: 5, right: 30, left: 20, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "name", label: { value: xLabel, position: 'insideBottomRight', offset: -10 } }), _jsx(YAxis, { label: { value: yLabel, angle: -90, position: 'insideLeft' } }), _jsx(RechartsTooltip, {}), _jsx(Legend, {}), _jsx(Bar, { dataKey: "value", fill: "#8884d8", children: chartData.map((entry, index) => (_jsx(Cell, { fill: COLORS[index % COLORS.length] }, `cell-${entry.name || entry.date || entry.id || ''}-${index}`))) })] }) }));
            case 'pie':
                return (_jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsxs(PieChart, { margin: { top: 5, right: 30, left: 20, bottom: 5 }, children: [_jsx(Pie, { data: chartData, cx: "50%", cy: "50%", labelLine: true, outerRadius: 80, fill: "#8884d8", dataKey: "value", nameKey: "name", label: renderCustomizedPieLabel, children: chartData.map((entry, index) => (_jsx(Cell, { fill: COLORS[index % COLORS.length] }, `cell-${entry.name || entry.date || entry.id || ''}-${index}`))) }), _jsx(RechartsTooltip, {}), _jsx(Legend, {})] }) }));
            default:
                return _jsx(Empty, { description: "\uC9C0\uC6D0\uB418\uC9C0 \uC54A\uB294 \uCC28\uD2B8 \uC720\uD615" });
        }
    };
    // 사용 가능한 차트 유형
    const getAvailableChartTypes = () => {
        switch (type) {
            case ReportType.COMPLETION_RATE:
            case ReportType.COST_ANALYSIS:
                return ['line', 'bar'];
            case ReportType.MAINTENANCE_SUMMARY:
                return ['pie', 'bar'];
            default:
                return ['bar', 'pie', 'line'];
        }
    };
    return (_jsxs(Card, { title: getChartTitle(), className: "report-chart", children: [chartType === 'auto' && (_jsx("div", { className: "chart-type-selector", children: _jsx(Radio.Group, { value: selectedChart, onChange: e => setSelectedChart(e.target.value), size: "small", buttonStyle: "solid", children: getAvailableChartTypes().map(type => {
                        let chartTypeName = '기본';
                        if (type === 'line') {
                            chartTypeName = '선형';
                        }
                        else if (type === 'bar') {
                            chartTypeName = '막대';
                        }
                        else if (type === 'pie') {
                            chartTypeName = '파이';
                        }
                        return (_jsx(Radio.Button, { value: type, children: chartTypeName }, type));
                    }) }) })), _jsx("div", { className: "chart-container", children: renderChart() })] }));
};
export default ReportChart;
