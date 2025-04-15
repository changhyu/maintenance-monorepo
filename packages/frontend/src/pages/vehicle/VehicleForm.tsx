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
  const [loading, setLoading] = useState(id ? true : false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEdit, setIsEdit] = useState(Boolean(id));
  
  const formik = useFormik({
    initialValues: initialVehicle,
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      try {
        setSubmitLoading(true);
        setError(null);
        
        // 실제로는 API 호출
        console.log('차량 저장:', values);
        
        // API 호출 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setSubmitLoading(false);
        navigate(isEdit ? `/vehicles/${id}` : '/vehicles');
      } catch (err) {
        setError('차량 정보 저장 중 오류가 발생했습니다.');
        setSubmitLoading(false);
        console.error(err);
      }
    }
  });

  useEffect(() => {
    // 수정 모드일 경우 기존 차량 정보 불러오기
    const fetchVehicle = async () => {
      if (id) {
        try {
          // 실제로는 API 호출
          // API 호출 시뮬레이션
          setTimeout(() => {
            const vehicle = mockVehicles[id];
            if (vehicle) {
              // Formik의 값을 설정
              formik.setValues(vehicle);
            }
            setLoading(false);
          }, 1000);
        } catch (err) {
          setError('차량 정보를 불러오는데 실패했습니다.');
          setLoading(false);
          console.error(err);
        }
      }
    };

    fetchVehicle();
  }, [id]);

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

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate(id ? `/vehicles/${id}` : '/vehicles')}
        >
          {id ? '차량 상세로 돌아가기' : '차량 목록으로 돌아가기'}
        </Button>
        <Typography variant="h4" component="h1">
          {isEdit ? '차량 정보 수정' : '새 차량 등록'}
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
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    <CarIcon />
                  </Avatar>
                  <Typography variant="h6">기본 정보</Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth error={Boolean(formik.touched.make && formik.errors.make)}>
                      <FormLabel>제조사*</FormLabel>
                      <Select
                        name="make"
                        value={formik.values.make}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        displayEmpty
                        error={Boolean(formik.touched.make && formik.errors.make)}
                      >
                        <MenuItem value="" disabled>
                          제조사 선택
                        </MenuItem>
                        {carMakes.map(make => (
                          <MenuItem key={make} value={make}>
                            {make}
                          </MenuItem>
                        ))}
                      </Select>
                      {formik.touched.make && formik.errors.make && (
                        <FormHelperText error>{formik.errors.make}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth error={Boolean(formik.touched.model && formik.errors.model)}>
                      <FormLabel>모델*</FormLabel>
                      <TextField
                        name="model"
                        value={formik.values.model}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        placeholder="모델명"
                        error={Boolean(formik.touched.model && formik.errors.model)}
                        helperText={formik.touched.model && formik.errors.model}
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth error={Boolean(formik.touched.year && formik.errors.year)}>
                      <FormLabel>연식*</FormLabel>
                      <TextField
                        name="year"
                        type="number"
                        value={formik.values.year}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        inputProps={{ min: 1900, max: currentYear + 1 }}
                        error={Boolean(formik.touched.year && formik.errors.year)}
                        helperText={formik.touched.year && formik.errors.year}
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <FormLabel>색상</FormLabel>
                      <TextField
                        name="color"
                        value={formik.values.color}
                        onChange={formik.handleChange}
                        placeholder="색상"
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth error={Boolean(formik.touched.licensePlate && formik.errors.licensePlate)}>
                      <FormLabel>번호판*</FormLabel>
                      <TextField
                        name="licensePlate"
                        value={formik.values.licensePlate}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        placeholder="번호판"
                        error={Boolean(formik.touched.licensePlate && formik.errors.licensePlate)}
                        helperText={formik.touched.licensePlate && formik.errors.licensePlate}
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth error={Boolean(formik.touched.vin && formik.errors.vin)}>
                      <FormLabel>VIN*</FormLabel>
                      <TextField
                        name="vin"
                        value={formik.values.vin}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        placeholder="Vehicle Identification Number"
                        inputProps={{ maxLength: 17 }}
                        error={Boolean(formik.touched.vin && formik.errors.vin)}
                        helperText={formik.touched.vin && formik.errors.vin}
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth error={Boolean(formik.touched.mileage && formik.errors.mileage)}>
                      <FormLabel>주행거리*</FormLabel>
                      <TextField
                        name="mileage"
                        type="number"
                        value={formik.values.mileage}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        inputProps={{ min: 0 }}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">km</InputAdornment>,
                        }}
                        error={Boolean(formik.touched.mileage && formik.errors.mileage)}
                        helperText={formik.touched.mileage && formik.errors.mileage}
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth error={Boolean(formik.touched.type && formik.errors.type)}>
                      <FormLabel>차량 유형*</FormLabel>
                      <Select
                        name="type"
                        value={formik.values.type}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={Boolean(formik.touched.type && formik.errors.type)}
                      >
                        {vehicleTypes.map(type => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {formik.touched.type && formik.errors.type && (
                        <FormHelperText error>{formik.errors.type}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <FormLabel>차량 상태*</FormLabel>
                      <RadioGroup
                        name="status"
                        value={formik.values.status}
                        onChange={formik.handleChange}
                        row
                      >
                        <FormControlLabel
                          value="active"
                          control={<Radio />}
                          label="활성"
                        />
                        <FormControlLabel
                          value="maintenance"
                          control={<Radio />}
                          label="정비 중"
                        />
                        <FormControlLabel
                          value="inactive"
                          control={<Radio />}
                          label="비활성"
                        />
                        <FormControlLabel
                          value="recalled"
                          control={<Radio />}
                          label="리콜"
                        />
                      </RadioGroup>
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
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <FormLabel>소유자</FormLabel>
                      <TextField
                        name="owner"
                        value={formik.values.owner || ''}
                        onChange={formik.handleChange}
                        placeholder="소유자 이름"
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <FormLabel>구매일</FormLabel>
                      <TextField
                        name="purchaseDate"
                        type="date"
                        value={formik.values.purchaseDate || ''}
                        onChange={formik.handleChange}
                        InputLabelProps={{
                          shrink: true,
                        }}
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <FormLabel>보험 만료일</FormLabel>
                      <TextField
                        name="insuranceExpiry"
                        type="date"
                        value={formik.values.insuranceExpiry || ''}
                        onChange={formik.handleChange}
                        InputLabelProps={{
                          shrink: true,
                        }}
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <FormLabel>연료 유형</FormLabel>
                      <Select
                        name="fuelType"
                        value={formik.values.fuelType || ''}
                        onChange={formik.handleChange}
                        displayEmpty
                      >
                        <MenuItem value="" disabled>
                          연료 유형 선택
                        </MenuItem>
                        {fuelTypes.map(type => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <FormLabel>변속기</FormLabel>
                      <Select
                        name="transmission"
                        value={formik.values.transmission || ''}
                        onChange={formik.handleChange}
                        displayEmpty
                      >
                        <MenuItem value="" disabled>
                          변속기 유형 선택
                        </MenuItem>
                        {transmissionTypes.map(type => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <FormLabel>엔진</FormLabel>
                      <TextField
                        name="engineSize"
                        value={formik.values.engineSize || ''}
                        onChange={formik.handleChange}
                        placeholder="엔진 크기 (예: 2.0L)"
                      />
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <FormLabel>메모</FormLabel>
                      <TextField
                        name="notes"
                        value={formik.values.notes || ''}
                        onChange={formik.handleChange}
                        placeholder="차량에 대한 추가 메모"
                        multiline
                        rows={4}
                      />
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button 
            variant="contained"
            color="secondary"
            onClick={() => navigate(id ? `/vehicles/${id}` : '/vehicles')}
            sx={{ mr: 2 }}
          >
            취소
          </Button>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={submitLoading || !formik.isValid || !formik.dirty}
            startIcon={<SaveIcon />}
          >
            {submitLoading ? '저장 중...' : (isEdit ? '수정 완료' : '차량 등록')}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default VehicleForm;