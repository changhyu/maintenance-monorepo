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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Build as BuildIcon,
  DirectionsCar as CarIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

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
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string | null>(null);

  useEffect(() => {
    // API 호출 시뮬레이션
    const fetchData = async () => {
      try {
        setTimeout(() => {
          if (id && mockVehicles[id]) {
            setVehicle(mockVehicles[id]);
            setMaintenanceRecords(mockMaintenance.filter(m => m.vehicleId === id));
          }
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('차량 상세 정보 로딩 실패:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

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

  const handleDeleteClick = () => {
    setDeleteDialog(true);
  };

  const confirmDelete = () => {
    // 실제로는 API 호출로 차량 삭제
    navigate('/vehicles');
    setDeleteDialog(false);
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
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }} variant="body1">
          차량 정보를 불러오는 중...
        </Typography>
      </Box>
    );
  }

  if (!vehicle) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/vehicles')}
          sx={{ mb: 3 }}
        >
          차량 목록으로 돌아가기
        </Button>
        <Typography variant="h5" component="h1">
          차량을 찾을 수 없습니다.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/vehicles')}>
          차량 목록으로 돌아가기
        </Button>
        <Box>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<BuildIcon />}
            onClick={() => navigate(`/vehicles/${id}/maintenance/new`)}
            sx={{ mr: 1 }}
          >
            정비 등록
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/vehicles/${id}/edit`)}
          >
            수정하기
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
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
              action={
                <IconButton aria-label="delete" onClick={handleDeleteClick}>
                  <DeleteIcon />
                </IconButton>
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

        <Grid item xs={12} md={8}>
          <Paper>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label="상세 정보" />
              <Tab label="정비 이력" />
              <Tab label="문서" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    소유자
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {vehicle.owner || '-'}
                  </Typography>

                  <Typography variant="subtitle1" gutterBottom>
                    구매 일자
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {formatDate(vehicle.purchaseDate)}
                  </Typography>

                  <Typography variant="subtitle1" gutterBottom>
                    보험 만료일
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {formatDate(vehicle.insuranceExpiry)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    연료 유형
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {vehicle.fuelType || '-'}
                  </Typography>

                  <Typography variant="subtitle1" gutterBottom>
                    변속기
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {vehicle.transmission || '-'}
                  </Typography>

                  <Typography variant="subtitle1" gutterBottom>
                    엔진
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {vehicle.engineSize || '-'}
                  </Typography>
                </Grid>

                {vehicle.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      메모
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="body1">{vehicle.notes}</Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<BuildIcon />}
                  onClick={() => navigate(`/vehicles/${id}/maintenance/new`)}
                >
                  새 정비 등록
                </Button>
              </Box>

              <List>
                {maintenanceRecords.map((record) => (
                  <React.Fragment key={record.id}>
                    <ListItem 
                      alignItems="flex-start"
                      secondaryAction={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {new Intl.NumberFormat('ko-KR', {
                              style: 'currency',
                              currency: 'KRW',
                              maximumFractionDigits: 0,
                            }).format(record.cost)}
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => navigate(`/maintenance/${record.id}`)}
                          >
                            상세 보기
                          </Button>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" fontWeight="medium">
                              {record.type}
                            </Typography>
                            {record.status === 'completed' ? (
                              <Chip size="small" color="success" label="완료" />
                            ) : record.status === 'scheduled' ? (
                              <Chip size="small" color="info" label="예약됨" />
                            ) : (
                              <Chip size="small" color="warning" label="진행 중" />
                            )}
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                            >
                              {formatDate(record.date)}
                            </Typography>
                            {" — "}
                            {record.description}
                            {record.shop && <div>정비소: {record.shop}</div>}
                          </>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
                {maintenanceRecords.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="정비 이력이 없습니다"
                      secondary="새 정비 이력을 등록하려면 '새 정비 등록' 버튼을 클릭하세요."
                    />
                  </ListItem>
                )}
              </List>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <Typography variant="body1" color="text.secondary">
                  등록된 문서가 없습니다.
                </Typography>
              </Box>
            </TabPanel>
          </Paper>
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
          <Button onClick={confirmDelete} color="error">
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