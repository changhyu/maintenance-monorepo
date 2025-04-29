import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Divider,
  CircularProgress,
  SelectChangeEvent,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  LocalGasStation as FuelIcon,
  Build as MaintenanceIcon,
  Security as InsuranceIcon,
} from '@mui/icons-material';
import { DateRangePicker } from '../common/DateRangePicker';
import { CostSummary, CostAnalysis } from '../../types/cost';
import { Vehicle } from '../../types/vehicle';
import { costService } from '../../services/costService';
import { vehicleService } from '../../services/vehicleService';

interface CostDashboardProps {
  onError?: (error: string) => void;
}

const CostDashboard: React.FC<CostDashboardProps> = ({ onError }) => {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [vehicleId, setVehicleId] = useState<string>('all');
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [analysis, setAnalysis] = useState<CostAnalysis | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      loadData();
    }
  }, [dateRange, vehicleId]);

  const loadVehicles = async () => {
    try {
      const data = await vehicleService.getAllVehicles();
      setVehicles(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '차량 목록을 불러오는데 실패했습니다.';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [startDate, endDate] = dateRange;
      
      if (!startDate || !endDate) {
        throw new Error('날짜를 선택해주세요.');
      }

      const params = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        vehicleId: vehicleId !== 'all' ? vehicleId : undefined,
      };

      const [summaryData, analysisData] = await Promise.all([
        costService.getCostSummary(params),
        costService.getCostAnalysis(params),
      ]);

      setSummary(summaryData);
      setAnalysis(analysisData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '비용 데이터를 불러오는데 실패했습니다.';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const [startDate, endDate] = dateRange;
      
      if (!startDate || !endDate) {
        throw new Error('날짜를 선택해주세요.');
      }

      const blob = await costService.exportCosts({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        vehicleId: vehicleId !== 'all' ? vehicleId : undefined,
        format: 'excel',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cost-report-${new Date().toISOString()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '비용 보고서 내보내기에 실패했습니다.';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleVehicleChange = (event: SelectChangeEvent<string>) => {
    setVehicleId(event.target.value);
  };

  const handleRetry = () => {
    setError(null);
    loadData();
  };

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 2 }}>
        <Typography variant="h6" color="error">
          {error}
        </Typography>
        <Button variant="contained" onClick={handleRetry}>
          다시 시도
        </Button>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!summary || !analysis) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography variant="h6" color="text.secondary">
          데이터가 없습니다.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          비용 관리 대시보드
        </Typography>
        <Button variant="contained" color="primary" onClick={handleExport}>
          보고서 내보내기
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* 필터 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>차량 선택</InputLabel>
                    <Select
                      value={vehicleId}
                      onChange={handleVehicleChange}
                      label="차량 선택"
                    >
                      <MenuItem value="all">전체 차량</MenuItem>
                      {vehicles.map((vehicle) => (
                        <MenuItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.name} ({vehicle.licensePlate})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 총 비용 */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <MoneyIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">총 비용</Typography>
              </Box>
              <Typography variant="h4" sx={{ mt: 2 }}>
                {summary.total.toLocaleString()}원
              </Typography>
              <Box display="flex" alignItems="center" sx={{ mt: 1 }}>
                {summary.trends[0].change >= 0 ? (
                  <TrendingUpIcon color="success" />
                ) : (
                  <TrendingDownIcon color="error" />
                )}
                <Typography
                  variant="body2"
                  color={summary.trends[0].change >= 0 ? 'success.main' : 'error.main'}
                >
                  {Math.abs(summary.trends[0].change)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 카테고리별 비용 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                카테고리별 비용
              </Typography>
              <Grid container spacing={2}>
                {summary.byCategory.map((category) => (
                  <Grid item xs={12} sm={6} md={3} key={category.category}>
                    <Box
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="subtitle2">{category.category}</Typography>
                      <Typography variant="h6">
                        {category.amount.toLocaleString()}원
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {category.percentage}%
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 비용 분석 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                비용 분석
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle2">km당 평균 비용</Typography>
                    <Typography variant="h6">
                      {analysis.averageCostPerKilometer.toLocaleString()}원/km
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle2">연비</Typography>
                    <Typography variant="h6">
                      {analysis.fuelEfficiency.toFixed(1)} km/L
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle2">정비 비용 추세</Typography>
                    <Typography variant="h6">
                      {analysis.maintenanceCostTrend >= 0 ? '+' : ''}
                      {analysis.maintenanceCostTrend}%
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 비용 절감 기회 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                비용 절감 기회
              </Typography>
              <Grid container spacing={2}>
                {analysis.costSavingsOpportunities.map((opportunity, index) => (
                  <Grid item xs={12} key={index}>
                    <Box
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="subtitle1">
                        {opportunity.description}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        잠재적 절감액: {opportunity.potentialSavings.toLocaleString()}원
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        구현 방법: {opportunity.implementation}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CostDashboard; 