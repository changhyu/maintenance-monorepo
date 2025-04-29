import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Button,
  Divider,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  DirectionsCar as CarIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';
import { Driver, DriverStats, DriverDocument } from '../../types/driver';
import { driverService } from '../../services/driverService';
import { useDriver, useDriverStats, useDriverDocuments, useUploadDocument } from '../../hooks/useDrivers';
import { DriverStatus } from '../../types/driver';

const DriverDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const { data: driver, isLoading: isDriverLoading, error: driverError } = useDriver(id);
  const { data: stats, isLoading: isStatsLoading } = useDriverStats(id);
  const { data: documents = [], isLoading: isDocumentsLoading } = useDriverDocuments(id);
  const uploadDocument = useUploadDocument(id);

  const loading = isDriverLoading || isStatsLoading || isDocumentsLoading;
  const error = driverError ? (driverError instanceof Error ? driverError.message : '운전자 정보를 불러오는데 실패했습니다.') : null;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadDocument.mutateAsync({ file, type: 'LICENSE' });
      setUploadDialogOpen(false);
    } catch (error) {
      console.error('문서 업로드에 실패했습니다:', error);
    }
  };

  const getStatusColor = (status: Driver['status']) => {
    const statusConfig = {
      [DriverStatus.ACTIVE]: 'success',
      [DriverStatus.INACTIVE]: 'error',
      [DriverStatus.ON_LEAVE]: 'warning',
      [DriverStatus.SUSPENDED]: 'error',
    };
    return statusConfig[status] as 'success' | 'error' | 'warning';
  };

  const getStatusLabel = (status: Driver['status']) => {
    const statusLabels = {
      [DriverStatus.ACTIVE]: '활성',
      [DriverStatus.INACTIVE]: '비활성',
      [DriverStatus.ON_LEAVE]: '휴가 중',
      [DriverStatus.SUSPENDED]: '정지',
    };
    return statusLabels[status];
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
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

  if (!driver || !stats) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        운전자 정보를 찾을 수 없습니다.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          운전자 상세 정보
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/drivers')}
          >
            목록으로
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate(`/drivers/${id}/edit`)}
          >
            정보 수정
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 기본 정보 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                기본 정보
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="이름"
                    secondary={`${driver.firstName} ${driver.lastName}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="이메일"
                    secondary={driver.email}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="연락처"
                    secondary={driver.phoneNumber}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <LocationIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="주소"
                    secondary={driver.address || '-'}
                  />
                </ListItem>
              </List>
              <Box sx={{ mt: 2 }}>
                <Chip
                  label={getStatusLabel(driver.status)}
                  color={getStatusColor(driver.status)}
                  sx={{ mr: 1 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 면허 정보 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                면허 정보
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CarIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="면허 번호"
                    secondary={driver.licenseNumber}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <WarningIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="면허 만료일"
                    secondary={format(new Date(driver.licenseExpiry), 'yyyy년 MM월 dd일')}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* 통계 정보 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                운행 통계
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4">{stats.totalTrips}</Typography>
                    <Typography color="text.secondary">총 운행 횟수</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4">{stats.totalDistance.toLocaleString()}km</Typography>
                    <Typography color="text.secondary">총 운행 거리</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4">{stats.averageRating.toFixed(1)}</Typography>
                    <Typography color="text.secondary">평균 평점</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4">{stats.incidentCount}</Typography>
                    <Typography color="text.secondary">사고 건수</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">문서</Typography>
                <Button
                  variant="contained"
                  startIcon={<UploadIcon />}
                  onClick={() => setUploadDialogOpen(true)}
                >
                  문서 업로드
                </Button>
              </Box>
              <List>
                {documents.map((doc) => (
                  <ListItem
                    key={doc.id}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => window.open(doc.url)}>
                        <DownloadIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={doc.type}
                      secondary={format(new Date(doc.uploadedAt), 'yyyy-MM-dd')}
                    />
                    <Chip
                      label={doc.status}
                      color={
                        doc.status === 'VALID'
                          ? 'success'
                          : doc.status === 'EXPIRED'
                          ? 'error'
                          : 'warning'
                      }
                      size="small"
                      sx={{ mx: 1 }}
                    />
                  </ListItem>
                ))}
                {documents.length === 0 && (
                  <ListItem>
                    <ListItemText primary="등록된 문서가 없습니다." />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)}>
        <DialogTitle>문서 업로드</DialogTitle>
        <DialogContent>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="document-upload"
          />
          <label htmlFor="document-upload">
            <Button variant="contained" component="span">
              파일 선택
            </Button>
          </label>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>취소</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DriverDetail; 