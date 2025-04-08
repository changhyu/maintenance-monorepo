import React, { useState, useEffect } from 'react';
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
  Skeleton
} from 'antd';
import { 
  FileTextOutlined, 
  BarChartOutlined, 
  LineChartOutlined, 
  PieChartOutlined, 
  CalendarOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined
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
  Cell
} from 'recharts';

const { Option } = Select;

// 차트 색상
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface ReportWidgetsProps {
  dashboardService?: DashboardDataService;
}

const ReportWidgets: React.FC<ReportWidgetsProps> = ({ dashboardService = new DashboardDataService() }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [reportCards, setReportCards] = useState<DashboardCardData[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [reportChartData, setReportChartData] = useState<DashboardChartData | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>(ReportType.COMPLETION_RATE);
  const navigate = useNavigate();

  // 데이터 로드
  useEffect(() => {
    loadReportData();
  }, []);

  // 보고서 타입이 변경될 때 차트 데이터 다시 로드
  useEffect(() => {
    loadReportChartData(selectedReportType);
  }, [selectedReportType]);

  // 보고서 데이터 로드
  const loadReportData = async () => {
    setLoading(true);
    try {
      // 대시보드 카드 데이터 (요약 정보)
      const cards = await dashboardService.getReportOverviewData();
      setReportCards(cards);

      // 최근 보고서 목록
      const reports = await reportService.getReports({ 
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });
      setRecentReports(reports.slice(0, 5));  // 최근 5개만

      // 초기 차트 데이터 로드
      loadReportChartData(selectedReportType);
    } catch (error) {
      console.error('보고서 위젯 데이터 로드 중 오류 발생:', error);
    } finally {
      setLoading(false);
    }
  };

  // 선택된 보고서 타입에 맞는 차트 데이터 로드
  const loadReportChartData = async (reportType: ReportType) => {
    try {
      const chartData = await dashboardService.getReportChartData(reportType);
      setReportChartData(chartData);
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
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-medium text-gray-900">보고서 요약</h2>
        <Button 
          type="link" 
          onClick={goToReportPage}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          모두 보기
        </Button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        {reportCards.map((card, index) => (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
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
                    <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                    {card.change !== undefined && (
                      <span 
                        className={`ml-2 text-sm font-medium ${
                          card.trend === 'up' ? 'text-green-600' : card.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                        }`}
                      >
                        {card.trend === 'up' && <ArrowUpOutlined />}
                        {card.trend === 'down' && <ArrowDownOutlined />}
                        {card.change > 0 ? '+' : ''}{card.change}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 차트 및 최근 보고서 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 차트 */}
        <div className="md:col-span-2">
          <Card 
            title="보고서 차트" 
            extra={
              <Select 
                value={selectedReportType} 
                onChange={value => setSelectedReportType(value)}
                style={{ width: 150 }}
              >
                <Option value={ReportType.COMPLETION_RATE}>완료율 추이</Option>
                <Option value={ReportType.COST_ANALYSIS}>비용 분석</Option>
                <Option value={ReportType.MAINTENANCE_SUMMARY}>정비 요약</Option>
              </Select>
            }
            className="h-full"
          >
            {reportChartData ? (
              <div className="chart-container" style={{ height: '300px' }}>
                <DashboardReportChart data={reportChartData} type={selectedReportType} />
              </div>
            ) : (
              <Empty description="차트 데이터가 없습니다" />
            )}
          </Card>
        </div>

        {/* 최근 보고서 */}
        <div className="md:col-span-1">
          <Card title="최근 보고서" className="h-full">
            {recentReports.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {recentReports.map((report, index) => (
                  <li key={index} className="py-3">
                    <div className="flex items-center">
                      <FileTextOutlined className="text-gray-400 mr-2" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {report.title}
                        </p>
                        <div className="flex items-center mt-1">
                          <Tag color={getReportTypeColor(report.type)}>
                            {getReportTypeName(report.type)}
                          </Tag>
                          <span className="text-xs text-gray-500 ml-2">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty description="최근 보고서가 없습니다" />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

// 대시보드용 보고서 차트 컴포넌트
const DashboardReportChart: React.FC<{ data: DashboardChartData, type: ReportType }> = ({ data, type }) => {
  const chartType = type === ReportType.MAINTENANCE_SUMMARY ? 'pie' : 
                    type === ReportType.COMPLETION_RATE ? 'line' : 'bar';

  const renderChart = () => {
    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.labels.map((label, index) => ({ name: label, value: data.datasets[0].data[index] }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.labels.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.labels.map((label, index) => ({ name: label, value: data.datasets[0].data[index] }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
                name={data.datasets[0].label}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'bar':
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.labels.map((label, index) => ({ name: label, value: data.datasets[0].data[index] }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar 
                dataKey="value" 
                name={data.datasets[0].label} 
                fill="#8884d8"
              >
                {data.labels.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return renderChart();
};

export default ReportWidgets; 