import React, { useState, useEffect, useCallback } from 'react';
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
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
  InputLabel,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Build as BuildIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
// @ts-ignore
import { useFormik } from 'formik';
// @ts-ignore
import * as Yup from 'yup';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
  Maintenance, 
  MaintenanceType, 
  MaintenanceStatus, 
  MaintenancePart,
  MaintenancePriority
} from '../../types/maintenance';
import { MaintenanceService } from '../../services/maintenanceService';

// 상수로 정의하여 값으로 사용
const MAINTENANCE_TYPES = {
  REGULAR_SERVICE: 'regular_service' as MaintenanceType,
  REPAIR: 'repair' as MaintenanceType,
  INSPECTION: 'inspection' as MaintenanceType,
  OIL_CHANGE: 'oil_change' as MaintenanceType,
  TIRE_SERVICE: 'tire_service' as MaintenanceType,
  BATTERY_SERVICE: 'battery_service' as MaintenanceType,
  BRAKE_SERVICE: 'brake_service' as MaintenanceType,
  FILTER_CHANGE: 'filter_change' as MaintenanceType,
  DIAGNOSTICS: 'diagnostics' as MaintenanceType,
  RECALL_SERVICE: 'recall_service' as MaintenanceType,
  BODY_REPAIR: 'body_repair' as MaintenanceType,
  ENGINE_SERVICE: 'engine_service' as MaintenanceType,
  ELECTRICAL: 'electrical' as MaintenanceType,
  OTHER: 'other' as MaintenanceType
};

const MAINTENANCE_STATUS = {
  SCHEDULED: 'scheduled' as MaintenanceStatus,
  IN_PROGRESS: 'in_progress' as MaintenanceStatus,
  COMPLETED: 'completed' as MaintenanceStatus,
  CANCELLED: 'cancelled' as MaintenanceStatus,
  DELAYED: 'delayed' as MaintenanceStatus
};

const MAINTENANCE_PRIORITY = {
  LOW: 'low' as MaintenancePriority,
  MEDIUM: 'medium' as MaintenancePriority,
  HIGH: 'high' as MaintenancePriority,
  CRITICAL: 'critical' as MaintenancePriority
};

// 부품 인터페이스 확장 (totalPrice 프로퍼티 추가)
interface ExtendedMaintenancePart extends MaintenancePart {
  unitPrice: number;
  totalPrice: number;
  status?: string;
  warrantyExpiry?: string;
}

// 정비 기록 타입 정의 (임시)
interface MaintenanceRecord {
  id?: string;
  vehicleId: string;
  vehicleName?: string;
  vehicleLicensePlate?: string;
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
  parts: Part[];
}

// 부품 타입 정의
interface Part {
  id: string;
  name: string;
  partNumber?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  customName?: string; // 직접 입력용 필드 추가
}

// 차량 타입 정의 (임시)
interface Vehicle {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
  mileage: number;
  status: string;
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
  },
};

// 테스트 차량 데이터
const mockVehicles: Vehicle[] = [
  {
    id: '1',
    make: '현대',
    model: '소나타',
    licensePlate: '서울 가 1234',
    mileage: 15000,
    status: 'active',
  },
  {
    id: '2',
    make: '기아',
    model: 'K5',
    licensePlate: '경기 나 5678',
    mileage: 28000,
    status: 'active',
  },
  {
    id: '3',
    make: '테슬라',
    model: '모델 3',
    licensePlate: '서울 다 9012',
    mileage: 8000,
    status: 'active',
  },
];

// 정비 유형 목록 (예시)
const maintenanceTypes = [
  '정기 점검',
  '엔진 오일 교체',
  '타이어 교체',
  '브레이크 패드 교체',
  '에어컨 점검',
  '배터리 교체',
  '필터 교체',
  '벨트 교체',
  '변속기 오일 교체',
  '기타 수리',
];

// ValidationSchema
const validationSchema = Yup.object().shape({
  vehicleId: Yup.string().required('차량은 필수 항목입니다'),
  type: Yup.string().required('정비 유형은 필수 항목입니다'),
  description: Yup.string().required('설명은 필수 항목입니다'),
  date: Yup.date().required('날짜는 필수 항목입니다'),
  status: Yup.string().required('상태는 필수 항목입니다'),
  cost: Yup.number().min(0, '비용은 0 이상이어야 합니다').required('비용은 필수 항목입니다'),
});

// 초기 정비 데이터
const initialMaintenance: MaintenanceRecord = {
  vehicleId: '',
  type: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  status: 'scheduled',
  cost: 0,
  parts: [],
};

// 빈 부품 템플릿
const emptyPart: Part = {
  id: '',
  name: '',
  partNumber: '',
  quantity: 1,
  unitCost: 0,
  totalCost: 0,
};

