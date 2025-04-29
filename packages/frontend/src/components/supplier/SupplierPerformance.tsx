import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';

interface SupplierPerformanceProps {
  open: boolean;
  onClose: () => void;
  supplierId: string;
  supplierName: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const SupplierPerformance: React.FC<SupplierPerformanceProps> = ({
  open,
  onClose,
  supplierId,
  supplierName,
}) => {
  const [period, setPeriod] = useState(3); // 기본값 3개월

  const { data, isLoading } = useQuery(
    ['supplierPerformance', supplierId, period],
    async () => {
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subMonths(new Date(), period), 'yyyy-MM-dd');
      
      const response = await fetch(
        `/api/v1/maintenance/suppliers/${supplierId}/performance?startDate=${startDate}&endDate=${endDate}`
      );
      
      if (!response.ok) throw new Error('실적 데이터를 불러오는데 실패했습니다.');
      return response.json();
    }
  );

  const getDeliveryRateColor = (rate: number) => {
    if (rate >= 90) return 'success.main';
    if (rate >= 80) return 'warning.main';
    return 'error.main';
  };

  const getRatingColor = (score: number) => {
    if (score >= 4) return 'success.main';
    if (score >= 3) return 'warning.main';
    return 'error.main';
  };

  if (isLoading) {
    return <Typography>로딩 중...</Typography>;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {supplierName} - 실적 분석
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ width: 150 }}>
            <InputLabel>조회 기간</InputLabel>
            <Select
              value={period}
              label="조회 기간"
              onChange={(e) => setPeriod(Number(e.target.value))}
            >
              <MenuItem value={3}>3개월</MenuItem>
              <MenuItem value={6}>6개월</MenuItem>
              <MenuItem value={12}>12개월</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={3}>
          {/* 주요 지표 */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  총 주문 건수
                </Typography>
                <Typography variant="h4">
                  {data.totalOrders}건
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  총 주문 금액
                </Typography>
                <Typography variant="h4">
                  {data.totalAmount.toLocaleString()}원
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  납기 준수율
                </Typography>
                <Typography variant="h4" color={getDeliveryRateColor(data.onTimeDeliveryRate)}>
                  {data.onTimeDeliveryRate.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  평균 평가 점수
                </Typography>
                <Typography variant="h4" color={getRatingColor(data.averageRating)}>
                  {data.averageRating.toFixed(1)}점
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* 주문 이력 */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              주문 이력
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>주문일</TableCell>
                    <TableCell>예상 납기일</TableCell>
                    <TableCell>실제 납기일</TableCell>
                    <TableCell align="right">수량</TableCell>
                    <TableCell align="right">금액</TableCell>
                    <TableCell>상태</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.orderHistory.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell>{format(new Date(order.orderDate), 'yyyy-MM-dd')}</TableCell>
                      <TableCell>{format(new Date(order.expectedDeliveryDate), 'yyyy-MM-dd')}</TableCell>
                      <TableCell>
                        {order.deliveryDate
                          ? format(new Date(order.deliveryDate), 'yyyy-MM-dd')
                          : '-'
                        }
                      </TableCell>
                      <TableCell align="right">{order.quantity}개</TableCell>
                      <TableCell align="right">{order.amount.toLocaleString()}원</TableCell>
                      <TableCell>{order.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* 평가 이력 */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              평가 이력
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>평가일</TableCell>
                    <TableCell align="right">점수</TableCell>
                    <TableCell>코멘트</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.ratingHistory.map((rating: any) => (
                    <TableRow key={rating.id}>
                      <TableCell>{format(new Date(rating.date), 'yyyy-MM-dd')}</TableCell>
                      <TableCell align="right">
                        <Typography color={getRatingColor(rating.score)}>
                          {rating.score}점
                        </Typography>
                      </TableCell>
                      <TableCell>{rating.comment}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SupplierPerformance; 