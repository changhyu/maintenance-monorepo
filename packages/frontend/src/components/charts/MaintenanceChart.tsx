import React, { useState, useEffect, useTransition } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Box, Card, CardContent, Typography, ToggleButton, ToggleButtonGroup, CircularProgress } from '@mui/material';

// 통계 데이터 형식
interface MaintenanceStats {
  name: string;
  count: number;
  cost: number;
}

// 컴포넌트 프롭스 타입
interface MaintenanceChartProps {
  /** 차트 제목 */
  title?: string;
  /** 차트 설명 */
  description?: string;
  /** 데이터 가져오기 함수 */
  fetchData?: () => Promise<MaintenanceStats[]>;
  /** 테스트용 더미 데이터 */
  testData?: MaintenanceStats[];
  /** 차트 높이 */
  height?: number;
}

/**
 * 정비 통계 차트 컴포넌트
 * React 19의 useTransition을 활용하여 데이터 로딩 최적화
 */
const MaintenanceChart: React.FC<MaintenanceChartProps> = ({
  title = '정비 현황',
  description = '월별 정비 건수 및 비용 추이',
  fetchData,
  testData,
  height = 300
}) => {
  // 상태 관리
  const [data, setData] = useState<MaintenanceStats[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [dataType, setDataType] = useState<'count' | 'cost'>('count');

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
        } catch (error) {
          console.error('데이터 로드 오류:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [fetchData, testData]);

  // 차트 타입 변경 핸들러
  const handleChartTypeChange = (
    _: React.MouseEvent<HTMLElement>,
    newType: 'bar' | 'line' | null
  ) => {
    if (newType !== null) {
      setChartType(newType);
    }
  };

  // 데이터 타입 변경 핸들러
  const handleDataTypeChange = (
    _: React.MouseEvent<HTMLElement>,
    newType: 'count' | 'cost' | null
  ) => {
    if (newType !== null) {
      setDataType(newType);
    }
  };

  // 더미 데이터 (fetchData나 testData가 없을 경우)
  const dummyData: MaintenanceStats[] = [
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
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: height
          }}
        >
          <CircularProgress />
        </Box>
      );
    }

    // 바 차트
    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value) => {
                if (dataType === 'cost') {
                  return [`${Number(value).toLocaleString()}원`, '비용'];
                }
                return [`${value}건`, '건수'];
              }}
            />
            <Legend />
            <Bar
              dataKey={dataType}
              name={dataType === 'count' ? '정비 건수' : '정비 비용'}
              fill={dataType === 'count' ? '#8884d8' : '#82ca9d'}
              animationDuration={1000}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // 라인 차트
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip
            formatter={(value) => {
              if (dataType === 'cost') {
                return [`${Number(value).toLocaleString()}원`, '비용'];
              }
              return [`${value}건`, '건수'];
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey={dataType}
            name={dataType === 'count' ? '정비 건수' : '정비 비용'}
            stroke={dataType === 'count' ? '#8884d8' : '#82ca9d'}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" component="div">
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ToggleButtonGroup
              size="small"
              value={dataType}
              exclusive
              onChange={handleDataTypeChange}
              aria-label="data type"
            >
              <ToggleButton value="count" aria-label="count">
                건수
              </ToggleButton>
              <ToggleButton value="cost" aria-label="cost">
                비용
              </ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup
              size="small"
              value={chartType}
              exclusive
              onChange={handleChartTypeChange}
              aria-label="chart type"
            >
              <ToggleButton value="bar" aria-label="bar chart">
                막대
              </ToggleButton>
              <ToggleButton value="line" aria-label="line chart">
                선
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
        
        {/* useTransition 사용으로 인한 데이터 로드 중 상태 표시 */}
        {isPending && (
          <Box
            sx={{
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
            }}
          >
            <CircularProgress size={40} />
          </Box>
        )}
        
        {renderChart()}
      </CardContent>
    </Card>
  );
};

export default MaintenanceChart;