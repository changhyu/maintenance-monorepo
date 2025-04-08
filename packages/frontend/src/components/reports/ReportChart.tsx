import React from 'react';
import { Card, Spin, Empty, Radio } from 'antd';
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
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { ReportType } from '../../services/reportService';
import './styles.css';

// 차트 색상
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface LineChartData {
  date: string;
  value: number;
  [key: string]: any;
}

export interface BarChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface ReportChartProps {
  type: ReportType;
  data: any;
  loading?: boolean;
  height?: number;
  title?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'auto';
}

/**
 * 보고서 차트 컴포넌트
 */
const ReportChart: React.FC<ReportChartProps> = ({
  type,
  data,
  loading = false,
  height = 300,
  title,
  chartType = 'auto'
}) => {
  const [selectedChart, setSelectedChart] = React.useState<'line' | 'bar' | 'pie'>(
    chartType === 'auto' ? getDefaultChartType(type) : chartType
  );

  // 보고서 유형에 따른 기본 차트 유형 설정
  function getDefaultChartType(reportType: ReportType): 'line' | 'bar' | 'pie' {
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
    if (!data) return [];

    switch (type) {
      case ReportType.COMPLETION_RATE:
        return data.trend || [];
      case ReportType.COST_ANALYSIS:
        return data.costTrend || [];
      case ReportType.VEHICLE_HISTORY:
        return data.maintenanceHistory?.map((item: any) => ({
          name: item.type,
          value: item.cost
        })) || [];
      case ReportType.MAINTENANCE_SUMMARY:
        return data.byType || [];
      case ReportType.MAINTENANCE_FORECAST:
        return data.upcoming?.map((item: any) => ({
          name: item.vehicleName,
          value: item.confidence * 100
        })) || [];
      default:
        return [];
    }
  };

  // 차트 제목 가져오기
  const getChartTitle = () => {
    if (title) return title;

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

  // 차트 내용 렌더링
  const renderChart = () => {
    if (loading) {
      return <Spin tip="차트 로딩 중..." />;
    }

    if (!chartData || chartData.length === 0) {
      return <Empty description="표시할 데이터가 없습니다" />;
    }

    switch (selectedChart) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" label={{ value: xLabel, position: 'insideBottomRight', offset: -10 }} />
              <YAxis label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" label={{ value: xLabel, position: 'insideBottomRight', offset: -10 }} />
              <YAxis label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8">
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return <Empty description="지원되지 않는 차트 유형" />;
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

  return (
    <Card title={getChartTitle()} className="report-chart">
      {chartType === 'auto' && (
        <div className="chart-type-selector">
          <Radio.Group
            value={selectedChart}
            onChange={(e) => setSelectedChart(e.target.value)}
            size="small"
            buttonStyle="solid"
          >
            {getAvailableChartTypes().map((type) => (
              <Radio.Button key={type} value={type}>
                {type === 'line' ? '선형' : type === 'bar' ? '막대' : '파이'}
              </Radio.Button>
            ))}
          </Radio.Group>
        </div>
      )}
      <div className="chart-container">{renderChart()}</div>
    </Card>
  );
};

export default ReportChart; 