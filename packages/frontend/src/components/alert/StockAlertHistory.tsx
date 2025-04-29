import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface AlertHistory {
  id: string;
  alertId: string;
  message: string;
  status: string;
  createdAt: string;
  alert: {
    id: string;
    type: string;
    part: {
      id: string;
      name: string;
    };
  };
}

const StockAlertHistory: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [status, setStatus] = useState('');

  // 알림 이력 조회
  const { data: history, isLoading } = useQuery(
    ['alertHistory', startDate, endDate, status],
    async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      if (status) params.append('status', status);

      const response = await fetch(`/api/v1/maintenance/alerts/history?${params}`);
      if (!response.ok) throw new Error('알림 이력을 불러오는데 실패했습니다.');
      return response.json();
    }
  );

  // 알림 통계 조회
  const { data: stats } = useQuery(
    ['alertStats'],
    async () => {
      const response = await fetch('/api/v1/maintenance/alerts/stats');
      if (!response.ok) throw new Error('알림 통계를 불러오는데 실패했습니다.');
      return response.json();
    }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SENT':
        return '발송 완료';
      case 'FAILED':
        return '발송 실패';
      case 'PENDING':
        return '발송 대기';
      default:
        return status;
    }
  };

  if (isLoading) {
    return <Typography>로딩 중...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          알림 이력
        </Typography>

        {/* 통계 카드 */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography color="textSecondary" gutterBottom>
              전체 알림 설정
            </Typography>
            <Typography variant="h4">
              {stats?.totalAlerts}개
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography color="textSecondary" gutterBottom>
              활성 알림
            </Typography>
            <Typography variant="h4">
              {stats?.activeAlerts}개
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography color="textSecondary" gutterBottom>
              최근 30일 알림
            </Typography>
            <Typography variant="h4">
              {stats?.recentAlerts}건
            </Typography>
          </Paper>
        </Box>

        {/* 필터 */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <DatePicker
            label="시작일"
            value={startDate}
            onChange={(newValue) => setStartDate(newValue)}
            slotProps={{ textField: { size: 'small' } }}
          />
          <DatePicker
            label="종료일"
            value={endDate}
            onChange={(newValue) => setEndDate(newValue)}
            slotProps={{ textField: { size: 'small' } }}
          />
          <FormControl size="small" sx={{ width: 150 }}>
            <InputLabel>상태</InputLabel>
            <Select
              value={status}
              label="상태"
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="SENT">발송 완료</MenuItem>
              <MenuItem value="FAILED">발송 실패</MenuItem>
              <MenuItem value="PENDING">발송 대기</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>발생 시각</TableCell>
              <TableCell>부품</TableCell>
              <TableCell>알림 유형</TableCell>
              <TableCell>메시지</TableCell>
              <TableCell>상태</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history?.map((item: AlertHistory) => (
              <TableRow key={item.id}>
                <TableCell>
                  {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                </TableCell>
                <TableCell>{item.alert.part.name}</TableCell>
                <TableCell>
                  <Chip
                    label={item.alert.type}
                    size="small"
                    color={
                      item.alert.type === 'LOW_STOCK' ? 'warning' :
                      item.alert.type === 'HIGH_STOCK' ? 'info' :
                      'error'
                    }
                  />
                </TableCell>
                <TableCell>{item.message}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusText(item.status)}
                    size="small"
                    color={getStatusColor(item.status)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default StockAlertHistory; 