import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from 'react';
// NodeJS 네임스페이스 정의를 위해 추가
/// <reference types="node" />
import { FileTextOutlined, BarChartOutlined, LineChartOutlined, CalendarOutlined, ArrowUpOutlined, ArrowDownOutlined, SyncOutlined, ClockCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { Card, Spin, Empty, Button, Tooltip, Select, Skeleton, Switch, List, Badge, Tag, message } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DashboardChart from './DashboardChart';
import { DashboardDataService } from '../../services/DashboardDataService';
import { reportService, ReportType } from '../../services/reportService';
import ClientOnly from '../utils/ClientOnly';

// 서비스의 타입을 확장하여 필요한 필드 추가
export interface DashboardCardData {
  title: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  // 서비스의 DashboardCardData와 호환되도록 string 타입도 허용
  icon?: 'file' | 'chart' | 'calendar' | 'line-chart' | string;
}

// 보고서 서비스에서 제공하는 타입과 일치하도록 수정
export interface RecentReport {
  id: string | number;
  name?: string;
  title: string;
  type: ReportType;
  createdAt: string | number | Date;
}

// 차트 데이터 서비스와 일치하도록 타입 정의
export interface DashboardChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    fill?: boolean;
  }>;
}

const { Option } = Select;
// 새로고침 주기 옵션 (초 단위)
const REFRESH_INTERVALS = [
    { label: '사용 안함', value: 0 },
    { label: '30초', value: 30 },
    { label: '1분', value: 60 },
    { label: '5분', value: 300 },
    { label: '10분', value: 600 }
];
// 차트 타입 옵션으로 바로 이동
const CHART_TYPES = [
    { label: '막대 차트', value: 'bar' },
    { label: '선 차트', value: 'line' },
    { label: '파이 차트', value: 'pie' },
    { label: '영역 차트', value: 'area' },
    { label: '레이더 차트', value: 'radar' }
];

