import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  DirectionsCar as CarIcon,
  Inventory as PartIcon,
  Description as DocumentIcon,
  Person as PersonIcon,
  Store as ShopIcon,
  EventAvailable as DateIcon,
  Build as BuildIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';

// 정비 기록 타입 정의 (임시)
interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehicleLicensePlate: string;
  type: string;
  description: string;
  date: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  cost: number;
  technician?: string;
  shop?: string;
  notes?: string;
  completionDate?: string;
  mileage?: number;
  parts?: {
    id: string;
    name: string;
    partNumber?: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }[];
  documents?: {
    id: string;
    name: string;
    fileUrl: string;
    uploadedAt: string;
    size: number;
    type: string;
  }[];
}

// 테스트 데이터
const mockMaintenanceRecords: Record<string, MaintenanceRecord> = {
  '1': {
    id: '1',
    vehicleId: '1',
    vehicleName: '현대 소나타',
    vehicleLicensePlate: '서울 가 1234',
    type: '정기 점검',
    description: '엔진 오일 교체 및 기본 점검',
    date: '2023-05-15',
    status: 'completed',
    cost: 150000,
    technician: '김기술',
    shop: '현대 서비스센터',
    notes: '다음 점검은 10,000km 주행 후 권장',
    completionDate: '2023-05-15',
    mileage: 15000,
    parts: [
      {
        id: '1',
        name: '엔진 오일',
        partNumber: 'HMC-OIL-5W30',
        quantity: 5,
        unitCost: 15000,
        totalCost: 75000,
      },
      {
        id: '2',
        name: '오일 필터',
        partNumber: 'HMC-FILTER-001',
        quantity: 1,
        unitCost: 25000,
        totalCost: 25000,
      },
    ],
    documents: [
      {
        id: '1',
        name: '정비 영수증.pdf',
        fileUrl: '#',
        uploadedAt: '2023-05-15',
        size: 245000,
        type: 'application/pdf',
      },
      {
        id: '2',
        name: '점검표.jpg',
        fileUrl: '#',
        uploadedAt: '2023-05-15',
        size: 1245000,
        type: 'image/jpeg',
      },
    ],
  },
  '3': {
    id: '3',
    vehicleId: '3',
    vehicleName: '테슬라 모델 3',
    vehicleLicensePlate: '서울 다 9012',
    type: '타이어 교체',
    description: '4개 타이어 모두 교체',
    date: '2023-05-28',
    status: 'scheduled',
    cost: 560000,
    shop: '타이어뱅크',
    parts: [
      {
        id: '3',
        name: '미쉐린 타이어 225/45R17',
        partNumber: 'MICH-225-45-17',
        quantity: 4,
        unitCost: 140000,
        totalCost: 560000,
      },
    ],
  },
};

const MaintenanceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [maintenanceRecord, setMaintenanceRecord] = useState<MaintenanceRecord | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    open: boolean;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | null;
  }>({ open: false, status: null });

  useEffect(() => {
    // API 호출 시뮬레이션
    const fetchData = async () => {
      try {
        setTimeout(() => {
          if (id && mockMaintenanceRecords[id]) {
            setMaintenanceRecord(mockMaintenanceRecords[id]);
          }
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('정비 상세 정보 로딩 실패:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleDeleteClick = () => {
    setDeleteDialog(true);
  };

  const confirmDelete = () => {
    // 실제로는 API 호출로 정비 기록 삭제
    navigate('/maintenance');
    setDeleteDialog(false);
  };

  const handleStatusChange = (status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled') => {
    setStatusChangeDialog({
      open: true,
      status,
    });
  };

  const confirmStatusChange = () => {
    if (maintenanceRecord && statusChangeDialog.status) {
      // 실제로는 API 호출로 상태 변경
      setMaintenanceRecord({
        ...maintenanceRecord,
        status: statusChangeDialog.status,
        completionDate: statusChangeDialog.status === 'completed' ? new Date().toISOString() : maintenanceRecord.completionDate,
      });
    }
    setStatusChangeDialog({ open: false, status: null });
  };

  const getStatusChip = (status: string) => {
    let color: 'success' | 'warning' | 'error' | 'info' | 'default' = 'default';
    let label = '';

    switch (status) {
      case 'scheduled':
        color = 'info';
        label = '예약됨';
        break;
      case 'in_progress':
        color = 'warning';
        label = '진행 중';
        break;
      case 'completed':
        color = 'success';
        label = '완료';
        break;
      case 'cancelled':
        color = 'error';
        label = '취소됨';
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }} variant="body1">
          정비 정보를 불러오는 중...
        </Typography>
      </Box>
    );
  }

  if (!maintenanceRecord) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/maintenance')}
          sx={{ mb: 3 }}
        >
          정비 목록으로 돌아가기
        </Button>
        <Alert severity="error">해당 정비 기록을 찾을 수 없습니다.</Alert>
      </Box>
    );
  }

  // 총 비용 계산
  const partsTotal = maintenanceRecord.parts?.reduce((sum, part) => sum + part.totalCost, 0) || 0;
  const laborCost = maintenanceRecord.cost - partsTotal;
  const totalCost = maintenanceRecord.cost;

  // 상태에 따른 액션 버튼 렌더링
  const renderActionButtons = () => {
    switch (maintenanceRecord.status) {
      case 'scheduled':
        return (
          <>
            <Button
              variant="contained"
              color="primary"
              startIcon={<BuildIcon />}
              onClick={() => handleStatusChange('in_progress')}
              sx={{ mr: 1 }}
            >
              작업 시작
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => handleStatusChange('cancelled')}
            >
              취소
            </Button>
          </>
        );
      case 'in_progress':
        return (
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={() => handleStatusChange('completed')}
          >
            작업 완료
          </Button>
        );
      case 'completed':
      case 'cancelled':
        return null;
      default:
        return null;
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/maintenance')}>
          정비 목록으로 돌아가기
        </Button>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/maintenance/${id}/edit`)}
            sx={{ mr: 1 }}
          >
            수정하기
          </Button>
          <IconButton color="error" onClick={handleDeleteClick}>
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>

      {/* 메인 정보 카드 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            {/* 헤더 정보 */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="h1">
                  {maintenanceRecord.type}
                </Typography>
                {getStatusChip(maintenanceRecord.status)}
              </Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {maintenanceRecord.description}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            {/* 차량 정보 */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <CarIcon />
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {maintenanceRecord.vehicleName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {maintenanceRecord.vehicleLicensePlate}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* 날짜 정보 */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'info.main' }}>
                  <DateIcon />
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    예정일: {formatDate(maintenanceRecord.date)}
                  </Typography>
                  {maintenanceRecord.completionDate && (
                    <Typography variant="body2" color={maintenanceRecord.status === 'completed' ? 'success.main' : 'text.secondary'}>
                      완료일: {formatDate(maintenanceRecord.completionDate)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>

            {/* 정비소/기술자 정보 */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {maintenanceRecord.shop ? (
                  <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
                    <ShopIcon />
                  </Avatar>
                ) : (
                  <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
                    <PersonIcon />
                  </Avatar>
                )}
                <Box>
                  {maintenanceRecord.shop && (
                    <Typography variant="body1" fontWeight="medium">
                      {maintenanceRecord.shop}
                    </Typography>
                  )}
                  {maintenanceRecord.technician && (
                    <Typography variant="body2" color="text.secondary">
                      담당: {maintenanceRecord.technician}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>

            {/* 주행거리/비용 정보 */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'success.main' }}>
                  <ReceiptIcon />
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    총 비용: {formatCurrency(totalCost)}
                  </Typography>
                  {maintenanceRecord.mileage && (
                    <Typography variant="body2" color="text.secondary">
                      주행거리: {maintenanceRecord.mileage.toLocaleString()} km
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>

            {/* 액션 버튼 */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                {renderActionButtons()}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* 부품 목록 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ mb: 3, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PartIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">부품 목록</Typography>
            </Box>
            {maintenanceRecord.parts && maintenanceRecord.parts.length > 0 ? (
              <>
                <List disablePadding>
                  {maintenanceRecord.parts.map((part) => (
                    <ListItem key={part.id} sx={{ px: 0, py: 1 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body1" component="div">
                            {part.name} {part.partNumber && `(${part.partNumber})`}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {part.quantity}개 × {formatCurrency(part.unitCost)}
                          </Typography>
                        }
                      />
                      <Typography variant="body1">
                        {formatCurrency(part.totalCost)}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <Typography variant="body1">부품 비용</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatCurrency(partsTotal)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body1">인건비</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatCurrency(laborCost)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body1" fontWeight="bold">
                    총 비용
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(totalCost)}
                  </Typography>
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                등록된 부품이 없습니다.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* 문서 목록 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ mb: 3, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DocumentIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">문서</Typography>
            </Box>
            {maintenanceRecord.documents && maintenanceRecord.documents.length > 0 ? (
              <List>
                {maintenanceRecord.documents.map((doc) => (
                  <ListItem key={doc.id} sx={{ px: 0, py: 1 }}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'info.main', width: 36, height: 36 }}>
                        <DocumentIcon fontSize="small" />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={doc.name}
                      secondary={`${formatDate(doc.uploadedAt)} • ${formatFileSize(doc.size)}`}
                    />
                    <Button size="small" href={doc.fileUrl} target="_blank">
                      보기
                    </Button>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                등록된 문서가 없습니다.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* 메모 */}
        {maintenanceRecord.notes && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                메모
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {maintenanceRecord.notes}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
      >
        <DialogTitle>정비 기록 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            이 정비 기록을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
        open={statusChangeDialog.open}
        onClose={() => setStatusChangeDialog({ open: false, status: null })}
      >
        <DialogTitle>정비 상태 변경</DialogTitle>
        <DialogContent>
          {statusChangeDialog.status === 'in_progress' && (
            <DialogContentText>
              이 정비 작업을 시작하시겠습니까? 상태가 '진행 중'으로 변경됩니다.
            </DialogContentText>
          )}
          {statusChangeDialog.status === 'completed' && (
            <DialogContentText>
              이 정비 작업을 완료로 표시하시겠습니까? 완료일이 오늘로 설정됩니다.
            </DialogContentText>
          )}
          {statusChangeDialog.status === 'cancelled' && (
            <DialogContentText>
              이 정비 작업을 취소하시겠습니까?
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusChangeDialog({ open: false, status: null })}>
            취소
          </Button>
          <Button
            onClick={confirmStatusChange}
            color={statusChangeDialog.status === 'cancelled' ? 'error' : 'primary'}
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaintenanceDetail;