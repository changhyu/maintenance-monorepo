import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Build as BuildIcon,
  DirectionsCar as CarIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Speed as SpeedIcon,
  LocalGasStation as FuelIcon,
  Event as EventIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Vehicle, VehicleStatus, VehicleStats } from '../../types/vehicle';
import { VehicleService } from '../../services/vehicleService';

// 차량 타입 정의 (임시)
interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  color?: string;
  type: string;
  status: 'active' | 'maintenance' | 'inactive' | 'recalled';
  mileage: number;
  lastMaintenance?: string;
  owner?: string;
  purchaseDate?: string;
  insuranceExpiry?: string;
  fuelType?: string;
  transmission?: string;
  engineSize?: string;
  notes?: string;
}

// 정비 기록 타입 정의 (임시)
interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: string;
  description: string;
  date: string;
  status: string;
  cost: number;
  technician?: string;
  shop?: string;
  notes?: string;
}

// 테스트 데이터
const mockVehicles: Record<string, Vehicle> = {
  '1': {
    id: '1',
    vin: 'JH4DA9370MS016526',
    make: '현대',
    model: '소나타',
    year: 2021,
    licensePlate: '서울 가 1234',
    color: '흰색',
    type: 'sedan',
    status: 'active',
    mileage: 15000,
    lastMaintenance: '2023-03-15',
    owner: '홍길동',
    purchaseDate: '2021-01-15',
    insuranceExpiry: '2024-01-14',
    fuelType: '가솔린',
    transmission: '자동',
    engineSize: '2.0L',
    notes: '회사 임원용 차량',
  },
};

