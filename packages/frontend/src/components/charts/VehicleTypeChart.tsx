import React from 'react';

import { Pie } from '@ant-design/plots';

export interface ChartDataItem {
  label: string;
  value: number;
}

interface VehicleTypeChartProps {
  data: ChartDataItem[];
  isLoading?: boolean;
  title?: string;
}

/**
 * 차량 유형 분포를 시각화하는 파이 차트 컴포넌트
 */
const VehicleTypeChart: React.FC<VehicleTypeChartProps> = ({ data, isLoading = false, title }) => {
  const config = {
    data,
    angleField: 'value',
    colorField: 'label',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name}: {percentage}'
    },
    interactions: [
      {
        type: 'element-active'
      }
    ],
    legend: {
      position: 'bottom' as const,
      layout: 'horizontal' as const
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: datum.label,
          value: `${datum.value}대 (${((datum.value / data.reduce((acc, item) => acc + item.value, 0)) * 100).toFixed(1)}%)`
        };
      }
    }
  };

  if (isLoading) {
    return <div className="h-64 flex items-center justify-center">로딩 중...</div>;
  }

  return (
    <div>
      {title && <div className="text-lg font-medium mb-4">{title}</div>}
      <Pie {...config} />
    </div>
  );
};

export default VehicleTypeChart;
