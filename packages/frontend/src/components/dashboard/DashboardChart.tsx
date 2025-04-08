import React from 'react';
import { ReportType } from '../../services/reportService';
import { DashboardChartData } from '../../services/DashboardDataService';
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
  Cell,
  AreaChart,
  Area,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { Empty } from 'antd';

// 차트 색상
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface DashboardChartProps {
  data: DashboardChartData;
  type: ReportType;
  chartType: string;
  animated: boolean;
}

const DashboardChart: React.FC<DashboardChartProps> = ({ 
  data, 
  type, 
  chartType = 'bar',
  animated = true 
}) => {
  // 데이터가 없는 경우
  if (!data || !data.data || data.data.length === 0) {
    return <Empty description="차트 데이터가 없습니다" />;
  }

  // 차트 공통 설정
  const animationDuration = animated ? 750 : 0;
  const animationConfig = {
    isAnimationActive: animated
  };

  // 데이터 포인트 수에 따라 막대 차트 너비 동적 조정
  const getBarSize = () => {
    const count = data.data.length;
    if (count <= 5) return 40;
    if (count <= 10) return 30;
    if (count <= 15) return 20;
    return 15;
  };

  // 차트 타입별 렌더링
  switch (chartType) {
    case 'line':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data.data}
            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey={data.xAxisKey || 'name'} 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              width={70}
              tickFormatter={data.yAxisFormat || undefined}
            />
            <Tooltip 
              formatter={data.tooltipFormat || undefined}
              labelFormatter={data.tooltipLabelFormat || undefined}
            />
            <Legend verticalAlign="top" height={36} />
            {data.series && data.series.map((serie, index) => (
              <Line
                key={serie.dataKey}
                type="monotone"
                dataKey={serie.dataKey}
                name={serie.name}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 1 }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                {...animationConfig}
                animationDuration={animationDuration}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );

    case 'bar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.data}
            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
            barSize={getBarSize()}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey={data.xAxisKey || 'name'} 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              width={70}
              tickFormatter={data.yAxisFormat || undefined}
            />
            <Tooltip 
              formatter={data.tooltipFormat || undefined}
              labelFormatter={data.tooltipLabelFormat || undefined}
            />
            <Legend verticalAlign="top" height={36} />
            {data.series && data.series.map((serie, index) => (
              <Bar
                key={serie.dataKey}
                dataKey={serie.dataKey}
                name={serie.name}
                fill={COLORS[index % COLORS.length]}
                {...animationConfig}
                animationDuration={animationDuration}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );

    case 'pie':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <Tooltip 
              formatter={data.tooltipFormat || undefined}
              labelFormatter={data.tooltipLabelFormat || undefined}
            />
            <Legend verticalAlign="top" height={36} />
            <Pie
              data={data.data}
              dataKey={data.series && data.series.length > 0 ? data.series[0].dataKey : 'value'}
              nameKey={data.xAxisKey || 'name'}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={type === ReportType.MAINTENANCE_SUMMARY ? 40 : 0}
              label={data.labelFormat || undefined}
              labelLine={true}
              {...animationConfig}
              animationDuration={animationDuration}
            >
              {data.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );

    case 'area':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data.data}
            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
          >
            <defs>
              {data.series && data.series.map((serie, index) => (
                <linearGradient key={`color-${index}`} id={`color-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.1}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey={data.xAxisKey || 'name'} 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              width={70}
              tickFormatter={data.yAxisFormat || undefined}
            />
            <Tooltip 
              formatter={data.tooltipFormat || undefined}
              labelFormatter={data.tooltipLabelFormat || undefined}
            />
            <Legend verticalAlign="top" height={36} />
            {data.series && data.series.map((serie, index) => (
              <Area
                key={serie.dataKey}
                type="monotone"
                dataKey={serie.dataKey}
                name={serie.name}
                stroke={COLORS[index % COLORS.length]}
                fillOpacity={1}
                fill={`url(#color-${index})`}
                {...animationConfig}
                animationDuration={animationDuration}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'radar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart 
            cx="50%" 
            cy="50%" 
            outerRadius="80%" 
            data={data.data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <PolarGrid stroke="#e5e5e5" />
            <PolarAngleAxis dataKey={data.xAxisKey || 'name'} tick={{ fontSize: 12 }} />
            <PolarRadiusAxis angle={90} tick={{ fontSize: 12 }} />
            {data.series && data.series.map((serie, index) => (
              <Radar
                key={serie.dataKey}
                name={serie.name}
                dataKey={serie.dataKey}
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.2}
                {...animationConfig}
                animationDuration={animationDuration}
              />
            ))}
            <Legend verticalAlign="top" height={36} />
            <Tooltip 
              formatter={data.tooltipFormat || undefined}
              labelFormatter={data.tooltipLabelFormat || undefined}
            />
          </RadarChart>
        </ResponsiveContainer>
      );

    default:
      // 기본값: 막대 차트
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.data}
            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
            barSize={getBarSize()}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey={data.xAxisKey || 'name'} 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              width={50}
              tickFormatter={data.yAxisFormat || undefined}
            />
            <Tooltip 
              formatter={data.tooltipFormat || undefined}
              labelFormatter={data.tooltipLabelFormat || undefined}
            />
            <Legend verticalAlign="top" height={36} />
            {data.series && data.series.map((serie, index) => (
              <Bar
                key={serie.dataKey}
                dataKey={serie.dataKey}
                name={serie.name}
                fill={COLORS[index % COLORS.length]}
                {...animationConfig}
                animationDuration={animationDuration}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
  }
};

export default DashboardChart; 