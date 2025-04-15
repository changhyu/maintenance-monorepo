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

// 화폐 표시 포맷 유틸리티 함수
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount);
};

const MaintenanceForm: React.FC = () => {
  const { id, vehicleId } = useParams<{ id?: string; vehicleId?: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(id ? true : false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEdit, setIsEdit] = useState(Boolean(id));
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [partDialog, setPartDialog] = useState<{
    open: boolean;
    part: Part | null;
    index: number | null;
  }>({
    open: false,
    part: null,
    index: null,
  });

  // 폼 제출 핸들러
  const handleSubmit = async (values: MaintenanceRecord) => {
    try {
      setSubmitLoading(true);
      setError(null);

      if (parts.length === 0) {
        // 부품이 없는 경우 사용자에게 확인
        if (!window.confirm('부품 목록이 비어 있습니다. 계속 진행하시겠습니까?')) {
          setSubmitLoading(false);
          return;
        }
      }

      // 부품 목록 및 총 비용 추가
      const maintenanceData = {
        ...values,
        parts,
        // 부품 비용 외 추가적인 인건비 등이 있다면 여기서 계산
      };

      // 실제로는 API 호출
      console.log('정비 저장:', maintenanceData);

      // API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSubmitLoading(false);
      navigate(isEdit ? `/maintenance/${id}` : '/maintenance');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '정비 정보 저장 중 오류가 발생했습니다.';
      setError(errorMessage);
      setSubmitLoading(false);
      console.error(err);
    }
  };

  const formik = useFormik({
    initialValues: initialMaintenance,
    validationSchema: validationSchema,
    onSubmit: handleSubmit
  });

  // 부품 총 비용 계산 - 메모이제이션
  const calculatePartsCost = React.useCallback((partsList: Part[] = parts) => {
    return partsList.reduce((total, part) => total + part.totalCost, 0);
  }, [parts]);

  useEffect(() => {
    // 차량 목록 불러오기
    const fetchVehicles = async () => {
      try {
        // 실제로는 API 호출
        // API 호출 시뮬레이션
        setTimeout(() => {
          setVehicles(mockVehicles);
        }, 500);
      } catch (err) {
        setError('차량 목록을 불러오는데 실패했습니다. 다시 시도해주세요.');
        console.error('차량 목록 로딩 실패:', err);
      }
    };

    fetchVehicles();
  }, []); // 비어있는 종속성 배열 유지 - 컴포넌트 마운트 시 한 번만 실행

  useEffect(() => {
    // 수정 모드일 경우 기존 정비 정보 불러오기
    const fetchMaintenance = async () => {
      if (!id && !vehicleId) {
        setLoading(false);
        return;
      }

      if (id) {
        try {
          // 실제로는 API 호출
          // API 호출 시뮬레이션
          setTimeout(() => {
            const maintenance = mockMaintenanceRecords[id];
            if (!maintenance) {
              setError('요청하신 정비 기록을 찾을 수 없습니다.');
              setLoading(false);
              return;
            }

            // Formik의 값을 설정
            formik.setValues({
              vehicleId: maintenance.vehicleId,
              type: maintenance.type,
              description: maintenance.description,
              date: maintenance.date,
              status: maintenance.status,
              cost: maintenance.cost,
              technician: maintenance.technician || '',
              shop: maintenance.shop || '',
              notes: maintenance.notes || '',
              mileage: maintenance.mileage || 0,
            });

            // 부품 목록 설정
            if (maintenance.parts) {
              setParts(maintenance.parts);
            }

            // 선택된 차량 찾기
            const vehicle = mockVehicles.find(v => v.id === maintenance.vehicleId);
            if (vehicle) {
              setSelectedVehicle(vehicle);
            }
            setLoading(false);
          }, 1000);
        } catch (err) {
          setError('정비 정보를 불러오는데 실패했습니다. 다시 시도해주세요.');
          setLoading(false);
          console.error(err);
        }
      } else if (vehicleId) {
        try {
          // 특정 차량에 대한 정비 등록 시 해당 차량 정보 설정
          formik.setFieldValue('vehicleId', vehicleId);

          // 선택된 차량 찾기
          const vehicle = mockVehicles.find(v => v.id === vehicleId);
          if (vehicle) {
            setSelectedVehicle(vehicle);
            formik.setFieldValue('mileage', vehicle.mileage);
          } else {
            setError('요청하신 차량 정보를 찾을 수 없습니다.');
          }
          setLoading(false);
        } catch (err) {
          setError('차량 정보를 불러오는데 실패했습니다.');
          setLoading(false);
          console.error(err);
        }
      }
    };

    fetchMaintenance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, vehicleId]); // formik은 무한 루프를 방지하기 위해 의도적으로 제외, ESLint 경고 무시

  // 차량 선택 시 호출되는 함수
  const handleVehicleChange = useCallback((event: SelectChangeEvent) => {
    const vehicleId = event.target.value;
    formik.setFieldValue('vehicleId', vehicleId);

    // 선택된 차량 찾기
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      formik.setFieldValue('mileage', vehicle.mileage);
    } else {
      setSelectedVehicle(null);
    }
  }, [vehicles, formik]);

  // 부품 추가/수정 다이얼로그 열기
  const handleOpenPartDialog = useCallback((part?: Part, index?: number) => {
    setPartDialog({
      open: true,
      part: part ? { ...part } : { ...emptyPart, id: Date.now().toString() },
      index: index !== undefined ? index : null,
    });
  }, []);

  // 부품 다이얼로그 닫기
  const handleClosePartDialog = useCallback(() => {
    setPartDialog({
      open: false,
      part: null,
      index: null,
    });
  }, []);

  // 부품 정보 유효성 검증
  const validatePart = (part: Part): boolean => {
    return Boolean(
      part.name && 
      part.quantity > 0 && 
      part.unitCost >= 0
    );
  };

  // 부품 추가/수정
  const handleSavePart = useCallback(() => {
    if (!partDialog.part || !validatePart(partDialog.part)) return;
    
    const newParts = [...parts];
    if (partDialog.index !== null) {
      // 기존 부품 수정
      newParts[partDialog.index] = partDialog.part;
    } else {
      // 새 부품 추가
      newParts.push(partDialog.part);
    }
    setParts(newParts);

    // 부품 비용 총합으로 정비 비용 업데이트
    const partsCost = calculatePartsCost(newParts);
    formik.setFieldValue('cost', partsCost);
    handleClosePartDialog();
  }, [parts, partDialog, calculatePartsCost, formik, handleClosePartDialog, validatePart]);

  // 부품 삭제
  const handleDeletePart = useCallback((index: number) => {
    const newParts = parts.filter((_, i) => i !== index);
    setParts(newParts);

    // 부품 비용 총합으로 정비 비용 업데이트
    const partsCost = calculatePartsCost(newParts);
    formik.setFieldValue('cost', partsCost);
  }, [parts, calculatePartsCost, formik]);

  // 부품 다이얼로그 내의 부품 정보 변경 핸들러
  const handlePartChange = useCallback((field: keyof Part, value: string | number) => {
    if (!partDialog.part) return;

    const updatedPart = { ...partDialog.part, [field]: value };

    // 수량이나 단가가 변경되면 총 비용 업데이트
    if (field === 'quantity' || field === 'unitCost') {
      const quantity = field === 'quantity' ? Number(value) : updatedPart.quantity;
      const unitCost = field === 'unitCost' ? Number(value) : updatedPart.unitCost;
      updatedPart.totalCost = quantity * unitCost;
    }

    setPartDialog(prev => ({
      ...prev,
      part: updatedPart
    }));
  }, [partDialog]);

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

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(id ? `/maintenance/${id}` : '/maintenance')}
        >
          {id ? '정비 상세로 돌아가기' : '정비 목록으로 돌아가기'}
        </Button>
        <Typography variant="h4" component="h1">
          {isEdit ? '정비 정보 수정' : '새 정비 등록'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
          {/* 기본 정보 카드 */}
          <Grid size={12}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    <BuildIcon />
                  </Avatar>
                  <Typography variant="h6">정비 정보</Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid size={12}>
                    <FormControl fullWidth error={Boolean(formik.touched.vehicleId && formik.errors.vehicleId)}>
                      <FormLabel>차량*</FormLabel>
                      <Select
                        name="vehicleId"
                        value={formik.values.vehicleId}
                        onChange={(e) => handleVehicleChange(e)}
                        onBlur={formik.handleBlur}
                        displayEmpty
                        error={Boolean(formik.touched.vehicleId && formik.errors.vehicleId)}
                        disabled={isEdit || Boolean(vehicleId)} // 수정 모드이거나 차량이 이미 지정된 경우 비활성화
                      >
                        <MenuItem value="" disabled>
                          차량 선택
                        </MenuItem>
                        {vehicles.map(vehicle => (
                          <MenuItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.make} {vehicle.model} ({vehicle.licensePlate})
                          </MenuItem>
                        ))}
                      </Select>
                      {formik.touched.vehicleId && formik.errors.vehicleId && (
                        <FormHelperText error>{formik.errors.vehicleId}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  {selectedVehicle && (
                    <Grid size={12}>
                      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>선택된 차량:</strong> {selectedVehicle.make} {selectedVehicle.model}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>번호판:</strong> {selectedVehicle.licensePlate}
                        </Typography>
                        <Typography variant="body2">
                          <strong>현재 주행거리:</strong> {selectedVehicle.mileage.toLocaleString()} km
                        </Typography>
                      </Paper>
                    </Grid>
                  )}

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth error={Boolean(formik.touched.type && formik.errors.type)}>
                      <FormLabel>정비 유형*</FormLabel>
                      <Select
                        name="type"
                        value={formik.values.type}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        displayEmpty
                        error={Boolean(formik.touched.type && formik.errors.type)}
                      >
                        <MenuItem value="" disabled>
                          정비 유형 선택
                        </MenuItem>
                        {maintenanceTypes.map(type => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                      {formik.touched.type && formik.errors.type && (
                        <FormHelperText error>{formik.errors.type}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth error={Boolean(formik.touched.date && formik.errors.date)}>
                      <FormLabel>날짜*</FormLabel>
                      <TextField
                        name="date"
                        type="date"
                        value={formik.values.date}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        error={Boolean(formik.touched.date && formik.errors.date)}
                        helperText={formik.touched.date && formik.errors.date}
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={12}>
                    <FormControl fullWidth error={Boolean(formik.touched.description && formik.errors.description)}>
                      <FormLabel>설명*</FormLabel>
                      <TextField
                        name="description"
                        value={formik.values.description}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        placeholder="정비 내용에 대한 상세 설명"
                        multiline
                        rows={3}
                        error={Boolean(formik.touched.description && formik.errors.description)}
                        helperText={formik.touched.description && formik.errors.description}
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth error={Boolean(formik.touched.status && formik.errors.status)}>
                      <FormLabel>상태*</FormLabel>
                      <RadioGroup
                        name="status"
                        value={formik.values.status}
                        onChange={formik.handleChange}
                        row
                      >
                        <FormControlLabel
                          value="scheduled"
                          control={<Radio />}
                          label="예약됨"
                        />
                        <FormControlLabel
                          value="in_progress"
                          control={<Radio />}
                          label="진행 중"
                        />
                        <FormControlLabel
                          value="completed"
                          control={<Radio />}
                          label="완료"
                        />
                      </RadioGroup>
                      {formik.touched.status && formik.errors.status && (
                        <FormHelperText error>{formik.errors.status}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <FormLabel>주행거리</FormLabel>
                      <TextField
                        name="mileage"
                        type="number"
                        value={formik.values.mileage || ''}
                        onChange={formik.handleChange}
                        placeholder="정비 시점의 주행 거리"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">km</InputAdornment>,
                        }}
                      />
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 추가 정보 카드 */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  추가 정보
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <FormLabel>정비소</FormLabel>
                      <TextField
                        name="shop"
                        value={formik.values.shop || ''}
                        onChange={formik.handleChange}
                        placeholder="정비소 이름"
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <FormLabel>기술자</FormLabel>
                      <TextField
                        name="technician"
                        value={formik.values.technician || ''}
                        onChange={formik.handleChange}
                        placeholder="담당 기술자 이름"
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={12}>
                    <FormControl fullWidth error={Boolean(formik.touched.cost && formik.errors.cost)}>
                      <FormLabel>총 비용*</FormLabel>
                      <TextField
                        name="cost"
                        type="number"
                        value={formik.values.cost}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        placeholder="총 정비 비용"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₩</InputAdornment>,
                        }}
                        error={Boolean(formik.touched.cost && formik.errors.cost)}
                        helperText={formik.touched.cost && formik.errors.cost}
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={12}>
                    <FormControl fullWidth>
                      <FormLabel>메모</FormLabel>
                      <TextField
                        name="notes"
                        value={formik.values.notes || ''}
                        onChange={formik.handleChange}
                        placeholder="추가 메모"
                        multiline
                        rows={3}
                      />
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 부품 목록 카드 */}
          <Grid size={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">부품 목록</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenPartDialog()}
                  >
                    부품 추가
                  </Button>
                </Box>

                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>부품명</TableCell>
                      <TableCell>부품 번호</TableCell>
                      <TableCell align="right">수량</TableCell>
                      <TableCell align="right">단가</TableCell>
                      <TableCell align="right">총액</TableCell>
                      <TableCell align="right">액션</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parts.map((part, index) => (
                      <TableRow key={part.id}>
                        <TableCell>{part.name}</TableCell>
                        <TableCell>{part.partNumber || '-'}</TableCell>
                        <TableCell align="right">{part.quantity}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(part.unitCost)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(part.totalCost)}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              onClick={() => handleOpenPartDialog(part, index)}
                            >
                              수정
                            </Button>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeletePart(index)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    {parts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 2 }}>
                          등록된 부품이 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                    {parts.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="right" sx={{ fontWeight: 'bold' }}>
                          부품 총액:
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(calculatePartsCost())}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => navigate(id ? `/maintenance/${id}` : '/maintenance')}
            sx={{ mr: 2 }}
          >
            취소
          </Button>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={submitLoading || !formik.isValid || (parts.length === 0 && formik.values.cost === 0)}
            startIcon={<SaveIcon />}
          >
            {submitLoading ? '저장 중...' : (isEdit ? '수정 완료' : '정비 등록')}
          </Button>
        </Box>
      </form>

      {/* 부품 추가/수정 다이얼로그 */}
      <Dialog open={partDialog.open} onClose={handleClosePartDialog}>
        <DialogTitle>
          {partDialog.index !== null ? '부품 정보 수정' : '새 부품 추가'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="부품명"
                value={partDialog.part?.name || ''}
                onChange={(e) => handlePartChange('name', e.target.value)}
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="부품 번호"
                value={partDialog.part?.partNumber || ''}
                onChange={(e) => handlePartChange('partNumber', e.target.value)}
                placeholder="(선택사항)"
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="수량"
                type="number"
                value={partDialog.part?.quantity || 0}
                onChange={(e) => handlePartChange('quantity', Number(e.target.value))}
                InputProps={{ inputProps: { min: 1 } }}
                required
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="단가"
                type="number"
                value={partDialog.part?.unitCost || 0}
                onChange={(e) => handlePartChange('unitCost', Number(e.target.value))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₩</InputAdornment>,
                  inputProps: { min: 0 }
                }}
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="총액"
                type="number"
                value={partDialog.part?.totalCost || 0}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₩</InputAdornment>,
                  readOnly: true,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePartDialog}>취소</Button>
          <Button
            onClick={handleSavePart}
            color="primary"
            disabled={!partDialog.part || !validatePart(partDialog.part)}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaintenanceForm;