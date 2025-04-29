import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface SupplierFormData {
  name: string;
  code: string;
  businessNumber: string;
  category: string;
  status: string;
  address: string;
  contacts: {
    name: string;
    position: string;
    phone: string;
    email: string;
  }[];
}

interface SupplierFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Partial<SupplierFormData>;
  mode: 'create' | 'edit';
}

const SupplierForm: React.FC<SupplierFormProps> = ({ open, onClose, initialData, mode }) => {
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset, formState: { errors } } = useForm<SupplierFormData>({
    defaultValues: {
      name: '',
      code: '',
      businessNumber: '',
      category: '',
      status: 'ACTIVE',
      address: '',
      contacts: [
        {
          name: '',
          position: '',
          phone: '',
          email: '',
        },
      ],
      ...initialData,
    },
  });

  const mutation = useMutation(
    async (data: SupplierFormData) => {
      const url = mode === 'create'
        ? '/api/v1/maintenance/suppliers'
        : `/api/v1/maintenance/suppliers/${initialData?.id}`;

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('공급업체 저장에 실패했습니다.');
      }

      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['suppliers']);
        onClose();
        reset();
      },
    }
  );

  const onSubmit = (data: SupplierFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? '공급업체 등록' : '공급업체 수정'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Controller
                name="name"
                control={control}
                rules={{ required: '업체명은 필수입니다.' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="업체명"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="code"
                control={control}
                rules={{ required: '업체 코드는 필수입니다.' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="업체 코드"
                    fullWidth
                    error={!!errors.code}
                    helperText={errors.code?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="businessNumber"
                control={control}
                rules={{ required: '사업자번호는 필수입니다.' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="사업자번호"
                    fullWidth
                    error={!!errors.businessNumber}
                    helperText={errors.businessNumber?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="category"
                control={control}
                rules={{ required: '카테고리는 필수입니다.' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.category}>
                    <InputLabel>카테고리</InputLabel>
                    <Select {...field} label="카테고리">
                      <MenuItem value="PARTS">부품</MenuItem>
                      <MenuItem value="TOOLS">공구</MenuItem>
                      <MenuItem value="CONSUMABLES">소모품</MenuItem>
                      <MenuItem value="EQUIPMENT">장비</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="address"
                control={control}
                rules={{ required: '주소는 필수입니다.' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="주소"
                    fullWidth
                    error={!!errors.address}
                    helperText={errors.address?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="status"
                control={control}
                rules={{ required: '상태는 필수입니다.' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.status}>
                    <InputLabel>상태</InputLabel>
                    <Select {...field} label="상태">
                      <MenuItem value="ACTIVE">활성</MenuItem>
                      <MenuItem value="INACTIVE">비활성</MenuItem>
                      <MenuItem value="SUSPENDED">정지</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* 대표 연락처 정보 */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                대표 연락처
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="contacts.0.name"
                control={control}
                rules={{ required: '담당자명은 필수입니다.' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="담당자명"
                    fullWidth
                    error={!!errors.contacts?.[0]?.name}
                    helperText={errors.contacts?.[0]?.name?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="contacts.0.position"
                control={control}
                rules={{ required: '직책은 필수입니다.' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="직책"
                    fullWidth
                    error={!!errors.contacts?.[0]?.position}
                    helperText={errors.contacts?.[0]?.position?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="contacts.0.phone"
                control={control}
                rules={{ required: '연락처는 필수입니다.' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="연락처"
                    fullWidth
                    error={!!errors.contacts?.[0]?.phone}
                    helperText={errors.contacts?.[0]?.phone?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="contacts.0.email"
                control={control}
                rules={{ 
                  required: '이메일은 필수입니다.',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: '유효한 이메일 주소를 입력하세요.',
                  }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="이메일"
                    fullWidth
                    error={!!errors.contacts?.[0]?.email}
                    helperText={errors.contacts?.[0]?.email?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>취소</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isLoading}
          >
            {mode === 'create' ? '등록' : '수정'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SupplierForm; 