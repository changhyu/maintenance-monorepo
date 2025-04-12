import React from 'react';

import { Pie } from '@ant-design/plots';

import { ChartDataItem } from './VehicleTypeChart';

interface MaintenanceStatusChartProps {
  data: ChartDataItem[];
}

/**
 * 차량 정비 상태 분포를 시각화하는 도넛 차트 컴포넌트
 */
const MaintenanceStatusChart: React.FC<MaintenanceStatusChartProps> = ({ data }) => {
  // 상태별 색상 매핑
  const getStatusColor = (status: string) => {
    switch (status) {
      case '운행 중':
        return '#52c41a'; // green
      case '정비 중':
        return '#1890ff'; // blue
      case '대기 중':
        return '#8c8c8c'; // gray
      case '고장':
        return '#f5222d'; // red
      case '점검 필요':
        return '#faad14'; // yellow
      default:
        return '#d9d9d9'; // light gray
    }
  };

  const config = {
    data,
    angleField: 'value',
    colorField: 'label',
    radius: 0.8,
    innerRadius: 0.6,
    label: {
      type: 'inner',
      offset: '-50%',
      content: '{value}',
      style: {
        textAlign: 'center',
        fontSize: 14
      }
    },
    colorConfig: {
      handler: (label: string) => getStatusColor(label)
    },
    statistic: {
      title: {
        content: '총계'
      },
      content: {
        style: {
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        },
        content: data.reduce((acc, item) => acc + item.value, 0) + '대'
      }
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: datum.label,
          value: `${datum.value}대 (${((datum.value / data.reduce((acc, item) => acc + item.value, 0)) * 100).toFixed(1)}%)`
        };
      }
    },
    legend: {
      position: 'bottom' as const,
      layout: 'horizontal' as const
    }
  };

  return <Pie {...config} />;
};

export default MaintenanceStatusChart;