const ReportWidgets = ({ dashboardService = new DashboardDataService() }) => {
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [reportCards, setReportCards] = useState<DashboardCardData[]>([]);
    const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
    const [reportChartData, setReportChartData] = useState<DashboardChartData | null>(null);
    const [selectedReportType, setSelectedReportType] = useState<ReportType>(ReportType.MAINTENANCE_SUMMARY);
    const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
    const [refreshInterval, setRefreshInterval] = useState<number>(60); // 기본값: 1분
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [chartType, setChartType] = useState<string>('pie'); // 기본 차트 타입
    const [chartAnimation, setChartAnimation] = useState<boolean>(true); // 차트 애니메이션 활성화
    const [dataUpdated, setDataUpdated] = useState<boolean>(false); // 데이터 업데이트 상태
    const [error, setError] = useState<string | null>(null); // 에러 상태 추가
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
    const chartLoadTimerRef = useRef<NodeJS.Timeout | null>(null);
    const navigate = useNavigate();
    
    // 타이머 모두 정리하는 함수
    const clearAllTimers = useCallback(() => {
        // 새로고침 타이머 정리
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
        // 애니메이션 타이머 정리
        if (animationTimerRef.current) {
            clearTimeout(animationTimerRef.current);
            animationTimerRef.current = null;
        }
        // 차트 로드 타이머 정리
        if (chartLoadTimerRef.current) {
            clearTimeout(chartLoadTimerRef.current);
            chartLoadTimerRef.current = null;
        }
    }, []);
    
    // 선택된 보고서 타입에 맞는 차트 데이터 로드
    const loadReportChartData = useCallback(async (reportType: ReportType) => {
        try {
            // ReportType을 문자열로 변환하여 전달 (언더스코어를 하이픈으로 변환)
            const reportTypeStr = reportType.toString().replace(/_/g, '-');
            const chartData = await dashboardService.getReportChartData(reportTypeStr);
            // 이전 타이머 정리
            if (chartLoadTimerRef.current) {
                clearTimeout(chartLoadTimerRef.current);
                chartLoadTimerRef.current = null;
            }
            // 애니메이션 효과를 위해 상태 업데이트
            setReportChartData(null);
            chartLoadTimerRef.current = setTimeout(() => {
                // 서비스에서 반환된 데이터를 현재 컴포넌트의 타입에 맞게 변환
                const formattedChartData: DashboardChartData = {
                    labels: chartData.labels || [],
                    datasets: chartData.datasets || []
                };
                setReportChartData(formattedChartData);
                chartLoadTimerRef.current = null;
            }, 100);
        }
        catch (error) {
            console.error('보고서 차트 데이터 로드 중 오류 발생:', error);
            setReportChartData(null);
            throw error; // 상위 호출자에게 오류 전파
        }
    }, [dashboardService]);
    
    // 보고서 데이터 로드
    const loadReportData = useCallback(async () => {
        if (!refreshing) {
            setLoading(true);
        }
        
        try {
            // 대시보드 카드 데이터 (요약 정보)
            const cards = await dashboardService.getReportOverviewData();
            setReportCards(Array.isArray(cards) ? cards : []);
            // 최근 보고서 목록
            const reports = await reportService.getRecentReports();
            // 서비스에서 반환된 형식을 현재 컴포넌트의 타입에 맞게 변환
            const formattedReports: RecentReport[] = Array.isArray(reports) 
                ? reports.map(report => ({
                    id: report.id || '',
                    title: report.name || '',  // name을 title로 매핑
                    type: report.type,
                    createdAt: report.createdAt
                  })) 
                : [];
            setRecentReports(formattedReports); // 배열 확인
            // 초기 차트 데이터 로드
            await loadReportChartData(selectedReportType);
            // 마지막 업데이트 시간 갱신
            setLastUpdated(new Date());
            // 오류 초기화
            setError(null);
        }
        catch (error) {
            console.error('보고서 위젯 데이터 로드 중 오류 발생:', error);
            setError('데이터를 불러오는 중 오류가 발생했습니다');
            // 에러 상태에서도 기존 데이터 유지
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dashboardService, selectedReportType, loadReportChartData, refreshing]);
    
    // 모든 데이터 새로고침
    const refreshData = useCallback(async () => {
        if (refreshing) {
            return; // 이미 새로고침 중이면 중복 실행 방지
        }
        
        setRefreshing(true);
        setError(null); // 에러 상태 초기화
        
        try {
            await loadReportData();
            setLastUpdated(new Date());
            // 데이터 업데이트 애니메이션 표시
            setDataUpdated(true);
            // 이전 애니메이션 타이머 정리 후 새로 설정
            if (animationTimerRef.current) {
                clearTimeout(animationTimerRef.current);
            }
            animationTimerRef.current = setTimeout(() => {
                setDataUpdated(false);
                animationTimerRef.current = null;
            }, 1500);
            message.success('데이터가 성공적으로 업데이트되었습니다');
        }
        catch (error) {
            console.error('데이터 새로고침 중 오류 발생:', error);
            message.error('데이터 업데이트 중 오류가 발생했습니다');
            setError('데이터를 새로고침하는 중 오류가 발생했습니다');
        }
        finally {
            setRefreshing(false);
        }
    }, [loadReportData, refreshing]);
    
    // 데이터 로드
    useEffect(() => {
        loadReportData().catch(err => {
            console.error('초기 데이터 로드 실패:', err);
            setError('초기 데이터를 불러오는 중 오류가 발생했습니다');
            setLoading(false);
        });
        // 컴포넌트 언마운트 시 모든 타이머 정리
        return clearAllTimers;
    }, [clearAllTimers, loadReportData]);
    
    // 자동 새로고침 설정 변경 시 타이머 업데이트
    useEffect(() => {
        // 기존 타이머 정리
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
        // 새로고침 활성화 및 인터벌 설정됨
        if (autoRefresh && refreshInterval > 0) {
            refreshTimerRef.current = setInterval(() => {
                refreshData().catch(err => {
                    console.error('자동 새로고침 중 오류 발생:', err);
                    message.error('데이터 자동 새로고침 중 오류가 발생했습니다');
                });
            }, refreshInterval * 1000);
        }
        // 컴포넌트 언마운트 시 정리
        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
        };
    }, [autoRefresh, refreshInterval, refreshData]);
    
    // 보고서 타입이 변경될 때 차트 데이터 다시 로드
    useEffect(() => {
        loadReportChartData(selectedReportType).catch(err => {
            console.error('차트 데이터 로드 실패:', err);
            setError('차트 데이터를 불러오는 중 오류가 발생했습니다');
        });
        // 기본 차트 타입 설정
        if (selectedReportType === ReportType.MAINTENANCE_SUMMARY) {
            setChartType('pie');
        } else if (selectedReportType === ReportType.COMPLETION_RATE) {
            setChartType('line');
        } else {
            setChartType('bar');
        }
    }, [selectedReportType, loadReportChartData]);
    
    // 수동 새로고침 핸들러
    const handleManualRefresh = useCallback(() => {
        refreshData().catch(err => {
            console.error('수동 새로고침 실패:', err);
        });
    }, [refreshData]);
    
    // 보고서 타입을 한글 이름으로 변환
    const getReportTypeName = useCallback((type: ReportType) => {
        switch (type) {
            case ReportType.COMPLETION_RATE:
                return '완료율 보고서';
            case ReportType.VEHICLE_HISTORY:
                return '차량 정비 이력';
            case ReportType.COST_ANALYSIS:
                return '비용 분석 보고서';
            case ReportType.MAINTENANCE_SUMMARY:
                return '정비 요약 보고서';
            case ReportType.MAINTENANCE_FORECAST:
                return '정비 예측 보고서';
            default:
                return '보고서';
        }
    }, []);
    
    // 보고서 유형에 따른 태그 색상
    const getReportTypeColor = useCallback((type: ReportType) => {
        switch (type) {
            case ReportType.COMPLETION_RATE:
                return 'blue';
            case ReportType.VEHICLE_HISTORY:
                return 'green';
            case ReportType.COST_ANALYSIS:
                return 'gold';
            case ReportType.MAINTENANCE_SUMMARY:
                return 'purple';
            case ReportType.MAINTENANCE_FORECAST:
                return 'magenta';
            default:
                return 'default';
        }
    }, []);
    
    // 보고서 페이지로 이동
    const goToReportPage = useCallback(() => {
        navigate('/report');
    }, [navigate]);
    
    // 특정 보고서 유형으로 이동
    const goToReportWithType = useCallback((type: ReportType) => {
        navigate(`/report?type=${type}`);
    }, [navigate]);
    
    // 시간을 포맷팅하는 함수
    const formatTime = useCallback((date: Date) => {
        try {
            return date.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
        catch (error) {
            console.error('시간 포맷팅 오류:', error);
            return '시간 정보 없음';
        }
    }, []);
    
    // 날짜를 포맷팅하는 함수
    const formatDate = useCallback((date: Date) => {
        try {
            return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
        }
        catch (error) {
            console.error('날짜 포맷팅 오류:', error);
            return '날짜 정보 없음';
        }
    }, []);
    
    // 차트 유형 변경 핸들러
    const handleChartTypeChange = useCallback((value: string) => {
        setChartType(value);
    }, []);
    
    // 차트 애니메이션 토글 핸들러
    const toggleChartAnimation = useCallback(() => {
        setChartAnimation(prev => !prev);
    }, []);
    
    // 상태에 따른 클래스 이름 반환 헬퍼 함수
    const getStatusClassName = (trend: 'up' | 'down' | 'neutral' | undefined): string => {
        if (trend === 'up') {
            return 'text-green-600';
        } else if (trend === 'down') {
            return 'text-red-600';
        } else {
            return 'text-gray-500';
        }
    };
    
    // 차트 컨텐츠 렌더링 헬퍼 함수
    const renderChartContent = () => {
        if (refreshing) {
            return (_jsx("div", { className: "chart-container flex justify-center items-center", style: { height: '300px' }, children: _jsx(Spin, { tip: "\uCC28\uD2B8 \uB370\uC774\uD130 \uB85C\uB529 \uC911..." }) }));
        } else if (reportChartData) {
            return (_jsx(motion.div, { className: "chart-container", style: { height: '300px' }, initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.5 }, children: _jsx(DashboardChart, { data: reportChartData, type: selectedReportType, chartType: chartType, animated: chartAnimation }) }));
        } else {
            return _jsx(Empty, { description: "\uCC28\uD2B8 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" });
        }
    };
    
    // 보고서 목록 렌더링 헬퍼 함수
    const renderReportList = () => {
        if (refreshing) {
            return (_jsx("div", { className: "p-4", children: _jsx(Skeleton, { active: true, paragraph: { rows: 5 } }) }));
        }
        if (recentReports.length > 0) {
            return (_jsx(AnimatePresence, { children: _jsx(List, { itemLayout: "horizontal", dataSource: recentReports, renderItem: (item: RecentReport, index: number) => {
                const isNew = new Date(item.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);
                return (_jsx(motion.div, { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.3, delay: index * 0.1 }, children: _jsxs(List.Item, { children: [_jsx(List.Item.Meta, { avatar: _jsx(FileTextOutlined, { style: { fontSize: '20px', color: '#1890ff' } }), title: _jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "mr-2", children: item.title }), isNew && (_jsx(Tag, { color: "red", children: "New" }))] }), description: _jsxs("div", { children: [_jsx(Tag, { color: getReportTypeColor(item.type), children: getReportTypeName(item.type) }), _jsxs("span", { className: "ml-2 text-gray-500", children: ["\uC0DD\uC131: ", formatDate(new Date(item.createdAt))] })] }) }), _jsx(motion.div, { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 }, children: _jsx(Button, { type: "link", onClick: () => goToReportWithType(item.type), children: "\uBCF4\uAE30" }) })] }) }, `report-item-${item.id || index}`));
            }}) }));
        }
        return _jsx(Empty, { description: "\uCD5C\uADFC \uBCF4\uACE0\uC11C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" });
    };
    
    // 오류 발생 시 표시
    if (error && !loading) {
        return (_jsxs("div", { className: "mb-8", children: [_jsxs("div", { className: "flex justify-between items-center mb-3", children: [_jsx("h2", { className: "text-lg font-medium text-gray-900", children: "\uBCF4\uACE0\uC11C \uC694\uC57D" }), _jsx(Button, { type: "primary", icon: _jsx(SyncOutlined, {}), onClick: handleManualRefresh, children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] }), _jsx("div", { className: "bg-white shadow rounded-lg p-6 flex flex-col items-center justify-center", style: { minHeight: '200px' }, children: _jsx(Empty, { description: _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-red-500 mb-2", children: error }), _jsx("p", { className: "text-gray-500", children: "\uC0C8\uB85C\uACE0\uCE68\uC744 \uC2DC\uB3C4\uD558\uAC70\uB098 \uB098\uC911\uC5D0 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694." })] }) }) })] }));
    } else if (loading) {
        return (_jsxs("div", { className: "mb-8", children: [_jsx("div", { className: "flex justify-between items-center mb-3", children: _jsx("h2", { className: "text-lg font-medium text-gray-900", children: "\uBCF4\uACE0\uC11C \uC694\uC57D" }) }), _jsx("div", { className: "bg-white shadow rounded-lg p-6", children: _jsx(Skeleton, { active: true }) })] }));
    }

    // Static fallback content for SSG
    const staticContent = (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                    <h2 className="text-lg font-medium text-gray-900 mr-2">보고서 요약</h2>
                    <div className="text-sm text-gray-500 flex items-center">
                        <ClockCircleOutlined className="mr-1" />
                        {formatTime(lastUpdated)}
                    </div>
                </div>
                <div className="flex items-center">
                    <Button type="primary" size="small" icon={<SyncOutlined />} className="mr-4">
                        새로고침
                    </Button>
                    <Button type="link" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                        모두 보기
                    </Button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
                {reportCards.map((card, index) => (
                    <div className="bg-white overflow-hidden shadow rounded-lg" key={`static-report-card-${card.title || index}`}>
                        <div className="px-4 py-5 sm:p-6">
                            <div className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3`}
                                    style={{
                                        backgroundColor: card.color ? `var(--${card.color}-100, #f0f0f0)` : '#f0f0f0'
                                    }}>
                                    {/* Icons would be rendered here in a static way */}
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-medium text-gray-500 truncate">{card.title}</p>
                                    <div className="mt-1 flex items-baseline">
                                        <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <Card title="보고서 차트">
                        <div className="chart-container" style={{ height: '300px' }}>
                            <Empty description="차트 데이터를 불러오는 중입니다" />
                        </div>
                    </Card>
                </div>
                <div className="md:col-span-1">
                    <Card title="최근 보고서">
                        <div className="p-4">
                            <Skeleton active paragraph={{ rows: 5 }} />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );

    return (
        <ClientOnly fallback={staticContent}></ClientOnly>
            <motion.div className="mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center">
                        <motion.h2 className="text-lg font-medium text-gray-900 mr-2" whileHover={{ scale: 1.03 }}>
                            보고서 요약
                        </motion.h2>
                        <Tooltip title="데이터 마지막 업데이트 시간">
                            <motion.div
                                className="text-sm text-gray-500 flex items-center"
                                animate={dataUpdated ? { scale: [1, 1.2, 1], color: ['#718096', '#4299e1', '#718096'] } : {}}
                            >
                                <ClockCircleOutlined className="mr-1" />
                                {formatTime(lastUpdated)}
                            </motion.div>
                        </Tooltip>
                    </div>
                    <div className="flex items-center">
                        <div className="mr-4 flex items-center">
                            <span className="mr-2 text-sm">자동 갱신:</span>
                            <Switch size="small" checked={autoRefresh} onChange={setAutoRefresh} />
                        </div>
                        {autoRefresh && (
                            <Select value={refreshInterval} onChange={setRefreshInterval} style={{ width: 100 }} size="small" className="mr-4" dropdownStyle={{ zIndex: 1050 }}>
                                {REFRESH_INTERVALS.slice(1).map(option => (
                                    <Option value={option.value} key={option.value}>{option.label}</Option>
                                ))}
                            </Select>
                        )}
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button type="primary" size="small" icon={<SyncOutlined spin={refreshing} />} onClick={handleManualRefresh} loading={refreshing} className="mr-4" disabled={refreshing}>
                                새로고침
                            </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button type="link" onClick={goToReportPage} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                                모두 보기
                            </Button>
                        </motion.div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
                    <ClientOnly>
                        <AnimatePresence>
                            {reportCards.map((card, index) => (
                                <motion.div
                                    className="bg-white overflow-hidden shadow rounded-lg"
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                                    whileHover={{
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                        y: -4
                                    }}
                                    key={`report-card-${card.title || index}`}
                                >
                                    <div className="px-4 py-5 sm:p-6">
                                        <div className="flex items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3`} style={{
                                                backgroundColor: card.color ? `var(--${card.color}-100, #f0f0f0)` : '#f0f0f0'
                                            }}>
                                                {card.icon === 'file' && (<FileTextOutlined style={{ color: card.color ? `var(--${card.color}-600, #666)` : '#666' }} />)}
                                                {card.icon === 'chart' && (<BarChartOutlined style={{ color: card.color ? `var(--${card.color}-600, #666)` : '#666' }} />)}
                                                {card.icon === 'calendar' && (<CalendarOutlined style={{ color: card.color ? `var(--${card.color}-600, #666)` : '#666' }} />)}
                                                {card.icon === 'line-chart' && (<LineChartOutlined style={{ color: card.color ? `var(--${card.color}-600, #666)` : '#666' }} />)}
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm font-medium text-gray-500 truncate">{card.title}</p>
                                                <div className="mt-1 flex items-baseline">
                                                    <motion.p className="text-2xl font-semibold text-gray-900" animate={dataUpdated ? { scale: [1, 1.1, 1] } : {}} transition={{ duration: 0.5 }}>
                                                        {card.value}
                                                    </motion.p>
                                                    {card.change !== undefined && (
                                                        <motion.span className={`ml-2 text-sm font-medium ${getStatusClassName(card.trend)}`} animate={dataUpdated ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.5, delay: 0.1 }}>
                                                            {card.trend === 'up' && <ArrowUpOutlined />}
                                                            {card.trend === 'down' && <ArrowDownOutlined />}
                                                            {card.change > 0 ? '+' : ''}{card.change}%
                                                        </motion.span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </ClientOnly>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div className="md:col-span-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                        <Card title={
                            <div className="flex items-center">
                                <span className="mr-2">보고서 차트</span>
                                <Badge dot={dataUpdated} color="blue" style={{ animationDuration: '1s' }} />
                            </div>
                        } extra={
                            <div className="flex space-x-2">
                                <Select value={selectedReportType} onChange={(value: ReportType) => setSelectedReportType(value)} style={{ width: 150 }} dropdownStyle={{ zIndex: 1050 }}>
                                    <Option value={ReportType.COMPLETION_RATE}>완료율 추이</Option>
                                    <Option value={ReportType.COST_ANALYSIS}>비용 분석</Option>
                                    <Option value={ReportType.MAINTENANCE_SUMMARY}>정비 요약</Option>
                                </Select>
                                <Select value={chartType} onChange={handleChartTypeChange} style={{ width: 110 }} dropdownStyle={{ zIndex: 1050 }}>
                                    {CHART_TYPES.map(type => (
                                        <Option value={type.value} key={type.value}>{type.label}</Option>
                                    ))}
                                </Select>
                                <Tooltip title="차트 애니메이션 켜기/끄기">
                                    <Button icon={<SettingOutlined />} onClick={toggleChartAnimation} type={chartAnimation ? 'primary' : 'default'} size="small" />
                                </Tooltip>
                            </div>
                        } className="h-full">
                            <ClientOnly>
                                {renderChartContent()}
                            </ClientOnly>
                        </Card>
                    </motion.div>

                    <motion.div className="md:col-span-1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                        <Card title={
                            <div className="flex items-center">
                                <span className="mr-2">최근 보고서</span>
                                <Badge dot={dataUpdated} color="blue" style={{ animationDuration: '1s' }} />
                            </div>
                        } className="h-full">
                            <ClientOnly>
                                {renderReportList()}
                            </ClientOnly>
                        </Card>
                    </motion.div>
                </div>
            </motion.div>
        </ClientOnly>
    );
};

export default ReportWidgets;
