import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  FormControlLabel,
  Checkbox,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Radio,
  RadioGroup,
  SelectChangeEvent,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { MaintenanceType } from '../../types/maintenance';
import { MaintenanceService } from '../../services/maintenanceService';

// 상수로 정의하여 값으로 사용할 수 있도록 함
const MAINTENANCE_TYPES = {
  REGULAR: 'regular' as MaintenanceType,
  REPAIR: 'repair' as MaintenanceType,
  INSPECTION: 'inspection' as MaintenanceType,
  ACCIDENT: 'accident' as MaintenanceType,
  RECALL: 'recall' as MaintenanceType,
  UPGRADE: 'upgrade' as MaintenanceType,
  OTHER: 'other' as MaintenanceType
};

const steps = ['차량 선택', '정비 내용', '일정 선택', '확인'];

const MaintenanceRequest: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    vehicleId: '',
    type: MAINTENANCE_TYPES.REGULAR,
    description: '',
    urgency: 'normal',
    preferredDate: new Date(),
    preferredTime: '오전',
    symptoms: [] as string[],
    additionalNotes: '',
    preferredShop: '',
    isFlexibleSchedule: false,
  });

  const [vehicles, setVehicles] = useState([
    { id: '1', name: '현대 소나타', plate: '서울 가 1234' },
    { id: '2', name: '기아 K5', plate: '경기 나 5678' },
  ]);

  const [availableShops, setAvailableShops] = useState([
    { id: '1', name: '현대 서비스센터 강남점', address: '서울시 강남구' },
    { id: '2', name: '현대 서비스센터 송파점', address: '서울시 송파구' },
  ]);

  const commonSymptoms = [
    '엔진 소음',
    '진동',
    '시동 문제',
    '브레이크 이상',
    '연비 저하',
    '냉각수 누수',
    '에어컨/히터 문제',
    '전기 계통 문제',
  ];

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const maintenanceService = MaintenanceService.getInstance();
      await maintenanceService.createMaintenance({
        ...formData,
        status: 'scheduled',
        priority: 'medium',
        startDate: formData.preferredDate.toISOString()
      });

      // 성공 메시지 표시 후 목록으로 이동
      alert('정비 요청이 성공적으로 등록되었습니다.');
      navigate('/maintenance');
    } catch (error) {
      console.error('정비 요청 등록 실패:', error);
      setError('정비 요청 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [field]: e.target.value,
    });
  };

  const handleSelectChange = (field: string) => (
    e: SelectChangeEvent<string>
  ) => {
    setFormData({
      ...formData,
      [field]: e.target.value,
    });
  };

  const handleSymptomToggle = (symptom: string) => {
    setFormData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom],
    }));
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>차량 선택</InputLabel>
                <Select
                  value={formData.vehicleId}
                  label="차량 선택"
                  onChange={handleSelectChange('vehicleId')}
                >
                  {vehicles.map((vehicle) => (
                    <MenuItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} ({vehicle.plate})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>정비 유형</InputLabel>
                <Select
                  value={formData.type}
                  label="정비 유형"
                  onChange={handleSelectChange('type')}
                >
                  <MenuItem value={MAINTENANCE_TYPES.REGULAR}>정기 점검</MenuItem>
                  <MenuItem value={MAINTENANCE_TYPES.REPAIR}>수리</MenuItem>
                  <MenuItem value={MAINTENANCE_TYPES.INSPECTION}>검사</MenuItem>
                  <MenuItem value={MAINTENANCE_TYPES.ACCIDENT}>사고 수리</MenuItem>
                  <MenuItem value={MAINTENANCE_TYPES.RECALL}>리콜</MenuItem>
                  <MenuItem value={MAINTENANCE_TYPES.UPGRADE}>업그레이드</MenuItem>
                  <MenuItem value={MAINTENANCE_TYPES.OTHER}>기타</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                증상 선택 (해당되는 항목 모두 선택)
              </Typography>
              <Paper sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  {commonSymptoms.map((symptom) => (
                    <Grid item xs={12} sm={6} key={symptom}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.symptoms.includes(symptom)}
                            onChange={() => handleSymptomToggle(symptom)}
                          />
                        }
                        label={symptom}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                rows={4}
                label="상세 설명"
                value={formData.description}
                onChange={handleChange('description')}
                placeholder="발생한 문제나 이상 증상에 대해 자세히 설명해주세요."
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl component="fieldset">
                <Typography variant="subtitle1" gutterBottom>
                  긴급도
                </Typography>
                <RadioGroup
                  value={formData.urgency}
                  onChange={handleChange('urgency')}
                >
                  <FormControlLabel
                    value="urgent"
                    control={<Radio />}
                    label="긴급 (24시간 이내 필요)"
                  />
                  <FormControlLabel
                    value="normal"
                    control={<Radio />}
                    label="보통 (1주일 이내 필요)"
                  />
                  <FormControlLabel
                    value="flexible"
                    control={<Radio />}
                    label="여유 있음 (정비소 일정에 맞춰 조정 가능)"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>선호 정비소</InputLabel>
                <Select
                  value={formData.preferredShop}
                  label="선호 정비소"
                  onChange={handleSelectChange('preferredShop')}
                >
                  {availableShops.map((shop) => (
                    <MenuItem key={shop.id} value={shop.id}>
                      {shop.name} ({shop.address})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="희망 날짜/시간"
                value={formData.preferredDate}
                onChange={(date) => date && setFormData({ ...formData, preferredDate: date })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>선호 시간대</InputLabel>
                <Select
                  value={formData.preferredTime}
                  label="선호 시간대"
                  onChange={handleSelectChange('preferredTime')}
                >
                  <MenuItem value="오전">오전</MenuItem>
                  <MenuItem value="오후">오후</MenuItem>
                  <MenuItem value="저녁">저녁</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isFlexibleSchedule}
                    onChange={(e) =>
                      setFormData({ ...formData, isFlexibleSchedule: e.target.checked })
                    }
                  />
                }
                label="정비소 사정에 따라 일정 조정 가능"
              />
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                정비 요청 정보 확인
              </Typography>
              <Paper sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1">차량 정보</Typography>
                    <Typography>
                      {vehicles.find((v) => v.id === formData.vehicleId)?.name} (
                      {vehicles.find((v) => v.id === formData.vehicleId)?.plate})
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1">정비 유형</Typography>
                    <Typography>{formData.type}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">상세 설명</Typography>
                    <Typography>{formData.description}</Typography>
                  </Grid>
                  {formData.symptoms.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle1">증상</Typography>
                      <Box component="ul" sx={{ pl: 2 }}>
                        {formData.symptoms.map((symptom) => (
                          <li key={symptom}>{symptom}</li>
                        ))}
                      </Box>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1">선호 정비소</Typography>
                    <Typography>
                      {availableShops.find((s) => s.id === formData.preferredShop)?.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1">희망 일정</Typography>
                    <Typography>
                      {formData.preferredDate.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">긴급도</Typography>
                    <Typography>
                      {
                        {
                          urgent: '긴급 (24시간 이내 필요)',
                          normal: '보통 (1주일 이내 필요)',
                          flexible: '여유 있음 (정비소 일정에 맞춰 조정 가능)',
                        }[formData.urgency]
                      }
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            정비 요청
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {getStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              disabled={activeStep === 0 || loading}
              onClick={handleBack}
            >
              이전
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
              disabled={
                loading ||
                (activeStep === 0 && !formData.vehicleId) ||
                (activeStep === 1 && !formData.description) ||
                (activeStep === 2 && !formData.preferredShop)
              }
            >
              {activeStep === steps.length - 1 ? '요청 제출' : '다음'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MaintenanceRequest; 