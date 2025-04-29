import React from 'react';
import { Box, useTheme } from '@mui/material';

// Chart.js 또는 대체 라이브러리 필요 (npm install chart.js react-chartjs-2)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// 차트 라이브러리 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const DashboardChart = ({ data = null }) => {
  const theme = useTheme();
  
  // 데이터가 없을 경우 기본 데이터
  const defaultData = {
    labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    datasets: [
      {
        label: '월간 정비 비용',
        data: [850000, 930000, 725000, 1050000, 960000, 1125000, 850000, 1250000, 1140000, 1320000, 1150000, 1250000],
        borderColor: theme.palette.primary.main,
        backgroundColor: 'rgba(21, 101, 192, 0.1)',
        fill: true,
        tension: 0.3
      },
      {
        label: '예방적 정비',
        data: [450000, 520000, 390000, 520000, 610000, 590000, 420000, 580000, 530000, 680000, 570000, 640000],
        borderColor: theme.palette.success.main,
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: true,
        tension: 0.3
      },
      {
        label: '수리 및 교체',
        data: [400000, 410000, 335000, 530000, 350000, 535000, 430000, 670000, 610000, 640000, 580000, 610000],
        borderColor: theme.palette.error.main,
        backgroundColor: 'rgba(211, 47, 47, 0.1)',
        fill: true,
        tension: 0.3
      }
    ]
  };

  // 차트 옵션
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('ko-KR', {
                style: 'currency',
                currency: 'KRW',
                maximumFractionDigits: 0
              }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('ko-KR', {
              style: 'currency',
              currency: 'KRW',
              notation: 'compact',
              maximumFractionDigits: 0
            }).format(value);
          }
        }
      }
    }
  };

  return (
    <Box sx={{ 
      position: 'relative', 
      height: 350,
      width: '100%',
      p: 1
    }}>
      <Line 
        data={data || defaultData} 
        options={options}
      />
    </Box>
  );
};

export default DashboardChart;
