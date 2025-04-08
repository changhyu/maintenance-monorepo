import React from 'react';
import { Column } from '@ant-design/plots';
import { ChartDataItem } from './VehicleTypeChart';

interface CostDistributionChartProps {
  data: ChartDataItem[];
}

/**
 * 비용 분포를 시각화하는 막대 차트 컴포넌트
 */
const CostDistributionChart: React.FC<CostDistributionChartProps> = ({ data }) => {
  const config = {
    data,
    xField: 'label',
    yField: 'value',
    label: {
      position: 'middle',
      style: {
        fill: '#FFFFFF',
        opacity: 0.6,
      },
    },
    color: ({ label }: { label: string }) => {
      if (label.includes('양호')) return '#52c41a';
      if (label.includes('주의')) return '#faad14';
      if (label.includes('위험')) return '#f5222d';
      return '#1890ff';
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    meta: {
      value: {
        alias: '차량 수',
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        return { name: datum.label, value: `${datum.value}대 (${((datum.value / data.reduce((acc, item) => acc + item.value, 0)) * 100).toFixed(1)}%)` };
      },
    },
  };

  return <Column {...config} />;
};

export default CostDistributionChart; 