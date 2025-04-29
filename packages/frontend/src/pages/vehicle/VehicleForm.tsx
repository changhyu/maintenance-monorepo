import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  DirectionsCar as CarIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Vehicle, VehicleType, VehicleStatus, FuelType } from '../../types/vehicle';
import { VehicleService } from '../../services/vehicleService';

// 차량 타입 정의 (임시)
interface Vehicle {
  id?: string;
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

// 차량 제조사 목록 (예시)
const carMakes = [
  '현대', '기아', '쉐보레', '르노삼성', '쌍용', 
  'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Toyota',
  'Honda', 'Nissan', 'Ford', 'Tesla',
];

// 차량 유형 목록
const vehicleTypes = [
  { value: 'sedan', label: '승용차' },
  { value: 'suv', label: 'SUV' },
  { value: 'truck', label: '트럭' },
  { value: 'van', label: '밴' },
  { value: 'hatchback', label: '해치백' },
  { value: 'coupe', label: '쿠페' },
  { value: 'convertible', label: '컨버터블' },
  { value: 'wagon', label: '왜건' },
  { value: 'electric', label: '전기차' },
  { value: 'hybrid', label: '하이브리드' },
];

// 연료 유형 목록
const fuelTypes = [
  { value: '가솔린', label: '가솔린' },
  { value: '디젤', label: '디젤' },
  { value: 'LPG', label: 'LPG' },
  { value: '전기', label: '전기' },
  { value: '하이브리드', label: '하이브리드' },
  { value: '수소', label: '수소' },
];

// 변속기 유형 목록
const transmissionTypes = [
  { value: '자동', label: '자동' },
  { value: '수동', label: '수동' },
  { value: 'DCT', label: '듀얼 클러치 (DCT)' },
  { value: 'CVT', label: 'CVT' },
];

// 현재 연도 계산
const currentYear = new Date().getFullYear();

// ValidationSchema
const validationSchema = Yup.object().shape({
  make: Yup.string().required('제조사는 필수 항목입니다'),
  model: Yup.string().required('모델명은 필수 항목입니다'),
  year: Yup.number()
    .required('연식은 필수 항목입니다')
    .min(1900, '유효한 연식을 입력하세요')
    .max(currentYear + 1, '유효한 연식을 입력하세요'),
  licensePlate: Yup.string().required('번호판은 필수 항목입니다'),
  vin: Yup.string()
    .required('VIN은 필수 항목입니다')
    .min(17, '정확한 17자리 VIN을 입력하세요')
    .max(17, '정확한 17자리 VIN을 입력하세요'),
  mileage: Yup.number()
    .required('주행거리는 필수 항목입니다')
    .min(0, '주행거리는 0 이상이어야 합니다'),
  type: Yup.string().required('차량 유형은 필수 항목입니다'),
  status: Yup.string().required('차량 상태는 필수 항목입니다'),
});

// 초기 차량 데이터
const initialVehicle: Vehicle = {
  vin: '',
  make: '',
  model: '',
  year: currentYear,
  licensePlate: '',
  color: '',
  type: 'sedan',
  status: 'active',
  mileage: 0,
  owner: '',
  fuelType: '',
  transmission: '',
  engineSize: '',
  notes: '',
};

const VehicleForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    registrationNumber: '',
    vin: '',
    manufacturer: '',
    model: '',
    year: new Date().getFullYear(),
    type: VehicleType.TRUCK,
    status: VehicleStatus.ACTIVE,
    mileage: 0,
    fuelType: FuelType.DIESEL,
    capacity: 0,
  });

  const vehicleService = VehicleService.getInstance();

  useEffect(() => {
    if (id) {
      loadVehicle();
    }
  }, [id]);

  const loadVehicle = async () => {
    try {
      setLoading(true);
      const data = await vehicleService.getVehicleById(id);
      setFormData(data);
    } catch (error) {
      console.error('차량 정보를 불러오는데 실패했습니다:', error);
      setError('차량 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      if (id) {
        await vehicleService.updateVehicle(id, formData);
      } else {
        await vehicleService.createVehicle(formData as Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>);
      }
      navigate('/vehicles');
    } catch (error) {
      console.error('차량 저장에 실패했습니다:', error);
      setError('차량 정보 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Vehicle) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [field]: e.target.value,
    });
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate(id ? `/vehicles/${id}` : '/vehicles')}
        >
          {id ? '차량 상세로 돌아가기' : '차량 목록으로 돌아가기'}
        </Button>
        <Typography variant="h4" component="h1">
          {id ? '차량 정보 수정' : '새 차량 등록'}
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
                label="차량 번호"
                value={formData.registrationNumber}
                onChange={handleChange('registrationNumber')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="차대 번호(VIN)"
                value={formData.vin}
                onChange={handleChange('vin')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="제조사"
                value={formData.manufacturer}
                onChange={handleChange('manufacturer')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="모델명"
                value={formData.model}
                onChange={handleChange('model')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="number"
                label="연식"
                value={formData.year}
                onChange={handleChange('year')}
                InputProps={{ inputProps: { min: 1900, max: new Date().getFullYear() + 1 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <FormLabel>차량 유형</FormLabel>
                <Select
                  value={formData.type}
                  label="차량 유형"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as VehicleType })}
                >
                  {Object.values(VehicleType).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <FormLabel>상태</FormLabel>
                <Select
                  value={formData.status}
                  label="상태"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                >
                  {Object.values(VehicleStatus).map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <FormLabel>연료 유형</FormLabel>
                <Select
                  value={formData.fuelType}
                  label="연료 유형"
                  onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as FuelType })}
                >
                  {Object.values(FuelType).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="number"
                label="적재 용량(kg)"
                value={formData.capacity}
                onChange={handleChange('capacity')}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="number"
                label="현재 주행거리(km)"
                value={formData.mileage}
                onChange={handleChange('mileage')}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>

            {/* 문서 정보 */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                문서 정보
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="보험 만료일"
                value={formData.insuranceExpiryDate}
                onChange={(date) =>
                  setFormData({
                    ...formData,
                    insuranceExpiryDate: date,
                  })
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="등록증 만료일"
                value={formData.registrationExpiryDate}
                onChange={(date) =>
                  setFormData({
                    ...formData,
                    registrationExpiryDate: date,
                  })
                }
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/vehicles')}
            >
              취소
            </Button>
            <Button
              variant="contained"
              type="submit"
              disabled={loading}
            >
              {id ? '수정' : '등록'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VehicleForm;