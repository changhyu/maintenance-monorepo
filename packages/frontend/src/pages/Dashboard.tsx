import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
  useTheme,
  Button,
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  Build as ToolIcon,
  Notifications as NotificationIcon,
  Assignment as TaskIcon,
  MoreVert as MoreVertIcon,
  Warning as WarningIcon,
  Check as CheckIcon,
  Schedule as ScheduleIcon,
  LocalGasStation as GasIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CalendarToday as CalendarIcon,
  Map as MapIcon,
  Navigation as NavigationIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

// Import charts and other components
import MileageChart from '../components/charts/MileageChart';
import FuelConsumptionChart from '../components/charts/FuelConsumptionChart';
import SpeedAnalysisChart from '../components/charts/SpeedAnalysisChart';
import UpcomingInspectionsWidget from '../components/dashboard/UpcomingInspectionsWidget';
import { useInspectionService } from '../hooks/useInspectionService';

// Define TypeScript interfaces
interface SummaryData {
  id: string;
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  change: string;
  changeIcon?: React.ReactNode;
  changeColor?: string;
}

interface ChartOption {
  value: string;
  label: string;
  icon: React.ReactNode;
}

interface MaintenanceSchedule {
  id: string;
  title: string;
  vehicleName: string;
  date: string;
  completed: boolean;
  overdue: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  icon: React.ReactNode;
  read: boolean;
}

interface Task {
  id: string;
  title: string;
  assignee: string;
  due: string;
}

interface VehicleStatus {
  id: string;
  label: string;
  value: string;
  icon: React.ReactNode;
}

const Dashboard: React.FC = () => {
  const [selectedChartOption, setSelectedChartOption] = useState<string>('mileage');
  const theme = useTheme();
  const { upcomingInspections, getUpcomingInspections } = useInspectionService();
  
  useEffect(() => {
    // 대시보드 로드시 다가오는 법정검사 일정 조회
    getUpcomingInspections(30);
  }, []);
  
  // Sample data for summary cards
  const summaryData: SummaryData[] = [
    {
      id: '1',
      title: '전체 차량',
      value: '24대',
      icon: <CarIcon style={{ color: theme.palette.primary.main }} />,
      color: theme.palette.primary.main,
      change: '2대 증가',
      changeIcon: <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} />,
      changeColor: 'success.main'
    },
    {
      id: '2',
      title: '정비 예정',
      value: '7대',
      icon: <ToolIcon style={{ color: theme.palette.warning.main }} />,
      color: theme.palette.warning.main,
      change: '최근 30일',
      changeIcon: undefined,
    },
    {
      id: '3',
      title: '법정검사 필요',
      value: `${upcomingInspections.length}대`,
      icon: <CalendarIcon style={{ color: theme.palette.info.main }} />,
      color: theme.palette.info.main,
      change: '30일 이내',
      changeIcon: undefined,
    },
    {
      id: '4',
      title: '일일 연료비',
      value: '₩ 458,000',
      icon: <GasIcon style={{ color: theme.palette.error.main }} />,
      color: theme.palette.error.main,
      change: '5% 감소',
      changeIcon: <TrendingDownIcon fontSize="small" sx={{ mr: 0.5 }} />,
      changeColor: 'success.main'
    }
  ];

  // Chart options
  const chartOptions: ChartOption[] = [
    { value: 'mileage', label: '주행거리', icon: <TimelineIcon /> },
    { value: 'fuel', label: '연료 소비량', icon: <GasIcon /> },
    { value: 'speed', label: '속도 분석', icon: <SpeedIcon /> }
  ];

  // Maintenance schedule data
  const maintenanceSchedule: MaintenanceSchedule[] = [
    {
      id: '1',
      title: '엔진 오일 교체',
      vehicleName: '트럭 A-1234',
      date: '2025-05-02',
      completed: false,
      overdue: false
    },
    {
      id: '2',
      title: '브레이크 패드 교체',
      vehicleName: '버스 B-5678',
      date: '2025-04-25',
      completed: false,
      overdue: true
    },
    {
      id: '3',
      title: '정기 점검',
      vehicleName: '승합차 C-9012',
      date: '2025-04-20',
      completed: true,
      overdue: false
    }
  ];

  // Notifications
  const notifications: Notification[] = [
    {
      id: '1',
      title: '차량 점검 알림',
      message: '트럭 A-1234의 다음 정기 점검이 3일 후로 예정되어 있습니다.',
      time: '10분 전',
      icon: <ScheduleIcon color="primary" />,
      read: false
    },
    {
      id: '2',
      title: '연료 소비량 이상',
      message: '버스 B-5678의 연료 소비량이 평균보다 15% 높게 측정되었습니다.',
      time: '2시간 전',
      icon: <WarningIcon color="error" />,
      read: false
    },
    {
      id: '3',
      title: '정비 완료',
      message: '승합차 C-9012의 정기 점검이 완료되었습니다.',
      time: '어제',
      icon: <CheckIcon color="success" />,
      read: true
    }
  ];

  // Active tasks
  const activeTasks: Task[] = [
    {
      id: '1',
      title: '트럭 A-1234 운행 일지 작성',
      assignee: '김철수',
      due: '오늘'
    },
    {
      id: '2',
      title: '버스 B-5678 연료 소비량 분석',
      assignee: '이영희',
      due: '내일'
    },
    {
      id: '3',
      title: '2025년 5월 정비 계획 수립',
      assignee: '박지민',
      due: '3일 후'
    }
  ];

  // Vehicle status data
  const vehicleStatusData: VehicleStatus[] = [
    {
      id: '1',
      label: '운행 중',
      value: '18대',
      icon: <CarIcon color="success" fontSize="large" />
    },
    {
      id: '2',
      label: '정비 중',
      value: '3대',
      icon: <ToolIcon color="warning" fontSize="large" />
    },
    {
      id: '3',
      label: '문제 발생',
      value: '2대',
      icon: <WarningIcon color="error" fontSize="large" />
    },
    {
      id: '4',
      label: '대기 상태',
      value: '1대',
      icon: <ScheduleIcon color="info" fontSize="large" />
    }
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          대시보드
        </Typography>
        
        {/* 요약 정보 카드 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {summaryData.map((item) => (
            <Grid component="div" key={item.id} sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
              <Card 
                sx={{ 
                  height: '100%',
                  borderLeft: '4px solid',
                  borderColor: item.color
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography 
                      color="textSecondary" 
                      variant="body2" 
                      component="div" 
                      gutterBottom
                    >
                      {item.title}
                    </Typography>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      backgroundColor: `${item.color}22`,
                      borderRadius: '50%',
                      width: 40,
                      height: 40
                    }}>
                      {item.icon}
                    </Box>
                  </Box>
                  <Typography variant="h5" component="div">
                    {item.value}
                  </Typography>
                  <Typography 
                    color={item.changeColor || 'textSecondary'} 
                    variant="body2"
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      mt: 1
                    }}
                  >
                    {item.changeIcon}
                    {item.change}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* 내비게이션 앱 바로가기 카드 */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: theme.palette.primary.main, color: 'white' }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, md: 0 } }}>
                <NavigationIcon sx={{ fontSize: 48, mr: 2 }} />
                <Box>
                  <Typography variant="h5" component="div" gutterBottom>
                    도시 교통 내비게이션
                  </Typography>
                  <Typography variant="body1">
                    UTIC 데이터 기반 실시간 교통 정보, 경로 계산 및 알림을 제공하는 내비게이션 서비스를 이용해보세요.
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Button
                variant="contained"
                size="large"
                component={RouterLink}
                to="/navigation"
                startIcon={<MapIcon />}
                sx={{ 
                  bgcolor: 'white', 
                  color: theme.palette.primary.main,
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.8)',
                  }
                }}
              >
                내비게이션 시작하기
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={3}>
          {/* 차트 영역 */}
          <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 8' } }}>
            <Paper sx={{ p: 2, mb: 3, height: '400px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">차량 운행 분석</Typography>
                <Box>
                  {chartOptions.map(option => (
                    <IconButton 
                      key={option.value}
                      size="small"
                      color={selectedChartOption === option.value ? 'primary' : 'default'}
                      onClick={() => setSelectedChartOption(option.value)}
                    >
                      {option.icon}
                    </IconButton>
                  ))}
                </Box>
              </Box>
              
              {/* 차트 컴포넌트 */}
              <Box sx={{ height: 'calc(100% - 50px)' }}>
                {selectedChartOption === 'mileage' && <MileageChart />}
                {selectedChartOption === 'fuel' && <FuelConsumptionChart />}
                {selectedChartOption === 'speed' && <SpeedAnalysisChart />}
              </Box>
            </Paper>
            
            <Paper sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">다가오는 법정검사</Typography>
                <Typography 
                  variant="body2" 
                  color="primary" 
                  component={RouterLink} 
                  to="/inspections"
                  sx={{ textDecoration: 'none' }}
                >
                  모든 법정검사 보기
                </Typography>
              </Box>
              
              <Box sx={{ height: '240px', overflow: 'auto' }}>
                <UpcomingInspectionsWidget days={30} limit={3} />
              </Box>
            </Paper>
            
            <Paper sx={{ p: 2, height: '300px' }}>
              <Typography variant="h6" gutterBottom>정비 일정</Typography>
              <List>
                {maintenanceSchedule.map((schedule) => (
                  <ListItem 
                    key={schedule.id} 
                    divider 
                    secondaryAction={
                      <IconButton edge="end">
                        <MoreVertIcon />
                      </IconButton>
                    }
                  >
                    <ListItemIcon>
                      {schedule.completed ? (
                        <CheckIcon color="success" />
                      ) : schedule.overdue ? (
                        <WarningIcon color="error" />
                      ) : (
                        <ScheduleIcon color="primary" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={schedule.title}
                      secondary={
                        <React.Fragment>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {schedule.vehicleName}
                          </Typography>
                          {` — ${schedule.date}`}
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          
          {/* 오른쪽 사이드 영역 */}
          <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
            {/* 최근 알림 */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">최근 알림</Typography>
                <Typography 
                  variant="body2" 
                  color="primary" 
                  component={RouterLink} 
                  to="/notifications"
                  sx={{ textDecoration: 'none' }}
                >
                  모두 보기
                </Typography>
              </Box>
              
              <List>
                {notifications.map((notification) => (
                  <ListItem 
                    key={notification.id} 
                    alignItems="flex-start"
                    sx={{
                      mb: 1,
                      borderRadius: 1,
                      backgroundColor: notification.read ? 'transparent' : 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <ListItemIcon>
                      {notification.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={notification.title}
                      secondary={
                        <>
                          <Typography
                            variant="body2"
                            color="text.primary"
                            sx={{ mb: 0.5 }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {notification.time}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
            
            {/* 활성 작업 */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                활성 작업
              </Typography>
              
              {activeTasks.length > 0 ? (
                <List>
                  {activeTasks.map((task) => (
                    <ListItem 
                      key={task.id} 
                      secondaryAction={
                        <Typography variant="caption" color="text.secondary">
                          {task.due}
                        </Typography>
                      }
                    >
                      <ListItemIcon>
                        <TaskIcon color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary={task.title}
                        secondary={`담당: ${task.assignee}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ py: 2, textAlign: 'center' }}>
                  <Typography color="text.secondary" variant="body2">
                    현재 활성화된 작업이 없습니다.
                  </Typography>
                </Box>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Stack direction="row" spacing={1}>
                <Box 
                  component={RouterLink} 
                  to="/tasks/create"
                  sx={{ 
                    flex: 1, 
                    textAlign: 'center',
                    p: 1,
                    borderRadius: 1,
                    border: '1px dashed',
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    textDecoration: 'none',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                      color: 'primary.contrastText'
                    }
                  }}
                >
                  작업 추가
                </Box>
                <Box 
                  component={RouterLink} 
                  to="/tasks"
                  sx={{ 
                    flex: 1, 
                    textAlign: 'center',
                    p: 1,
                    borderRadius: 1,
                    border: '1px dashed',
                    borderColor: 'text.secondary',
                    color: 'text.secondary',
                    textDecoration: 'none',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    }
                  }}
                >
                  모든 작업
                </Box>
              </Stack>
            </Paper>
          </Grid>
          
          {/* 추가적인 통계 정보 */}
          <Grid component="div" sx={{ gridColumn: 'span 12' }}>
            <Paper sx={{ p: 2, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                차량 상태 요약
              </Typography>
              
              <Grid container spacing={2}>
                {vehicleStatusData.map((status) => (
                  <Grid component="div" key={status.id} sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
                    <Box sx={{ 
                      p: 2, 
                      border: '1px solid', 
                      borderColor: 'divider',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {status.icon}
                      <Box sx={{ ml: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          {status.label}
                        </Typography>
                        <Typography variant="h6">
                          {status.value}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;