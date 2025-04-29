import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const PartDashboard: React.FC = () => {
  const [period, setPeriod] = useState('3');  // 기본값 3개월
  const [category, setCategory] = useState('');

  // 재고 분석 데이터 조회
  const { data: stockAnalysis } = useQuery(
    ['partStockAnalysis', period, category],
    async () => {
      const startDate = format(subMonths(new Date(), parseInt(period)), 'yyyy-MM-dd');
      const response = await fetch(`/api/v1/maintenance/parts/analysis/stock?startDate=${startDate}&category=${category}`);
      if (!response.ok) throw new Error('재고 분석 데이터를 불러오는데 실패했습니다.');
      return response.json();
    }
  );

  // 사용량 분석 데이터 조회
  const { data: usageAnalysis } = useQuery(
    ['partUsageAnalysis', period, category],
    async () => {
      const startDate = format(subMonths(new Date(), parseInt(period)), 'yyyy-MM-dd');
      const response = await fetch(`/api/v1/maintenance/parts/analysis/usage?startDate=${startDate}&category=${category}`);
      if (!response.ok) throw new Error('사용량 분석 데이터를 불러오는데 실패했습니다.');
      return response.json();
    }
  );

  // 비용 분석 데이터 조회
  const { data: costAnalysis } = useQuery(
    ['partCostAnalysis', period, category],
    async () => {
      const startDate = format(subMonths(new Date(), parseInt(period)), 'yyyy-MM-dd');
      const response = await fetch(`/api/v1/maintenance/parts/analysis/cost?startDate=${startDate}&category=${category}`);
      if (!response.ok) throw new Error('비용 분석 데이터를 불러오는데 실패했습니다.');
      return response.json();
    }
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          부품 분석 대시보드
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ width: 150 }}>
            <InputLabel>기간</InputLabel>
            <Select
              value={period}
              label="기간"
              onChange={(e) => setPeriod(e.target.value)}
            >
              <MenuItem value="1">1개월</MenuItem>
              <MenuItem value="3">3개월</MenuItem>
              <MenuItem value="6">6개월</MenuItem>
              <MenuItem value="12">12개월</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ width: 150 }}>
            <InputLabel>카테고리</InputLabel>
            <Select
              value={category}
              label="카테고리"
              onChange={(e) => setCategory(e.target.value)}
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="ENGINE">엔진</MenuItem>
              <MenuItem value="TRANSMISSION">변속기</MenuItem>
              <MenuItem value="BRAKE">브레이크</MenuItem>
              <MenuItem value="SUSPENSION">서스펜션</MenuItem>
              <MenuItem value="ELECTRICAL">전기</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 주요 지표 카드 */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                총 재고 금액
              </Typography>
              <Typography variant="h4">
                {costAnalysis?.totalStockValue?.toLocaleString()}원
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                월평균 사용량
              </Typography>
              <Typography variant="h4">
                {usageAnalysis?.averageMonthlyUsage?.toLocaleString()}개
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                재고 부족 품목
              </Typography>
              <Typography variant="h4">
                {stockAnalysis?.lowStockCount}개
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                월평균 발주 금액
              </Typography>
              <Typography variant="h4">
                {costAnalysis?.averageMonthlyOrderCost?.toLocaleString()}원
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 카테고리별 재고 현황 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              카테고리별 재고 현황
            </Typography>
            <Box sx={{ height: 300 }}>
              <BarChart
                width={500}
                height={300}
                data={stockAnalysis?.categoryStocks}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="currentStock" fill="#8884d8" name="현재고" />
                <Bar dataKey="minStock" fill="#82ca9d" name="최소재고" />
              </BarChart>
            </Box>
          </Paper>
        </Grid>

        {/* 월별 사용량 추이 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              월별 사용량 추이
            </Typography>
            <Box sx={{ height: 300 }}>
              <LineChart
                width={500}
                height={300}
                data={usageAnalysis?.monthlyUsage}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="quantity" stroke="#8884d8" name="사용량" />
              </LineChart>
            </Box>
          </Paper>
        </Grid>

        {/* 재고 상태 분포 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              재고 상태 분포
            </Typography>
            <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
              <PieChart width={400} height={300}>
                <Pie
                  data={stockAnalysis?.stockStatus}
                  cx={200}
                  cy={150}
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {stockAnalysis?.stockStatus?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </Box>
          </Paper>
        </Grid>

        {/* 재고 부족 예상 품목 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              재고 부족 예상 품목
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>부품명</TableCell>
                    <TableCell align="right">현재고</TableCell>
                    <TableCell align="right">최소재고</TableCell>
                    <TableCell align="right">예상 소진일</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stockAnalysis?.lowStockPredictions?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell align="right">{item.currentStock}</TableCell>
                      <TableCell align="right">{item.minStock}</TableCell>
                      <TableCell align="right">
                        {format(new Date(item.expectedStockoutDate), 'yyyy-MM-dd')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PartDashboard; 