import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Driver, DriverStatus } from '../../types/driver';
import { useDriver, useCreateDriver, useUpdateDriver } from '../../hooks/useDrivers';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';

interface DriverFormProps {
  driverId?: string;
  onSubmit?: () => void;
  onCancel?: () => void;
}

const DriverForm: React.FC<DriverFormProps> = ({ driverId, onSubmit, onCancel }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const effectiveId = driverId || id;
  const isEditMode = !!effectiveId;

  const [formData, setFormData] = useState<Partial<Driver>>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    licenseNumber: '',
    status: DriverStatus.ACTIVE,
    address: '',
  });

  const { 
    data: driver, 
    isLoading: isDriverLoading, 
    error: driverError 
  } = useDriver(effectiveId || '');
  
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver(effectiveId || '');

  // 드라이버 데이터 로드 시 폼 데이터 초기화
  useEffect(() => {
    if (driver && isEditMode) {
      setFormData(driver);
    }
  }, [driver, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditMode) {
        await updateDriver.mutateAsync(formData);
      } else {
        await createDriver.mutateAsync(formData as Omit<Driver, 'id'>);
      }
      
      if (onSubmit) {
        onSubmit();
      } else {
        navigate('/drivers');
      }
    } catch (error) {
      console.error('드라이버 저장에 실패했습니다:', error);
    }
  };

  const handleChange = (field: keyof Driver) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [field]: e.target.value,
    });
  };

  if (isDriverLoading && isEditMode) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  const error = driverError || createDriver.error || updateDriver.error;
  const errorMessage = error instanceof Error ? error.message : '드라이버 정보 처리 중 오류가 발생했습니다.';

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {isEditMode ? '드라이버 정보 수정' : '새 드라이버 등록'}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="이름"
                value={formData.firstName}
                onChange={handleChange('firstName')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="성"
                value={formData.lastName}
                onChange={handleChange('lastName')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="이메일"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="전화번호"
                value={formData.phoneNumber}
                onChange={handleChange('phoneNumber')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="운전면허 번호"
                value={formData.licenseNumber}
                onChange={handleChange('licenseNumber')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="면허 만료일"
                value={formData.licenseExpiry}
                onChange={(date) =>
                  setFormData({
                    ...formData,
                    licenseExpiry: date,
                  })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={formData.status}
                  label="상태"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as DriverStatus,
                    })
                  }
                >
                  {Object.values(DriverStatus).map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="주소"
                multiline
                rows={2}
                value={formData.address}
                onChange={handleChange('address')}
              />
            </Grid>
            {formData.emergencyContact && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="비상연락처 이름"
                    value={formData.emergencyContact.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyContact: {
                          ...formData.emergencyContact!,
                          name: e.target.value,
                        },
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="비상연락처 관계"
                    value={formData.emergencyContact.relationship}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyContact: {
                          ...formData.emergencyContact!,
                          relationship: e.target.value,
                        },
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="비상연락처 전화번호"
                    value={formData.emergencyContact.phoneNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyContact: {
                          ...formData.emergencyContact!,
                          phoneNumber: e.target.value,
                        },
                      })
                    }
                  />
                </Grid>
              </>
            )}
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" onClick={() => {
              if (onCancel) {
                onCancel();
              } else {
                navigate('/drivers');
              }
            }}>
              취소
            </Button>
            <Button variant="contained" type="submit">
              {isEditMode ? '수정' : '등록'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DriverForm; 