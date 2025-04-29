import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Card, Button, Table, Space, Typography } from 'antd';
import moment from 'moment';
import 'moment/locale/ko';
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartTooltip, Legend, Bar } from 'recharts';
import ReportChart from './ReportChart';
import { reportService, ReportType } from '../../services/reportService';
// 날짜 로케일 설정
moment.locale('ko');
// 단축 변수
const { Title } = Typography;
/**
 * 보고서 대시보드 컴포넌트
 */
const ReportDashboard = () => {
    // 보고서 인스턴스 생성
    const reportInstance = reportService;
    // 전체 보고서 데이터
    const [reports, setReports] = useState([]);
    // 요약 데이터
    const [summary, setSummary] = useState(null);
    // 로딩 상태
    const [loading, setLoading] = useState(false);
    // 초기 데이터 로드
    useEffect(() => {
        // 저장된 보고서 로드
        const loadReports = async () => {
            setLoading(true);
            try {
                const loadedReports = await reportInstance.getReports();
                // Report[] 타입을 LocalReport[] 타입으로 변환
                const formattedReports = loadedReports.map(report => ({
                    id: report.id,
                    name: report.title, // title을 name으로 매핑
                    type: report.type,
                    createdAt: report.createdAt,
                    data: report.data
                }));
                setReports(formattedReports);
                // 요약 데이터 로드
                const summaryData = await reportInstance.getReportSummary();
                setSummary(summaryData);
            }
            catch (error) {
                console.error('보고서 로드 중 오류 발생:', error);
            }
            finally {
                setLoading(false);
            }
        };
        loadReports();
    }, []);
    return (_jsxs("div", { className: "report-dashboard", children: [_jsx(Card, { title: "\uBCF4\uACE0\uC11C \uB300\uC2DC\uBCF4\uB4DC", className: "mb-4", children: _jsx("div", { className: "summary-section", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-md-6", children: _jsx(Card, { title: "\uBCF4\uACE0\uC11C \uD1B5\uACC4", loading: loading, children: summary && (_jsxs("div", { children: [_jsxs("p", { children: [_jsx("strong", { children: "\uCD1D \uBCF4\uACE0\uC11C:" }), " ", summary.totalReports, "\uAC1C"] }), _jsxs("p", { children: [_jsx("strong", { children: "\uCD5C\uADFC \uC0DD\uC131:" }), " ", moment(summary.lastReportDate).fromNow()] }), _jsxs("p", { children: [_jsx("strong", { children: "\uC644\uB8CC\uC728 \uBCF4\uACE0\uC11C:" }), " ", summary.reportsByType.completionRate, "\uAC1C"] }), _jsxs("p", { children: [_jsx("strong", { children: "\uBE44\uC6A9 \uBCF4\uACE0\uC11C:" }), " ", summary.reportsByType.costAnalysis, "\uAC1C"] }), _jsxs("p", { children: [_jsx("strong", { children: "\uC815\uBE44 \uC608\uCE21 \uBCF4\uACE0\uC11C:" }), " ", summary.reportsByType.maintenanceForecast, "\uAC1C"] })] })) }) }), _jsx("div", { className: "col-md-6", children: _jsx(Card, { title: "\uBCF4\uACE0\uC11C \uC720\uD615 \uBD84\uD3EC", loading: loading, children: summary && (_jsxs(BarChart, { width: 300, height: 200, data: [
                                            { name: '완료율', value: summary.reportsByType.completionRate },
                                            { name: '비용 분석', value: summary.reportsByType.costAnalysis },
                                            { name: '정비 예측', value: summary.reportsByType.maintenanceForecast },
                                            { name: '차량 이력', value: summary.reportsByType.vehicleHistory }
                                        ], children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "name" }), _jsx(YAxis, {}), _jsx(RechartTooltip, {}), _jsx(Legend, {}), _jsx(Bar, { dataKey: "value", fill: "#8884d8" })] })) }) })] }) }) }), _jsx(Card, { title: "\uCD5C\uADFC \uBCF4\uACE0\uC11C", className: "mb-4", children: _jsx(Table, { dataSource: reports, rowKey: "id", loading: loading, columns: [
                        {
                            title: '보고서 이름',
                            dataIndex: 'name',
                            key: 'name'
                        },
                        {
                            title: '유형',
                            dataIndex: 'type',
                            key: 'type',
                            render: (type) => {
                                switch (type) {
                                    case ReportType.COMPLETION_RATE:
                                        return '완료율 보고서';
                                    case ReportType.COST_ANALYSIS:
                                        return '비용 분석 보고서';
                                    case ReportType.MAINTENANCE_FORECAST:
                                        return '정비 예측 보고서';
                                    case ReportType.VEHICLE_HISTORY:
                                        return '차량 이력 보고서';
                                    default:
                                        return '기타 보고서';
                                }
                            }
                        },
                        {
                            title: '생성일',
                            dataIndex: 'createdAt',
                            key: 'createdAt',
                            render: (date) => moment(date).format('YYYY-MM-DD HH:mm')
                        },
                        {
                            title: '액션',
                            key: 'action',
                            render: (_, record) => (_jsx(Space, { size: "middle", children: _jsx(Button, { size: "small", onClick: () => console.log('보고서 보기', record.id), children: "\uBCF4\uAE30" }) }))
                        }
                    ] }) }), _jsx(Card, { title: "\uBCF4\uACE0\uC11C \uCC28\uD2B8", className: "mb-4", children: summary && _jsx(ReportChart, { data: summary.chartData, type: ReportType.MAINTENANCE_SUMMARY, chartType: "line" }) })] }));
};
export default ReportDashboard;
