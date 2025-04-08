import React from 'react';
import { Line } from '@ant-design/plots';

interface MaintenanceTrendDataItem {
  date: string;
  completed: number;
  pending: number;
}

interface MaintenanceTrendChartProps {
  data: MaintenanceTrendDataItem[];
}

/**
 * 정비 추세를 시각화하는 선 차트 컴포넌트
 */
const MaintenanceTrendChart: React.FC<MaintenanceTrendChartProps> = ({ data }) => {
  // 데이터 가공: 월별 그룹화
  const processData = () => {
    const map = new Map<string, { completed: number; pending: number }>();
    
    data.forEach(item => {
      const date = new Date(item.date);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!map.has(yearMonth)) {
        map.set(yearMonth, { completed: 0, pending: 0 });
      }
      
      const current = map.get(yearMonth)!;
      current.completed += item.completed;
      current.pending += item.pending;
    });
    
    // 날짜순 정렬
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .flatMap(([month, values]) => [
        { month, category: '완료', value: values.completed },
        { month, category: '대기', value: values.pending }
      ]);
  };
  
  const processedData = processData();

  const config = {
    data: processedData,
    xField: 'month',
    yField: 'value',
    seriesField: 'category',
    legend: {
      position: 'top' as const,
    },
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
    color: ['#52c41a', '#faad14'],
    point: {
      size: 5,
      shape: 'diamond',
    },
  };

  return <Line {...config} />;
};

export default MaintenanceTrendChart; 