const mockMaintenance: MaintenanceRecord[] = [
  {
    id: '1',
    vehicleId: '1',
    type: '정기 점검',
    description: '엔진 오일 교체 및 기본 점검',
    date: '2023-03-15',
    status: 'completed',
    cost: 150000,
    technician: '김기술',
    shop: '현대 서비스센터',
    notes: '다음 점검은 10,000km 주행 후 권장'
  },
  {
    id: '2',
    vehicleId: '1',
    type: '브레이크 패드 교체',
    description: '전방 브레이크 패드 마모로 교체',
    date: '2022-12-10',
    status: 'completed',
    cost: 280000,
    technician: '박정비',
    shop: '현대 서비스센터',
  },
  {
    id: '3',
    vehicleId: '1',
    type: '타이어 교체',
    description: '4개 타이어 모두 교체',
    date: '2023-05-28',
    status: 'scheduled',
    cost: 560000,
    shop: '타이어뱅크',
  },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vehicle-tabpanel-${index}`}
      aria-labelledby={`vehicle-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const VehicleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string | null>(null);

  const vehicleService = VehicleService.getInstance();

  useEffect(() => {
    if (id) {
      loadVehicleData(id);
    }
  }, [id]);

  const loadVehicleData = async (vehicleId: string) => {
    try {
      setLoading(true);
      const [vehicleData, statsData] = await Promise.all([
        vehicleService.getVehicleById(vehicleId),
        vehicleService.getVehicleStats(vehicleId),
      ]);
      setVehicle(vehicleData);
      setStats(statsData);
      setMaintenanceRecords(mockMaintenance.filter(m => m.vehicleId === vehicleId));
    } catch (error) {
      console.error('차량 정보를 불러오는데 실패했습니다:', error);
      setError('차량 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleStatusChange = (status: string) => {
    setNewStatus(status);
    setStatusDialog(true);
  };

  const confirmStatusChange = () => {
    if (vehicle && newStatus) {
      // 실제로는 API 호출로 상태 변경
      setVehicle({
        ...vehicle,
        status: newStatus as any,
      });
    }
    setStatusDialog(false);
    setNewStatus(null);
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('정말로 이 차량을 삭제하시겠습니까?')) return;

    try {
      await vehicleService.deleteVehicle(id);
      navigate('/vehicles');
    } catch (error) {
      console.error('차량 삭제에 실패했습니다:', error);
      setError('차량 삭제에 실패했습니다.');
    }
  };

  const getStatusChip = (status: string) => {
    let color: 'success' | 'warning' | 'error' | 'default' = 'default';
    let label = '';

    switch (status) {
      case 'active':
        color = 'success';
        label = '활성';
        break;
      case 'maintenance':
        color = 'warning';
        label = '정비 중';
        break;
      case 'inactive':
        color = 'error';
        label = '비활성';
        break;
      case 'recalled':
        color = 'error';
        label = '리콜';
        break;
      default:
        label = status;
    }

    return <Chip color={color} label={label} />;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!vehicle || !stats) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        차량 정보를 찾을 수 없습니다.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          차량 상세 정보
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<BuildIcon />}
            onClick={() => navigate(`/maintenance/new/${id}`)}
          >
            정비 등록
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/vehicles/${id}/edit`)}
          >
            수정
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
          >
            삭제
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 기본 정보 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title={
                <Typography variant="h5" component="h1">
                  {vehicle.make} {vehicle.model}
                </Typography>
              }
              subheader={`${vehicle.year}년형 ${vehicle.color || ''}`}
              avatar={
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <CarIcon />
                </Avatar>
              }
            />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography color="text.secondary" gutterBottom>
                  상태
                </Typography>
                {getStatusChip(vehicle.status)}
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography color="text.secondary" gutterBottom>
                  번호판
                </Typography>
                <Typography variant="h6">{vehicle.licensePlate}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography color="text.secondary" gutterBottom>
                  VIN
                </Typography>
                <Typography variant="body1">{vehicle.vin}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography color="text.secondary" gutterBottom>
                  주행 거리
                </Typography>
                <Typography variant="h6">{vehicle.mileage.toLocaleString()} km</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Button
                fullWidth
                variant="outlined"
                onClick={() => setStatusDialog(true)}
              >
                상태 변경
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* 운행 정보 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                운행 정보
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="현재 주행거리"
                    secondary={`${vehicle.mileage.toLocaleString()}km`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="배정된 운전자"
                    secondary={vehicle.driverId || '배정된 운전자 없음'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="최근 정비일"
                    secondary={
                      vehicle.lastMaintenanceDate
                        ? format(new Date(vehicle.lastMaintenanceDate), 'yyyy-MM-dd')
                        : '정비 이력 없음'
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="다음 정비 예정일"
                    secondary={
                      vehicle.nextMaintenanceDate
                        ? format(new Date(vehicle.nextMaintenanceDate), 'yyyy-MM-dd')
                        : '예정된 정비 없음'
                    }
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
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4">{stats.totalDistance.toLocaleString()}km</Typography>
                    <Typography color="text.secondary">총 주행거리</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4">{stats.fuelEfficiency.toFixed(1)}km/L</Typography>
                    <Typography color="text.secondary">평균 연비</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4">{stats.maintenanceCount}회</Typography>
                    <Typography color="text.secondary">정비 횟수</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4">{stats.totalCost.toLocaleString()}원</Typography>
                    <Typography color="text.secondary">총 비용</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4">{stats.incidentCount}회</Typography>
                    <Typography color="text.secondary">사고 건수</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4">{(stats.utilizationRate * 100).toFixed(1)}%</Typography>
                    <Typography color="text.secondary">가동률</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 문서 정보 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                문서 정보
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="보험 만료일"
                    secondary={format(new Date(vehicle.insuranceExpiryDate), 'yyyy-MM-dd')}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="등록증 만료일"
                    secondary={format(new Date(vehicle.registrationExpiryDate), 'yyyy-MM-dd')}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
      >
        <DialogTitle>차량 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {vehicle.make} {vehicle.model} ({vehicle.licensePlate}) 차량을 정말 삭제하시겠습니까?
            이 작업은 되돌릴 수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>취소</Button>
          <Button onClick={handleDelete} color="error">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 상태 변경 다이얼로그 */}
      <Dialog
        open={statusDialog}
        onClose={() => setStatusDialog(false)}
      >
        <DialogTitle>차량 상태 변경</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            차량 상태를 선택하세요:
          </DialogContentText>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button 
              variant={newStatus === 'active' ? 'contained' : 'outlined'} 
              color="success"
              onClick={() => handleStatusChange('active')}
            >
              활성
            </Button>
            <Button 
              variant={newStatus === 'maintenance' ? 'contained' : 'outlined'} 
              color="warning"
              onClick={() => handleStatusChange('maintenance')}
            >
              정비 중
            </Button>
            <Button 
              variant={newStatus === 'inactive' ? 'contained' : 'outlined'} 
              color="error"
              onClick={() => handleStatusChange('inactive')}
            >
              비활성
            </Button>
            <Button 
              variant={newStatus === 'recalled' ? 'contained' : 'outlined'} 
              color="error"
              onClick={() => handleStatusChange('recalled')}
            >
              리콜
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog(false)}>취소</Button>
          <Button 
            onClick={confirmStatusChange} 
            color="primary"
            disabled={!newStatus}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VehicleDetail;