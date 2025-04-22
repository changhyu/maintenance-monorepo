import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  Build as MaintenanceIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

// 차트 컴포넌트 임포트 (필요시 추후 구현)
import { DashboardChart } from '../components/dashboard/DashboardChart';
// API 클라이언트
import apiClient from '../api-client';
import logger from '../utils/logger';

// 대시보드 데이터 타입 정의
interface DashboardData {
  vehicles: {
    total: number;
    active: number;
    maintenance: number;
    inactive: number;
  };
  maintenance: {
    completed: number;
    scheduled: number;
    inProgress: number;
    overdue: number;
  };
  upcomingMaintenance: Array<{
    id: string;
    vehicleId: string;
    vehicleName: string;
    date: string;
    type: string;
    priority: string;
  }>;
  recentMaintenance: Array<{
    id: string;
    vehicleName: string;
    date: string;
    type: string;
    cost: number;
  }>;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // API에서 데이터를 가져오는 효과
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // 대시보드 데이터 API 호출
        const response = await apiClient.get<DashboardData>('/dashboard');
        setDashboardData(response.data);
      } catch (error) {
        logger.error('대시보드 데이터 로딩 실패:', error);
        setError('대시보드 데이터를 불러오는데 실패했습니다.');
        
        // API 실패 시 기본 대시보드 데이터로 초기화 (실제 배포 시 제거)
        setDashboardData({
          vehicles: {
            total: 0,
            active: 0,
            maintenance: 0,
            inactive: 0,
          },
          maintenance: {
            completed: 0,
            scheduled: 0,
            inProgress: 0,
            overdue: 0,
          },
          upcomingMaintenance: [],
          recentMaintenance: []
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusColor = (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'error.main';
      case 'medium':
        return 'warning.main';
      default:
        return 'info.main';
    }
  };

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ko-KR', options);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      currencyDisplay: 'symbol',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 데이터가 없는 경우 표시할 컴포넌트
  if (!isLoading && !dashboardData) {
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          {error || '대시보드 데이터를 불러올 수 없습니다.'}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          다시 시도
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          대시보드
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/maintenance/new')}
        >
          + 새 정비 등록
        </Button>
      </Box>

      {isLoading ? (
        <LinearProgress sx={{ mb: 4 }} />
      ) : dashboardData && (
        <Grid container spacing={3}>
          {/* 차량 현황 요약 */}
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  총 차량
                </Typography>
                <Typography variant="h4">
                  {dashboardData.vehicles.total}
                </Typography>
                <Box sx={{ display: 'flex', mt: 2, gap: 1 }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      활성
                    </Typography>
                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 'medium' }}>
                      {dashboardData.vehicles.active}
                    </Typography>
                  </Box>
                  <Box sx={{ mx: 1 }}>
                    <Typography variant="caption" color="textSecondary">
                      정비 중
                    </Typography>
                    <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'medium' }}>
                      {dashboardData.vehicles.maintenance}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      비활성
                    </Typography>
                    <Typography variant="body2" color="error.main" sx={{ fontWeight: 'medium' }}>
                      {dashboardData.vehicles.inactive}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
              <Divider />
              <Box sx={{ p: 1 }}>
                <Button size="small" onClick={() => navigate('/vehicles')}>
                  차량 목록 보기
                </Button>
              </Box>
            </Card>
          </Grid>

          {/* 정비 현황 요약 */}
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  정비 현황
                </Typography>
                <Typography variant="h4">
                  {dashboardData.maintenance.completed}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  완료된 정비
                </Typography>
                <Box sx={{ display: 'flex', mt: 2, gap: 1 }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      예정됨
                    </Typography>
                    <Typography variant="body2" color="info.main" sx={{ fontWeight: 'medium' }}>
                      {dashboardData.maintenance.scheduled}
                    </Typography>
                  </Box>
                  <Box sx={{ mx: 1 }}>
                    <Typography variant="caption" color="textSecondary">
                      진행 중
                    </Typography>
                    <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'medium' }}>
                      {dashboardData.maintenance.inProgress}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      지연됨
                    </Typography>
                    <Typography variant="body2" color="error.main" sx={{ fontWeight: 'medium' }}>
                      {dashboardData.maintenance.overdue}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
              <Divider />
              <Box sx={{ p: 1 }}>
                <Button size="small" onClick={() => navigate('/maintenance')}>
                  정비 이력 보기
                </Button>
              </Box>
            </Card>
          </Grid>

          {/* 월간 비용 추이 */}
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  이번 달 정비 비용
                </Typography>
                <Typography variant="h4">
                  {formatCurrency(1250000)}
                </Typography>
                <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                  ↓ 지난달 대비 12% 감소
                </Typography>
              </CardContent>
              <Divider />
              <Box sx={{ p: 1 }}>
                <Button size="small" onClick={() => navigate('/reports')}>
                  비용 보고서 보기
                </Button>
              </Box>
            </Card>
          </Grid>

          {/* 차량 종류 */}
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  차량 종류
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">승용차</Typography>
                    <Typography variant="body2">7대</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={58} sx={{ mb: 1 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">SUV</Typography>
                    <Typography variant="body2">3대</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={25} color="secondary" sx={{ mb: 1 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">트럭</Typography>
                    <Typography variant="body2">2대</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={17} color="success" sx={{ mb: 1 }} />
                </Box>
              </CardContent>
              <Divider />
              <Box sx={{ p: 1 }}>
                <Button size="small" onClick={() => navigate('/vehicles')}>
                  차량 목록 보기
                </Button>
              </Box>
            </Card>
          </Grid>

          {/* 차트 및 그래프 */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardHeader title="정비 비용 추이" />
              <CardContent>
                <DashboardChart />
              </CardContent>
            </Card>
          </Grid>

          {/* 예정된 정비 목록 */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title="예정된 정비" action={
                <Button size="small" onClick={() => navigate('/maintenance?filter=scheduled')}>
                  모두 보기
                </Button>
              } />
              <List>
                {dashboardData.upcomingMaintenance.map((item) => (
                  <ListItem key={item.id} onClick={() => navigate(`/maintenance/${item.id}`)} sx={{ cursor: 'pointer' }}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: getStatusColor(item.priority) }}>
                        <ScheduleIcon />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={item.vehicleName}
                      secondary={`${formatDate(item.date)} - ${item.type}`}
                    />
                  </ListItem>
                ))}
                {dashboardData.upcomingMaintenance.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="예정된 정비가 없습니다."
                      secondary="새 정비를 예약하세요."
                    />
                  </ListItem>
                )}
              </List>
            </Card>
          </Grid>

          {/* 최근 완료된 정비 */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="최근 완료된 정비" />
              <List sx={{ pt: 0 }}>
                {dashboardData.recentMaintenance.map((item) => (
                  <React.Fragment key={item.id}>
                    <ListItem onClick={() => navigate(`/maintenance/${item.id}`)} sx={{ cursor: 'pointer' }}>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: 'success.main' }}>
                          <CheckCircleIcon />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={item.vehicleName}
                        secondary={`${formatDate(item.date)} - ${item.type}`}
                      />
                      <Typography variant="body2">
                        {formatCurrency(item.cost)}
                      </Typography>
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            </Card>
          </Grid>
        </Grid>
      )}
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};

export default Dashboard;