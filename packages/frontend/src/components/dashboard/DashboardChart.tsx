import React, { useMemo } from 'react';
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
  PolarRadiusAxis,
  ScatterChart,
  Scatter
} from 'recharts';
import { Empty, message } from 'antd';

// 차트 색상
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface DashboardChartProps {
  data: DashboardChartData;
  type: ReportType;
  chartType: string;
  animated: boolean;
  onChartElementClick?: (element: any) => void;
}

const DashboardChart: React.FC<DashboardChartProps> = ({ 
  data, 
  type, 
  chartType = 'bar',
  animated = true,
  onChartElementClick
}) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { chartData, xAxisKey, series, hasData } = useMemo(() => {
    try {
      if (!data) {
        return { hasData: false, chartData: [], xAxisKey: 'name', series: [] };
      }

      // 데이터 배열 가져오기 (data.data 또는 data.datasets의 첫번째 항목의 data)
      const chartData = data.data || (data.datasets && data.datasets[0]?.data ? 
        data.datasets[0].data.map((value, i) => ({
          name: data.labels?.[i] || `항목 ${i+1}`,
          value
        })) : []);

      // x축 키 값 (호환성 유지)
      const xAxisKey = data.xAxisKey || data.xKey || 'name';
      
      // series 또는 datasets에서 시리즈 정보 추출
      const series = data.series || (data.datasets?.map(ds => ({
        dataKey: 'value',
        name: ds.label || '값'
      })) || [{ dataKey: 'value', name: '값' }]);

      return { 
        hasData: chartData && chartData.length > 0, 
        chartData, 
        xAxisKey, 
        series 
      };
    } catch (error) {
      console.error('차트 데이터 처리 중 오류 발생:', error);
      // 오류 발생 시 빈 데이터 반환
      return { hasData: false, chartData: [], xAxisKey: 'name', series: [] };
    }
  }, [data]);

  // 데이터가 없는 경우
  if (!hasData) {
    return <Empty description="차트 데이터가 없습니다" />;
  }

  // 차트 공통 설정
  const animationDuration = animated ? 750 : 0;
  const animationConfig = {
    isAnimationActive: animated
  };

  // 데이터 포인트 수에 따라 막대 차트 너비 동적 조정
  const getBarSize = () => {
    const count = chartData.length;
    if (count <= 5) return 40;
    if (count <= 10) return 30;
    if (count <= 15) return 20;
    return 15;
  };

  // 차트 고유 ID (여러 차트가 동시에 렌더링될 때 ID 충돌 방지)
  const chartId = useMemo(() => `chart-${Math.random().toString(36).substr(2, 9)}`, []);

  // 오류 발생 시 처리할 에러 핸들러
  const handleChartError = (err: Error) => {
    console.error('차트 렌더링 중 오류 발생:', err);
    message.error('차트를 표시하는 중 오류가 발생했습니다.');
  };
  
  try {
    // 차트 타입별 렌더링
    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                width={70}
                tickFormatter={data.yAxisFormat}
              />
              <Tooltip 
                formatter={data.tooltipFormat}
                labelFormatter={data.tooltipLabelFormat}
              />
              <Legend verticalAlign="top" height={36} />
              {series.map((serie, index) => (
                <Line
                  key={`${serie.dataKey}-${index}`}
                  type="monotone"
                  dataKey={serie.dataKey}
                  name={serie.name}
                  stroke={data.colors?.[index] || COLORS[index % COLORS.length]}
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
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
              barSize={getBarSize()}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                width={70}
                tickFormatter={data.yAxisFormat}
              />
              <Tooltip 
                formatter={data.tooltipFormat}
                labelFormatter={data.tooltipLabelFormat}
              />
              <Legend verticalAlign="top" height={36} />
              {series.map((serie, index) => (
                <Bar
                  key={`${serie.dataKey}-${index}`}
                  dataKey={serie.dataKey}
                  name={serie.name}
                  fill={data.colors?.[index] || COLORS[index % COLORS.length]}
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
                formatter={data.tooltipFormat}
                labelFormatter={data.tooltipLabelFormat}
              />
              <Legend verticalAlign="top" height={36} />
              <Pie
                data={chartData}
                dataKey={data.valueKey || series[0]?.dataKey || 'value'}
                nameKey={data.nameKey || xAxisKey}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={type === ReportType.MAINTENANCE_SUMMARY ? 40 : 0}
                label={data.labelFormat ? 
                  (entry) => (typeof data.labelFormat === 'function' ? 
                    data.labelFormat(entry.value, entry.name, entry) : 
                    `${entry.name}: ${entry.value}`) : 
                  true
                }
                labelLine={true}
                {...animationConfig}
                animationDuration={animationDuration}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}-${entry.name}`} 
                    fill={data.colors?.[index] || COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
            >
              <defs>
                {series.map((serie, index) => (
                  <linearGradient 
                    key={`color-${chartId}-${index}`} 
                    id={`color-${chartId}-${index}`} 
                    x1="0" y1="0" x2="0" y2="1"
                  >
                    <stop offset="5%" stopColor={data.colors?.[index] || COLORS[index % COLORS.length]} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={data.colors?.[index] || COLORS[index % COLORS.length]} stopOpacity={0.1}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                width={70}
                tickFormatter={data.yAxisFormat}
              />
              <Tooltip 
                formatter={data.tooltipFormat}
                labelFormatter={data.tooltipLabelFormat}
              />
              <Legend verticalAlign="top" height={36} />
              {series.map((serie, index) => (
                <Area
                  key={`${serie.dataKey}-${index}`}
                  type="monotone"
                  dataKey={serie.dataKey}
                  name={serie.name}
                  stroke={data.colors?.[index] || COLORS[index % COLORS.length]}
                  fillOpacity={1}
                  fill={`url(#color-${chartId}-${index})`}
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
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <PolarGrid stroke="#e5e5e5" />
              <PolarAngleAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={90} tick={{ fontSize: 12 }} />
              {series.map((serie, index) => (
                <Radar
                  key={`${serie.dataKey}-${index}`}
                  name={serie.name}
                  dataKey={serie.dataKey}
                  stroke={data.colors?.[index] || COLORS[index % COLORS.length]}
                  fill={data.colors?.[index] || COLORS[index % COLORS.length]}
                  fillOpacity={0.2}
                  {...animationConfig}
                  animationDuration={animationDuration}
                />
              ))}
              <Legend verticalAlign="top" height={36} />
              <Tooltip 
                formatter={data.tooltipFormat}
                labelFormatter={data.tooltipLabelFormat}
              />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="x" tick={{ fontSize: 12 }} />
              <YAxis dataKey="y" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Scatter 
                data={chartData} 
                fill="#8884d8" 
                onClick={(entry) => { if(onChartElementClick) { onChartElementClick(entry) } }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'heatmap':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {chartData.map((item, index) => (
                <div key={`heatmap-${index}`} style={{ width: '20%', height: 50, backgroundColor: item.value > 50 ? '#ff0000' : '#00ff00', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fff' }}>
                  {item.value}
                </div>
              ))}
            </div>
          </ResponsiveContainer>
        );

      default:
        // 기본값: 막대 차트
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
              barSize={getBarSize()}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                width={50}
                tickFormatter={data.yAxisFormat}
              />
              <Tooltip 
                formatter={data.tooltipFormat}
                labelFormatter={data.tooltipLabelFormat}
              />
              <Legend verticalAlign="top" height={36} />
              {series.map((serie, index) => (
                <Bar
                  key={`${serie.dataKey}-${index}`}
                  dataKey={serie.dataKey}
                  name={serie.name}
                  fill={data.colors?.[index] || COLORS[index % COLORS.length]}
                  {...animationConfig}
                  animationDuration={animationDuration}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  } catch (error) {
    handleChartError(error as Error);
    return <Empty description="차트를 표시할 수 없습니다" />;
  }
};

export default DashboardChart; 