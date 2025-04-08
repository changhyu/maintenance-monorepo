import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Card, 
  Spin, 
  Empty, 
  Statistic, 
  Row, 
  Col, 
  Tag, 
  Button, 
  Tooltip,
  Select,
  Skeleton,
  Switch,
  Tabs,
  List,
  Badge,
  Progress,
  message
} from 'antd';
import { 
  FileTextOutlined, 
  BarChartOutlined, 
  LineChartOutlined, 
  PieChartOutlined, 
  CalendarOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  DashboardOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import reportService, { ReportType } from '../../services/reportService';
import { DashboardDataService, DashboardChartData, DashboardCardData } from '../../services/DashboardDataService';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardChart from './DashboardChart';

const { Option } = Select;

// 차트 색상
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// 새로고침 주기 옵션 (초 단위)
const REFRESH_INTERVALS = [
  { label: '사용 안함', value: 0 },
  { label: '30초', value: 30 },
  { label: '1분', value: 60 },
  { label: '5분', value: 300 },
  { label: '10분', value: 600 }
];

// 차트 타입 옵션
const CHART_TYPES = [
  { label: '막대 차트', value: 'bar' },
  { label: '선 차트', value: 'line' },
  { label: '파이 차트', value: 'pie' },
  { label: '영역 차트', value: 'area' },
  { label: '레이더 차트', value: 'radar' }
];

interface ReportWidgetsProps {
  dashboardService?: DashboardDataService;
}

const ReportWidgets: React.FC<ReportWidgetsProps> = ({ dashboardService = new DashboardDataService() }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [reportCards, setReportCards] = useState<DashboardCardData[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [reportChartData, setReportChartData] = useState<DashboardChartData | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>(ReportType.MAINTENANCE_SUMMARY);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(60); // 기본값: 1분
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [chartType, setChartType] = useState<string>('pie'); // 기본 차트 타입
  const [chartAnimation, setChartAnimation] = useState<boolean>(true); // 차트 애니메이션 활성화
  const [dataUpdated, setDataUpdated] = useState<boolean>(false); // 데이터 업데이트 상태
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // 데이터 로드
  useEffect(() => {
    loadReportData();
    return () => {
      // 컴포넌트 언마운트 시 타이머 정리
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  // 자동 새로고침 설정 변경 시 타이머 업데이트
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (autoRefresh && refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        refreshData();
      }, refreshInterval * 1000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // 보고서 타입이 변경될 때 차트 데이터 다시 로드
  useEffect(() => {
    loadReportChartData(selectedReportType);
    
    // 기본 차트 타입 설정
    if (selectedReportType === ReportType.MAINTENANCE_SUMMARY) {
      setChartType('pie');
    } else if (selectedReportType === ReportType.COMPLETION_RATE) {
      setChartType('line');
    } else if (selectedReportType === ReportType.COST_ANALYSIS) {
      setChartType('bar');
    }
  }, [selectedReportType]);

  // 모든 데이터 새로고침
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await loadReportData();
      setLastUpdated(new Date());
      // 데이터 업데이트 애니메이션 표시
      setDataUpdated(true);
      setTimeout(() => setDataUpdated(false), 1500);
      message.success('데이터가 성공적으로 업데이트되었습니다');
    } catch (error) {
      console.error('데이터 새로고침 중 오류 발생:', error);
      message.error('데이터 업데이트 중 오류가 발생했습니다');
    } finally {
      setRefreshing(false);
    }
  };

  // 수동 새로고침 핸들러
  const handleManualRefresh = () => {
    refreshData();
  };

  // 보고서 데이터 로드
  const loadReportData = useCallback(async () => {
    if (!refreshing) setLoading(true);
    try {
      // 대시보드 카드 데이터 (요약 정보)
      const cards = await dashboardService.getReportOverviewData();
      setReportCards(cards);

      // 최근 보고서 목록
      const reports = await reportService.getRecentReports();
      setRecentReports(reports.slice(0, 5));  // 최근 5개만

      // 초기 차트 데이터 로드
      await loadReportChartData(selectedReportType);
      
      // 마지막 업데이트 시간 갱신
      setLastUpdated(new Date());
    } catch (error) {
      console.error('보고서 위젯 데이터 로드 중 오류 발생:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dashboardService, selectedReportType]);

  // 선택된 보고서 타입에 맞는 차트 데이터 로드
  const loadReportChartData = async (reportType: ReportType) => {
    try {
      // ReportType을 문자열로 변환하여 전달
      const reportTypeStr = reportType.toString();
      const chartData = await dashboardService.getReportChartData(reportTypeStr);
      
      // 애니메이션 효과를 위해 상태 업데이트
      setReportChartData(null);
      setTimeout(() => {
        setReportChartData(chartData);
      }, 100);
    } catch (error) {
      console.error('보고서 차트 데이터 로드 중 오류 발생:', error);
      setReportChartData(null);
    }
  };

  // 보고서 타입을 한글 이름으로 변환
  const getReportTypeName = (type: ReportType): string => {
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
  };

  // 보고서 유형에 따른 태그 색상
  const getReportTypeColor = (type: ReportType): string => {
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
  };

  // 보고서 페이지로 이동
  const goToReportPage = () => {
    navigate('/report');
  };

  // 특정 보고서 유형으로 이동
  const goToReportWithType = (type: ReportType) => {
    navigate(`/report?type=${type}`);
  };

  // 시간을 포맷팅하는 함수
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // 날짜를 포맷팅하는 함수
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // 차트 유형 변경 핸들러
  const handleChartTypeChange = (value: string) => {
    setChartType(value);
  };

  // 차트 애니메이션 토글 핸들러
  const toggleChartAnimation = () => {
    setChartAnimation(!chartAnimation);
  };

  // 상태가 로드 중이면 로딩 UI 표시
  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-medium text-gray-900">보고서 요약</h2>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <Skeleton active />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="mb-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <motion.h2 
            className="text-lg font-medium text-gray-900 mr-2"
            whileHover={{ scale: 1.03 }}
          >
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
            <Switch 
              size="small" 
              checked={autoRefresh} 
              onChange={setAutoRefresh} 
            />
          </div>
          
          {autoRefresh && (
            <Select
              value={refreshInterval}
              onChange={setRefreshInterval}
              style={{ width: 100 }}
              size="small"
              className="mr-4"
              dropdownStyle={{ zIndex: 1050 }}
            >
              {REFRESH_INTERVALS.slice(1).map(option => (
                <Option key={option.value} value={option.value}>{option.label}</Option>
              ))}
            </Select>
          )}
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              type="primary"
              size="small"
              icon={<SyncOutlined spin={refreshing} />}
              onClick={handleManualRefresh}
              loading={refreshing}
              className="mr-4"
            >
              새로고침
            </Button>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              type="link" 
              onClick={goToReportPage}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              모두 보기
            </Button>
          </motion.div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <AnimatePresence>
          {reportCards.map((card, index) => (
            <motion.div 
              key={index} 
              className="bg-white overflow-hidden shadow rounded-lg"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ 
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                y: -4
              }}
            >
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full bg-${card.color}-100 flex items-center justify-center mr-3`}>
                    {card.icon === 'file' && <FileTextOutlined className={`text-${card.color}-600`} />}
                    {card.icon === 'chart' && <BarChartOutlined className={`text-${card.color}-600`} />}
                    {card.icon === 'calendar' && <CalendarOutlined className={`text-${card.color}-600`} />}
                    {card.icon === 'line-chart' && <LineChartOutlined className={`text-${card.color}-600`} />}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-gray-500 truncate">{card.title}</p>
                    <div className="mt-1 flex items-baseline">
                      <motion.p 
                        className="text-2xl font-semibold text-gray-900"
                        animate={dataUpdated ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.5 }}
                      >
                        {card.value}
                      </motion.p>
                      {card.change !== undefined && (
                        <motion.span 
                          className={`ml-2 text-sm font-medium ${
                            card.trend === 'up' ? 'text-green-600' : card.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                          }`}
                          animate={dataUpdated ? { scale: [1, 1.2, 1] } : {}}
                          transition={{ duration: 0.5, delay: 0.1 }}
                        >
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
      </div>

      {/* 차트 및 최근 보고서 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 차트 */}
        <motion.div 
          className="md:col-span-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card 
            title={
              <div className="flex items-center">
                <span className="mr-2">보고서 차트</span>
                <Badge 
                  dot={dataUpdated} 
                  color="blue" 
                  style={{ animationDuration: '1s' }}
                />
              </div>
            }
            extra={
              <div className="flex space-x-2">
                <Select 
                  value={selectedReportType} 
                  onChange={value => setSelectedReportType(value)}
                  style={{ width: 150 }}
                  dropdownStyle={{ zIndex: 1050 }}
                >
                  <Option value={ReportType.COMPLETION_RATE}>완료율 추이</Option>
                  <Option value={ReportType.COST_ANALYSIS}>비용 분석</Option>
                  <Option value={ReportType.MAINTENANCE_SUMMARY}>정비 요약</Option>
                </Select>
                <Select
                  value={chartType}
                  onChange={handleChartTypeChange}
                  style={{ width: 110 }}
                  dropdownStyle={{ zIndex: 1050 }}
                >
                  {CHART_TYPES.map(type => (
                    <Option key={type.value} value={type.value}>{type.label}</Option>
                  ))}
                </Select>
                <Tooltip title="차트 애니메이션 켜기/끄기">
                  <Button
                    icon={<SettingOutlined />}
                    onClick={toggleChartAnimation}
                    type={chartAnimation ? "primary" : "default"}
                    size="small"
                  />
                </Tooltip>
              </div>
            }
            className="h-full"
          >
            {refreshing ? (
              <div className="chart-container flex justify-center items-center" style={{ height: '300px' }}>
                <Spin tip="차트 데이터 로딩 중..." />
              </div>
            ) : reportChartData ? (
              <motion.div 
                className="chart-container" 
                style={{ height: '300px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <DashboardChart 
                  data={reportChartData} 
                  type={selectedReportType} 
                  chartType={chartType}
                  animated={chartAnimation}
                />
              </motion.div>
            ) : (
              <Empty description="차트 데이터가 없습니다" />
            )}
          </Card>
        </motion.div>

        {/* 최근 보고서 */}
        <motion.div 
          className="md:col-span-1"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card 
            title={
              <div className="flex items-center">
                <span className="mr-2">최근 보고서</span>
                <Badge 
                  dot={dataUpdated} 
                  color="blue" 
                  style={{ animationDuration: '1s' }}
                />
              </div>
            } 
            className="h-full"
          >
            {refreshing ? (
              <div className="p-4">
                <Skeleton active paragraph={{ rows: 5 }} />
              </div>
            ) : recentReports.length > 0 ? (
              <AnimatePresence>
                <List
                  itemLayout="horizontal"
                  dataSource={recentReports}
                  renderItem={(item, index) => (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <List.Item>
                        <List.Item.Meta
                          avatar={<FileTextOutlined style={{ fontSize: '20px', color: '#1890ff' }} />}
                          title={
                            <div className="flex items-center">
                              <span className="mr-2">{item.title}</span>
                              {new Date(item.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) && (
                                <Tag color="red">New</Tag>
                              )}
                            </div>
                          }
                          description={
                            <div>
                              <Tag color={getReportTypeColor(item.type)}>{getReportTypeName(item.type)}</Tag>
                              <span className="ml-2 text-gray-500">생성: {formatDate(new Date(item.createdAt))}</span>
                            </div>
                          }
                        />
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button 
                            type="link" 
                            onClick={() => goToReportWithType(item.type)}
                          >
                            보기
                          </Button>
                        </motion.div>
                      </List.Item>
                    </motion.div>
                  )}
                />
              </AnimatePresence>
            ) : (
              <Empty description="최근 보고서가 없습니다" />
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ReportWidgets; 