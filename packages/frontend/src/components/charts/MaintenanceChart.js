import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useTransition } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Box, Card, CardContent, Typography, ToggleButton, ToggleButtonGroup, CircularProgress } from '@mui/material';
/**
 * 정비 통계 차트 컴포넌트
 * React 19의 useTransition을 활용하여 데이터 로딩 최적화
 */
const MaintenanceChart = ({ title = '정비 현황', description = '월별 정비 건수 및 비용 추이', fetchData, testData, height = 300 }) => {
    // 상태 관리
    const [data, setData] = useState([]);
    const [isPending, startTransition] = useTransition();
    const [isLoading, setIsLoading] = useState(false);
    const [chartType, setChartType] = useState('bar');
    const [dataType, setDataType] = useState('count');
    // 데이터 로드
    useEffect(() => {
        const loadData = async () => {
            if (testData) {
                // 테스트 데이터가 있으면 사용
                startTransition(() => {
                    setData(testData);
                });
                return;
            }
            if (fetchData) {
                setIsLoading(true);
                try {
                    const response = await fetchData();
                    // React 19의 useTransition을 사용하여 UI 블로킹 방지
                    startTransition(() => {
                        setData(response);
                    });
                }
                catch (error) {
                    console.error('데이터 로드 오류:', error);
                }
                finally {
                    setIsLoading(false);
                }
            }
        };
        loadData();
    }, [fetchData, testData]);
    // 차트 타입 변경 핸들러
    const handleChartTypeChange = (_, newType) => {
        if (newType !== null) {
            setChartType(newType);
        }
    };
    // 데이터 타입 변경 핸들러
    const handleDataTypeChange = (_, newType) => {
        if (newType !== null) {
            setDataType(newType);
        }
    };
    // 더미 데이터 (fetchData나 testData가 없을 경우)
    const dummyData = [
        { name: '1월', count: 28, cost: 2800000 },
        { name: '2월', count: 31, cost: 3100000 },
        { name: '3월', count: 26, cost: 2600000 },
        { name: '4월', count: 30, cost: 3000000 },
        { name: '5월', count: 32, cost: 3500000 },
        { name: '6월', count: 35, cost: 3200000 },
        { name: '7월', count: 38, cost: 3800000 },
        { name: '8월', count: 29, cost: 2900000 },
        { name: '9월', count: 32, cost: 3100000 },
        { name: '10월', count: 27, cost: 2700000 },
        { name: '11월', count: 18, cost: 1800000 },
        { name: '12월', count: 16, cost: 1600000 }
    ];
    // 실제 사용할 데이터
    const displayData = data.length > 0 ? data : dummyData;
    // 차트 렌더링
    const renderChart = () => {
        // 데이터가 로딩 중일 때
        if (isLoading) {
            return (_jsx(Box, { sx: {
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: height
                }, children: _jsx(CircularProgress, {}) }));
        }
        // 바 차트
        if (chartType === 'bar') {
            return (_jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsxs(BarChart, { data: displayData, margin: { top: 20, right: 30, left: 20, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "name" }), _jsx(YAxis, {}), _jsx(Tooltip, { formatter: (value) => {
                                if (dataType === 'cost') {
                                    return [`${Number(value).toLocaleString()}원`, '비용'];
                                }
                                return [`${value}건`, '건수'];
                            } }), _jsx(Legend, {}), _jsx(Bar, { dataKey: dataType, name: dataType === 'count' ? '정비 건수' : '정비 비용', fill: dataType === 'count' ? '#8884d8' : '#82ca9d', animationDuration: 1000 })] }) }));
        }
        // 라인 차트
        return (_jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsxs(LineChart, { data: displayData, margin: { top: 20, right: 30, left: 20, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "name" }), _jsx(YAxis, {}), _jsx(Tooltip, { formatter: (value) => {
                            if (dataType === 'cost') {
                                return [`${Number(value).toLocaleString()}원`, '비용'];
                            }
                            return [`${value}건`, '건수'];
                        } }), _jsx(Legend, {}), _jsx(Line, { type: "monotone", dataKey: dataType, name: dataType === 'count' ? '정비 건수' : '정비 비용', stroke: dataType === 'count' ? '#8884d8' : '#82ca9d', animationDuration: 1000 })] }) }));
    };
    return (_jsx(Card, { sx: { height: '100%' }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", component: "div", children: title }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: description })] }), _jsxs(Box, { sx: { display: 'flex', gap: 1 }, children: [_jsxs(ToggleButtonGroup, { size: "small", value: dataType, exclusive: true, onChange: handleDataTypeChange, "aria-label": "data type", children: [_jsx(ToggleButton, { value: "count", "aria-label": "count", children: "\uAC74\uC218" }), _jsx(ToggleButton, { value: "cost", "aria-label": "cost", children: "\uBE44\uC6A9" })] }), _jsxs(ToggleButtonGroup, { size: "small", value: chartType, exclusive: true, onChange: handleChartTypeChange, "aria-label": "chart type", children: [_jsx(ToggleButton, { value: "bar", "aria-label": "bar chart", children: "\uB9C9\uB300" }), _jsx(ToggleButton, { value: "line", "aria-label": "line chart", children: "\uC120" })] })] })] }), isPending && (_jsx(Box, { sx: {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1
                    }, children: _jsx(CircularProgress, { size: 40 }) })), renderChart()] }) }));
};
export default MaintenanceChart;