// 부품 추천 목록 (자동 완성용)
const suggestedParts = [
  { name: '엔진 오일', partNumber: 'OIL-5W30', unitCost: 15000 },
  { name: '오일 필터', partNumber: 'FILTER-OIL-01', unitCost: 25000 },
  { name: '에어 필터', partNumber: 'FILTER-AIR-01', unitCost: 30000 },
  { name: '연료 필터', partNumber: 'FILTER-FUEL-01', unitCost: 35000 },
  { name: '브레이크 패드 (앞)', partNumber: 'BRAKE-PAD-FRONT', unitCost: 60000 },
  { name: '브레이크 패드 (뒤)', partNumber: 'BRAKE-PAD-REAR', unitCost: 45000 },
  { name: '와이퍼 블레이드', partNumber: 'WIPER-BLADE', unitCost: 20000 },
  { name: '타이어 (일반)', partNumber: 'TIRE-STD', unitCost: 150000 },
  { name: '배터리', partNumber: 'BATTERY-STD', unitCost: 120000 },
  { name: '타이밍 벨트', partNumber: 'BELT-TIMING', unitCost: 80000 },
];

// 화폐 표시 포맷 유틸리티 함수
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount);
};

interface PartFormData {
  name: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  status: 'IN_STOCK' | 'ORDERED' | 'INSTALLED';
  warrantyExpiry?: Date;
}

const MaintenanceForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  
  // 상태 관리
  const [formData, setFormData] = useState<Partial<Maintenance>>({
    vehicleId: '',
    type: MAINTENANCE_TYPES.REGULAR_SERVICE,
    status: MAINTENANCE_STATUS.SCHEDULED,
    description: '',
    startDate: new Date().toISOString(),
    priority: MAINTENANCE_PRIORITY.MEDIUM,
    cost: 0,
    parts: [],
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partDialogOpen, setPartDialogOpen] = useState(false);
  const [partFormData, setPartFormData] = useState<Partial<ExtendedMaintenancePart>>({
    name: '',
    partNumber: '',
    quantity: 1,
    unitPrice: 0,
    status: 'IN_STOCK',
  });

  const maintenanceService = MaintenanceService.getInstance();

  // 데이터 로드
  useEffect(() => {
    const loadMaintenance = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await maintenanceService.getMaintenanceById(id);
        setFormData(data);
      } catch (error) {
        console.error('정비 정보 로드 실패:', error);
        setError('정비 정보를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadMaintenance();
  }, [id]);

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      if (id) {
        // 수정
        await maintenanceService.updateMaintenance(id, formData);
      } else {
        // 신규 등록
        await maintenanceService.createMaintenance(formData as any);
      }

      // 성공 시 목록으로 이동
      navigate('/maintenance');
    } catch (error) {
      console.error('정비 저장 실패:', error);
      setError('정비 정보 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 필드 변경 핸들러
  const handleChange = (field: keyof Maintenance) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [field]: e.target.value,
    });
  };

  // 부품 추가 핸들러
  const handlePartSubmit = () => {
    if (!partFormData.name || !partFormData.partNumber || !partFormData.quantity || !partFormData.unitPrice) {
      return;
    }
    
    const totalPrice = (partFormData.quantity || 0) * (partFormData.unitPrice || 0);
    const newPart: ExtendedMaintenancePart = {
      id: Math.random().toString(36).substr(2, 9), // 임시 ID
      name: partFormData.name || '',
      partNumber: partFormData.partNumber || '',
      quantity: partFormData.quantity || 0,
      cost: totalPrice,
      replaced: false,
      unitPrice: partFormData.unitPrice || 0,
      totalPrice: totalPrice,
      status: partFormData.status,
      warrantyExpiry: partFormData.warrantyExpiry,
    };

    setFormData({
      ...formData,
      parts: [...(formData.parts || []), newPart],
      cost: ((formData.cost || 0) + totalPrice),
    });

    setPartDialogOpen(false);
    setPartFormData({
      name: '',
      partNumber: '',
      quantity: 1,
      unitPrice: 0,
      status: 'IN_STOCK',
    });
  };

  // 부품 삭제 핸들러
  const handlePartDelete = (partId: string) => {
    const part = formData.parts?.find(p => p.id === partId) as ExtendedMaintenancePart;
    if (!part) return;

    setFormData({
      ...formData,
      parts: formData.parts?.filter(p => p.id !== partId) || [],
      cost: ((formData.cost || 0) - (part.totalPrice || 0)),
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          {id ? '정비 정보 수정' : '새 정비 등록'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Grid container spacing={3}>
            {/* 기본 정보 */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                기본 정보
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="차량 ID"
                value={formData.vehicleId || ''}
                onChange={(e) => setFormData({...formData, vehicleId: e.target.value})}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>정비 유형</InputLabel>
                <Select
                  value={formData.type || ''}
                  label="정비 유형"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as MaintenanceType })}
                >
                  <MenuItem value={MAINTENANCE_TYPES.REGULAR_SERVICE}>정기 점검</MenuItem>
                  <MenuItem value={MAINTENANCE_TYPES.REPAIR}>수리</MenuItem>
                  <MenuItem value={MAINTENANCE_TYPES.INSPECTION}>검사</MenuItem>
                  <MenuItem value={MAINTENANCE_TYPES.OIL_CHANGE}>오일 교체</MenuItem>
                  <MenuItem value={MAINTENANCE_TYPES.TIRE_SERVICE}>타이어 서비스</MenuItem>
                  <MenuItem value={MAINTENANCE_TYPES.BATTERY_SERVICE}>배터리 서비스</MenuItem>
                  <MenuItem value={MAINTENANCE_TYPES.OTHER}>기타</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                multiline
                rows={3}
                label="설명"
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="예정일"
                value={formData.startDate ? new Date(formData.startDate) : null}
                onChange={(date) =>
                  setFormData({
                    ...formData,
                    startDate: date?.toISOString() || new Date().toISOString(),
                  })
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="주행거리(km)"
                value={formData.odometer || ''}
                onChange={(e) => setFormData({...formData, odometer: Number(e.target.value)})}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="정비소 ID"
                value={formData.facility || ''}
                onChange={(e) => setFormData({...formData, facility: e.target.value})}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="정비사 ID"
                value={formData.technician || ''}
                onChange={(e) => setFormData({...formData, technician: e.target.value})}
              />
            </Grid>

            {/* 부품 정보 */}
            <Grid item xs={12} sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">부품 정보</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setPartDialogOpen(true)}
                >
                  부품 추가
                </Button>
              </Box>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>부품명</TableCell>
                      <TableCell>부품번호</TableCell>
                      <TableCell>수량</TableCell>
                      <TableCell align="right">단가</TableCell>
                      <TableCell align="right">금액</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>보증기간</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.parts && formData.parts.length > 0 ? (
                      formData.parts.map((part) => {
                        const extendedPart = part as ExtendedMaintenancePart;
                        return (
                          <TableRow key={part.id}>
                            <TableCell>{part.name}</TableCell>
                            <TableCell>{part.partNumber}</TableCell>
                            <TableCell>{part.quantity}</TableCell>
                            <TableCell align="right">{extendedPart.unitPrice || (part.cost / part.quantity)}</TableCell>
                            <TableCell align="right">{part.cost}</TableCell>
                            <TableCell>{extendedPart.status || '-'}</TableCell>
                            <TableCell>
                              {extendedPart.warrantyExpiry
                                ? new Date(extendedPart.warrantyExpiry).toLocaleDateString()
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handlePartDelete(part.id)}
                                aria-label="삭제"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          등록된 부품이 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            <Grid item xs={12} sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate(-1)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={loading}
                >
                  저장
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 부품 추가 다이얼로그 */}
      <Dialog open={partDialogOpen} onClose={() => setPartDialogOpen(false)}>
        <DialogTitle>부품 추가</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="부품명"
                value={partFormData.name || ''}
                onChange={(e) => setPartFormData({ ...partFormData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="부품 번호"
                value={partFormData.partNumber || ''}
                onChange={(e) => setPartFormData({ ...partFormData, partNumber: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="수량"
                value={partFormData.quantity || ''}
                onChange={(e) => setPartFormData({ ...partFormData, quantity: Number(e.target.value) })}
                InputProps={{ inputProps: { min: 1 } }}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="단가"
                value={partFormData.unitPrice || ''}
                onChange={(e) => setPartFormData({ ...partFormData, unitPrice: Number(e.target.value) })}
                InputProps={{ inputProps: { min: 0 } }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={partFormData.status || 'IN_STOCK'}
                  label="상태"
                  onChange={(e) => setPartFormData({ ...partFormData, status: e.target.value })}
                >
                  <MenuItem value="IN_STOCK">재고 있음</MenuItem>
                  <MenuItem value="ON_ORDER">주문 중</MenuItem>
                  <MenuItem value="INSTALLED">설치됨</MenuItem>
                  <MenuItem value="DEFECTIVE">결함 있음</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="보증 만료일"
                value={partFormData.warrantyExpiry || ''}
                onChange={(e) => setPartFormData({ ...partFormData, warrantyExpiry: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPartDialogOpen(false)}>취소</Button>
          <Button onClick={handlePartSubmit} variant="contained" color="primary">
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaintenanceForm;