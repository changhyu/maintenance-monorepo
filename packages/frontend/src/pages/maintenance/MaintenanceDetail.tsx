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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Maintenance, MaintenanceStatus, MaintenancePart } from '../../types/maintenance';
import { MaintenanceService } from '../../services/maintenanceService';

// 정비 기록 타입 정의 (임시)
interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehicleLicensePlate: string;
  type: string;
  description: string;
  date: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'delayed';
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
  const [maintenance, setMaintenance] = useState<Maintenance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    open: boolean;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'delayed' | null;
  }>({ open: false, status: null });

  const maintenanceService = MaintenanceService.getInstance();

  useEffect(() => {
    if (id) {
      loadMaintenanceData(id);
    }
  }, [id]);

  const loadMaintenanceData = async (maintenanceId: string) => {
    try {
      setLoading(true);
      const data = await maintenanceService.getMaintenanceById(maintenanceId);
      setMaintenance(data);
    } catch (error) {
      console.error('정비 정보를 불러오는데 실패했습니다:', error);
      setError('정비 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('정말로 이 정비 기록을 삭제하시겠습니까?')) return;

    try {
      await maintenanceService.deleteMaintenance(id);
      navigate('/maintenance');
    } catch (error) {
      console.error('정비 기록 삭제에 실패했습니다:', error);
      setError('정비 기록 삭제에 실패했습니다.');
    }
  };

  const handleStatusChange = (status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'delayed') => {
    setStatusChangeDialog({
      open: true,
      status,
    });
  };

  const confirmStatusChange = async () => {
    if (maintenance && statusChangeDialog.status) {
      try {
        setLoading(true);
        
        const newStatus = statusChangeDialog.status;
        const updatedMaintenance = {
          ...maintenance,
          status: newStatus,
          completionDate: newStatus === 'completed' ? new Date().toISOString() : maintenance.completionDate,
        };
        
        // 개발 환경인지 확인
        if (process.env.NODE_ENV === 'development') {
          // 목업 응답 시뮬레이션
          await new Promise(resolve => setTimeout(resolve, 500));
          setMaintenance(updatedMaintenance);
          
          // 상태가 변경되었음을 알림
          const statusText = 
            newStatus === 'in_progress' ? '작업 시작' :
            newStatus === 'completed' ? '작업 완료' :
            newStatus === 'cancelled' ? '작업 취소' :
            newStatus === 'delayed' ? '작업 지연' : '상태 변경';
          
          alert(`정비 기록이 '${statusText}' 상태로 변경되었습니다.`);
          setLoading(false);
        } else {
          // 실제 API 호출
          import('../../services').then(async ({ maintenanceService }) => {
            try {
              if (!id) return;
              
              // 상태에 따라 적절한 API 엔드포인트 호출
              const result = await maintenanceService.updateMaintenanceStatus(id, newStatus);
              // 모든 필수 필드가 포함된 완전한 MaintenanceRecord 객체를 생성
              const updatedMaintenance: Maintenance = {
                ...maintenance,
                ...result,
                // id는 항상 문자열이어야 함을 보장
                id: maintenance.id
              };
              setMaintenance(updatedMaintenance);
              
              // 상태가 변경되었음을 알림
              const statusText = 
                newStatus === 'in_progress' ? '작업 시작' :
                newStatus === 'completed' ? '작업 완료' :
                newStatus === 'cancelled' ? '작업 취소' :
                newStatus === 'delayed' ? '작업 지연' : '상태 변경';
              
              alert(`정비 기록이 '${statusText}' 상태로 변경되었습니다.`);
              setLoading(false);
            } catch (apiError) {
              console.error('정비 상태 변경 실패:', apiError);
              alert('정비 상태 변경 중 오류가 발생했습니다.');
              setLoading(false);
            }
          }).catch(importError => {
            console.error('서비스 모듈 로드 오류:', importError);
            setLoading(false);
          });
        }
      } catch (error) {
        console.error('정비 상태 변경 실패:', error);
        alert('정비 상태 변경 중 오류가 발생했습니다.');
        setLoading(false);
      }
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
      case 'delayed':
        color = 'warning';
        label = '지연됨';
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

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!maintenance) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        정비 정보를 찾을 수 없습니다.
      </Alert>
    );
  }

  // 총 비용 계산
  const partsTotal = maintenance.parts?.reduce((sum, part) => sum + part.totalCost, 0) || 0;
  const laborCost = maintenance.cost - partsTotal;
  const totalCost = maintenance.cost;

  // 상태에 따른 액션 버튼 렌더링
  const renderActionButtons = () => {
    switch (maintenance.status) {
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
      case 'delayed':
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
          <IconButton color="error" onClick={() => setDeleteDialog(true)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>

      {/* 메인 정보 카드 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            {/* 헤더 정보 */}
            <Grid component="div" sx={{ gridColumn: { xs: 'span 12' } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="h1">
                  {maintenance.type}
                </Typography>
                {getStatusChip(maintenance.status)}
              </Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {maintenance.description}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            {/* 차량 정보 */}
            <Grid component="div" sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <CarIcon />
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {maintenance.vehicleName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {maintenance.vehicleLicensePlate}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* 날짜 정보 */}
            <Grid component="div" sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'info.main' }}>
                  <DateIcon />
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    예정일: {formatDate(maintenance.scheduledDate)}
                  </Typography>
                  {maintenance.completionDate && (
                    <Typography variant="body2" color={maintenance.status === 'completed' ? 'success.main' : 'text.secondary'}>
                      완료일: {formatDate(maintenance.completionDate)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>

            {/* 정비소/기술자 정보 */}
            <Grid component="div" sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {maintenance.shopId && (
                  <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
                    <ShopIcon />
                  </Avatar>
                )}
                <Box>
                  {maintenance.shopId && (
                    <Typography variant="body1" fontWeight="medium">
                      {maintenance.shopId}
                    </Typography>
                  )}
                  {maintenance.technicianId && (
                    <Typography variant="body2" color="text.secondary">
                      담당: {maintenance.technicianId}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>

            {/* 주행거리/비용 정보 */}
            <Grid component="div" sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'success.main' }}>
                  <ReceiptIcon />
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    총 비용: {formatCurrency(totalCost)}
                  </Typography>
                  {maintenance.mileage && (
                    <Typography variant="body2" color="text.secondary">
                      주행거리: {maintenance.mileage.toLocaleString()} km
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>

            {/* 액션 버튼 */}
            <Grid component="div" sx={{ gridColumn: { xs: 'span 12' } }}>
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
        <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
          <Paper sx={{ mb: 3, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PartIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">부품 목록</Typography>
            </Box>
            {maintenance.parts && maintenance.parts.length > 0 ? (
              <>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>부품명</TableCell>
                        <TableCell>부품 번호</TableCell>
                        <TableCell align="right">수량</TableCell>
                        <TableCell align="right">단가</TableCell>
                        <TableCell align="right">총액</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell>보증 만료일</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {maintenance.parts.map((part) => (
                        <TableRow key={part.id}>
                          <TableCell>{part.name}</TableCell>
                          <TableCell>{part.partNumber}</TableCell>
                          <TableCell align="right">{part.quantity}</TableCell>
                          <TableCell align="right">{part.unitPrice.toLocaleString()}원</TableCell>
                          <TableCell align="right">{part.totalPrice.toLocaleString()}원</TableCell>
                          <TableCell>
                            <Chip
                              label={part.status}
                              color={
                                part.status === 'INSTALLED'
                                  ? 'success'
                                  : part.status === 'IN_STOCK'
                                  ? 'info'
                                  : 'warning'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {part.warrantyExpiry
                              ? format(new Date(part.warrantyExpiry), 'yyyy-MM-dd')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {maintenance.parts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            사용된 부품이 없습니다.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
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
        <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
          <Paper sx={{ mb: 3, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <DocumentIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">문서</Typography>
              </Box>
              <Button 
                variant="outlined" 
                size="small" 
                startIcon={<DocumentIcon />}
                onClick={() => alert('문서 업로드 기능은 곧 추가될 예정입니다.')}
              >
                문서 추가
              </Button>
            </Box>
            {maintenance.documents && maintenance.documents.length > 0 ? (
              <List>
                {maintenance.documents.map((doc) => (
                  <ListItem key={doc.id} sx={{ px: 0, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <ListItemIcon>
                      <Avatar sx={{ 
                        bgcolor: doc.type.includes('pdf') ? 'error.light' : 
                                 doc.type.includes('image') ? 'success.light' : 'info.main', 
                        width: 36, 
                        height: 36 
                      }}>
                        <DocumentIcon fontSize="small" />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body1" sx={{ fontWeight: 'medium' }}>{doc.name}</Typography>}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            업로드: {formatDate(doc.uploadedAt)}
                          </Typography>
                          <Divider orientation="vertical" flexItem />
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(doc.size)}
                          </Typography>
                        </Box>
                      }
                    />
                    <Box>
                      <Button size="small" color="primary" href={doc.fileUrl} target="_blank">
                        보기
                      </Button>
                      <IconButton size="small" color="error" onClick={() => alert('문서 삭제 기능은 곧 추가될 예정입니다.')}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  등록된 문서가 없습니다.
                </Typography>
                <Button 
                  variant="text" 
                  color="primary"
                  startIcon={<DocumentIcon />}
                  onClick={() => alert('문서 업로드 기능은 곧 추가될 예정입니다.')}
                >
                  문서 업로드
                </Button>
              </Paper>
            )}
          </Paper>
        </Grid>

        {/* 메모 */}
        {maintenance.notes && (
          <Grid component="div" sx={{ gridColumn: { xs: 'span 12' } }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                메모
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {maintenance.notes}
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
          <Button onClick={handleDelete} color="error">
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
          {statusChangeDialog.status === 'delayed' && (
            <DialogContentText>
              이 정비 작업을 지연 상태로 표시하시겠습니까?
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