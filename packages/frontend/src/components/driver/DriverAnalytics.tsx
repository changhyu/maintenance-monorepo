import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import {
  DirectionsCar as CarIcon,
  Speed as SpeedIcon,
  LocalGasStation as FuelIcon,
  Warning as WarningIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { driverService } from '../../services/driverService';

interface DriverAnalyticsProps {
  driverId: string;
  onError?: (error: string) => void;
}

interface AnalyticsData {
  safetyScore: number;
  fuelEfficiency: number;
  averageSpeed: number;
  incidentHistory: {
    date: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  performanceMetrics: {
    category: string;
    score: number;
    benchmark: number;
  }[];
  recentActivities: {
    date: string;
    activity: string;
    details: string;
  }[];
}

const DriverAnalytics: React.FC<DriverAnalyticsProps> = ({ driverId, onError }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [driverId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: API 구현 후 실제 데이터로 교체
      const mockData: AnalyticsData = {
        safetyScore: 85,
        fuelEfficiency: 12.5,
        averageSpeed: 65,
        incidentHistory: [
          {
            date: '2024-03-15',
            type: '과속',
            description: '제한속도 초과',
            severity: 'low',
          },
          {
            date: '2024-02-28',
            type: '급제동',
            description: '갑작스러운 정지',
            severity: 'medium',
          },
        ],
        performanceMetrics: [
          {
            category: '안전 운전',
            score: 85,
            benchmark: 80,
          },
          {
            category: '연비 효율',
            score: 78,
            benchmark: 75,
          },
          {
            category: '시간 준수',
            score: 92,
            benchmark: 85,
          },
          {
            category: '차량 관리',
            score: 88,
            benchmark: 82,
          },
        ],
        recentActivities: [
          {
            date: '2024-03-20',
            activity: '정기 점검',
            details: '차량 정기 점검 완료',
          },
          {
            date: '2024-03-18',
            activity: '안전 교육',
            details: '월간 안전 교육 이수',
          },
          {
            date: '2024-03-15',
            activity: '운행',
            details: '장거리 운행 완료 (450km)',
          },
        ],
      };

      setAnalytics(mockData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '분석 데이터를 불러오는데 실패했습니다.';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        분석 데이터를 찾을 수 없습니다.
      </Alert>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* 주요 지표 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                주요 지표
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <StarIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h4">{analytics.safetyScore}%</Typography>
                    <Typography color="text.secondary">안전 점수</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <FuelIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h4">{analytics.fuelEfficiency.toFixed(1)}km/L</Typography>
                    <Typography color="text.secondary">평균 연비</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <SpeedIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h4">{analytics.averageSpeed}km/h</Typography>
                    <Typography color="text.secondary">평균 속도</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 성과 지표 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                성과 지표
              </Typography>
              {analytics.performanceMetrics.map((metric, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>{metric.category}</Typography>
                    <Typography>{metric.score}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={metric.score}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    기준치: {metric.benchmark}%
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* 사고 이력 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                사고 이력
              </Typography>
              {analytics.incidentHistory.length > 0 ? (
                analytics.incidentHistory.map((incident, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" color="error">
                      {incident.type}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(incident.date), 'yyyy년 MM월 dd일')}
                    </Typography>
                    <Typography>{incident.description}</Typography>
                    <Chip
                      label={
                        incident.severity === 'high' ? '높음' :
                        incident.severity === 'medium' ? '중간' : '낮음'
                      }
                      color={
                        incident.severity === 'high' ? 'error' :
                        incident.severity === 'medium' ? 'warning' : 'success'
                      }
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary">
                  기록된 사고가 없습니다.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 최근 활동 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                최근 활동
              </Typography>
              <Timeline>
                {analytics.recentActivities.map((activity, index) => (
                  <TimelineItem key={index}>
                    <TimelineSeparator>
                      <TimelineDot color="primary" />
                      {index < analytics.recentActivities.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant="subtitle2">
                        {activity.activity}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {format(new Date(activity.date), 'yyyy년 MM월 dd일')}
                      </Typography>
                      <Typography variant="body2">
                        {activity.details}
                      </Typography>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DriverAnalytics; 