import React from 'react';
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
  ChartOptions,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { Box, Grid, Paper, Typography } from '@mui/material';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// 임시 데이터
const barChartData = {
  labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
  datasets: [
    {
      label: '정기 점검',
      data: [650000, 590000, 800000, 510000, 560000, 550000],
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
    },
    {
      label: '수리',
      data: [860000, 720000, 540000, 890000, 490000, 580000],
      backgroundColor: 'rgba(255, 99, 132, 0.5)',
    },
    {
      label: '부품 교체',
      data: [420000, 390000, 520000, 390000, 500000, 320000],
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
    },
  ],
};

const pieChartData = {
  labels: ['승용차', 'SUV', '트럭', '밴'],
  datasets: [
    {
      data: [4800000, 2500000, 1200000, 800000],
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(255, 206, 86, 0.7)',
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(255, 206, 86, 1)',
      ],
      borderWidth: 1,
    },
  ],
};

// 차트 옵션
const barOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: false,
    },
    tooltip: {
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
              maximumFractionDigits: 0,
            }).format(context.parsed.y);
          }
          return label;
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      ticks: {
        callback: function(value) {
          return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
            notation: 'compact',
            compactDisplay: 'short',
            maximumFractionDigits: 0,
          }).format(value as number);
        }
      }
    }
  }
};

const pieOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          let label = context.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed !== null) {
            label += new Intl.NumberFormat('ko-KR', {
              style: 'currency',
              currency: 'KRW',
              maximumFractionDigits: 0,
            }).format(context.parsed);
          }
          return label;
        }
      }
    }
  }
};

// Bar 차트 컴포넌트
export const BarChart: React.FC = () => {
  return (
    <Box sx={{ height: 300, position: 'relative' }}>
      <Bar options={barOptions} data={barChartData} />
    </Box>
  );
};

// Pie 차트 컴포넌트
export const PieChart: React.FC = () => {
  return (
    <Box sx={{ height: 300, position: 'relative', display: 'flex', justifyContent: 'center' }}>
      <Pie options={pieOptions} data={pieChartData} />
    </Box>
  );
};

// 메인 대시보드 차트 컴포넌트
export const DashboardChart: React.FC = () => {
  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom component="div">
              정비 비용 추이 (최근 6개월)
            </Typography>
            <BarChart />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom component="div">
              차량 유형별 정비 비용
            </Typography>
            <PieChart />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardChart;
