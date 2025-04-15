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

// 태스트 데이터 (실제로는 API 호출하여 데이터 가져옴)
const mockData = {
  vehicles: {
    total: 12,
    active: 9,
    maintenance: 3,
    inactive: 0,
  },
  maintenance: {
    completed: 48,
    scheduled: 7,
    inProgress: 3,
    overdue: 1,
  },
  upcomingMaintenance: [
    {
      id: '1',
      vehicleId: '1',
      vehicleName: '현대 소나타',
      date: '2023-05-28',
      type: '정기 점검',
      priority: 'medium',
    },
    {
      id: '2',
      vehicleId: '2',
      vehicleName: '기아 K5',
      date: '2023-05-29',
      type: '오일 교체',
      priority: 'high',
    },
    {
      id: '3',
      vehicleId: '3',
      vehicleName: '테슬라 모델 3',
      date: '2023-06-02',
      type: '타이어 교체',
      priority: 'medium',
    },
  ],
  recentMaintenance: [
    {
      id: '4',
      vehicleName: '현대 그랜저',
      date: '2023-05-20',
      type: '정기 점검',
      cost: 150000,
    },
    {
      id: '5',
      vehicleName: '기아 쏘렌토',
      date: '2023-05-18',
      type: '브레이크 패드 교체',
      cost: 280000,
    },
    {
      id: '6',
      vehicleName: 'BMW 520d',
      date: '2023-05-15',
      type: '엔진 오일 교체',
      cost: 220000,
    },
  ],
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState(mockData);

  // API에서 데이터를 가져오는 효과 (목업 데이터 사용)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 실제 API 호출 대신 타임아웃으로 로딩 상태 시뮬레이션
        setTimeout(() => {
          setDashboardData(mockData);
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('대시보드 데이터 로딩 실패:', error);
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
      ) : (
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
    </Box>
  );
};

export default Dashboard;